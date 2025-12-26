
import React, { useState, useMemo, useEffect } from 'react';
import { InvoiceData, LookupTable, ExportTemplate, XmlMappingProfile, PartnerMasterData } from '../types';
import { Search, Filter, Maximize2, Clock, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, ArrowUpDown, ArrowUp, ArrowDown, Inbox, Archive } from 'lucide-react';
import { FacturXModal } from './FacturXModal';

const PAGE_SIZE = 20;

interface InvoiceTableProps {
  invoices: InvoiceData[];
  selectedIds: Set<string>;
  onToggleSelection: (id: string) => void;
  onToggleAll: () => void;
  onUpdate: (id: string, data: Partial<InvoiceData>) => void;
  onDeleteInvoices: (ids: string[]) => void;
  onArchiveInvoices: (ids: string[], archived: boolean) => void;
  onSyncInvoices: (ids: string[]) => void;
  lookupTables: LookupTable[];
  templates: ExportTemplate[];
  xmlProfiles: XmlMappingProfile[];
  masterData?: PartnerMasterData[];
  isArchiveView?: boolean;
}

export const InvoiceTable: React.FC<InvoiceTableProps> = ({ 
  invoices, selectedIds, onToggleSelection, onToggleAll, onUpdate, onDeleteInvoices, onArchiveInvoices, 
  lookupTables, templates, xmlProfiles, masterData = [] 
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);

  const filteredInvoices = useMemo(() => {
    return invoices.filter(inv => 
      inv.supplier.toLowerCase().includes(searchTerm.toLowerCase()) || 
      inv.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [invoices, searchTerm]);

  const totalPages = Math.ceil(filteredInvoices.length / PAGE_SIZE);
  const paginatedInvoices = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredInvoices.slice(start, start + PAGE_SIZE);
  }, [filteredInvoices, currentPage]);

  useEffect(() => setCurrentPage(1), [searchTerm]);

  const activeInvoice = useMemo(() => invoices.find(inv => inv.id === editingId), [invoices, editingId]);

  return (
    <>
      {activeInvoice && (
        <FacturXModal isOpen={true} onClose={() => setEditingId(null)} invoice={activeInvoice} onSave={(u) => onUpdate(u.id, u)} lookupTables={lookupTables} masterData={masterData} />
      )}
      
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" placeholder="Rechercher..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-[11px] font-black uppercase outline-none focus:border-indigo-500 transition-all"
            />
          </div>
        </div>

        <div className="bg-white rounded-[2.5rem] shadow-xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse table-fixed min-w-[1000px]">
              <thead className="bg-slate-50 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-200">
                <tr>
                  <th className="w-12 px-4 py-6 text-center"><input type="checkbox" checked={selectedIds.size > 0 && paginatedInvoices.every(i => selectedIds.has(i.id))} onChange={onToggleAll} className="w-4 h-4 rounded border-slate-300" /></th>
                  <th className="w-40 px-4 py-6">N° Facture</th>
                  <th className="w-32 px-4 py-6">Date</th>
                  <th className="px-4 py-6">Fournisseur</th>
                  <th className="w-36 px-4 py-6">Extraction</th>
                  <th className="w-32 px-4 py-6 text-right">Total TTC</th>
                  <th className="w-24 px-4 py-6 text-center">Audit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedInvoices.map(inv => (
                  <tr key={inv.id} className={`group hover:bg-slate-50 transition-colors ${selectedIds.has(inv.id) ? 'bg-indigo-50/50' : ''}`}>
                    <td className="px-4 py-5 text-center"><input type="checkbox" checked={selectedIds.has(inv.id)} onChange={() => onToggleSelection(inv.id)} className="w-4 h-4 rounded border-slate-300" /></td>
                    <td className="px-4 py-5 font-black text-slate-900 text-xs">{inv.invoiceNumber}</td>
                    <td className="px-4 py-5 text-xs text-slate-500">{inv.invoiceDate}</td>
                    <td className="px-4 py-5 font-bold text-slate-800">{inv.supplier}</td>
                    <td className="px-4 py-5 text-[10px] text-slate-500 font-mono flex items-center h-full"><Clock className="w-3 h-3 mr-2 text-indigo-500" />{inv.extractedAt ? new Date(inv.extractedAt).toLocaleTimeString() : 'N/A'}</td>
                    <td className="px-4 py-5 text-right font-black text-indigo-600 text-xs">{inv.amountInclVat?.toLocaleString()} {inv.currency}</td>
                    <td className="px-4 py-5 text-center"><button onClick={() => setEditingId(inv.id)} className="p-2 text-slate-400 hover:text-indigo-600 bg-white border border-slate-200 rounded-xl"><Maximize2 className="w-4 h-4" /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="px-8 py-6 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between">
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Affichage de {(currentPage-1)*PAGE_SIZE+1} à {Math.min(currentPage*PAGE_SIZE, filteredInvoices.length)} sur {filteredInvoices.length}</p>
            <div className="flex items-center space-x-1">
              <button onClick={() => setCurrentPage(1)} disabled={currentPage === 1} className="p-2 disabled:opacity-20"><ChevronsLeft className="w-4 h-4" /></button>
              <button onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} disabled={currentPage === 1} className="p-2 disabled:opacity-20"><ChevronLeft className="w-4 h-4" /></button>
              <span className="px-4 text-[10px] font-black text-indigo-600 bg-white border border-slate-200 rounded-lg py-1">{currentPage} / {totalPages || 1}</span>
              <button onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))} disabled={currentPage === totalPages} className="p-2 disabled:opacity-20"><ChevronRight className="w-4 h-4" /></button>
              <button onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages} className="p-2 disabled:opacity-20"><ChevronsRight className="w-4 h-4" /></button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
