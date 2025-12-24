
import { InvoiceData, ExportTemplate, LookupTable, ExportColumn, XmlMappingProfile } from '../types';

// Helper to safely access nested object properties
const getNestedValue = (obj: any, path: string): any => {
  return path.split('.').reduce((acc, part) => acc && acc[part], obj);
};

// Simple XML escaping
const escapeXml = (unsafe: any): string => {
  if (unsafe === null || unsafe === undefined) return '';
  return String(unsafe)
    .replace(/[<>&"']/g, (c) => {
      switch (c) {
        case '<': return '&lt;';
        case '>': return '&gt;';
        case '&': return '&amp;';
        case '"': return '&quot;';
        case "'": return '&apos;';
        default: return c;
      }
    });
};

// Formatting helpers based on general needs
const formatValue = (value: any): string => {
  if (value === null || value === undefined || value === '') return '';
  if (value instanceof Date) {
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())} ${pad(value.getHours())}:${pad(value.getMinutes())}:${pad(value.getSeconds())}`;
  }
  if (typeof value === 'number') {
    return value.toFixed(2);
  }
  return String(value);
};

// Process a composite string
const processComposite = (pattern: string, context: any): string => {
  return pattern.replace(/\{\{([^}]+)\}\}/g, (_, path) => {
    const val = getNestedValue(context, path.trim());
    return val !== undefined && val !== null ? String(val) : '';
  });
};

// Process a single cell
export const processCell = (
  col: ExportColumn | { type: string, value: string, defaultValue?: string, lookupTableId?: string }, 
  context: any, 
  lookups: LookupTable[]
): string => {
  let rawValue: any = '';

  switch (col.type) {
    case 'static':
      rawValue = (col as any).value;
      break;

    case 'field':
      rawValue = getNestedValue(context, col.value);
      if (rawValue === undefined || rawValue === null || rawValue === '') {
        rawValue = col.defaultValue || '';
      }
      break;

    case 'composite':
      rawValue = processComposite(col.value, context);
      if (!rawValue) {
        rawValue = col.defaultValue || '';
      }
      break;

    case 'lookup':
      const sourceVal = getNestedValue(context, col.value);
      if (sourceVal !== undefined && sourceVal !== null && sourceVal !== '') {
        const table = lookups.find(t => t.id === col.lookupTableId);
        if (table) {
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
  const headers = template.columns.map(c => c.header).join(separatorChar);
  const rows: string[] = [];

  invoices.forEach(inv => {
    const itemsToProcess = (inv.items && inv.items.length > 0) ? inv.items : [null];
    itemsToProcess.forEach(item => {
      const context = { ...inv, ...(item || {}), invoice: inv, item: item };
      const rowCells = template.columns.map(col => {
        let cellVal = processCell(col, context, lookups);
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

export const generateTemplatedXML = (
  invoices: InvoiceData[],
  profile: XmlMappingProfile,
  lookups: LookupTable[]
): string => {
  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  xml += `<${profile.rootTag}>\n`;

  invoices.forEach(inv => {
    const itemsToProcess = (inv.items && inv.items.length > 0) ? inv.items : [null];
    itemsToProcess.forEach(item => {
      const context = { ...inv, ...(item || {}), invoice: inv, item: item };
      xml += `  <${profile.itemTag}>\n`;
      
      profile.mappings.forEach(m => {
        if (!m.enabled) return;
        // Construct a virtual column object to reuse processCell
        const val = processCell({ type: 'field', value: m.btId, defaultValue: '' }, context, lookups);
        xml += `    <${m.xmlTag}>${escapeXml(val)}</${m.xmlTag}>\n`;
      });

      xml += `  </${profile.itemTag}>\n`;
    });
  });

  xml += `</${profile.rootTag}>`;
  return xml;
};
