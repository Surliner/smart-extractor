
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { InvoiceData, InvoiceItem, ErpStatus, InvoiceType, LookupTable, ExportTemplate } from '../types';
import { Trash2, ChevronDown, ChevronRight, CheckCircle2, AlertCircle, Circle, Columns, X, FileCode, ArrowDownLeft, ArrowUpRight, Maximize2, LayoutList, FileSpreadsheet, FileDown, Zap, ListChecks } from 'lucide-react';
import { FacturXModal } from './FacturXModal';
import { generateTemplatedCSV } from '../services/exportService';

interface InvoiceTableProps {
  invoices: InvoiceData[];
  selectedIds: Set<string>;
  onToggleSelection: (id: string) => void;
  onToggleAll: () => void;
  onUpdate: (id: string, data: Partial<InvoiceData>) => void;
  onUpdateItem: (invoiceId: string, itemIndex: number, data: Partial<InvoiceItem>) => void;
  onDeleteItem: (invoiceId: string, itemIndex: number) => void;
  onDeleteInvoices: (ids: string[]) => void;
  onSyncInvoices: (ids: string[]) => void;
  lookupTables: LookupTable[];
  templates: ExportTemplate[];
}

const DEFAULT_COL_WIDTHS: Record<string, number> = {
  direction: 35,
  type: 70,
  invoiceNumber: 100,
  poNumber: 90,
  buyerRef: 90,
  date: 85,
  dueDate: 85,
  supplier: 150,
  supplierDetails: 100,
  financials: 90,
  total: 100,
  currency: 50,
  payment: 150,
  bic: 80,
  buyer: 150,
  buyerDetails: 100,
  filename: 120
};

