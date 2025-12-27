
import { GoogleGenAI, Type } from "@google/genai";
import { InvoiceData, InvoiceItem, InvoiceType, ExtractionMode, ExtractionResult, FacturXProfile, ErpStatus, VatBreakdown } from "../types";

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

  // On enrichit le schéma avec des descriptions pour guider l'IA sans alourdir la systemInstruction
  const schema = {
    type: Type.OBJECT,
    properties: {
      specification_id: { type: Type.STRING, description: "BT-24: urn:cen.eu:en16931:2017#compliant#urn:factur-x.eu:1p0:comfort" },
      invoice_type: { type: Type.STRING, enum: ["INVOICE", "CREDIT_NOTE"], description: "BT-3: INVOICE (380) ou CREDIT_NOTE (381)" },
      invoice_number: { type: Type.STRING, description: "BT-1: Numéro de facture unique" },
      invoice_date: { type: Type.STRING, description: "BT-2: Date d'émission (YYYY-MM-DD)" },
      due_date: { type: Type.STRING, description: "BT-9: Date d'échéance" },
      tax_point_date: { type: Type.STRING, description: "BT-7: Date de livraison/prestation" },
      currency: { type: Type.STRING, description: "BT-5: Devise ISO (ex: EUR)" },
      po_number: { type: Type.STRING, description: "BT-13: Numéro de commande" },
      buyer_reference: { type: Type.STRING, description: "BT-10: Référence acheteur" },
      
      logistics: {
        type: Type.OBJECT,
        properties: {
          deliver_to_name: { type: Type.STRING, description: "BT-70: Nom du lieu de livraison" },
          delivery_date: { type: Type.STRING, description: "BT-72: Date de livraison effective" },
          deliver_to_address: { type: Type.STRING, description: "BG-15: Adresse complète du lieu de livraison" }
        }
      },

      billing_period: {
        type: Type.OBJECT,
        properties: {
          start_date: { type: Type.STRING, description: "BT-73: Début de période de facturation" },
          end_date: { type: Type.STRING, description: "BT-74: Fin de période de facturation" }
        }
      },

      supplier_name: { type: Type.STRING, description: "BT-27: Raison sociale du vendeur" },
      supplier_vat: { type: Type.STRING, description: "BT-31: TVA Intra du vendeur (ex: FR...)" },
      supplier_siret: { type: Type.STRING, description: "BT-29: SIRET (14 chiffres) du vendeur" },
      supplier_address: { type: Type.STRING, description: "BG-5: Adresse complète du vendeur" },
      
      buyer_name: { type: Type.STRING, description: "BT-44: Raison sociale de l'acheteur" },
      buyer_vat: { type: Type.STRING, description: "BT-48: TVA Intra de l'acheteur" },
      buyer_siret: { type: Type.STRING, description: "BT-47: SIRET de l'acheteur" },
      buyer_address: { type: Type.STRING, description: "BG-8: Adresse complète de l'acheteur" },
      
      payment_means_code: { type: Type.STRING, description: "BT-81: Code mode de paiement (30=Virement, 48=Carte, 59=Prélèvement)" },
      payment_terms_text: { type: Type.STRING, description: "BT-20: Conditions de paiement" },
      iban: { type: Type.STRING, description: "BT-84: IBAN du vendeur" },
      bic: { type: Type.STRING, description: "BT-85: BIC du vendeur" },
      
      amount_excl_vat: { type: Type.NUMBER, description: "BT-109: Total HT" },
      global_discount: { type: Type.NUMBER, description: "BT-107: Remises totales" },
      global_charge: { type: Type.NUMBER, description: "BT-108: Frais totaux" },
      total_vat_amount: { type: Type.NUMBER, description: "BT-110: Montant total TVA" },
      amount_incl_vat: { type: Type.NUMBER, description: "BT-112: Total TTC" },
      prepaid_amount: { type: Type.NUMBER, description: "BT-113: Montant déjà payé" },
      amount_due: { type: Type.NUMBER, description: "BT-115: Net à payer" },
      
      vat_breakdowns: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            vat_category: { type: Type.STRING, description: "BT-118: S, AE, E, Z" },
            vat_rate: { type: Type.NUMBER, description: "BT-119: Taux TVA" },
            vat_taxable_amount: { type: Type.NUMBER, description: "BT-116: Base HT" },
            vat_amount: { type: Type.NUMBER, description: "BT-117: Montant TVA" }
          },
          required: ["vat_category", "vat_rate", "vat_taxable_amount", "vat_amount"]
        }
      },
      line_items: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            article_id: { type: Type.STRING, description: "BT-128" },
            description: { type: Type.STRING, description: "BT-129" },
            quantity: { type: Type.NUMBER, description: "BT-131" },
            unit_of_measure: { type: Type.STRING, description: "BT-130 (ex: C62, HUR)" },
            unit_price: { type: Type.NUMBER, description: "BT-146: Prix net" },
            gross_price: { type: Type.NUMBER, description: "BT-148: Prix brut" },
            tax_rate: { type: Type.NUMBER, description: "BT-152: Taux TVA ligne" },
            line_vat_category: { type: Type.STRING, description: "BT-151: S, AE, E, Z" },
            amount: { type: Type.NUMBER, description: "BT-131: Total ligne HT" },
            origin_country: { type: Type.STRING, description: "BT-159: Pays d'origine" }
          }
        }
      }
    },
    required: ["supplier_name", "invoice_number", "amount_incl_vat", "vat_breakdowns"],
  };

  const systemInstruction = `Extract invoice data as valid JSON according to the schema. 
- Omit null or empty fields to save tokens.
- Ensure total precision for SIRET (14 digits) and VAT IDs (FR+11).
- Strictly no trailing commas in arrays or objects.
- Response must be pure JSON only.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [{
        parts: [
          { inlineData: { mimeType, data: base64Data } },
          { text: "Extract data based on the provided schema for EN16931 compliance." }
        ]
      }],
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: schema,
        temperature: 0,
        thinkingConfig: { thinkingBudget: 0 } // Vitesse maximale pour extraction structurée
      },
    });

    const raw = JSON.parse(response.text || "{}");
    const usage = response.usageMetadata || { totalTokenCount: 0 };

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
      originCountry: it.origin_country || ""
    }));

    const vats: VatBreakdown[] = (raw.vat_breakdowns || []).map((v: any) => ({
      vatCategory: v.vat_category || "S",
      vatRate: parseNum(v.vat_rate),
      vatTaxableAmount: parseNum(v.vat_taxable_amount),
      vatAmount: parseNum(v.vat_amount)
    }));

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
      businessProcessId: raw.specification_id || "urn:cen.eu:en16931:2017#compliant#urn:factur-x.eu:1p0:comfort",
      invoiceType: raw.invoice_type === 'CREDIT_NOTE' ? InvoiceType.CREDIT_NOTE : InvoiceType.INVOICE,
      invoiceNumber: raw.invoice_number || "INCONNU",
      invoiceDate: parseInvoiceDate(raw.invoice_date),
      dueDate: parseInvoiceDate(raw.due_date),
      taxPointDate: parseInvoiceDate(raw.tax_point_date),
      currency: raw.currency || "EUR",
      poNumber: raw.po_number || "",
      buyerReference: raw.buyer_reference || "",
      contractNumber: raw.contract_number || "",
      deliveryNoteNumber: raw.delivery_note_number || "",
      invoiceNote: raw.invoice_note || "",

      billingPeriod: raw.billing_period ? {
        startDate: parseInvoiceDate(raw.billing_period.start_date),
        endDate: parseInvoiceDate(raw.billing_period.end_date)
      } : undefined,

      logistics: raw.logistics ? {
        deliverToName: raw.logistics.deliver_to_name || "",
        deliveryDate: parseInvoiceDate(raw.logistics.delivery_date),
        deliverToAddress: raw.logistics.deliver_to_address || ""
      } : undefined,

      supplier: raw.supplier_name || "",
      supplierAddress: raw.supplier_address || "",
      supplierVat: raw.supplier_vat?.replace(/\s/g, "").toUpperCase() || "",
      supplierSiret: raw.supplier_siret?.replace(/\s/g, "") || "",
      
      buyerName: raw.buyer_name || "",
      buyerAddress: raw.buyer_address || "",
      buyerVat: raw.buyer_vat?.replace(/\s/g, "").toUpperCase() || "",
      buyerSiret: raw.buyer_siret?.replace(/\s/g, "") || "",
      
      iban: raw.iban?.replace(/\s/g, "").toUpperCase() || "",
      bic: raw.bic?.replace(/\s/g, "").toUpperCase() || "",
      paymentMeansCode: raw.payment_means_code || "",
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
