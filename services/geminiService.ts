
import { GoogleGenAI, Type } from "@google/genai";
import { InvoiceData, InvoiceItem, InvoiceType, ExtractionMode, ExtractionResult, FacturXProfile, ErpStatus, VatBreakdown } from "../types";

const parseInvoiceDate = (dateStr: string): string => {
  if (!dateStr) return "";
  const clean = dateStr.trim();
  // Format YYYYMMDD to DD/MM/YYYY
  if (/^\d{8}$/.test(clean)) return `${clean.substring(6, 8)}/${clean.substring(4, 6)}/${clean.substring(0, 4)}`;
  // Format YYYY-MM-DD to DD/MM/YYYY
  if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) {
    const [y, m, d] = clean.split('-');
    return `${d}/${m}/${y}`;
  }
  return clean;
};

const parseNum = (val: any): number => {
  if (typeof val === 'number') return val;
  if (typeof val === 'string') {
    let clean = val.trim().replace(',', '.').replace(/[^0-9.-]/g, '');
    const num = parseFloat(clean);
    return isNaN(num) ? 0 : num;
  }
  return 0;
};

export const extractInvoiceData = async (
  base64Data: string,
  mimeType: string,
  filename: string,
  mode: ExtractionMode,
  direction: 'INBOUND' | 'OUTBOUND',
  companyId: string,
  owner: string
): Promise<ExtractionResult> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const schema = {
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
      global_discount: { type: Type.NUMBER },
      global_charge: { type: Type.NUMBER },
      total_vat_amount: { type: Type.NUMBER },
      amount_incl_vat: { type: Type.NUMBER },
      prepaid_amount: { type: Type.NUMBER },
      amount_due: { type: Type.NUMBER },
      vat_breakdowns: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            vat_category: { type: Type.STRING },
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
            unit_price: { type: Type.NUMBER },
            gross_price: { type: Type.NUMBER },
            tax_rate: { type: Type.NUMBER },
            line_vat_category: { type: Type.STRING },
            amount: { type: Type.NUMBER }
          }
        }
      }
    },
    required: ["supplier_name", "invoice_number", "amount_incl_vat", "vat_breakdowns"],
  };

  const systemInstruction = `EXTRACTEUR RFE EN16931 (FACTUR-X 2026).
Extraire toutes les données sémantiques BT-xxx du document PDF.

RÈGLES CRITIQUES :
1. VAT_BREAKDOWN (BG-23) : Requis par taux de TVA. vat_category doit être (S, Z, E, AE, K, G, O).
2. LIGNES (BG-25) : Chaque ligne doit avoir son line_vat_category.
3. IDENTIFIANTS : SIRET (14 chiffres), TVA (Code Pays + 11 chiffres).
4. MONTANTS : Décimales précises. amount_due = amount_incl_vat - prepaid_amount.
5. BANCAIRE : Extraire l'IBAN du vendeur.

REPONDRE UNIQUEMENT EN JSON.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [{
        parts: [
          { inlineData: { mimeType, data: base64Data } },
          { text: "Analyse cette facture et retourne le JSON complet conforme RFE EN16931." }
        ]
      }],
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: schema,
        temperature: 0
      },
    });

    const raw = JSON.parse(response.text || "{}");
    const usage = response.usageMetadata || { totalTokenCount: 0 };

    // Mapping Item par Item (Pas de perte)
    const items: InvoiceItem[] = (raw.line_items || []).map((it: any) => ({
      articleId: it.article_id || "",
      description: it.description || "",
      quantity: parseNum(it.quantity),
      unitOfMeasure: it.unit_of_measure || "C62",
      unitPrice: parseNum(it.unit_price),
      grossPrice: parseNum(it.gross_price),
      discount: 0,
      lineAllowanceAmount: 0,
      lineChargeAmount: 0,
      taxRate: parseNum(it.tax_rate),
      lineVatCategory: it.line_vat_category || "S",
      amount: parseNum(it.amount),
    }));

    // Mapping TVA par TVA
    const vats: VatBreakdown[] = (raw.vat_breakdowns || []).map((v: any) => ({
      vatCategory: v.vat_category || "S",
      vatRate: parseNum(v.vat_rate),
      vatTaxableAmount: parseNum(v.vat_taxable_amount),
      vatAmount: parseNum(v.vat_amount)
    }));

    // Objet final exhaustif
    const invoice: InvoiceData = {
      id: crypto.randomUUID(),
      companyId,
      owner,
      extractionMode: mode,
      extractedAt: new Date().toISOString(),
      direction,
      isArchived: false,
      erpStatus: ErpStatus.PENDING,
      
      facturXProfile: FacturXProfile.COMFORT,
      invoiceType: raw.invoice_type === 'CREDIT_NOTE' ? InvoiceType.CREDIT_NOTE : InvoiceType.INVOICE,
      invoiceNumber: raw.invoice_number || "INCONNU",
      invoiceDate: parseInvoiceDate(raw.invoice_date),
      dueDate: parseInvoiceDate(raw.due_date),
      taxPointDate: parseInvoiceDate(raw.tax_point_date),
      currency: raw.currency || "EUR",
      poNumber: raw.po_number || "",
      buyerReference: raw.buyer_reference || "",
      contractNumber: raw.contract_number || "",
      invoiceNote: raw.invoice_note || "",

      supplier: raw.supplier_name || "",
      supplierAddress: raw.supplier_address || "",
      supplierVat: raw.supplier_vat || "",
      supplierSiret: raw.supplier_siret?.replace(/\s/g, "") || "",
      
      buyerName: raw.buyer_name || "",
      buyerAddress: raw.buyer_address || "",
      buyerVat: raw.buyer_vat || "",
      buyerSiret: raw.buyer_siret?.replace(/\s/g, "") || "",
      
      iban: raw.iban?.replace(/\s/g, "") || "",
      bic: raw.bic?.replace(/\s/g, "") || "",
      paymentTermsText: raw.payment_terms_text || "",

      amountExclVat: parseNum(raw.amount_excl_vat),
      globalDiscount: parseNum(raw.global_discount),
      globalCharge: parseNum(raw.global_charge),
      totalVat: parseNum(raw.total_vat_amount),
      amountInclVat: parseNum(raw.amount_incl_vat),
      prepaidAmount: parseNum(raw.prepaid_amount),
      amountDueForPayment: parseNum(raw.amount_due) || parseNum(raw.amount_incl_vat),

      items,
      vatBreakdowns: vats,
      originalFilename: filename,
      fileData: base64Data
    };

    return { 
      invoice, 
      usage: { 
        promptTokens: usage.promptTokenCount || 0, 
        completionTokens: usage.candidatesTokenCount || 0, 
        totalTokens: usage.totalTokenCount || 0
      } 
    };
  } catch (error) {
    console.error("Critical Extraction Error:", error);
    throw error;
  }
};
