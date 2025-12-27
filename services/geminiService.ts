
import { GoogleGenAI, Type } from "@google/genai";
import { InvoiceData, InvoiceItem, InvoiceType, ExtractionMode, ExtractionResult, OperationCategory, TaxPointType, VatBreakdown } from "../types";

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
      payment_terms_text: { type: Type.STRING },
      invoice_note: { type: Type.STRING },
      iban: { type: Type.STRING },
      bic: { type: Type.STRING },
      amount_excl_vat: { type: Type.NUMBER },
      total_vat_amount: { type: Type.NUMBER },
      amount_incl_vat: { type: Type.NUMBER },
      vat_breakdowns: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            vat_category: { type: Type.STRING }, // S, Z, E, AE
            vat_rate: { type: Type.NUMBER },
            vat_taxable_amount: { type: Type.NUMBER },
            vat_amount: { type: Type.NUMBER }
          },
          required: ["vat_category", "vat_rate", "vat_taxable_amount", "vat_amount"]
        }
      },
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
            discount_rate: { type: Type.NUMBER },
            unit_price: { type: Type.NUMBER },
            tax_rate: { type: Type.NUMBER },
            line_vat_category: { type: Type.STRING },
            amount: { type: Type.NUMBER }
          }
        }
      }
    },
    required: ["supplier_name", "invoice_number", "amount_incl_vat", "vat_breakdowns"],
  };

  const systemInstruction = `EXTRACTEUR RFE EN16931 STRICT (FAC-X 2026).
OBJET: Extraction pour plateformes agréées (PDP).

CHAMPS CRITIQUES:
1. VENTILATION TVA (BG-23): Créer un array 'vat_breakdowns' PAR TAUX. 
   - vat_category (BT-118): S=Standard, Z=Zéro, E=Exo, AE=Autoliquid.
   - vat_taxable_amount (BT-116): Base HT du taux.
   - vat_amount (BT-117): Base * Taux.
2. LIGNES (BG-25): line_vat_category (BT-151) obligatoire par ligne.
3. IDENTIFIANTS: SIRET 14 chiffres, TVA FR+11.
4. BANCAIRE: IBAN Vendeur (BT-84) format FR.
5. NOTES & PAIEMENT: invoice_note (BT-22) et payment_terms_text (BT-20).

RÉPONSE: JSON STRICT UNIQUEMENT.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [{
        parts: [
          { inlineData: { mimeType, data: base64Data } },
          { text: "Extraire les données structurées conformes RFE EN16931." }
        ]
      }],
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: ultimateSchema,
        temperature: 0
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
      discount: item.discount_rate || null,
      unitPrice: item.unit_price || null,
      taxRate: item.tax_rate || 20.0,
      lineVatCategory: item.line_vat_category || "S",
      amount: item.amount || null,
    }));

    const vatBreakdowns: VatBreakdown[] = (rawData.vat_breakdowns || []).map((v: any) => ({
      vatCategory: v.vat_category || "S",
      vatRate: v.vat_rate || 20.0,
      vatTaxableAmount: v.vat_taxable_amount || 0,
      vatAmount: v.vat_amount || 0
    }));

    const invoiceData: InvoiceData = {
      id: crypto.randomUUID(),
      companyId: companyId,
      extractionMode: 'ULTIMATE',
      direction: direction,
      invoiceType: rawData.invoice_type === 'CREDIT_NOTE' ? InvoiceType.CREDIT_NOTE : InvoiceType.INVOICE,
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
      currency: rawData.currency || "EUR",
      iban: rawData.iban?.replace(/\s/g, "") || "",
      bic: rawData.bic || "",
      paymentTermsText: rawData.payment_terms_text || "",
      invoiceNote: rawData.invoice_note || "",
      originalFilename: filename,
      fileData: base64Data,
      items: withItems ? items : undefined,
      vatBreakdowns: vatBreakdowns,
    };

    return { 
      invoice: invoiceData, 
      usage: { 
        promptTokens: usage.promptTokenCount || 0, 
        completionTokens: usage.candidatesTokenCount || 0, 
        totalTokens: usage.totalTokenCount || 0
      } 
    };
  } catch (error) {
    console.error("Gemini RFE Extraction Error:", error);
    throw error;
  }
};
