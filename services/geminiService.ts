
import { GoogleGenAI, Type } from "@google/genai";
import { InvoiceData, InvoiceItem, InvoiceType, ExtractionMode, ExtractionResult, OperationCategory, TaxPointType } from "../types";

const parseInvoiceDate = (dateStr: string): string => {
  if (!dateStr) return "";
  const clean = dateStr.trim();
  if (/^\d{8}$/.test(clean)) return `${clean.substring(6, 8)}/${clean.substring(4, 6)}/${clean.substring(0, 4)}`;
  if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) {
    const [y, m, d] = clean.split('-');
    return `${d}/${m}/${y}`;
  }
  return clean;
};

const parseQuantity = (val: any): number | null => {
  if (typeof val === 'number') return val;
  if (typeof val === 'string') {
    let clean = val.trim().replace(',', '.').replace(/[^0-9.-]/g, '');
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
  companyId: string,
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
      contract_number: { type: Type.STRING },
      delivery_note_number: { type: Type.STRING },
      project_reference: { type: Type.STRING },
      delivery_date: { type: Type.STRING },
      receiving_advice_number: { type: Type.STRING },
      business_process_id: { type: Type.STRING },
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
      prepaid_amount: { type: Type.NUMBER },
      global_discount: { type: Type.NUMBER },
      global_charge: { type: Type.NUMBER },
      iban: { type: Type.STRING },
      bic: { type: Type.STRING },
      payment_method: { type: Type.STRING },
      payment_means_code: { type: Type.STRING },
      payment_terms: { type: Type.STRING },
      payment_reference: { type: Type.STRING },
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

  // PROMPT TECHNIQUE DENSE (RFE/EN16931 COMPLIANT)
  const systemInstruction = `EXTRACTEUR RFE EN16931 STRICT. 
OBJET: Extraction structurée Factur-X pour plateformes agréées (PDP).
RÈGLES CRITIQUES:
1. IDENTITÉ: Extraire SIRET (14 chiffres) et TVA (FR+11 chiffres). Priorité absolue.
2. DATES: Format ISO YYYY-MM-DD.
3. BANCAIRE: IBAN et BIC de l'émetteur obligatoires si présents.
4. BG-25 (LIGNES): Extraire TOUTES les lignes. Calcul: (GrossPrice - Discount) * Quantity = Amount.
5. ARITHMÉTIQUE: Total HT = Somme(Lignes) + Frais - Remises. Doit être cohérent.
6. ACOMPTES: Isoler 'prepaid_amount' (BT-113).
7. TAXES: Isoler les taux par ligne (BT-152).
RÉPONSE: JSON STRICT UNIQUEMENT.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: {
        parts: [
          { inlineData: { mimeType, data: base64Data } },
          { text: "Analyser ce document selon les règles EN16931." }
        ]
      },
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: ultimateSchema,
        temperature: 0,
        thinkingConfig: { thinkingBudget: 0 }
      },
    });

    const rawData = JSON.parse(response.text || "{}");
    const usage = response.usageMetadata || { totalTokenCount: 0 };

    const items: InvoiceItem[] = (rawData.line_items || []).map((item: any) => ({
      articleId: item.article_id || "",
      description: item.description || "",
      quantity: parseQuantity(item.quantity),
      unitOfMeasure: item.unit_of_measure || "C62",
      grossPrice: item.gross_price || null,
      discount: item.discount_amount || null,
      unitPrice: item.unit_price || null,
      taxRate: item.tax_rate || 20.0,
      amount: item.amount || null,
    }));

    const invoiceData: InvoiceData = {
      id: crypto.randomUUID(),
      companyId: companyId,
      extractionMode: 'ULTIMATE',
      direction: direction,
      invoiceType: rawData.invoice_type === 'CREDIT_NOTE' ? InvoiceType.CREDIT_NOTE : InvoiceType.INVOICE,
      operationCategory: (rawData.operation_category || 'GOODS') as OperationCategory,
      taxPointType: (rawData.tax_point_type || 'DEBIT') as TaxPointType,
      businessProcessId: rawData.business_process_id || "urn:factur-x.eu:1p0:comfort",
      supplier: rawData.supplier_name || "",
      supplierAddress: rawData.supplier_address || "",
      supplierVat: rawData.supplier_vat || "",
      supplierSiret: rawData.supplier_siret?.replace(/\s/g, "") || "",
      buyerName: rawData.buyer_name || "",
      buyerAddress: rawData.buyer_address || "",
      buyerVat: rawData.buyer_vat || "",
      buyerSiret: rawData.buyer_siret?.replace(/\s/g, "") || "",
      invoiceNumber: rawData.invoice_number || "",
      invoiceDate: parseInvoiceDate(rawData.invoice_date),
      dueDate: parseInvoiceDate(rawData.due_date),
      amountExclVat: rawData.amount_excl_vat || null,
      totalVat: rawData.total_vat_amount || null,
      amountInclVat: rawData.amount_incl_vat || null,
      prepaidAmount: rawData.prepaid_amount || 0,
      currency: rawData.currency || "EUR",
      iban: rawData.iban?.replace(/\s/g, "") || "",
      bic: rawData.bic || "",
      originalFilename: filename,
      fileData: base64Data,
      items: withItems ? items : undefined,
    };

    return { invoice: invoiceData, usage: { promptTokens: usage.promptTokenCount || 0, completionTokens: usage.candidatesTokenCount || 0, totalTokens: usage.totalTokenCount } };
  } catch (error) {
    console.error("Gemini Extraction Error:", error);
    throw error;
  }
};