export const InvoiceTable: React.FC<InvoiceTableProps> = ({ 
  invoices, 
  selectedIds,
  onToggleSelection,
  onToggleAll,
  onUpdate, 
  onUpdateItem,
  onDeleteItem,
  onDeleteInvoices,
  onSyncInvoices,
  lookupTables,
  templates
}) => {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [showColMenu, setShowColMenu] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const exportMenuRef = useRef<HTMLDivElement>(null);
  const [editingFacturXId, setEditingFacturXId] = useState<string | null>(null);

  const [colWidths, setColWidths] = useState<Record<string, number>>(() => {
    try {
      const saved = localStorage.getItem('invoice-table-col-widths');
      return saved ? { ...DEFAULT_COL_WIDTHS, ...JSON.parse(saved) } : DEFAULT_COL_WIDTHS;
    } catch {
      return DEFAULT_COL_WIDTHS;
    }
  });

  useEffect(() => {
    localStorage.setItem('invoice-table-col-widths', JSON.stringify(colWidths));
  }, [colWidths]);

  const [visible, setVisible] = useState({
    type: false,
    po: false,
    buyerRef: false,
    dates: false, 
    supplierDetails: false, 
    breakdown: false, 
    payment: false, 
    buyer: false, 
  });

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowColMenu(false);
      }
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
        setShowExportMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const activeInvoiceForModal = useMemo(() => 
    invoices.find(inv => inv.id === editingFacturXId), 
  [invoices, editingFacturXId]);

  if (invoices.length === 0) return (
    <div className="bg-white rounded-[2.5rem] border-2 border-slate-200 p-20 flex flex-col items-center justify-center text-center">
       <div className="bg-slate-100 p-6 rounded-full mb-6">
          <FileCode className="w-12 h-12 text-slate-300" />
       </div>
       <h3 className="text-xl font-black text-slate-500 uppercase tracking-widest">No Active Extraction</h3>
       <p className="text-slate-400 text-sm mt-2 max-w-xs font-bold">Le tableau est vide. En attente de documents...</p>
    </div>
  );

  const handleResize = (key: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.pageX;
    const startWidth = colWidths[key] || 100;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const currentWidth = startWidth + (moveEvent.pageX - startX);
      setColWidths(prev => ({ ...prev, [key]: Math.max(40, currentWidth) }));
    };

    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  const handleExport = (template: ExportTemplate) => {
    const targetInvoices = selectedIds.size > 0 
      ? invoices.filter(inv => selectedIds.has(inv.id)) 
      : invoices;
    
    if (targetInvoices.length === 0) {
      alert("Aucune facture à exporter.");
      return;
    }

    const csvContent = generateTemplatedCSV(targetInvoices, template, lookupTables);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${template.name}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    setShowExportMenu(false);
  };

  const inputClass = "w-full bg-slate-50 border-b-2 border-slate-100 hover:border-indigo-300 focus:border-indigo-600 focus:bg-white outline-none px-2 py-1 transition-all text-xs text-slate-950 font-black placeholder-slate-400 truncate rounded-t-lg";
  const numInputClass = `${inputClass} text-right font-mono`;

  const handleNumChange = (val: string) => {
    return val === '' ? null : parseFloat(val);
  };

  const getStatusIcon = (status?: ErpStatus) => {
    switch (status) {
      case ErpStatus.SUCCESS: return <CheckCircle2 className="w-4 h-4 text-emerald-600" />;
      case ErpStatus.ERROR: return <AlertCircle className="w-4 h-4 text-rose-600" />;
      default: return <Circle className="w-4 h-4 text-slate-300" />;
    }
  };

  const allSelected = invoices.length > 0 && selectedIds.size === invoices.length;
  const toggleColumn = (key: keyof typeof visible) => {
    setVisible(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const Resizer = ({ colKey }: { colKey: string }) => (
    <div
      className="absolute right-0 top-0 bottom-0 w-4 -mr-2 cursor-col-resize hover:bg-indigo-400/20 z-20 flex justify-center group/resizer"
      onMouseDown={(e) => handleResize(colKey, e)}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="w-[1px] h-3 my-auto bg-slate-300 group-hover/resizer:bg-indigo-400"></div>
    </div>
  );

  return (
    <>
      {activeInvoiceForModal && (
        <FacturXModal 
          isOpen={true}
          onClose={() => setEditingFacturXId(null)}
          invoice={activeInvoiceForModal}
          onSave={(updated) => onUpdate(updated.id, updated)}
          lookupTables={lookupTables}
          isAdmin={true}
        />
      )}

      {/* Barre d'Actions Flottante */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[60] bg-slate-950/90 backdrop-blur-2xl text-white px-8 py-5 rounded-[2.5rem] shadow-[0_40px_100px_-20px_rgba(0,0,0,0.6)] flex items-center space-x-10 animate-in slide-in-from-bottom-10 duration-500 border border-white/10">
          <div className="flex items-center space-x-4 pr-10 border-r border-white/10">
             <div className="bg-indigo-600 p-2.5 rounded-2xl shadow-lg shadow-indigo-500/20">
                <ListChecks className="w-5 h-5" />
             </div>
             <div>
                <p className="text-[11px] font-black uppercase tracking-[0.2em] leading-none">{selectedIds.size} FACTURES</p>
                <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-1.5">Traitement de masse</p>
             </div>
          </div>

          <div className="flex items-center space-x-8">
             <button 
                onClick={() => setShowExportMenu(!showExportMenu)}
                className="flex items-center space-x-2.5 text-[10px] font-black uppercase tracking-widest hover:text-emerald-400 transition-colors group"
             >
                <FileSpreadsheet className="w-5 h-5 text-emerald-500 group-hover:scale-110 transition-transform" />
                <span>Exporter ({selectedIds.size})</span>
             </button>

             <button 
                onClick={() => onSyncInvoices(Array.from(selectedIds))}
                className="flex items-center space-x-2.5 text-[10px] font-black uppercase tracking-widest hover:text-indigo-400 transition-colors group"
             >
                <Zap className="w-5 h-5 text-indigo-500 group-hover:scale-110 transition-transform" />
                <span>Sync Sage</span>
             </button>

             <button 
                onClick={() => onDeleteInvoices(Array.from(selectedIds))}
                className="flex items-center space-x-2.5 text-[10px] font-black uppercase tracking-widest hover:text-rose-400 transition-colors group"
             >
                <Trash2 className="w-5 h-5 text-rose-500 group-hover:scale-110 transition-transform" />
                <span>Supprimer</span>
             </button>
          </div>

          <button 
            onClick={() => onToggleAll()} 
            className="ml-4 p-2.5 hover:bg-white/10 rounded-full transition-all text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      <div className="bg-white rounded-[2rem] shadow-2xl border-2 border-slate-200 flex flex-col relative">
        <div className="px-8 py-4 border-b-2 border-slate-100 flex justify-between items-center bg-white sticky top-0 z-40 rounded-t-[2rem]">
          <div className="flex items-center space-x-4">
             <div className="p-2 bg-indigo-50 rounded-xl">
                <LayoutList className="w-4 h-4 text-indigo-600" />
             </div>
             <h2 className="text-[10px] font-black text-slate-900 uppercase tracking-[0.2em] flex items-center">
               Active Batch Queue
               <span className="ml-3 bg-slate-900 text-white text-[9px] px-2 py-0.5 rounded-md font-black">{invoices.length} Documents</span>
             </h2>
          </div>
          
          <div className="flex items-center space-x-3">
            {/* Export Menu */}
            <div className="relative" ref={exportMenuRef}>
              <button 
                onClick={() => setShowExportMenu(!showExportMenu)}
                disabled={templates.length === 0}
                className={`flex items-center space-x-2 px-4 py-2 text-[9px] font-black uppercase tracking-widest rounded-xl border-2 transition-all disabled:opacity-30
                  ${showExportMenu ? 'bg-emerald-600 text-white border-emerald-600 shadow-lg' : 'bg-white text-emerald-600 border-emerald-100 hover:bg-emerald-50'}`}
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Export Flat File</span>
                <ChevronDown className={`w-3 h-3 transition-transform ${showExportMenu ? 'rotate-180' : ''}`} />
              </button>

              {showExportMenu && (
                <div 
                  className="absolute right-0 top-full mt-3 w-72 bg-slate-950 border border-white/10 rounded-[2rem] shadow-[0_30px_60px_-15px_rgba(0,0,0,0.5)] z-[100] py-4 overflow-hidden animate-in fade-in zoom-in-95 duration-200"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="px-6 py-2 border-b border-white/5 text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">Select Template</div>
                  <div className="p-2 space-y-1 max-h-[300px] overflow-y-auto custom-scrollbar">
                    {templates.map(tpl => (
                      <button
                        key={tpl.id}
                        onClick={() => handleExport(tpl)}
                        className="w-full flex items-center justify-between px-4 py-3 text-[10px] font-black uppercase tracking-widest text-left rounded-xl transition-all text-slate-200 hover:bg-white/10"
                      >
                        <div className="flex items-center">
                          <FileDown className="w-3.5 h-3.5 mr-3 text-emerald-400" />
                          <span>{tpl.name}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Column Menu */}
            <div className="relative" ref={menuRef}>
              <button 
                onClick={() => setShowColMenu(!showColMenu)}
                className={`flex items-center space-x-2 px-4 py-2 text-[9px] font-black uppercase tracking-widest rounded-xl border-2 transition-all
                  ${showColMenu ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}
              >
                <Columns className="w-3.5 h-3.5" />
                <span>Columns</span>
                <ChevronDown className={`w-3 h-3 transition-transform ${showColMenu ? 'rotate-180' : ''}`} />
              </button>
              
              {showColMenu && (
                <div 
                  className="absolute right-0 top-full mt-3 w-64 bg-slate-950 border border-white/10 rounded-[2rem] shadow-[0_30px_60px_-15px_rgba(0,0,0,0.5)] z-[100] py-4 overflow-hidden animate-in fade-in zoom-in-95 duration-200"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="px-6 py-2 border-b border-white/5 text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">Configure Grid</div>
                  <div className="p-2 space-y-1 max-h-[400px] overflow-y-auto custom-scrollbar">
                    {[
                      { key: 'type', label: 'Type Facture' },
                      { key: 'po', label: 'Order PO' },
                      { key: 'buyerRef', label: 'Ref Client' },
                      { key: 'dates', label: 'Dates Échéance' },
                      { key: 'supplierDetails', label: 'IDs Fiscaux' },
                      { key: 'breakdown', label: 'Details HT/TVA' },
                      { key: 'payment', label: 'Banque/RIB' },
                      { key: 'buyer', label: 'Client Profile' },
                    ].map((opt) => (
                      <button
                        key={opt.key}
                        onClick={() => toggleColumn(opt.key as keyof typeof visible)}
                        className={`w-full flex items-center justify-between px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-left rounded-xl transition-all
                          ${visible[opt.key as keyof typeof visible] ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-white/5'}`}
                      >
                        <span>{opt.label}</span>
                        {visible[opt.key as keyof typeof visible] && <CheckCircle2 className="w-3.5 h-3.5" />}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="overflow-x-auto custom-scrollbar bg-white rounded-b-[2rem]">
          <table className="w-full text-sm text-left border-collapse table-fixed">
            <thead className="text-[9px] text-slate-500 uppercase font-black bg-slate-100/50 border-b border-slate-200 sticky top-0 z-30 backdrop-blur-md">
              <tr>
                <th className="w-10 px-0 text-center sticky left-0 bg-slate-100/80 z-30 border-r-2 border-slate-200">
                  <div className="flex items-center justify-center h-full w-full">
                    <input 
                      type="checkbox"
                      checked={allSelected}
                      onChange={onToggleAll}
                      className="w-4 h-4 rounded border-slate-400 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                    />
                  </div>
                </th>
                <th className="w-16 px-0 text-center sticky left-10 bg-slate-100/80 z-30 border-r-2 border-slate-200">Audit</th>
                <th className="px-0 py-3 font-black text-center relative group/th" style={{ width: colWidths.direction }}> <Resizer colKey="direction" /></th>
                
                {visible.type && <th className="px-2 py-3 font-black relative group/th" style={{ width: colWidths.type }}>Type <Resizer colKey="type" /></th>}
                <th className="px-2 py-3 font-black relative group/th text-slate-900" style={{ width: colWidths.invoiceNumber }}>N° Facture <Resizer colKey="invoiceNumber" /></th>
                {visible.po && <th className="px-2 py-3 font-black relative group/th" style={{ width: colWidths.poNumber }}>PO <Resizer colKey="poNumber" /></th>}
                {visible.buyerRef && <th className="px-2 py-3 font-black relative group/th" style={{ width: colWidths.buyerRef }}>ByRef <Resizer colKey="buyerRef" /></th>}
                <th className="px-2 py-3 font-black relative group/th" style={{ width: colWidths.date }}>Date <Resizer colKey="date" /></th>
                {visible.dates && <th className="px-2 py-3 font-black relative group/th" style={{ width: colWidths.dueDate }}>Échéance <Resizer colKey="dueDate" /></th>}

                <th className="px-2 py-3 font-black bg-indigo-50/20 relative group/th border-l-2 border-slate-100 text-indigo-900" style={{ width: colWidths.supplier }}>Fournisseur <Resizer colKey="supplier" /></th>
                {visible.supplierDetails && <th className="px-2 py-3 font-black bg-indigo-50/10 relative group/th" style={{ width: colWidths.supplierDetails }}>VAT ID <Resizer colKey="supplierDetails" /></th>}

                <th className="px-2 py-3 font-black text-right bg-emerald-50/20 relative group/th border-l-2 border-slate-100 text-emerald-900" style={{ width: colWidths.total }}>Total TTC <Resizer colKey="total" /></th>
                <th className="px-2 py-3 font-black text-slate-400 relative group/th border-l-2 border-slate-100" style={{ width: colWidths.filename }}>Source <Resizer colKey="filename" /></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {invoices.map((inv) => {
                const isSelected = selectedIds.has(inv.id);
                const isOutbound = inv.direction === 'OUTBOUND';

                return (
                  <tr key={inv.id} className={`group transition-colors ${isSelected ? 'bg-indigo-50/30' : 'hover:bg-slate-50'}`}>
                    <td className="px-0 py-3 text-center sticky left-0 bg-white group-hover:bg-slate-50 border-r-2 border-slate-100 z-10">
                      <div className="flex items-center justify-center h-full w-full">
                        <input 
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => onToggleSelection(inv.id)}
                          className="w-4 h-4 rounded border-slate-400 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                        />
                      </div>
                    </td>
                    <td className="px-0 py-3 text-center sticky left-10 bg-white group-hover:bg-slate-50 border-r-2 border-slate-100 z-10 flex justify-center items-center h-full gap-2">
                      {getStatusIcon(inv.erpStatus)}
                      <button onClick={() => setEditingFacturXId(inv.id)} className="text-slate-400 hover:text-indigo-600 p-1 hover:bg-white rounded-lg border border-transparent hover:border-indigo-100" title="Full Audit">
                        <Maximize2 className="w-4 h-4" />
                      </button>
                    </td>
                    
                    <td className="px-0 py-3 text-center">
                       <div className="flex justify-center">
                         {isOutbound ? <ArrowUpRight className="w-4 h-4 text-purple-600" /> : <ArrowDownLeft className="w-4 h-4 text-indigo-600" />}
                       </div>
                    </td>

                    {visible.type && (
                      <td className="px-2 py-3">
                        <select
                            value={inv.invoiceType}
                            onChange={(e) => onUpdate(inv.id, { invoiceType: e.target.value as InvoiceType })}
                            className="w-full bg-white border border-slate-200 text-[10px] font-black px-2 py-1 rounded outline-none text-slate-900"
                          >
                            <option value={InvoiceType.INVOICE}>FACT</option>
                            <option value={InvoiceType.CREDIT_NOTE}>AVOIR</option>
                          </select>
                      </td>
                    )}

                    <td className="px-2 py-3">
                      <input type="text" value={inv.invoiceNumber} onChange={(e) => onUpdate(inv.id, { invoiceNumber: e.target.value })} className={inputClass} />
                    </td>
                    {visible.po && (
                      <td className="px-2 py-3">
                        <input type="text" value={inv.poNumber || ''} onChange={(e) => onUpdate(inv.id, { poNumber: e.target.value })} className={inputClass} />
                      </td>
                    )}
                    {visible.buyerRef && (
                      <td className="px-2 py-3">
                        <input type="text" value={inv.buyerReference || ''} onChange={(e) => onUpdate(inv.id, { buyerReference: e.target.value })} className={inputClass} />
                      </td>
                    )}
                    <td className="px-2 py-3">
                      <input type="text" value={inv.invoiceDate} onChange={(e) => onUpdate(inv.id, { invoiceDate: e.target.value })} className={inputClass} />
                    </td>
                    {visible.dates && (
                      <td className="px-2 py-3">
                        <input type="text" value={inv.dueDate || ''} onChange={(e) => onUpdate(inv.id, { dueDate: e.target.value })} className={inputClass} />
                      </td>
                    )}

                    <td className="px-2 py-3 bg-indigo-50/5 border-l-2 border-slate-50">
                      <input type="text" value={inv.supplier} onChange={(e) => onUpdate(inv.id, { supplier: e.target.value })} className={`${inputClass} font-black text-slate-950`} />
                    </td>
                    {visible.supplierDetails && (
                      <td className="px-2 py-3 bg-indigo-50/5">
                        <input type="text" value={inv.supplierVat || ''} onChange={(e) => onUpdate(inv.id, { supplierVat: e.target.value })} className={inputClass} />
                      </td>
                    )}

                    <td className="px-2 py-3 bg-emerald-50/5 border-l-2 border-slate-50">
                      <input type="number" step="0.01" value={inv.amountInclVat ?? ''} onChange={(e) => onUpdate(inv.id, { amountInclVat: handleNumChange(e.target.value) })} className={`${numInputClass} font-black text-indigo-800 bg-indigo-50/50 rounded-lg`} />
                    </td>

                    <td className="px-2 py-3 text-slate-400 text-[9px] font-bold truncate border-l-2 border-slate-50 italic" title={inv.originalFilename}>
                      {inv.originalFilename}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
