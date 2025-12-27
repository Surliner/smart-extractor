
import { InvoiceData, InvoiceItem, InvoiceType, FacturXProfile, VatBreakdown } from '../types';

const PROFILE_URIS = {
  [FacturXProfile.MINIMUM]: 'urn:factur-x.eu:1p0:minimum',
  [FacturXProfile.BASIC]: 'urn:cen.eu:en16931:2017#compliant#urn:factur-x.eu:1p0:basic',
  [FacturXProfile.COMFORT]: 'urn:cen.eu:en16931:2017#compliant#urn:factur-x.eu:1p0:comfort'
};

const formatToUDT = (dateStr: string | undefined): string => {
  if (!dateStr) return '';
  const clean = dateStr.trim();
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(clean)) {
    const [d, m, y] = clean.split('/');
    return `${y}${m}${d}`;
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) return clean.replace(/-/g, '');
  const date = new Date(dateStr);
  if (!isNaN(date.getTime())) {
    const y = date.getFullYear();
    const m = (date.getMonth() + 1).toString().padStart(2, '0');
    const d = date.getDate().toString().padStart(2, '0');
    return `${y}${m}${d}`;
  }
  return clean.replace(/[^0-9]/g, '').substring(0, 8);
};

const esc = (str: string | undefined | null): string => {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
};

const cleanID = (str: string | undefined | null): string => str ? str.replace(/\s/g, '') : '';

const parseAddress = (addressStr: string | undefined) => {
  if (!addressStr) return { line: '', postcode: '', city: '' };
  const postcodeMatch = addressStr.match(/(\d{5})/);
  if (postcodeMatch) {
    const postcode = postcodeMatch[1];
    const index = postcodeMatch.index!;
    const line = addressStr.substring(0, index).trim().replace(/,$/, '');
    const city = addressStr.substring(index + 5).trim().replace(/^,/, '').trim();
    return { line: line || addressStr, postcode: postcode, city: city.toUpperCase() || 'INCONNU' };
  }
  return { line: addressStr, postcode: '', city: '' };
};

