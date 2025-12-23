
import { InvoiceData, InvoiceItem, InvoiceType, FacturXProfile } from '../types';

const PROFILE_URIS = {
  [FacturXProfile.MINIMUM]: 'urn:factur-x.eu:1p0:minimum',
  [FacturXProfile.BASIC]: 'urn:factur-x.eu:1p0:basic',
  [FacturXProfile.COMFORT]: 'urn:cen.eu:en16931:2017#compliant#urn:factur-x.eu:1p0:comfort'
};

const formatToUDT = (dateStr: string): string => {
  if (!dateStr) return '';
  const parts = dateStr.split('/');
  if (parts.length === 3) return `${parts[2]}${parts[1]}${parts[0]}`;
  const date = new Date(dateStr);
  if (!isNaN(date.getTime())) {
    const y = date.getFullYear();
    const m = (date.getMonth() + 1).toString().padStart(2, '0');
    const d = date.getDate().toString().padStart(2, '0');
    return `${y}${m}${d}`;
  }
  return '';
};

const esc = (str: string | undefined | null): string => {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
};

const mapUnitToCode = (unit: string | undefined): string => {
  if (!unit) return 'C62';
  const u = unit.toUpperCase().trim();
  if (['C62', 'HUR', 'LTR', 'KGM', 'MTQ', 'MTR', 'MTK', 'ANN', 'MON', 'E48', 'DAY'].includes(u)) return u;
  if (u.includes('PIECE') || u.includes('UNITE') || u.includes('PCE') || u === 'PC') return 'C62';
  if (u.includes('HEURE') || u === 'H') return 'HUR';
  if (u.includes('LITRE') || u === 'L') return 'LTR';
  if (u.includes('KILO') || u === 'KG') return 'KGM';
  if (u.includes('JOUR') || u === 'DAY') return 'DAY';
  if (u.includes('FORFAIT') || u.includes('PRESTATION') || u.includes('SERVICE')) return 'E48';
  if (u.includes('MOIS')) return 'MON';
  return 'C62';
};

const getTaxBreakdown = (invoice: InvoiceData) => {
  const breakdown: Record<number, { basis: number; amount: number; category: string }> = {};
  (invoice.items || []).forEach(item => {
    const rate = item.taxRate || 20;
    const amount = item.amount || 0; 
    let category = rate === 0 ? 'Z' : 'S';
    if (!breakdown[rate]) breakdown[rate] = { basis: 0, amount: 0, category };
    breakdown[rate].basis += amount;
  });
  const stdRate = Object.keys(breakdown).length > 0 ? parseFloat(Object.keys(breakdown)[0]) : 20;
  if (!breakdown[stdRate]) breakdown[stdRate] = { basis: 0, amount: 0, category: 'S' };
  breakdown[stdRate].basis += ((invoice.globalCharge || 0) - (invoice.globalDiscount || 0));
  return Object.entries(breakdown).map(([rate, vals]) => ({
    rate: parseFloat(rate), 
    basis: vals.basis, 
    amount: (vals.basis * parseFloat(rate) / 100), 
    category: vals.category
  }));
};

