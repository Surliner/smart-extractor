
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
      specification_id: { type: Type.STRING }, // BT-24
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
      
      logistics: {
        type: Type.OBJECT,
        properties: {
          deliver_to_name: { type: Type.STRING },
          delivery_date: { type: Type.STRING },
          deliver_to_address: { type: Type.STRING }
        }
      },

      billing_period: {
        type: Type.OBJECT,
        properties: {
          start_date: { type: Type.STRING },
          end_date: { type: Type.STRING }
        }
      },

      supplier_name: { type: Type.STRING },
      supplier_vat: { type: Type.STRING },
      supplier_siret: { type: Type.STRING },
      supplier_address: { type: Type.STRING },
      buyer_name: { type: Type.STRING },
      buyer_vat: { type: Type.STRING },
      buyer_siret: { type: Type.STRING },
      buyer_address: { type: Type.STRING },
      
      payment_means_code: { type: Type.STRING },
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
            amount: { type: Type.NUMBER },
            origin_country: { type: Type.STRING }
          }
        }
      }
    },
    required: ["supplier_name", "invoice_number", "amount_incl_vat", "vat_breakdowns"],
  };

  const systemInstruction = `EXTRACTEUR RFE EN16931 (FACTUR-X COMFORT).
Extraire TOUTES les données sémantiques BT-xxx avec une précision comptable absolue.

IDENTIFICATION FISCALE (OBLIGATOIRE) :
1. VENDEUR (Seller) : Localise le SIRET (BT-29, 14 chiffres) et la TVA Intra (BT-31, format FR+11 chiffres). Regarde dans l'en-tête ou le pied de page.
2. ACHETEUR (Buyer) : Localise le SIRET (BT-47) et la TVA Intra (BT-48) du destinataire dans le bloc "Facturé à".
3. RÈGLE : Ne jamais confondre les identifiants de l'émetteur et du récepteur.

COORDONNÉES BANCAIRES (PRIORITÉ HAUTE) :
- IBAN (BT-84) : Extraire impérativement l'IBAN du vendeur (format FR76...).
- BIC (BT-85) : Extraire le code SWIFT/BIC associé.

PRÉCISIONS COMMERCIALES & LOGISTIQUES :
- LOGISTIQUE : Nom (BT-70) et adresse (BG-15) du lieu de livraison effectif.
- PÉRIODE : Dates de début (BT-73) et de fin (BT-74) de facturation.
- LIGNES : Prix unitaire Brut (BT-148), pays d'origine de l'article (BT-159).
- PAIEMENT : Mode de règlement BT-81 (30=Virement, 48=Carte, 59=Prélèvement).

REPONDRE EXCLUSIVEMENT EN JSON SANS COMMENTAIRE.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [{
        parts: [
          { inlineData: { mimeType, data: base64Data } },
          { text: "Analyser le document et extraire les données Factur-X conformes au standard EN16931." }
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
