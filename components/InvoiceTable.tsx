
import React, { useState, useMemo, useEffect } from 'react';
import { InvoiceData, LookupTable, ExportTemplate, XmlMappingProfile, PartnerMasterData, InvoiceType } from '../types';
import { Search, Filter, Maximize2, Clock, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, ArrowUpDown, ArrowUp, ArrowDown, Inbox, Archive, X, Calendar, Euro } from 'lucide-react';
import { FacturXModal } from './FacturXModal';

const PAGE_SIZE = 20;

type SortField = 'invoiceNumber' | 'invoiceDate' | 'supplier' | 'amountInclVat' | 'extractedAt';
type SortOrder = 'asc' | 'desc';

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
  
  // États des filtres dynamiques
  const [showFilters, setShowFilters] = useState(false);
  const [filterType, setFilterType] = useState<'ALL' | InvoiceType>('ALL');
  const [dateStart, setDateStart] = useState('');
  const [dateEnd, setDateEnd] = useState('');
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');
  
  // État du tri
  const [sortField, setSortField] = useState<SortField>('extractedAt');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const filteredInvoices = useMemo(() => {
    return invoices.filter(inv => {
      // Filtre Recherche
      const matchesSearch = inv.supplier.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           inv.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase());
      if (!matchesSearch) return false;

      // Filtre Type
      if (filterType !== 'ALL' && inv.invoiceType !== filterType) return false;

      // Filtre Dates (Simple string compare YYYY-MM-DD)
      if (dateStart && inv.invoiceDate < dateStart) return false;
      if (dateEnd && inv.invoiceDate > dateEnd) return false;

      // Filtre Montants
      const amt = inv.amountInclVat || 0;
      if (minAmount && amt < parseFloat(minAmount)) return false;
      if (maxAmount && amt > parseFloat(maxAmount)) return false;

      return true;
    }).sort((a, b) => {
      let valA: any = a[sortField];
      let valB: any = b[sortField];
      
      if (sortField === 'invoiceDate') {
        valA = new Date(a.invoiceDate).getTime();
        valB = new Date(b.invoiceDate).getTime();
      }
      
      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }, [invoices, searchTerm, filterType, dateStart, dateEnd, minAmount, maxAmount, sortField, sortOrder]);

  const totalPages = Math.ceil(filteredInvoices.length / PAGE_SIZE);
  const paginatedInvoices = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredInvoices.slice(start, start + PAGE_SIZE);
  }, [filteredInvoices, currentPage]);

  useEffect(() => setCurrentPage(1), [searchTerm, filterType, dateStart, dateEnd, minAmount, maxAmount]);

  const activeInvoice = useMemo(() => invoices.find(inv => inv.id === editingId), [invoices, editingId]);

  const resetFilters = () => {
    setFilterType('ALL');
    setDateStart('');
    setDateEnd('');
    setMinAmount('');
    setMaxAmount('');
    setSearchTerm('');
  };

  const hasActiveFilters = filterType !== 'ALL' || dateStart || dateEnd || minAmount || maxAmount || searchTerm;

  return (
    <>
      {activeInvoice && (
        <FacturXModal isOpen={true} onClose={() => setEditingId(null)} invoice={activeInvoice} onSave={(u) => onUpdate(u.id, u)} lookupTables={lookupTables} masterData={masterData} />
      )}
      
      <div className="space-y-4">
        <div className="flex items-center space-x-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" placeholder="Rechercher fournisseur ou N°..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-[11px] font-black uppercase outline-none focus:border-indigo-500 transition-all shadow-sm"
            />
          </div>
          <button 
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center space-x-3 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all shadow-sm ${showFilters ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}
          >
            <Filter className="w-4 h-4" />
            <span>Filtres {hasActiveFilters && !showFilters && '•'}</span>
          </button>
          {hasActiveFilters && (
            <button onClick={resetFilters} className="p-3 text-slate-400 hover:text-rose-500 bg-white border border-slate-200 rounded-2xl transition-all shadow-sm">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* PANNEAU DE FILTRES DYNAMIQUES */}
        {showFilters && (
          <div className="bg-white border border-slate-200 rounded-[2rem] p-8 grid grid-cols-1 md:grid-cols-4 gap-8 shadow-xl animate-in slide-in-from-top-4">
            <div className="space-y-3">
              <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest flex items-center"><Clock className="w-3 h-3 mr-2" /> Type Document</label>
              <select 
                value={filterType} 
                onChange={(e) => setFilterType(e.target.value as any)}
                className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-2.5 text-[10px] font-black uppercase outline-none focus:border-indigo-300"
              >
                <option value="ALL">Tous types</option>
                <option value={InvoiceType.INVOICE}>Factures</option>
                <option value={InvoiceType.CREDIT_NOTE}>Avoirs</option>
              </select>
            </div>
            <div className="space-y-3">
              <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest flex items-center"><Calendar className="w-3 h-3 mr-2" /> Période</label>
              <div className="flex items-center space-x-2">
                <input type="date" value={dateStart} onChange={(e) => setDateStart(e.target.value)} className="flex-1 bg-slate-50 border border-slate-100 rounded-xl px-4 py-2.5 text-[10px] font-black uppercase outline-none" />
                <span className="text-slate-300">/</span>
                <input type="date" value={dateEnd} onChange={(e) => setDateEnd(e.target.value)} className="flex-1 bg-slate-50 border border-slate-100 rounded-xl px-4 py-2.5 text-[10px] font-black uppercase outline-none" />
              </div>
            </div>
            <div className="space-y-3">
              <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest flex items-center"><Euro className="w-3 h-3 mr-2" /> Plage Montant TTC</label>
              <div className="flex items-center space-x-2">
                <input type="number" placeholder="Min" value={minAmount} onChange={(e) => setMinAmount(e.target.value)} className="flex-1 bg-slate-50 border border-slate-100 rounded-xl px-4 py-2.5 text-[10px] font-black uppercase outline-none" />
                <span className="text-slate-300">/</span>
                <input type="number" placeholder="Max" value={maxAmount} onChange={(e) => setMaxAmount(e.target.value)} className="flex-1 bg-slate-50 border border-slate-100 rounded-xl px-4 py-2.5 text-[10px] font-black uppercase outline-none" />
              </div>
            </div>
            <div className="flex items-end pb-1">
              <button onClick={() => setShowFilters(false)} className="w-full bg-slate-950 text-white rounded-xl py-3 text-[9px] font-black uppercase tracking-widest hover:bg-black transition-all">Appliquer les filtres</button>
            </div>
          </div>
        )}

        <div className="bg-white rounded-[2.5rem] shadow-xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse table-fixed min-w-[1000px]">
              <thead className="bg-slate-50 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-200">
                <tr>
                  <th className="w-12 px-4 py-6 text-center">
                    <input 
                      type="checkbox" 
                      checked={paginatedInvoices.length > 0 && paginatedInvoices.every(i => selectedIds.has(i.id))} 
                      onChange={onToggleAll} 
                      className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" 
                    />
                  </th>
                  <th onClick={() => handleSort('invoiceNumber')} className="w-40 px-4 py-6 cursor-pointer hover:text-indigo-600 transition-colors">
                    <div className="flex items-center space-x-2">
                      <span>N° Facture</span>
                      {sortField === 'invoiceNumber' ? (sortOrder === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />) : <ArrowUpDown className="w-3 h-3 opacity-20" />}
                    </div>
                  </th>
                  <th onClick={() => handleSort('invoiceDate')} className="w-32 px-4 py-6 cursor-pointer hover:text-indigo-600 transition-colors">
                    <div className="flex items-center space-x-2">
                      <span>Date</span>
                      {sortField === 'invoiceDate' ? (sortOrder === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />) : <ArrowUpDown className="w-3 h-3 opacity-20" />}
                    </div>
                  </th>
                  <th onClick={() => handleSort('supplier')} className="px-4 py-6 cursor-pointer hover:text-indigo-600 transition-colors">
                    <div className="flex items-center space-x-2">
                      <span>Fournisseur</span>
                      {sortField === 'supplier' ? (sortOrder === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />) : <ArrowUpDown className="w-3 h-3 opacity-20" />}
                    </div>
                  </th>
                  <th onClick={() => handleSort('extractedAt')} className="w-36 px-4 py-6 cursor-pointer hover:text-indigo-600 transition-colors">
                    <div className="flex items-center space-x-2">
                      <span>Extraction</span>
                      {sortField === 'extractedAt' ? (sortOrder === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />) : <ArrowUpDown className="w-3 h-3 opacity-20" />}
                    </div>
                  </th>
                  <th onClick={() => handleSort('amountInclVat')} className="w-32 px-4 py-6 text-right cursor-pointer hover:text-indigo-600 transition-colors">
                    <div className="flex items-center justify-end space-x-2">
                      <span>Total TTC</span>
                      {sortField === 'amountInclVat' ? (sortOrder === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />) : <ArrowUpDown className="w-3 h-3 opacity-20" />}
                    </div>
                  </th>
                  <th className="w-24 px-4 py-6 text-center">Audit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedInvoices.map(inv => (
                  <tr key={inv.id} className={`group hover:bg-slate-50 transition-colors ${selectedIds.has(inv.id) ? 'bg-indigo-50/50' : ''}`}>
                    <td className="px-4 py-5 text-center">
                      <input 
                        type="checkbox" 
                        checked={selectedIds.has(inv.id)} 
                        onChange={() => onToggleSelection(inv.id)} 
                        className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" 
                      />
                    </td>
                    <td className="px-4 py-5 font-black text-slate-900 text-xs flex items-center h-full">
                       {inv.invoiceType === InvoiceType.CREDIT_NOTE && <span className="mr-2 text-[8px] bg-rose-100 text-rose-600 px-1.5 py-0.5 rounded font-black">AVOIR</span>}
                       {inv.invoiceNumber}
                    </td>
                    <td className="px-4 py-5 text-xs text-slate-500">{inv.invoiceDate}</td>
                    <td className="px-4 py-5 font-bold text-slate-800">
                      <div className="flex flex-col">
                        <span>{inv.supplier}</span>
                        {inv.supplierErpCode && <span className="text-[9px] font-black text-indigo-500 uppercase tracking-tighter">Code: {inv.supplierErpCode}</span>}
                      </div>
                    </td>
                    <td className="px-4 py-5 text-[10px] text-slate-500 font-mono">
                      <div className="flex items-center h-full">
                        <Clock className="w-3 h-3 mr-2 text-indigo-500" />
                        {inv.extractedAt ? new Date(inv.extractedAt).toLocaleTimeString() : 'N/A'}
                      </div>
                    </td>
                    <td className="px-4 py-5 text-right font-black text-indigo-600 text-xs">{inv.amountInclVat?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {inv.currency}</td>
                    <td className="px-4 py-5 text-center">
                      <button 
                        onClick={() => setEditingId(inv.id)} 
                        className="p-2 text-slate-400 hover:text-indigo-600 bg-white border border-slate-200 rounded-xl hover:shadow-md transition-all"
                      >
                        <Maximize2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
                {paginatedInvoices.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-20 text-center text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">
                      <Inbox className="w-10 h-10 mx-auto mb-4 opacity-10" />
                      Aucune facture ne correspond à vos filtres
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="px-8 py-6 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between">
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Affichage de {filteredInvoices.length > 0 ? (currentPage-1)*PAGE_SIZE+1 : 0} à {Math.min(currentPage*PAGE_SIZE, filteredInvoices.length)} sur {filteredInvoices.length}</p>
            <div className="flex items-center space-x-1">
              <button onClick={() => setCurrentPage(1)} disabled={currentPage === 1} className="p-2 disabled:opacity-20 hover:text-indigo-600 transition-colors"><ChevronsLeft className="w-4 h-4" /></button>
              <button onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} disabled={currentPage === 1} className="p-2 disabled:opacity-20 hover:text-indigo-600 transition-colors"><ChevronLeft className="w-4 h-4" /></button>
              <div className="flex items-center space-x-2 px-4">
                 <span className="text-[10px] font-black text-indigo-600 bg-white border border-slate-200 rounded-lg px-3 py-1 shadow-sm">{currentPage}</span>
                 <span className="text-[10px] font-black text-slate-400">/</span>
                 <span className="text-[10px] font-black text-slate-400">{totalPages || 1}</span>
              </div>
              <button onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))} disabled={currentPage === totalPages || totalPages === 0} className="p-2 disabled:opacity-20 hover:text-indigo-600 transition-colors"><ChevronRight className="w-4 h-4" /></button>
              <button onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages || totalPages === 0} className="p-2 disabled:opacity-20 hover:text-indigo-600 transition-colors"><ChevronsRight className="w-4 h-4" /></button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