export const generateFacturXXML = (invoice: InvoiceData): string => {
  const profile = invoice.facturXProfile || FacturXProfile.COMFORT;
  const isMinimum = profile === FacturXProfile.MINIMUM;
  const typeCode = invoice.invoiceType === InvoiceType.CREDIT_NOTE ? '381' : '380';
  const taxBreakdown = getTaxBreakdown(invoice);
  const issueDateUDT = formatToUDT(invoice.invoiceDate);
  const dueDateUDT = formatToUDT(invoice.dueDate || '');
  const guidelineID = PROFILE_URIS[profile];

  const lineTotalHT = (invoice.items || []).reduce((sum, item) => sum + (item.amount || 0), 0);
  const taxBasisTotal = lineTotalHT + (invoice.globalCharge || 0) - (invoice.globalDiscount || 0);
  const taxTotal = taxBreakdown.reduce((sum, t) => sum + t.amount, 0);
  const grandTotal = taxBasisTotal + taxTotal;

  return `<?xml version="1.0" encoding="UTF-8"?>
<rsm:CrossIndustryInvoice xmlns:rsm="urn:un:unece:uncefact:data:standard:CrossIndustryInvoice:100" 
xmlns:ram="urn:un:unece:uncefact:data:standard:ReusableAggregateBusinessInformationEntity:100" 
xmlns:udt="urn:un:unece:uncefact:data:standard:UnqualifiedDataType:100">
  <rsm:ExchangedDocumentContext>
    <ram:GuidelineSpecifiedDocumentContextParameter>
      <ram:ID>${guidelineID}</ram:ID>
    </ram:GuidelineSpecifiedDocumentContextParameter>
  </rsm:ExchangedDocumentContext>
  <rsm:ExchangedDocument>
    <ram:ID>${esc(invoice.invoiceNumber)}</ram:ID>
    <ram:TypeCode>${typeCode}</ram:TypeCode>
    <ram:IssueDateTime><udt:DateTimeString format="102">${issueDateUDT}</udt:DateTimeString></ram:IssueDateTime>
  </rsm:ExchangedDocument>
  <rsm:SupplyChainTradeTransaction>
    ${!isMinimum ? (invoice.items || []).map((item, index) => `
    <ram:IncludedSupplyChainTradeLineItem>
      <ram:AssociatedDocumentLineDocument><ram:LineID>${index + 1}</ram:LineID></ram:AssociatedDocumentLineDocument>
      <ram:SpecifiedTradeProduct>
        <ram:SellerAssignedID>${esc(item.articleId)}</ram:SellerAssignedID>
        <ram:Name>${esc(item.description)}</ram:Name>
      </ram:SpecifiedTradeProduct>
      <ram:SpecifiedLineTradeAgreement>
        <ram:NetPriceProductTradePrice>
          <ram:ChargeAmount>${(item.unitPrice || 0).toFixed(4)}</ram:ChargeAmount>
        </ram:NetPriceProductTradePrice>
        ${item.discount ? `
        <ram:AppliedTradeAllowanceCharge>
          <ram:ChargeIndicator>false</ram:ChargeIndicator>
          <ram:ActualAmount>${item.discount.toFixed(4)}</ram:ActualAmount>
          <ram:Reason>Remise sur ligne</ram:Reason>
        </ram:AppliedTradeAllowanceCharge>` : ''}
      </ram:SpecifiedLineTradeAgreement>
      <ram:SpecifiedLineTradeDelivery><ram:BilledQuantity unitCode="${mapUnitToCode(item.unitOfMeasure)}">${item.quantity || 0}</ram:BilledQuantity></ram:SpecifiedLineTradeDelivery>
      <ram:SpecifiedLineTradeSettlement>
        <ram:ApplicableTradeTax>
          <ram:TypeCode>VAT</ram:TypeCode>
          <ram:CategoryCode>${item.taxRate === 0 ? 'Z' : 'S'}</ram:CategoryCode>
          <ram:RateApplicablePercent>${(item.taxRate || 20.0).toFixed(2)}</ram:RateApplicablePercent>
        </ram:ApplicableTradeTax>
        <ram:SpecifiedTradeSettlementLineMonetarySummation><ram:LineTotalAmount>${(item.amount || 0).toFixed(2)}</ram:LineTotalAmount></ram:SpecifiedTradeSettlementLineMonetarySummation>
      </ram:SpecifiedLineTradeSettlement>
    </ram:IncludedSupplyChainTradeLineItem>`).join('') : ''}
    <ram:ApplicableHeaderTradeAgreement>
      <ram:SellerTradeParty>
        <ram:Name>${esc(invoice.supplier)}</ram:Name>
        <ram:SpecifiedLegalOrganization><ram:ID schemeID="0002">${esc(invoice.supplierSiret)}</ram:ID></ram:SpecifiedLegalOrganization>
        <ram:PostalTradeAddress><ram:CountryID>FR</ram:CountryID></ram:PostalTradeAddress>
        <ram:SpecifiedTaxRegistration><ram:ID schemeID="VA">${esc(invoice.supplierVat)}</ram:ID></ram:SpecifiedTaxRegistration>
      </ram:SellerTradeParty>
      <ram:BuyerTradeParty>
        <ram:Name>${esc(invoice.buyerName)}</ram:Name>
        <ram:PostalTradeAddress><ram:CountryID>FR</ram:CountryID></ram:PostalTradeAddress>
      </ram:BuyerTradeParty>
    </ram:ApplicableHeaderTradeAgreement>
    <ram:ApplicableHeaderTradeDelivery />
    <ram:ApplicableHeaderTradeSettlement>
      <ram:InvoiceCurrencyCode>${esc(invoice.currency) || 'EUR'}</ram:InvoiceCurrencyCode>
      <ram:SpecifiedTradeSettlementPaymentMeans>
        <ram:TypeCode>${invoice.paymentMeansCode || '58'}</ram:TypeCode>
      </ram:SpecifiedTradeSettlementPaymentMeans>
      ${taxBreakdown.map(tax => `
      <ram:ApplicableTradeTax>
        <ram:CalculatedAmount>${tax.amount.toFixed(2)}</ram:CalculatedAmount>
        <ram:TypeCode>VAT</ram:TypeCode>
        <ram:BasisAmount>${tax.basis.toFixed(2)}</ram:BasisAmount>
        <ram:CategoryCode>${tax.category}</ram:CategoryCode>
        <ram:RateApplicablePercent>${tax.rate.toFixed(2)}</ram:RateApplicablePercent>
      </ram:ApplicableTradeTax>`).join('')}
      <ram:SpecifiedTradePaymentTerms>
        ${dueDateUDT ? `<ram:DueDateDateTime><udt:DateTimeString format="102">${dueDateUDT}</udt:DateTimeString></ram:DueDateDateTime>` : ''}
      </ram:SpecifiedTradePaymentTerms>
      <ram:SpecifiedTradeSettlementHeaderMonetarySummation>
        <ram:LineTotalAmount>${lineTotalHT.toFixed(2)}</ram:LineTotalAmount>
        <ram:ChargeTotalAmount>${(invoice.globalCharge || 0).toFixed(2)}</ram:ChargeTotalAmount>
        <ram:AllowanceTotalAmount>${(invoice.globalDiscount || 0).toFixed(2)}</ram:AllowanceTotalAmount>
        <ram:TaxBasisTotalAmount>${taxBasisTotal.toFixed(2)}</ram:TaxBasisTotalAmount>
        <ram:TaxTotalAmount currencyID="${esc(invoice.currency) || 'EUR'}">${taxTotal.toFixed(2)}</ram:TaxTotalAmount>
        <ram:GrandTotalAmount>${grandTotal.toFixed(2)}</ram:GrandTotalAmount>
        <ram:DuePayableAmount>${grandTotal.toFixed(2)}</ram:DuePayableAmount>
      </ram:SpecifiedTradeSettlementHeaderMonetarySummation>
    </ram:ApplicableHeaderTradeSettlement>
  </rsm:SupplyChainTradeTransaction>
</rsm:CrossIndustryInvoice>`;
};
