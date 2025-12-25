
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { InvoiceData, InvoiceItem, ErpStatus, InvoiceType, LookupTable, ExportTemplate, XmlMappingProfile, PartnerMasterData } from '../types';
import { Trash2, ChevronDown, CheckCircle2, AlertCircle, Circle, Columns, X, FileCode, ArrowDownLeft, ArrowUpRight, Maximize2, LayoutList, FileSpreadsheet, FileDown, Zap, ListChecks, FileJson, ShieldCheck, FileCheck, Search, Filter, ArrowUpDown, ArrowUp, ArrowDown, Calendar, Banknote } from 'lucide-react';
import { FacturXModal } from './FacturXModal';
import { generateTemplatedCSV, generateTemplatedXML } from '../services/exportService';
import { generateFacturXXML } from '../services/facturXService';

interface InvoiceTableProps {
  invoices: InvoiceData[];
  selectedIds: Set<string>;
  onToggleSelection: (id: string) => void;
  onToggleAll: () => void;
  onUpdate: (id: string, data: Partial<InvoiceData>) => void;
  onDeleteInvoices: (ids: string[]) => void;
  onSyncInvoices: (ids: string[]) => void;
  lookupTables: LookupTable[];
  templates: ExportTemplate[];
  xmlProfiles: XmlMappingProfile[];
  masterData?: PartnerMasterData[];
}

type SortConfig = {
  key: keyof InvoiceData;
  direction: 'asc' | 'desc';
} | null;

