
import React, { useState, useMemo, useEffect } from 'react';
import { Settings, X, Database, Search, UploadCloud, Plus, Trash2, ChevronLeft, ChevronRight, BarChart3, Users, Zap, ShieldCheck, Download, Save } from 'lucide-react';
import { ErpConfig, LookupTable, ExportTemplate, PartnerMasterData, XmlMappingProfile } from '../types';

const MD_PAGE_SIZE = 15;

interface ConfigurationModalProps {
  isOpen: boolean; onClose: () => void;
  erpConfig: ErpConfig; onSaveErp: (config: ErpConfig) => void;
  lookupTables: LookupTable[]; onSaveLookups: (tables: LookupTable[]) => void;
  templates: ExportTemplate[]; onSaveTemplates: (templates: ExportTemplate[]) => void;
  xmlProfiles: XmlMappingProfile[]; onSaveXmlProfiles: (profiles: XmlMappingProfile[]) => void;
  masterData: PartnerMasterData[]; onSaveMasterData: (data: PartnerMasterData[]) => void;
}

export const ConfigurationModal: React.FC<ConfigurationModalProps> = ({ 
  isOpen, onClose, erpConfig, onSaveErp, lookupTables, onSaveLookups, templates, onSaveTemplates, xmlProfiles, onSaveXmlProfiles, masterData, onSaveMasterData 
}) => {
  const [activeTab, setActiveTab] = useState<'stats' | 'masterdata' | 'erp'>('stats');
  const [localMasterData, setLocalMasterData] = useState<PartnerMasterData[]>(masterData || []);
  const [mdSearch, setMdSearch] = useState('');
  const [mdPage, setMdPage] = useState(1);

  useEffect(() => { if (isOpen) setLocalMasterData(masterData || []); }, [isOpen, masterData]);

  const filteredMD = useMemo(() => {
    const s = mdSearch.toLowerCase();
    return localMasterData.filter(m => m.name.toLowerCase().includes(s) || m.siret.includes(s) || m.erpCode.toLowerCase().includes(s));
  }, [localMasterData, mdSearch]);

  const mdTotalPages = Math.ceil(filteredMD.length / MD_PAGE_SIZE);
  const paginatedMD = useMemo(() => filteredMD.slice((mdPage - 1) * MD_PAGE_SIZE, mdPage * MD_PAGE_SIZE), [filteredMD, mdPage]);

  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const rows = (event.target?.result as string).split('\n').slice(1);
      const imported = rows.map(row => {
        const c = row.split(';');
        if (c.length < 3) return null;
        return { id: crypto.randomUUID(), name: c[0]?.trim(), erpCode: c[1]?.trim(), siret: c[2]?.replace(/\s/g, ''), vatNumber: c[3]?.trim(), iban: c[4]?.trim() } as PartnerMasterData;
      }).filter(Boolean) as PartnerMasterData[];
      setLocalMasterData(prev => [...imported, ...prev]);
      alert(`${imported.length} tiers ajoutés.`);
    };
    reader.readAsText(file);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-[110] p-4">
      <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-7xl h-[90vh] flex flex-col overflow-hidden">
        <div className="px-10 py-6 border-b border-slate-100 flex justify-between items-center bg-white shrink-0">
          <div className="flex items-center space-x-6">
            <div className="bg-slate-950 p-3 rounded-2xl text-white"><Settings className="w-6 h-6" /></div>
            <div><h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Configuration Hub</h2><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">SaaS Enterprise Scaling</p></div>
          </div>
          <button onClick={onClose} className="p-3 text-slate-400 hover:text-rose-500 bg-slate-50 rounded-xl"><X className="w-6 h-6" /></button>
        </div>

        <div className="flex-1 flex overflow-hidden">
          <div className="w-64 bg-slate-50 border-r border-slate-100 p-6 space-y-2 shrink-0">
            <button onClick={() => setActiveTab('stats')} className={`w-full flex items-center space-x-4 px-6 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'stats' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:bg-white'}`}><BarChart3 className="w-5 h-5" /><span>Dashboard</span></button>
            <button onClick={() => setActiveTab('masterdata')} className={`w-full flex items-center space-x-4 px-6 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'masterdata' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:bg-white'}`}><Database className="w-5 h-5" /><span>Master Data Hub</span></button>
          </div>

          <div className="flex-1 p-10 overflow-y-auto custom-scrollbar bg-white">
            {activeTab === 'stats' && (
              <div className="space-y-10">
                <div className="grid grid-cols-3 gap-8">
                  <div className="p-8 bg-indigo-50 border border-indigo-100 rounded-[2.5rem] space-y-3"><Users className="w-6 h-6 text-indigo-600" /><p className="text-3xl font-black">{localMasterData.length.toLocaleString()}</p><p className="text-[10px] font-black uppercase text-slate-400">Tiers Référencés</p></div>
                  <div className="p-8 bg-emerald-50 border border-emerald-100 rounded-[2.5rem] space-y-3"><ShieldCheck className="w-6 h-6 text-emerald-600" /><p className="text-3xl font-black">100%</p><p className="text-[10px] font-black uppercase text-slate-400">Conformité RFE</p></div>
                  <div className="p-8 bg-purple-50 border border-purple-100 rounded-[2.5rem] space-y-3"><Zap className="w-6 h-6 text-purple-600" /><p className="text-3xl font-black">Fast</p><p className="text-[10px] font-black uppercase text-slate-400">Mode Render Optimized</p></div>
                </div>
                <div className="bg-slate-900 rounded-[2.5rem] p-10 text-white border-b-8 border-indigo-600">
                  <h4 className="text-lg font-black uppercase mb-4 tracking-tighter">Infrastructure & Cost-Efficiency</h4>
                  <p className="text-xs text-slate-400 font-medium leading-relaxed">Le pipeline utilise <b>Gemini 3 Flash</b> avec un prompt compressé minimisant les tokens d'entrée. La précision est garantie par des schémas JSON stricts conformes à la norme EN16931. L'hébergement sur Render est optimisé pour les threads asynchrones.</p>
                </div>
              </div>
            )}

            {activeTab === 'masterdata' && (
              <div className="space-y-8 animate-in fade-in">
                <div className="flex justify-between items-end">
                  <div className="relative flex-1 max-w-md"><Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" /><input type="text" placeholder="Rechercher tiers..." value={mdSearch} onChange={e => {setMdSearch(e.target.value); setMdPage(1);}} className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-[10px] font-black uppercase outline-none focus:bg-white" /></div>
                  <div className="flex space-x-3">
                    <label className="px-6 py-3 bg-white border border-slate-200 rounded-xl text-[10px] font-black uppercase cursor-pointer hover:bg-slate-50 transition-all flex items-center"><UploadCloud className="w-4 h-4 mr-2" /> Import CSV<input type="file" accept=".csv" onChange={handleImportCSV} className="hidden" /></label>
                    <button onClick={() => setLocalMasterData([{id: crypto.randomUUID(), name: 'Nouveau Tiers', erpCode: '', siret: '', vatNumber: ''}, ...localMasterData])} className="px-6 py-3 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase flex items-center shadow-lg"><Plus className="w-4 h-4 mr-2" /> Ajouter</button>
                  </div>
                </div>

                <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 text-[8px] font-black text-slate-400 uppercase tracking-widest">
                      <tr><th className="px-6 py-4">Nom Tiers</th><th className="px-6 py-4">Code ERP</th><th className="px-6 py-4">SIRET</th><th className="px-6 py-4 text-right">Action</th></tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {paginatedMD.map(m => (
                        <tr key={m.id} className="hover:bg-slate-50/50">
                          <td className="px-6 py-4"><input value={m.name} onChange={e => setLocalMasterData(prev => prev.map(x => x.id === m.id ? {...x, name: e.target.value} : x))} className="bg-transparent outline-none font-bold text-xs w-full" /></td>
                          <td className="px-6 py-4"><input value={m.erpCode} onChange={e => setLocalMasterData(prev => prev.map(x => x.id === m.id ? {...x, erpCode: e.target.value} : x))} className="bg-transparent outline-none font-black text-indigo-600 text-xs w-full uppercase" /></td>
                          <td className="px-6 py-4 font-mono text-[10px]">{m.siret}</td>
                          <td className="px-6 py-4 text-right"><button onClick={() => setLocalMasterData(prev => prev.filter(x => x.id !== m.id))} className="text-slate-300 hover:text-rose-500"><Trash2 className="w-4 h-4" /></button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex items-center justify-between py-4 border-t border-slate-50">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{filteredMD.length} Tiers trouvés</p>
                  <div className="flex items-center space-x-2">
                    <button onClick={() => setMdPage(p => Math.max(1, p-1))} disabled={mdPage === 1} className="p-2 disabled:opacity-20"><ChevronLeft className="w-4 h-4" /></button>
                    <span className="text-[10px] font-black text-indigo-600">Page {mdPage} / {mdTotalPages || 1}</span>
                    <button onClick={() => setMdPage(p => Math.min(mdTotalPages, p+1))} disabled={mdPage === mdTotalPages} className="p-2 disabled:opacity-20"><ChevronRight className="w-4 h-4" /></button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="px-10 py-6 bg-slate-50 border-t border-slate-100 flex justify-end items-center space-x-6 shrink-0">
          <button onClick={onClose} className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-600">Annuler</button>
          <button onClick={() => { onSaveMasterData(localMasterData); onSaveErp(erpConfig); onClose(); }} className="bg-slate-950 text-white px-12 py-5 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-2xl flex items-center border-b-4 border-slate-800 active:scale-95"><Save className="w-5 h-5 mr-3" /> Enregistrer les modifications</button>
        </div>
      </div>
    </div>
  );
};
