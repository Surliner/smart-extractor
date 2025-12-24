
import { InvoiceData, ExportTemplate, LookupTable, ExportColumn } from '../types';

// Helper to safely access nested object properties
const getNestedValue = (obj: any, path: string): any => {
  return path.split('.').reduce((acc, part) => acc && acc[part], obj);
};

// Formatting helpers based on MotoClic specs or general CSV needs
const formatValue = (value: any, type?: string): string => {
  if (value === null || value === undefined || value === '') return '';
  if (value instanceof Date) {
    // Format YYYY-MM-DD HH:mm:ss
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())} ${pad(value.getHours())}:${pad(value.getMinutes())}:${pad(value.getSeconds())}`;
  }
  if (typeof value === 'number') {
    return value.toFixed(2); // Standard 2 decimals
  }
  return String(value);
};

// Process a composite string like "Recep {{supplier}} ref {{invoiceNumber}}"
const processComposite = (pattern: string, context: any): string => {
  return pattern.replace(/\{\{([^}]+)\}\}/g, (_, path) => {
    const val = getNestedValue(context, path.trim());
    return val !== undefined && val !== null ? String(val) : '';
  });
};

// Process a single cell
export const processCell = (
  col: ExportColumn, 
  context: any, // Contains flattened invoice + item + { invoice, item }
  lookups: LookupTable[]
): string => {
  let rawValue: any = '';

  switch (col.type) {
    case 'static':
      rawValue = col.value;
      break;

    case 'field':
      rawValue = getNestedValue(context, col.value);
      // Use default if extracted field is empty
      if (rawValue === undefined || rawValue === null || rawValue === '') {
        rawValue = col.defaultValue || '';
      }
      break;

    case 'composite':
      rawValue = processComposite(col.value, context);
      // Use default if composite results in empty string
      if (!rawValue) {
        rawValue = col.defaultValue || '';
      }
      break;

    case 'lookup':
      // 1. Get source value
      const sourceVal = getNestedValue(context, col.value);
      if (sourceVal !== undefined && sourceVal !== null && sourceVal !== '') {
        // 2. Find table
        const table = lookups.find(t => t.id === col.lookupTableId);
        if (table) {
          // 3. Find entry (case insensitive matching)
          const entry = table.entries.find(e => e.key.toLowerCase() === String(sourceVal).toLowerCase());
          rawValue = entry ? entry.value : (col.defaultValue || '');
        } else {
          rawValue = col.defaultValue || '';
        }
      } else {
        rawValue = col.defaultValue || '';
      }
      break;
  }

  return formatValue(rawValue);
};

export const generateTemplatedCSV = (
  invoices: InvoiceData[], 
  template: ExportTemplate, 
  lookups: LookupTable[]
): string => {
  const separatorChar = template.separator === 'semicolon' ? ';' : template.separator === 'tab' ? '\t' : ',';
  
  // 1. Header Row
  const headers = template.columns.map(c => c.header).join(separatorChar);
  const rows: string[] = [];

  // 2. Data Rows
  invoices.forEach(inv => {
    const itemsToProcess = (inv.items && inv.items.length > 0) ? inv.items : [null];

    itemsToProcess.forEach(item => {
      const context = { 
        ...inv, 
        ...(item || {}), 
        invoice: inv, 
        item: item 
      };
      
      const rowCells = template.columns.map(col => {
        let cellVal = processCell(col, context, lookups);
        
        // Escape CSV/DSV special chars
        if (cellVal.includes(separatorChar) || cellVal.includes('"') || cellVal.includes('\n')) {
          cellVal = `"${cellVal.replace(/"/g, '""')}"`;
        }
        return cellVal;
      });

      rows.push(rowCells.join(separatorChar));
    });
  });

  return [headers, ...rows].join('\n');
};
