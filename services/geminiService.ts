
import { GoogleGenAI, Type } from "@google/genai";
import { InvoiceData, InvoiceItem, InvoiceType, ExtractionMode, ExtractionResult, OperationCategory, TaxPointType } from "../types";

const parseInvoiceDate = (dateStr: string): string => {
  if (!dateStr) return "";
  const clean = dateStr.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) {
    const [y, m, d] = clean.split('-');
    return `${d}/${m}/${y}`;
  }
  return clean;
};

const parseQuantity = (val: any): number | null => {
  if (typeof val === 'number') return val;
  if (typeof val === 'string') {
    let clean = val.trim();
    if (clean.includes(',') && !clean.includes('.')) clean = clean.replace(',', '.');
    clean = clean.replace(/[^0-9.-]/g, '');
    const num = parseFloat(clean);
    return isNaN(num) ? null : num;
  }
  return null;
};

export const extractInvoiceData = async (
  base64Data: string,
  mimeType: string,
  filename: string,
  mode: ExtractionMode,
  direction: 'INBOUND' | 'OUTBOUND',
  withItems: boolean = false
): Promise<ExtractionResult> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const ultimateSchema = {
    type: Type.OBJECT,
    properties: {
      invoice_type: { type: Type.STRING, enum: ["INVOICE", "CREDIT_NOTE"] },
      invoice_number: { type: Type.STRING },
      invoice_date: { type: Type.STRING },
      due_date: { type: Type.STRING },
      tax_point_date: { type: Type.STRING },
      currency: { type: Type.STRING },
      po_number: { type: Type.STRING },
      buyer_reference: { type: Type.STRING },
      supplier_name: { type: Type.STRING },
      supplier_vat: { type: Type.STRING },
      supplier_siret: { type: Type.STRING },
      supplier_address: { type: Type.STRING },
      buyer_name: { type: Type.STRING },
      buyer_vat: { type: Type.STRING },
      buyer_siret: { type: Type.STRING },
      buyer_address: { type: Type.STRING },
      amount_excl_vat: { type: Type.NUMBER },
      total_vat_amount: { type: Type.NUMBER },
      amount_incl_vat: { type: Type.NUMBER },
      global_discount: { type: Type.NUMBER },
      global_charge: { type: Type.NUMBER },
      iban: { type: Type.STRING },
      bic: { type: Type.STRING },
      payment_method: { type: Type.STRING },
      payment_means_code: { type: Type.STRING },
      notes: { type: Type.STRING },
      line_items: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            article_id: { type: Type.STRING },
            description: { type: Type.STRING },
            quantity: { type: Type.NUMBER },
            unit_of_measure: { type: Type.STRING },
            gross_price: { type: Type.NUMBER },
            discount_amount: { type: Type.NUMBER },
            unit_price: { type: Type.NUMBER },
            tax_rate: { type: Type.NUMBER },
            amount: { type: Type.NUMBER }
          }
        }
      }
    },
    required: ["supplier_name", "invoice_number", "amount_incl_vat"],
  };

  const systemInstruction = `EXPERT COMPTABLE HAUTE PERFORMANCE.
  MISSION : Extraire TOUTES les lignes (BG-25) de TOUTES les pages du document.
  REGLES :
  1. Zéro omission : transport, frais admin, palettes, GNR sont des items obligatoires.
  2. Somme des items == Total HT.
  3. Format JSON compact, sans espaces inutiles pour la rapidité.
  4. Dates ISO (YYYY-MM-DD).`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview", 
      contents: [
        {
          parts: [
            { inlineData: { mimeType, data: base64Data } },
            { text: "Extraire en JSON Factur-X." }
          ]
        }
      ],
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: ultimateSchema,
        temperature: 0,
        maxOutputTokens: 20000, 
      },
    });

    let textOutput = response.text || "{}";
    const rawData = JSON.parse(textOutput);
    const usage = response.usageMetadata || { totalTokenCount: 0 };

    const items: InvoiceItem[] = Array.isArray(rawData.line_items) 
      ? rawData.line_items.map((item: any) => ({
          articleId: item.article_id || "",
          description: item.description || "",
          quantity: parseQuantity(item.quantity),
          unitOfMeasure: item.unit_of_measure || "C62",
          grossPrice: typeof item.gross_price === 'number' ? item.gross_price : null,
          discount: typeof item.discount_amount === 'number' ? item.discount_amount : null,
          unitPrice: typeof item.unit_price === 'number' ? item.unit_price : null,
          taxRate: typeof item.tax_rate === 'number' ? item.tax_rate : 20.0,
          amount: typeof item.amount === 'number' ? item.amount : null,
        }))
      : [];

    const invoiceData: InvoiceData = {
      id: crypto.randomUUID(),
      extractionMode: 'ULTIMATE',
      direction: direction,
      invoiceType: rawData.invoice_type === 'CREDIT_NOTE' ? InvoiceType.CREDIT_NOTE : InvoiceType.INVOICE,
      operationCategory: (rawData.operation_category || 'GOODS') as OperationCategory,
      taxPointType: (rawData.tax_point_type || 'DEBIT') as TaxPointType,
      supplier: rawData.supplier_name || "",
      supplierAddress: rawData.supplier_address || "",
      supplierVat: rawData.supplier_vat || "",
      supplierSiret: rawData.supplier_siret || "",
      buyerName: rawData.buyer_name || "",
      buyerAddress: rawData.buyer_address || "",
      buyerVat: rawData.buyer_vat || "",
      buyerSiret: rawData.buyer_siret || "",
      invoiceNumber: rawData.invoice_number || "",
      invoiceDate: parseInvoiceDate(rawData.invoice_date),
      dueDate: parseInvoiceDate(rawData.due_date),
      taxPointDate: parseInvoiceDate(rawData.tax_point_date),
      deliveryDate: parseInvoiceDate(rawData.delivery_date),
      contractNumber: rawData.contract_number || "",
      deliveryNoteNumber: rawData.delivery_note_number || "",
      projectReference: rawData.project_reference || "",
      paymentReference: rawData.payment_reference || "",
      amountExclVat: typeof rawData.amount_excl_vat === 'number' ? rawData.amount_excl_vat : null,
      totalVat: typeof rawData.total_vat_amount === 'number' ? rawData.total_vat_amount : null,
      amountInclVat: typeof rawData.amount_incl_vat === 'number' ? rawData.amount_incl_vat : null,
      currency: rawData.currency || "EUR",
      globalDiscount: typeof rawData.global_discount === 'number' ? rawData.global_discount : 0,
      globalCharge: typeof rawData.global_charge === 'number' ? rawData.global_charge : 0,
      iban: rawData.iban?.replace(/\s/g, "") || "",
      bic: rawData.bic || "",
      paymentMethod: rawData.payment_method || "",
      paymentMeansCode: rawData.payment_means_code || "58",
      notes: rawData.notes || "",
      originalFilename: filename,
      fileData: base64Data,
      items: withItems ? items : undefined,
    };

    return { 
      invoice: invoiceData, 
      usage: { 
        promptTokens: usage.promptTokenCount || 0, 
        completionTokens: usage.candidatesTokenCount || 0, 
        totalTokens: usage.totalTokenCount 
      } 
    };
  } catch (error) {
    console.error("Gemini Extraction Error:", error);
    throw error;
  }
};
