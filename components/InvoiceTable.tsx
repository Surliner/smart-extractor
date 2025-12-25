
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { InvoiceData, InvoiceItem, ErpStatus, InvoiceType, LookupTable, ExportTemplate, XmlMappingProfile } from '../types';
import { Trash2, ChevronDown, CheckCircle2, AlertCircle, Circle, Columns, X, FileCode, ArrowDownLeft, ArrowUpRight, Maximize2, LayoutList, FileSpreadsheet, FileDown, Zap, ListChecks, FileJson, ShieldCheck, FileCheck } from 'lucide-react';
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
}

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
  xmlProfiles
}) => {
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const activeInvoice = useMemo(() => invoices.find(inv => inv.id === editingId), [invoices, editingId]);

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
    
    // Pour chaque facture, on génère un XML séparé conforme RFE
    targets.forEach((inv, index) => {
      setTimeout(() => {
        const xml = generateFacturXXML(inv);
        const blob = new Blob([xml], { type: 'application/xml;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `FACTUR-X_${inv.invoiceNumber || inv.id}.xml`;
        link.click();
      }, index * 200); // Petit délai pour éviter le blocage navigateur
    });
    
    setShowExportMenu(false);
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
        />
      )}

      {/* FLOATING ACTION BAR */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-12 left-1/2 -translate-x-1/2 z-[60] bg-slate-900/90 backdrop-blur-2xl text-white px-10 py-6 rounded-[3rem] shadow-2xl flex items-center space-x-12 animate-in slide-in-from-bottom-10 duration-500 border border-white/10">
          <div className="flex items-center space-x-4 border-r border-white/10 pr-10">
            <div className="bg-indigo-600 p-3 rounded-2xl"><ListChecks className="w-5 h-5" /></div>
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
              <span>Sync Sage</span>
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
                   <ShieldCheck className="w-3 h-3 mr-2" /> Formats RFE (Officiel)
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
                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">Blueprints XML (Custom)</p>
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
                  <input type="checkbox" checked={selectedIds.size === invoices.length && invoices.length > 0} onChange={onToggleAll} className="w-4 h-4 rounded border-slate-300" />
                </th>
                <th className="w-40 px-4 py-6">Numéro Facture</th>
                <th className="w-32 px-4 py-6">Date</th>
                <th className="px-4 py-6">Fournisseur</th>
                <th className="w-32 px-4 py-6 text-right">Total TTC</th>
                <th className="w-24 px-4 py-6 text-center">Audit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {invoices.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-20 text-center text-slate-400 font-bold uppercase tracking-widest text-[10px]">
                    Aucune facture dans le système
                  </td>
                </tr>
              ) : (
                invoices.map(inv => (
                  <tr key={inv.id} className={`group hover:bg-slate-50 transition-colors ${selectedIds.has(inv.id) ? 'bg-indigo-50/50' : ''}`}>
                    <td className="px-4 py-5 text-center">
                      <input type="checkbox" checked={selectedIds.has(inv.id)} onChange={() => onToggleSelection(inv.id)} className="w-4 h-4 rounded border-slate-300" />
                    </td>
                    <td className="px-4 py-5 font-black text-slate-900 text-xs">{inv.invoiceNumber}</td>
                    <td className="px-4 py-5 text-xs text-slate-500">{inv.invoiceDate}</td>
                    <td className="px-4 py-5 text-xs font-bold text-slate-800">
                      <div className="flex items-center">
                        {inv.supplier}
                        {inv.isMasterMatched && <ShieldCheck className="w-3 h-3 ml-2 text-emerald-500" />}
                      </div>
                    </td>
                    <td className="px-4 py-5 text-right font-black text-indigo-600 text-xs">{inv.amountInclVat?.toFixed(2)} {inv.currency}</td>
                    <td className="px-4 py-5 text-center">
                      <button onClick={() => setEditingId(inv.id)} className="p-2 text-slate-400 hover:text-indigo-600 bg-white border border-slate-200 rounded-xl shadow-sm"><Maximize2 className="w-4 h-4" /></button>
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
