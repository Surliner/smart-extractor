
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
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
};

const cleanID = (str: string | undefined | null): string => str ? str.replace(/\s/g, '') : '';

const parseAddress = (addressStr: string | undefined) => {
  if (!addressStr) return { line: '', postcode: '', city: '' };
  const matches = [...addressStr.matchAll(/(\d{5})/g)];
  if (matches.length > 0) {
    const lastMatch = matches[matches.length - 1];
    const postcode = lastMatch[1];
    const index = lastMatch.index!;
    const line = addressStr.substring(0, index).trim().replace(/,$/, '');
    const city = addressStr.substring(index + 5).trim().replace(/^,/, '').trim();
    return { line: line || addressStr, postcode, city: city.toUpperCase() || 'INCONNU' };
  }
  return { line: addressStr, postcode: '', city: '' };
};

export const generateFacturXXML = (invoice: InvoiceData, includeHeader: boolean = true): string => {
  const profile = invoice.facturXProfile || FacturXProfile.COMFORT;
  const typeCode = invoice.invoiceType === InvoiceType.CREDIT_NOTE ? '381' : '380';
  const issueDateUDT = formatToUDT(invoice.invoiceDate);
  const dueDateUDT = formatToUDT(invoice.dueDate);
  const taxPointDateUDT = formatToUDT(invoice.taxPointDate);
  const guidelineID = PROFILE_URIS[profile];

  const sellerAddr = parseAddress(invoice.supplierAddress);
  const buyerAddr = parseAddress(invoice.buyerAddress);
  const shipAddr = parseAddress(invoice.logistics?.deliverToAddress);

  const lineTotalHT = (invoice.items || []).reduce((sum, item) => sum + (item.amount || 0), 0);
  const charge = invoice.globalCharge || 0;
  const discount = invoice.globalDiscount || 0;
  const taxBasisTotal = parseFloat((lineTotalHT + charge - discount).toFixed(2));
  const taxTotal = (invoice.totalVat || 0);
  const grandTotal = parseFloat((taxBasisTotal + taxTotal).toFixed(2));

  // Gestion de la note header (BT-22)
  const freeItems = (invoice.items || []).filter(it => (it.unitPrice || 0) === 0);
  const autoNotes = freeItems.map(it => `Article ${it.description} offert`).join(' | ');
  const finalNote = invoice.invoiceNote ? `${invoice.invoiceNote}${autoNotes ? ' | ' + autoNotes : ''}` : autoNotes;

  let taxSegments = '';
  if (invoice.vatBreakdowns && invoice.vatBreakdowns.length > 0) {
    taxSegments = invoice.vatBreakdowns.map(v => `
      <ram:ApplicableTradeTax>
        <ram:CalculatedAmount>${(v.vatAmount || 0).toFixed(2)}</ram:CalculatedAmount>
        <ram:TypeCode>VAT</ram:TypeCode>
        ${v.exemptionReason ? `<ram:ExemptionReason>${esc(v.exemptionReason)}</ram:ExemptionReason>` : ''}
        <ram:BasisAmount>${(v.vatTaxableAmount || 0).toFixed(2)}</ram:BasisAmount>
        <ram:CategoryCode>${esc(v.vatCategory || 'S')}</ram:CategoryCode>
        <ram:RateApplicablePercent>${(v.vatRate || 0).toFixed(2)}</ram:RateApplicablePercent>
      </ram:ApplicableTradeTax>`).join('');
  }

  const xmlBody = `<rsm:CrossIndustryInvoice 
  xmlns:udt="urn:un:unece:uncefact:data:standard:UnqualifiedDataType:100" 
  xmlns:ram="urn:un:unece:uncefact:data:standard:ReusableAggregateBusinessInformationEntity:100" 
  xmlns:rsm="urn:un:unece:uncefact:data:standard:CrossIndustryInvoice:100"
  xmlns:qdt="urn:un:unece:uncefact:data:standard:QualifiedDataType:100">
  <rsm:ExchangedDocumentContext>
    <ram:GuidelineSpecifiedDocumentContextParameter>
      <ram:ID>${esc(invoice.businessProcessId || guidelineID)}</ram:ID>
    </ram:GuidelineSpecifiedDocumentContextParameter>
  </rsm:ExchangedDocumentContext>
  <rsm:ExchangedDocument>
    <ram:ID>${esc(invoice.invoiceNumber)}</ram:ID>
    <ram:TypeCode>${typeCode}</ram:TypeCode>
    <ram:IssueDateTime>
      <udt:DateTimeString format="102">${issueDateUDT}</udt:DateTimeString>
    </ram:IssueDateTime>
    ${finalNote ? `<ram:IncludedNote><ram:Content>${esc(finalNote)}</ram:Content></ram:IncludedNote>` : ''}
  </rsm:ExchangedDocument>
  <rsm:SupplyChainTradeTransaction>
    ${(invoice.items || []).map((item, index) => `
    <ram:IncludedSupplyChainTradeLineItem>
      <ram:AssociatedDocumentLineDocument><ram:LineID>${index + 1}</ram:LineID></ram:AssociatedDocumentLineDocument>
      <ram:SpecifiedTradeProduct>
        <ram:Name>${esc(item.description)}</ram:Name>
        ${item.articleId ? `<ram:SellerAssignedID>${esc(item.articleId)}</ram:SellerAssignedID>` : ''}
        ${item.originCountry ? `<ram:OriginTradeCountry><ram:ID>${esc(item.originCountry)}</ram:ID></ram:OriginTradeCountry>` : ''}
      </ram:SpecifiedTradeProduct>
      <ram:SpecifiedLineTradeAgreement>
        <ram:NetPriceProductTradePrice>
          <ram:ChargeAmount>${(item.unitPrice || 0).toFixed(2)}</ram:ChargeAmount>
        </ram:NetPriceProductTradePrice>
        ${item.grossPrice ? `
        <ram:GrossPriceProductTradePrice>
          <ram:ChargeAmount>${(item.grossPrice || 0).toFixed(2)}</ram:ChargeAmount>
        </ram:GrossPriceProductTradePrice>` : ''}
      </ram:SpecifiedLineTradeAgreement>
      <ram:SpecifiedLineTradeDelivery>
        <ram:BilledQuantity unitCode="${item.unitOfMeasure || 'C62'}">${(item.quantity || 0).toFixed(2)}</ram:BilledQuantity>
      </ram:SpecifiedLineTradeDelivery>
      <ram:SpecifiedLineTradeSettlement>
        <ram:ApplicableTradeTax>
          <ram:TypeCode>VAT</ram:TypeCode>
          <ram:CategoryCode>${item.lineVatCategory || 'S'}</ram:CategoryCode>
          <ram:RateApplicablePercent>${(item.taxRate || 20.0).toFixed(2)}</ram:RateApplicablePercent>
        </ram:ApplicableTradeTax>
        <ram:SpecifiedTradeSettlementLineMonetarySummation>
          <ram:LineTotalAmount>${(item.amount || 0).toFixed(2)}</ram:LineTotalAmount>
        </ram:SpecifiedTradeSettlementLineMonetarySummation>
      </ram:SpecifiedLineTradeSettlement>
    </ram:IncludedSupplyChainTradeLineItem>`).join('')}
    <ram:ApplicableHeaderTradeAgreement>
      ${invoice.buyerReference ? `<ram:BuyerReference>${esc(invoice.buyerReference)}</ram:BuyerReference>` : ''}
      <ram:SellerTradeParty>
        <ram:Name>${esc(invoice.supplier)}</ram:Name>
        <ram:SpecifiedLegalOrganization>
          <ram:ID schemeID="0002">${cleanID(invoice.supplierSiret)}</ram:ID>
        </ram:SpecifiedLegalOrganization>
        <ram:PostalTradeAddress>
          <ram:LineOne>${esc(sellerAddr.line)}</ram:LineOne>
          ${sellerAddr.postcode ? `<ram:PostcodeCode>${esc(sellerAddr.postcode)}</ram:PostcodeCode>` : ''}
          ${sellerAddr.city ? `<ram:CityName>${esc(sellerAddr.city)}</ram:CityName>` : ''}
          <ram:CountryID>FR</ram:CountryID>
        </ram:PostalTradeAddress>
        <ram:SpecifiedTaxRegistration>
          <ram:ID schemeID="VA">${cleanID(invoice.supplierVat)}</ram:ID>
        </ram:SpecifiedTaxRegistration>
      </ram:SellerTradeParty>
      <ram:BuyerTradeParty>
        <ram:Name>${esc(invoice.buyerName)}</ram:Name>
        <ram:SpecifiedLegalOrganization>
          <ram:ID schemeID="0002">${cleanID(invoice.buyerSiret)}</ram:ID>
        </ram:SpecifiedLegalOrganization>
        <ram:PostalTradeAddress>
          <ram:LineOne>${esc(buyerAddr.line)}</ram:LineOne>
          ${buyerAddr.postcode ? `<ram:PostcodeCode>${esc(buyerAddr.postcode)}</ram:PostcodeCode>` : ''}
          ${buyerAddr.city ? `<ram:CityName>${esc(buyerAddr.city)}</ram:CityName>` : ''}
          <ram:CountryID>FR</ram:CountryID>
        </ram:PostalTradeAddress>
        <ram:SpecifiedTaxRegistration>
          <ram:ID schemeID="VA">${cleanID(invoice.buyerVat)}</ram:ID>
        </ram:SpecifiedTaxRegistration>
      </ram:BuyerTradeParty>
    </ram:ApplicableHeaderTradeAgreement>
    <ram:ApplicableHeaderTradeDelivery>
      ${invoice.logistics?.deliverToName ? `
      <ram:ShipToTradeParty>
        <ram:Name>${esc(invoice.logistics.deliverToName)}</ram:Name>
        <ram:PostalTradeAddress>
          <ram:LineOne>${esc(shipAddr.line)}</ram:LineOne>
          ${shipAddr.postcode ? `<ram:PostcodeCode>${esc(shipAddr.postcode)}</ram:PostcodeCode>` : ''}
          ${shipAddr.city ? `<ram:CityName>${esc(shipAddr.city)}</ram:CityName>` : ''}
          <ram:CountryID>FR</ram:CountryID>
        </ram:PostalTradeAddress>
      </ram:ShipToTradeParty>` : ''}
      ${(invoice.logistics?.deliveryDate || invoice.deliveryDate) ? `
      <ram:ActualDeliverySupplyChainEvent>
        <ram:OccurrenceDateTime>
          <udt:DateTimeString format="102">${formatToUDT(invoice.logistics?.deliveryDate || invoice.deliveryDate)}</udt:DateTimeString>
        </ram:OccurrenceDateTime>
      </ram:ActualDeliverySupplyChainEvent>` : ''}
    </ram:ApplicableHeaderTradeDelivery>
    <ram:ApplicableHeaderTradeSettlement>
      ${(invoice.billingPeriod?.startDate || invoice.billingPeriod?.endDate) ? `
      <ram:BillingSpecifiedPeriod>
        ${invoice.billingPeriod.startDate ? `<ram:StartDateTime><udt:DateTimeString format="102">${formatToUDT(invoice.billingPeriod.startDate)}</udt:DateTimeString></ram:StartDateTime>` : ''}
        ${invoice.billingPeriod.endDate ? `<ram:EndDateTime><udt:DateTimeString format="102">${formatToUDT(invoice.billingPeriod.endDate)}</udt:DateTimeString></ram:EndDateTime>` : ''}
      </ram:BillingSpecifiedPeriod>` : ''}
      <ram:InvoiceCurrencyCode>${esc(invoice.currency) || 'EUR'}</ram:InvoiceCurrencyCode>
      <ram:SpecifiedTradeSettlementPaymentMeans>
        <ram:TypeCode>${invoice.paymentMeansCode === '49' ? '59' : esc(invoice.paymentMeansCode || '30')}</ram:TypeCode>
        <ram:PayeePartyCreditorFinancialAccount>
          <ram:IBANID>${cleanID(invoice.iban)}</ram:IBANID>
          <ram:AccountName>${esc(invoice.supplier)}</ram:AccountName>
        </ram:PayeePartyCreditorFinancialAccount>
        ${invoice.bic ? `
        <ram:PayeeSpecifiedCreditorFinancialInstitution>
          <ram:BICID>${cleanID(invoice.bic)}</ram:BICID>
        </ram:PayeeSpecifiedCreditorFinancialInstitution>` : ''}
      </ram:SpecifiedTradeSettlementPaymentMeans>
      ${taxSegments}
      ${taxPointDateUDT ? `
      <ram:TaxPointDate>
        <udt:DateTimeString format="102">${taxPointDateUDT}</udt:DateTimeString>
      </ram:TaxPointDate>` : ''}
      <ram:SpecifiedTradeSettlementHeaderMonetarySummation>
        <ram:LineTotalAmount>${lineTotalHT.toFixed(2)}</ram:LineTotalAmount>
        <ram:ChargeTotalAmount>${charge.toFixed(2)}</ram:ChargeTotalAmount>
        <ram:AllowanceTotalAmount>${discount.toFixed(2)}</ram:AllowanceTotalAmount>
        <ram:TaxBasisTotalAmount>${taxBasisTotal.toFixed(2)}</ram:TaxBasisTotalAmount>
        <ram:TaxTotalAmount currencyID="${esc(invoice.currency) || 'EUR'}">${taxTotal.toFixed(2)}</ram:TaxTotalAmount>
        <ram:GrandTotalAmount>${grandTotal.toFixed(2)}</ram:GrandTotalAmount>
        <ram:DuePayableAmount>${grandTotal.toFixed(2)}</ram:DuePayableAmount>
      </ram:SpecifiedTradeSettlementHeaderMonetarySummation>
      ${invoice.paymentTermsText || dueDateUDT ? `
      <ram:SpecifiedTradePaymentTerms>
        ${invoice.paymentTermsText ? `<ram:Description>${esc(invoice.paymentTermsText)}</ram:Description>` : ''}
        ${dueDateUDT ? `<ram:DueDateTime><udt:DateTimeString format="102">${dueDateUDT}</udt:DateTimeString></ram:DueDateTime>` : ''}
      </ram:SpecifiedTradePaymentTerms>` : ''}
    </ram:ApplicableHeaderTradeSettlement>
  </rsm:SupplyChainTradeTransaction>
</rsm:CrossIndustryInvoice>`;

  return includeHeader ? `<?xml version="1.0" encoding="UTF-8"?>\n${xmlBody}` : xmlBody;
};