export const generateFacturXXML = (invoice: InvoiceData, includeHeader: boolean = true): string => {
  const profile = invoice.facturXProfile || FacturXProfile.COMFORT;
  const typeCode = invoice.invoiceType === InvoiceType.CREDIT_NOTE ? '381' : 
                   invoice.invoiceType === InvoiceType.CORRECTIVE ? '384' :
                   invoice.invoiceType === InvoiceType.SELF_INVOICE ? '389' : '380';
  
  const issueDateUDT = formatToUDT(invoice.invoiceDate);
  const dueDateUDT = formatToUDT(invoice.dueDate);
  const deliveryDateUDT = formatToUDT(invoice.deliveryDate);
  const guidelineID = PROFILE_URIS[profile];

  const sellerAddr = parseAddress(invoice.supplierAddress);
  const buyerAddr = parseAddress(invoice.buyerAddress);

  const lineTotalHT = (invoice.items || []).reduce((sum, item) => sum + (item.amount || 0), 0);
  const charge = invoice.globalCharge || 0;
  const discount = invoice.globalDiscount || 0;
  const taxBasisTotal = lineTotalHT + charge - discount;
  const taxTotal = (invoice.totalVat || 0);
  const grandTotal = taxBasisTotal + taxTotal;
  const duePayable = (invoice.amountDueForPayment || grandTotal);

  let taxSegments = (invoice.vatBreakdowns || []).map(v => `
      <ram:ApplicableTradeTax>
        <ram:CalculatedAmount>${(v.vatAmount || 0).toFixed(2)}</ram:CalculatedAmount>
        <ram:TypeCode>VAT</ram:TypeCode>
        ${v.exemptionReason ? `<ram:ExemptionReason>${esc(v.exemptionReason)}</ram:ExemptionReason>` : ''}
        <ram:BasisAmount>${(v.vatTaxableAmount || 0).toFixed(2)}</ram:BasisAmount>
        <ram:CategoryCode>${esc(v.vatCategory || 'S')}</ram:CategoryCode>
        <ram:RateApplicablePercent>${(v.vatRate || 0).toFixed(2)}</ram:RateApplicablePercent>
      </ram:ApplicableTradeTax>`).join('');

  const xmlBody = `<rsm:CrossIndustryInvoice 
  xmlns:udt="urn:un:unece:uncefact:data:standard:UnqualifiedDataType:100" 
  xmlns:ram="urn:un:unece:uncefact:data:standard:ReusableAggregateBusinessInformationEntity:100" 
  xmlns:rsm="urn:un:unece:uncefact:data:standard:CrossIndustryInvoice:100"
  xmlns:qdt="urn:un:unece:uncefact:data:standard:QualifiedDataType:100">
  <rsm:ExchangedDocumentContext>
    <ram:GuidelineSpecifiedDocumentContextParameter>
      <ram:ID>${guidelineID}</ram:ID>
    </ram:GuidelineSpecifiedDocumentContextParameter>
  </rsm:ExchangedDocumentContext>
  <rsm:ExchangedDocument>
    <ram:ID>${esc(invoice.invoiceNumber)}</ram:ID>
    <ram:TypeCode>${typeCode}</ram:TypeCode>
    <ram:IssueDateTime><udt:DateTimeString format="102">${issueDateUDT}</udt:DateTimeString></ram:IssueDateTime>
    ${invoice.invoiceNote ? `<ram:IncludedNote><ram:Content>${esc(invoice.invoiceNote)}</ram:Content></ram:IncludedNote>` : ''}
  </rsm:ExchangedDocument>
  <rsm:SupplyChainTradeTransaction>
    ${(invoice.items || []).map((item, index) => `
    <ram:IncludedSupplyChainTradeLineItem>
      <ram:AssociatedDocumentLineDocument><ram:LineID>${index + 1}</ram:LineID></ram:AssociatedDocumentLineDocument>
      <ram:SpecifiedTradeProduct>
        <ram:Name>${esc(item.description)}</ram:Name>
        ${item.articleId ? `<ram:SellerAssignedID>${esc(item.articleId)}</ram:SellerAssignedID>` : ''}
      </ram:SpecifiedTradeProduct>
      <ram:SpecifiedLineTradeAgreement>
        <ram:NetPriceProductTradePrice><ram:ChargeAmount>${(item.unitPrice || 0).toFixed(4)}</ram:ChargeAmount></ram:NetPriceProductTradePrice>
      </ram:SpecifiedLineTradeAgreement>
      <ram:SpecifiedLineTradeDelivery>
        <ram:BilledQuantity unitCode="${item.unitOfMeasure || 'C62'}">${(item.quantity || 0).toFixed(4)}</ram:BilledQuantity>
      </ram:SpecifiedLineTradeDelivery>
      <ram:SpecifiedLineTradeSettlement>
        <ram:ApplicableTradeTax>
          <ram:TypeCode>VAT</ram:TypeCode>
          <ram:CategoryCode>${item.lineVatCategory || 'S'}</ram:CategoryCode>
          <ram:RateApplicablePercent>${(item.taxRate || 20.0).toFixed(2)}</ram:RateApplicablePercent>
        </ram:ApplicableTradeTax>
        <ram:SpecifiedTradeSettlementLineMonetarySummation><ram:LineTotalAmount>${(item.amount || 0).toFixed(2)}</ram:LineTotalAmount></ram:SpecifiedTradeSettlementLineMonetarySummation>
      </ram:SpecifiedLineTradeSettlement>
    </ram:IncludedSupplyChainTradeLineItem>`).join('')}
    <ram:ApplicableHeaderTradeAgreement>
      ${invoice.buyerReference ? `<ram:BuyerReference>${esc(invoice.buyerReference)}</ram:BuyerReference>` : ''}
      <ram:SellerTradeParty>
        <ram:Name>${esc(invoice.supplier)}</ram:Name>
        <ram:SpecifiedLegalOrganization><ram:ID schemeID="0002">${cleanID(invoice.supplierSiret)}</ram:ID></ram:SpecifiedLegalOrganization>
        <ram:PostalTradeAddress>
          <ram:LineOne>${esc(sellerAddr.line)}</ram:LineOne>
          <ram:PostcodeCode>${esc(sellerAddr.postcode)}</ram:PostcodeCode>
          <ram:CityName>${esc(sellerAddr.city)}</ram:CityName>
          <ram:CountryID>FR</ram:CountryID>
        </ram:PostalTradeAddress>
        <ram:SpecifiedTaxRegistration><ram:ID schemeID="VA">${cleanID(invoice.supplierVat)}</ram:ID></ram:SpecifiedTaxRegistration>
      </ram:SellerTradeParty>
      <ram:BuyerTradeParty>
        <ram:Name>${esc(invoice.buyerName)}</ram:Name>
        <ram:SpecifiedLegalOrganization><ram:ID schemeID="0002">${cleanID(invoice.buyerSiret)}</ram:ID></ram:SpecifiedLegalOrganization>
        <ram:PostalTradeAddress>
          <ram:LineOne>${esc(buyerAddr.line)}</ram:LineOne>
          <ram:PostcodeCode>${esc(buyerAddr.postcode)}</ram:PostcodeCode>
          <ram:CityName>${esc(buyerAddr.city)}</ram:CityName>
          <ram:CountryID>FR</ram:CountryID>
        </ram:PostalTradeAddress>
      </ram:BuyerTradeParty>
      ${invoice.poNumber ? `<ram:BuyerOrderReferencedDocument><ram:IssuerAssignedID>${esc(invoice.poNumber)}</ram:IssuerAssignedID></ram:BuyerOrderReferencedDocument>` : ''}
      ${invoice.salesOrderReference ? `<ram:SellerOrderReferencedDocument><ram:IssuerAssignedID>${esc(invoice.salesOrderReference)}</ram:IssuerAssignedID></ram:SellerOrderReferencedDocument>` : ''}
      ${invoice.contractNumber ? `<ram:ContractReferencedDocument><ram:IssuerAssignedID>${esc(invoice.contractNumber)}</ram:IssuerAssignedID></ram:ContractReferencedDocument>` : ''}
      ${invoice.projectReference ? `<ram:SpecifiedProcurementProject><ram:ID>${esc(invoice.projectReference)}</ram:ID></ram:SpecifiedProcurementProject>` : ''}
    </ram:ApplicableHeaderTradeAgreement>
    <ram:ApplicableHeaderTradeDelivery>
       ${invoice.deliveryNoteNumber ? `<ram:DespatchAdviceReferencedDocument><ram:IssuerAssignedID>${esc(invoice.deliveryNoteNumber)}</ram:IssuerAssignedID></ram:DespatchAdviceReferencedDocument>` : ''}
       ${deliveryDateUDT ? `<ram:ActualDeliverySupplyChainEvent><ram:OccurrenceDateTime><udt:DateTimeString format="102">${deliveryDateUDT}</udt:DateTimeString></ram:OccurrenceDateTime></ram:ActualDeliverySupplyChainEvent>` : ''}
    </ram:ApplicableHeaderTradeDelivery>
    <ram:ApplicableHeaderTradeSettlement>
      <ram:InvoiceCurrencyCode>${esc(invoice.currency) || 'EUR'}</ram:InvoiceCurrencyCode>
      <ram:SpecifiedTradeSettlementPaymentMeans>
        <ram:TypeCode>${esc(invoice.paymentMeansCode) || '30'}</ram:TypeCode>
        ${invoice.paymentReference ? `<ram:Information>${esc(invoice.paymentReference)}</ram:Information>` : ''}
        <ram:PayeePartyCreditorFinancialAccount><ram:IBANID>${cleanID(invoice.iban)}</ram:IBANID></ram:PayeePartyCreditorFinancialAccount>
      </ram:SpecifiedTradeSettlementPaymentMeans>
      ${invoice.buyerIban ? `<ram:PayerPartyDebtorFinancialAccount><ram:IBANID>${cleanID(invoice.buyerIban)}</ram:IBANID></ram:PayerPartyDebtorFinancialAccount>` : ''}
      ${taxSegments}
      <ram:SpecifiedTradeSettlementHeaderMonetarySummation>
        <ram:LineTotalAmount>${lineTotalHT.toFixed(2)}</ram:LineTotalAmount>
        <ram:ChargeTotalAmount>${charge.toFixed(2)}</ram:ChargeTotalAmount>
        <ram:AllowanceTotalAmount>${discount.toFixed(2)}</ram:AllowanceTotalAmount>
        <ram:TaxBasisTotalAmount>${taxBasisTotal.toFixed(2)}</ram:TaxBasisTotalAmount>
        <ram:TaxTotalAmount currencyID="${esc(invoice.currency) || 'EUR'}">${taxTotal.toFixed(2)}</ram:TaxTotalAmount>
        <ram:GrandTotalAmount>${grandTotal.toFixed(2)}</ram:GrandTotalAmount>
        <ram:DuePayableAmount>${duePayable.toFixed(2)}</ram:DuePayableAmount>
      </ram:SpecifiedTradeSettlementHeaderMonetarySummation>
      ${dueDateUDT ? `<ram:SpecifiedTradePaymentTerms><ram:DueDateTime><udt:DateTimeString format="102">${dueDateUDT}</udt:DateTimeString></ram:DueDateTime></ram:SpecifiedTradePaymentTerms>` : ''}
    </ram:ApplicableHeaderTradeSettlement>
  </rsm:SupplyChainTradeTransaction>
</rsm:CrossIndustryInvoice>`;

  return includeHeader ? `<?xml version="1.0" encoding="UTF-8"?>\n${xmlBody}` : xmlBody;
};
