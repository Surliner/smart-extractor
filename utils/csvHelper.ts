import { InvoiceData } from '../types';

export const generateCSV = (invoices: InvoiceData[]): string => {
  // Ensure we process only what is passed (which is filtered by session/history in App.tsx)
  if (!invoices || invoices.length === 0) return '';
  
  const hasItems = invoices.some(inv => inv.items && inv.items.length > 0);

  // Headers (Ultimate Superset)
  const headers = [
    'Document Type',
    'Supplier Name',
    'Supplier VAT',
    'Supplier SIRET',
    'Supplier Address',
    'Buyer Name',
    'Buyer VAT',
    'Buyer SIRET',
    'Buyer Address',
    'Invoice Number',
    'PO Number',
    'Invoice Date',
    'Due Date',
    'Amount Excl VAT',
    'Total VAT',
    'Amount Incl VAT',
    'Currency',
    'IBAN',
    'BIC',
    'Payment Method',
    'Original Filename'
  ];

  if (hasItems) {
    headers.push(
      'Article ID', 
      'Item Description', 
      'Quantity', 
      'Unit', 
      'Unit Price', 
      'Tax Rate %',
      'Item Total'
    );
  }

  const fmtNum = (num: number | null | undefined) => (num !== null && num !== undefined) ? num.toFixed(2) : '';
  
  const escape = (str: string | undefined | null) => {
    if (!str) return '';
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const rows: string[] = [];

  invoices.forEach(inv => {
    const baseRow = [
      escape(inv.invoiceType),
      escape(inv.supplier),
      escape(inv.supplierVat),
      escape(inv.supplierSiret),
      escape(inv.supplierAddress),
      escape(inv.buyerName),
      escape(inv.buyerVat),
      escape(inv.buyerSiret),
      escape(inv.buyerAddress),
      escape(inv.invoiceNumber),
      escape(inv.poNumber),
      escape(inv.invoiceDate),
      escape(inv.dueDate),
      fmtNum(inv.amountExclVat),
      fmtNum(inv.totalVat),
      fmtNum(inv.amountInclVat),
      escape(inv.currency),
      escape(inv.iban),
      escape(inv.bic),
      escape(inv.paymentMethod),
      escape(inv.originalFilename)
    ];

    if (hasItems) {
      if (inv.items && inv.items.length > 0) {
        inv.items.forEach(item => {
          const itemRow = [
            ...baseRow,
            escape(item.articleId),
            escape(item.description),
            fmtNum(item.quantity),
            escape(item.unitOfMeasure),
            fmtNum(item.unitPrice),
            fmtNum(item.taxRate),
            fmtNum(item.amount)
          ];
          rows.push(itemRow.join(','));
        });
      } else {
        // Pad with empty cells matching the number of item headers
        rows.push([...baseRow, '', '', '', '', '', '', ''].join(','));
      }
    } else {
      rows.push(baseRow.join(','));
    }
  });

  return [headers.join(','), ...rows].join('\n');
};

export const downloadCSV = (content: string, filename: string) => {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};