export const InvoiceTable: React.FC<InvoiceTableProps> = ({ 
  invoices, 
  selectedIds,
  onToggleSelection,
  onToggleAll,
  onUpdate, 
  onDeleteInvoices,
  onSyncInvoices,
  lookupTables,
  templates,
  xmlProfiles,
  masterData = []
}) => {
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Filtering states
  const [showFilters, setShowFilters] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [dateStart, setDateStart] = useState('');
  const [dateEnd, setDateEnd] = useState('');
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');

  // Sorting state
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'invoiceDate', direction: 'desc' });

  const activeInvoice = useMemo(() => invoices.find(inv => inv.id === editingId), [invoices, editingId]);

  // Helper to parse date DD/MM/YYYY to Date object
  const parseDate = (dStr: string) => {
    if (!dStr) return null;
    const [d, m, y] = dStr.split('/').map(Number);
    return new Date(y, m - 1, d);
  };

  // Filter and Sort Logic
  const filteredAndSortedInvoices = useMemo(() => {
    let result = [...invoices];

    // Search
    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      result = result.filter(inv => 
        inv.supplier.toLowerCase().includes(lowerSearch) || 
        inv.invoiceNumber.toLowerCase().includes(lowerSearch)
      );
    }

    // Status
    if (statusFilter !== 'ALL') {
      result = result.filter(inv => inv.erpStatus === statusFilter);
    }

    // Date Range
    if (dateStart) {
      const start = new Date(dateStart);
      result = result.filter(inv => {
        const d = parseDate(inv.invoiceDate);
        return d ? d >= start : false;
      });
    }
    if (dateEnd) {
      const end = new Date(dateEnd);
      result = result.filter(inv => {
        const d = parseDate(inv.invoiceDate);
        return d ? d <= end : false;
      });
    }

    // Amount Range
    if (minAmount) {
      result = result.filter(inv => (inv.amountInclVat || 0) >= parseFloat(minAmount));
    }
    if (maxAmount) {
      result = result.filter(inv => (inv.amountInclVat || 0) <= parseFloat(maxAmount));
    }

    // Sort
    if (sortConfig) {
      result.sort((a, b) => {
        let aVal = a[sortConfig.key];
        let bVal = b[sortConfig.key];

        // Specific handling for dates
        if (sortConfig.key === 'invoiceDate') {
          const dA = parseDate(a.invoiceDate)?.getTime() || 0;
          const dB = parseDate(b.invoiceDate)?.getTime() || 0;
          return sortConfig.direction === 'asc' ? dA - dB : dB - dA;
        }

        // Default string/number sort
        if (aVal === undefined || aVal === null) aVal = '';
        if (bVal === undefined || bVal === null) bVal = '';

        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [invoices, searchTerm, statusFilter, dateStart, dateEnd, minAmount, maxAmount, sortConfig]);

  const requestSort = (key: keyof InvoiceData) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const getSortIcon = (key: keyof InvoiceData) => {
    if (!sortConfig || sortConfig.key !== key) return <ArrowUpDown className="w-3 h-3 ml-1 opacity-30" />;
    return sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3 ml-1 text-indigo-600" /> : <ArrowDown className="w-3 h-3 ml-1 text-indigo-600" />;
  };

  const handleExportCSV = (tpl: ExportTemplate) => {
    const targets = invoices.filter(i => selectedIds.has(i.id));
    const csv = generateTemplatedCSV(targets, tpl, lookupTables);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${tpl.name}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    setShowExportMenu(false);
  };

  const handleExportXML = (prof: XmlMappingProfile) => {
    const targets = invoices.filter(i => selectedIds.has(i.id));
    const xml = generateTemplatedXML(targets, prof, lookupTables);
    const blob = new Blob([xml], { type: 'application/xml;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${prof.name}_${new Date().toISOString().split('T')[0]}.xml`;
    link.click();
    setShowExportMenu(false);
  };

  const handleExportFacturX = () => {
    const targets = invoices.filter(i => selectedIds.has(i.id));
    targets.forEach((inv, index) => {
      setTimeout(() => {
        const xml = generateFacturXXML(inv);
        const blob = new Blob([xml], { type: 'application/xml;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `FACTUR-X_${inv.invoiceNumber || inv.id}.xml`;
        link.click();
      }, index * 200);
    });
    setShowExportMenu(false);
  };

  const resetFilters = () => {
    setSearchTerm('');
    setStatusFilter('ALL');
    setDateStart('');
    setDateEnd('');
    setMinAmount('');
    setMaxAmount('');
  };

  return (
    <>
      {activeInvoice && (
        <FacturXModal 
          isOpen={true}
          onClose={() => setEditingId(null)}
          invoice={activeInvoice}
          onSave={(u) => onUpdate(u.id, u)}
          lookupTables={lookupTables}
          masterData={masterData}
        />
      )}

      {/* FILTERS & SEARCH BAR */}
      <div className="mb-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="relative flex-1 max-w-md group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
            <input 
              type="text" 
              placeholder="Rechercher un fournisseur ou n° facture..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-[11px] font-black uppercase tracking-widest outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 transition-all"
            />
          </div>
          <div className="flex items-center space-x-3">
            <button 
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center space-x-2 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${showFilters ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-100' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
            >
              <Filter className="w-4 h-4" />
              <span>Filtres</span>
              {(statusFilter !== 'ALL' || dateStart || dateEnd || minAmount || maxAmount) && (
                <span className="ml-1 w-2 h-2 bg-rose-400 rounded-full animate-pulse"></span>
              )}
            </button>
          </div>
        </div>

        {showFilters && (
          <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-xl grid grid-cols-1 md:grid-cols-4 gap-6 animate-in slide-in-from-top-4 duration-300">
            <div className="space-y-2">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Statut ERP</label>
              <select 
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-[10px] font-bold outline-none focus:border-indigo-500"
              >
                <option value="ALL">Tous les statuts</option>
                <option value="PENDING">En attente</option>
                <option value="SUCCESS">Synchronisé</option>
                <option value="ERROR">Erreur</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center">
                <Calendar className="w-3 h-3 mr-1" /> Période Facture
              </label>
              <div className="flex items-center space-x-2">
                <input 
                  type="date" 
                  value={dateStart}
                  onChange={(e) => setDateStart(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-[9px] font-bold" 
                />
                <span className="text-slate-300">/</span>
                <input 
                  type="date" 
                  value={dateEnd}
                  onChange={(e) => setDateEnd(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-[9px] font-bold" 
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center">
                <Banknote className="w-3 h-3 mr-1" /> Plage Montant TTC
              </label>
              <div className="flex items-center space-x-2">
                <input 
                  type="number" 
                  placeholder="Min"
                  value={minAmount}
                  onChange={(v) => setMinAmount(v.target.value)}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-[9px] font-bold" 
                />
                <span className="text-slate-300">-</span>
                <input 
                  type="number" 
                  placeholder="Max"
                  value={maxAmount}
                  onChange={(v) => setMaxAmount(v.target.value)}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-[9px] font-bold" 
                />
              </div>
            </div>

            <div className="flex items-end space-x-3">
              <button 
                onClick={resetFilters}
                className="flex-1 py-2.5 text-[9px] font-black uppercase text-rose-500 border border-rose-100 rounded-xl hover:bg-rose-50 transition-colors"
              >
                Réinitialiser
              </button>
            </div>
          </div>
        )}
      </div>

      {/* FLOATING ACTION BAR */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-12 left-1/2 -translate-x-1/2 z-[60] bg-slate-900/90 backdrop-blur-2xl text-white px-10 py-6 rounded-[3rem] shadow-2xl flex items-center space-x-12 animate-in slide-in-from-bottom-10 duration-500 border border-white/10">
          <div className="flex items-center space-x-4 border-r border-white/10 pr-10">
            <div className="bg-indigo-600 p-3 rounded-2xl shadow-xl shadow-indigo-500/20"><ListChecks className="w-5 h-5" /></div>
            <div>
              <p className="text-[11px] font-black uppercase tracking-widest">{selectedIds.size} FACTURES</p>
              <p className="text-[8px] font-bold text-slate-500 uppercase mt-1">Sélection active</p>
            </div>
          </div>

          <div className="flex items-center space-x-8">
            <button onClick={() => setShowExportMenu(!showExportMenu)} className="flex items-center space-x-2 text-[10px] font-black uppercase tracking-widest hover:text-indigo-400 transition-colors group">
              <FileDown className="w-5 h-5 text-indigo-500 group-hover:scale-110 transition-transform" />
              <span>Exporter</span>
              <ChevronDown className={`w-3 h-3 transition-all ${showExportMenu ? 'rotate-180' : ''}`} />
            </button>
            <button onClick={() => onSyncInvoices(Array.from(selectedIds))} className="flex items-center space-x-2 text-[10px] font-black uppercase tracking-widest hover:text-emerald-400 transition-colors group">
              <Zap className="w-5 h-5 text-emerald-500 group-hover:scale-110 transition-transform" />
              <span>Sync ERP</span>
            </button>
            <button onClick={() => onDeleteInvoices(Array.from(selectedIds))} className="flex items-center space-x-2 text-[10px] font-black uppercase tracking-widest hover:text-rose-400 transition-colors group">
              <Trash2 className="w-5 h-5 text-rose-500 group-hover:scale-110 transition-transform" />
              <span>Effacer</span>
            </button>
          </div>

          {showExportMenu && (
            <div className="absolute bottom-full mb-4 left-1/2 -translate-x-1/2 w-80 bg-slate-900 border border-white/10 rounded-[2.5rem] shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in-95">
              <div className="space-y-2">
                <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest mb-2 flex items-center">
                   <ShieldCheck className="w-3 h-3 mr-2" /> Formats RFE (Officiels)
                </p>
                <button onClick={handleExportFacturX} className="w-full text-left px-4 py-3 bg-indigo-600/20 border border-indigo-500/30 rounded-xl text-[10px] font-black hover:bg-indigo-600 hover:text-white flex items-center transition-all">
                  <FileCheck className="w-4 h-4 mr-3 text-indigo-400" /> Factur-X (Profil Comfort)
                </button>
              </div>
              <div className="h-px bg-white/5"></div>
              <div className="space-y-2">
                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">Templates CSV</p>
                {templates.map(tpl => (
                  <button key={tpl.id} onClick={() => handleExportCSV(tpl)} className="w-full text-left px-4 py-3 bg-white/5 rounded-xl text-[10px] font-black hover:bg-white/10 flex items-center">
                    <FileSpreadsheet className="w-4 h-4 mr-3 text-emerald-400" /> {tpl.name}
                  </button>
                ))}
              </div>
              <div className="h-px bg-white/5"></div>
              <div className="space-y-2">
                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">Blueprints XML</p>
                {xmlProfiles.map(prof => (
                  <button key={prof.id} onClick={() => handleExportXML(prof)} className="w-full text-left px-4 py-3 bg-white/5 rounded-xl text-[10px] font-black hover:bg-white/10 flex items-center">
                    <FileJson className="w-4 h-4 mr-3 text-amber-400" /> {prof.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="bg-white rounded-[2.5rem] shadow-2xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse table-fixed">
            <thead className="bg-slate-50 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-200">
              <tr>
                <th className="w-12 px-4 py-6 text-center">
                  <input type="checkbox" checked={selectedIds.size === filteredAndSortedInvoices.length && filteredAndSortedInvoices.length > 0} onChange={onToggleAll} className="w-4 h-4 rounded border-slate-300" />
                </th>
                <th className="w-40 px-4 py-6 cursor-pointer group" onClick={() => requestSort('invoiceNumber')}>
                  <div className="flex items-center">
                    N° Facture {getSortIcon('invoiceNumber')}
                  </div>
                </th>
                <th className="w-32 px-4 py-6 cursor-pointer" onClick={() => requestSort('invoiceDate')}>
                  <div className="flex items-center">
                    Date {getSortIcon('invoiceDate')}
                  </div>
                </th>
                <th className="px-4 py-6 cursor-pointer" onClick={() => requestSort('supplier')}>
                  <div className="flex items-center">
                    Fournisseur {getSortIcon('supplier')}
                  </div>
                </th>
                <th className="w-32 px-4 py-6 text-right cursor-pointer" onClick={() => requestSort('amountInclVat')}>
                  <div className="flex items-center justify-end">
                    Total TTC {getSortIcon('amountInclVat')}
                  </div>
                </th>
                <th className="w-24 px-4 py-6 text-center">Audit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredAndSortedInvoices.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-20 text-center text-slate-400 font-bold uppercase tracking-widest text-[10px]">
                    {invoices.length === 0 ? "Aucune facture" : "Aucun résultat"}
                  </td>
                </tr>
              ) : (
                filteredAndSortedInvoices.map(inv => (
                  <tr key={inv.id} className={`group hover:bg-slate-50 transition-colors ${selectedIds.has(inv.id) ? 'bg-indigo-50/50' : ''}`}>
                    <td className="px-4 py-5 text-center">
                      <input type="checkbox" checked={selectedIds.has(inv.id)} onChange={() => onToggleSelection(inv.id)} className="w-4 h-4 rounded border-slate-300" />
                    </td>
                    <td className="px-4 py-5 font-black text-slate-900 text-xs">
                      <div className="flex items-center space-x-2">
                        <span>{inv.invoiceNumber}</span>
                        {inv.erpStatus === 'SUCCESS' && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>}
                        {inv.erpStatus === 'ERROR' && <div className="w-1.5 h-1.5 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]"></div>}
                      </div>
                    </td>
                    <td className="px-4 py-5 text-xs text-slate-500">{inv.invoiceDate}</td>
                    <td className="px-4 py-5 text-xs font-bold text-slate-800">
                      <div className="flex items-center">
                        {inv.supplier}
                        {inv.isMasterMatched && <ShieldCheck className="w-3 h-3 ml-2 text-emerald-500" />}
                      </div>
                    </td>
                    <td className="px-4 py-5 text-right font-black text-indigo-600 text-xs">
                      {inv.amountInclVat?.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} {inv.currency}
                    </td>
                    <td className="px-4 py-5 text-center">
                      <button onClick={() => setEditingId(inv.id)} className="p-2 text-slate-400 hover:text-indigo-600 bg-white border border-slate-200 rounded-xl shadow-sm transition-all hover:scale-110 active:scale-95">
                        <Maximize2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
};
