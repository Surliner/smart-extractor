
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

  const schema = {
    type: Type.OBJECT,
    properties: {
      specification_id: { type: Type.STRING, description: "BT-24: Identifiant de spécification Factur-X (ex: urn:cen.eu:en16931:2017#compliant#urn:factur-x.eu:1p0:comfort)" },
      invoice_type: { type: Type.STRING, enum: ["INVOICE", "CREDIT_NOTE"], description: "BT-3: Type de document (INVOICE pour facture 380, CREDIT_NOTE pour avoir 381)" },
      invoice_number: { type: Type.STRING, description: "BT-1: Numéro de facture unique" },
      invoice_date: { type: Type.STRING, description: "BT-2: Date d'émission au format YYYY-MM-DD" },
      due_date: { type: Type.STRING, description: "BT-9: Date d'échéance du paiement (YYYY-MM-DD)" },
      tax_point_date: { type: Type.STRING, description: "BT-7: Date de livraison ou de prestation de services (YYYY-MM-DD)" },
      currency: { type: Type.STRING, description: "BT-5: Code devise ISO 4217 (ex: EUR)" },
      po_number: { type: Type.STRING, description: "BT-13: Numéro de commande d'achat" },
      buyer_reference: { type: Type.STRING, description: "BT-10: Référence interne fournie par l'acheteur (ex: MP-71-25)" },
      invoice_note: { type: Type.STRING, description: "BT-22: Note ou commentaire libre en en-tête de facture" },
      
      logistics: {
        type: Type.OBJECT,
        properties: {
          deliver_to_name: { type: Type.STRING, description: "BT-70: Nom du destinataire de la livraison" },
          delivery_date: { type: Type.STRING, description: "BT-72: Date effective de livraison" },
          deliver_to_address: { type: Type.STRING, description: "BG-15: Adresse complète du lieu de livraison" }
        }
      },

      billing_period: {
        type: Type.OBJECT,
        properties: {
          start_date: { type: Type.STRING, description: "BT-73: Date de début de la période de facturation" },
          end_date: { type: Type.STRING, description: "BT-74: Date de fin de la période de facturation" }
        }
      },

      supplier_name: { type: Type.STRING, description: "BT-27: Raison sociale du vendeur" },
      supplier_vat: { type: Type.STRING, description: "BT-31: Numéro de TVA intracommunautaire du vendeur (ex: FR...)" },
      supplier_siret: { type: Type.STRING, description: "BT-29: SIRET du vendeur (14 chiffres)" },
      supplier_address: { type: Type.STRING, description: "BG-5: Adresse complète du siège social du vendeur" },
      
      buyer_name: { type: Type.STRING, description: "BT-44: Raison sociale de l'acheteur" },
      buyer_vat: { type: Type.STRING, description: "BT-48: Numéro de TVA intracommunautaire de l'acheteur" },
      buyer_siret: { type: Type.STRING, description: "BT-47: SIRET de l'acheteur" },
      buyer_address: { type: Type.STRING, description: "BG-8: Adresse de facturation de l'acheteur" },
      
      payment_means_code: { type: Type.STRING, description: "BT-81: Code du mode de paiement (30=Virement, 48=Carte, 59=Prélèvement)" },
      payment_terms_text: { type: Type.STRING, description: "BT-20: Conditions de paiement textuelles" },
      iban: { type: Type.STRING, description: "BT-84: Identifiant IBAN du compte de paiement du vendeur" },
      bic: { type: Type.STRING, description: "BT-85: Code BIC/SWIFT de la banque du vendeur" },
      
      amount_excl_vat: { type: Type.NUMBER, description: "BT-109: Montant total HT (Net)" },
      global_discount: { type: Type.NUMBER, description: "BT-107: Somme des remises au niveau en-tête" },
      global_charge: { type: Type.NUMBER, description: "BT-108: Somme des frais au niveau en-tête" },
      total_vat_amount: { type: Type.NUMBER, description: "BT-110: Montant total de la TVA" },
      amount_incl_vat: { type: Type.NUMBER, description: "BT-112: Montant total TTC" },
      prepaid_amount: { type: Type.NUMBER, description: "BT-113: Somme des acomptes déjà réglés" },
      amount_due: { type: Type.NUMBER, description: "BT-115: Net à payer" },
      
      vat_breakdowns: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            vat_category: { type: Type.STRING, description: "BT-118: Code catégorie TVA (S=Standard, AE=Autoliquidation, E=Exonéré, Z=Export)" },
            vat_rate: { type: Type.NUMBER, description: "BT-119: Taux de TVA applicable en pourcentage" },
            vat_taxable_amount: { type: Type.NUMBER, description: "BT-116: Base imposable HT pour ce taux" },
            vat_amount: { type: Type.NUMBER, description: "BT-117: Montant de TVA pour ce taux" }
          },
          required: ["vat_category", "vat_rate", "vat_taxable_amount", "vat_amount"]
        },
        description: "BG-23: Ventilation de la TVA par taux"
      },
      line_items: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            article_id: { type: Type.STRING, description: "BT-128: Référence article vendeur" },
            description: { type: Type.STRING, description: "BT-129: Libellé ou désignation du produit/service" },
            quantity: { type: Type.NUMBER, description: "BT-131: Quantité facturée" },
            unit_of_measure: { type: Type.STRING, description: "BT-130: Code unité (C62 pour pièce, HUR pour heure, DAY pour jour)" },
            unit_price: { type: Type.NUMBER, description: "BT-146: Prix unitaire net" },
            gross_price: { type: Type.NUMBER, description: "BT-148: Prix unitaire brut avant remise" },
            tax_rate: { type: Type.NUMBER, description: "BT-152: Taux TVA de la ligne" },
            line_vat_category: { type: Type.STRING, description: "BT-151: Catégorie TVA ligne (S, AE, E, Z)" },
            amount: { type: Type.NUMBER, description: "BT-131: Montant total HT de la ligne" },
            origin_country: { type: Type.STRING, description: "BT-159: Code pays d'origine de l'article" }
          }
        },
        description: "BG-25: Détail des lignes de facturation"
      }
    },
    required: ["supplier_name", "invoice_number", "amount_incl_vat", "vat_breakdowns"],
  };

  const systemInstruction = `Extract data from the invoice following the EN16931 semantic standard.
- Use the provided descriptions to map document values to the schema.
- SIRET must be exactly 14 digits. VAT IDs must be formatted (e.g., FR + 11 digits).
- If a field is missing, omit it from the JSON.
- Response MUST be valid pure JSON only.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [{
        parts: [
          { inlineData: { mimeType, data: base64Data } },
          { text: "Extract invoice data precisely based on the Factur-X/EN16931 schema." }
        ]
      }],
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: schema,
        temperature: 0,
        thinkingConfig: { thinkingBudget: 0 } // On garde le budget à 0 pour la vitesse, les descriptions guident l'extraction.
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
