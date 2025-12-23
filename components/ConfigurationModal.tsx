
import React, { useState, useRef } from 'react';
// Added ArrowDownLeft to the lucide-react imports to fix the 'Cannot find name' error.
import { Settings, Save, X, Server, Database, FileSpreadsheet, Plus, Trash2, Edit2, GripVertical, ChevronDown, Upload, CloudLightning, ShieldCheck, Search, FileDown, Table, Layers, ArrowDownLeft } from 'lucide-react';
import { ErpConfig, LookupTable, ExportTemplate, PartnerMasterData, SageX3Config, ExportColumn } from '../types';

interface ConfigurationModalProps {
  isOpen: boolean;
  onClose: () => void;
  erpConfig: ErpConfig;
  onSaveErp: (config: ErpConfig) => void;
  lookupTables: LookupTable[];
  onSaveLookups: (tables: LookupTable[]) => void;
  templates: ExportTemplate[];
  onSaveTemplates: (templates: ExportTemplate[]) => void;
  masterData: PartnerMasterData[];
  onSaveMasterData: (data: PartnerMasterData[]) => void;
}

export const ConfigurationModal: React.FC<ConfigurationModalProps> = ({ 
  isOpen, onClose, 
  erpConfig, onSaveErp,
  lookupTables, onSaveLookups,
  templates, onSaveTemplates,
  masterData, onSaveMasterData
}) => {
  const [activeTab, setActiveTab] = useState<'erp' | 'masterdata' | 'templates' | 'lookups'>('erp');
  const [localErp, setLocalErp] = useState<ErpConfig>(erpConfig);
  const [localMasterData, setLocalMasterData] = useState<PartnerMasterData[]>(masterData);
  const [localTemplates, setLocalTemplates] = useState<ExportTemplate[]>(templates);
  const [localLookups, setLocalLookups] = useState<LookupTable[]>(lookupTables);
  const [searchTiers, setSearchTiers] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleSaveAll = () => {
    onSaveErp(localErp);
    onSaveMasterData(localMasterData);
    onSaveLookups(localLookups);
    onSaveTemplates(localTemplates);
    onClose();
  };

  const handleAddTemplate = () => {
    const newTpl: ExportTemplate = {
      id: crypto.randomUUID(),
      name: 'Nouveau Modèle d\'Export',
      separator: 'semicolon',
      columns: [
        { header: 'Reference', type: 'field', value: 'invoiceNumber' },
        { header: 'Date', type: 'field', value: 'invoiceDate' },
        { header: 'Total', type: 'field', value: 'amountInclVat' }
      ]
    };
    setLocalTemplates([...localTemplates, newTpl]);
  };

  const updateTemplate = (id: string, updates: Partial<ExportTemplate>) => {
    setLocalTemplates(localTemplates.map(t => t.id === id ? { ...t, ...updates } : t));
  };

  const addColumn = (tplId: string) => {
    const tpl = localTemplates.find(t => t.id === tplId);
    if (!tpl) return;
    const newCols = [...tpl.columns, { header: 'Nouveau', type: 'field', value: 'notes' } as ExportColumn];
    updateTemplate(tplId, { columns: newCols });
  };

  const handleMasterDataUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const csv = event.target?.result as string;
      const lines = csv.split('\n');
      const headers = lines[0].toLowerCase().split(/[;,]/);
      
      const newPartners: PartnerMasterData[] = lines.slice(1).filter(l => l.trim()).map(line => {
        const values = line.split(/[;,]/);
        const p: any = { id: crypto.randomUUID() };
        headers.forEach((h, i) => {
          const val = values[i]?.trim();
          if (h.includes('code') || h.includes('id')) p.erpCode = val;
          else if (h.includes('nom') || h.includes('name')) p.name = val;
          else if (h.includes('siret')) p.siret = val;
          else if (h.includes('tva') || h.includes('vat')) p.vatNumber = val;
          else if (h.includes('iban')) p.iban = val;
          else if (h.includes('compte') || h.includes('group')) p.accountingGroup = val;
        });
        return p as PartnerMasterData;
      });

      setLocalMasterData([...localMasterData, ...newPartners]);
    };
    reader.readAsText(file);
  };

  const filteredMasterData = localMasterData.filter(p => 
    p.name?.toLowerCase().includes(searchTiers.toLowerCase()) || 
    p.siret?.includes(searchTiers) ||
    p.erpCode?.toLowerCase().includes(searchTiers.toLowerCase())
  ).slice(0, 50);

  return (
    <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-[110] backdrop-blur-md p-4">
      <div className="bg-white rounded-[2.5rem] shadow-[0_40px_100px_-20px_rgba(0,0,0,0.4)] border border-slate-200 w-full max-w-7xl h-[85vh] flex flex-col overflow-hidden">
        
        <div className="px-8 py-5 border-b border-slate-100 flex justify-between items-center bg-white shrink-0">
          <div className="flex items-center space-x-4">
            <div className="bg-indigo-600 p-2.5 rounded-2xl text-white shadow-lg">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900 tracking-tight">Configuration Hub</h2>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Unified System Parameters</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-900 transition-colors"><X className="w-6 h-6" /></button>
        </div>

        <div className="flex-1 flex overflow-hidden">
          <div className="w-72 bg-slate-50 border-r border-slate-200 p-6 space-y-2 shrink-0 overflow-y-auto custom-scrollbar">
             <TabButton icon={CloudLightning} label="Connecteur Sage X3" active={activeTab === 'erp'} onClick={() => setActiveTab('erp')} />
             <TabButton icon={Database} label="Master Data Tiers" active={activeTab === 'masterdata'} onClick={() => setActiveTab('masterdata')} />
             <TabButton icon={FileSpreadsheet} label="Export Templates" active={activeTab === 'templates'} onClick={() => setActiveTab('templates')} />
             <TabButton icon={Layers} label="Lookup Tables" active={activeTab === 'lookups'} onClick={() => setActiveTab('lookups')} />
          </div>

          <div className="flex-1 p-10 overflow-y-auto bg-white custom-scrollbar">
            {activeTab === 'erp' && (
              <div className="max-w-2xl space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="bg-indigo-600 text-white p-6 rounded-[2rem] shadow-xl shadow-indigo-100">
                  <div className="flex items-center space-x-3 mb-2">
                    <CloudLightning className="w-6 h-6" />
                    <h3 className="text-lg font-black uppercase tracking-tight">Sage X3 Web Services</h3>
                  </div>
                  <p className="text-indigo-100 text-sm font-medium leading-relaxed opacity-80">Configuration de l'endpoint SOAP/REST pour l'injection directe des factures dans Sage X3.</p>
                </div>

                <div className="grid grid-cols-1 gap-6">
                  <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-100 rounded-2xl">
                     <div className="flex items-center space-x-3">
                        <ShieldCheck className={`w-5 h-5 ${localErp.enabled ? 'text-emerald-500' : 'text-slate-300'}`} />
                        <span className="text-xs font-black uppercase text-slate-600">Statut de la Liaison ERP</span>
                     </div>
                     <button onClick={() => setLocalErp({...localErp, enabled: !localErp.enabled})} className={`w-12 h-6 rounded-full p-1 transition-all ${localErp.enabled ? 'bg-emerald-500' : 'bg-slate-300'}`}>
                        <div className={`w-4 h-4 bg-white rounded-full transition-all ${localErp.enabled ? 'translate-x-6' : 'translate-x-0'}`}></div>
                     </button>
                  </div>

                  <FormGroup label="Sage X3 Endpoint URL" value={localErp.apiUrl} onChange={(v:any)=>setLocalErp({...localErp, apiUrl:v})} placeholder="https://sage-x3.company.com/soap-generic/action" />
                  <div className="grid grid-cols-2 gap-4">
                    <FormGroup label="Dossier (Folder)" value={localErp.sageConfig?.folder || ''} onChange={(v:any)=>setLocalErp({...localErp, sageConfig: {...(localErp.sageConfig || {}), folder: v} as SageX3Config})} placeholder="SEED" />
                    <FormGroup label="User Sage" value={localErp.sageConfig?.user || ''} onChange={(v:any)=>setLocalErp({...localErp, sageConfig: {...(localErp.sageConfig || {}), user: v} as SageX3Config})} placeholder="ADMIN" />
                  </div>
                  <FormGroup label="Password / API Key" type="password" value={localErp.apiKey} onChange={(v:any)=>setLocalErp({...localErp, apiKey:v})} placeholder="••••••••" />
                </div>
              </div>
            )}

            {activeTab === 'masterdata' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="flex justify-between items-center">
                   <div>
                      <h3 className="text-xl font-black text-slate-900 tracking-tight">Référentiel Tiers (Master Data)</h3>
                      <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">Validation de concordance ERP</p>
                   </div>
                   <button onClick={() => fileInputRef.current?.click()} className="bg-indigo-600 text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center shadow-lg hover:bg-indigo-700 transition-all">
                      <Upload className="w-4 h-4 mr-2" /> Import CSV Tiers
                   </button>
                   <input type="file" ref={fileInputRef} onChange={handleMasterDataUpload} accept=".csv" className="hidden" />
                </div>

                <div className="relative">
                   <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                   <input 
                    type="text" 
                    placeholder="Rechercher par SIRET, Nom ou Code Sage..." 
                    value={searchTiers}
                    onChange={(e) => setSearchTiers(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 rounded-2xl border border-slate-200 bg-slate-50 outline-none focus:border-indigo-600 focus:bg-white text-sm font-bold text-slate-800 transition-all"
                   />
                </div>

                <div className="rounded-3xl border border-slate-100 overflow-hidden shadow-sm bg-white">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-[9px] font-black uppercase text-slate-500 tracking-widest border-b border-slate-100">
                       <tr>
                          <th className="px-6 py-4">Code ERP</th>
                          <th className="px-6 py-4">Raison Sociale</th>
                          <th className="px-6 py-4">SIRET</th>
                          <th className="px-6 py-4">TVA Intra</th>
                          <th className="px-6 py-4 text-right">Actions</th>
                       </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                       {filteredMasterData.map(p => (
                         <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                           <td className="px-6 py-4 font-mono text-xs font-bold text-indigo-600">{p.erpCode}</td>
                           <td className="px-6 py-4 font-black text-slate-800">{p.name}</td>
                           <td className="px-6 py-4 text-slate-500 font-medium">{p.siret}</td>
                           <td className="px-6 py-4 text-slate-500 font-medium">{p.vatNumber}</td>
                           <td className="px-6 py-4 text-right">
                              <button onClick={() => setLocalMasterData(localMasterData.filter(x => x.id !== p.id))} className="text-slate-300 hover:text-rose-500 p-2 rounded-lg hover:bg-rose-50 transition-all">
                                 <Trash2 className="w-4 h-4" />
                              </button>
                           </td>
                         </tr>
                       ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === 'templates' && (
              <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="flex justify-between items-center">
                  <h3 className="text-xl font-black text-slate-900 tracking-tight">Générateur de Fichiers Plats (CSV/Excel)</h3>
                  <button onClick={handleAddTemplate} className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center shadow-lg">
                    <Plus className="w-4 h-4 mr-2" /> Nouveau Modèle
                  </button>
                </div>

                {localTemplates.map(tpl => (
                  <div key={tpl.id} className="p-8 border-2 border-slate-200 rounded-[2.5rem] bg-white space-y-6 shadow-sm">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <FormGroup label="Nom du Modèle" value={tpl.name} onChange={(v:any) => updateTemplate(tpl.id, { name: v })} />
                      </div>
                      <div className="flex items-center space-x-2 ml-4">
                        <select 
                          value={tpl.separator} 
                          onChange={(e) => updateTemplate(tpl.id, { separator: e.target.value as any })}
                          className="bg-slate-100 border-2 border-slate-200 rounded-xl px-4 py-2 text-[10px] font-black uppercase outline-none focus:border-indigo-600"
                        >
                          <option value="comma">Virgule (,)</option>
                          <option value="semicolon">Point-Virgule (;)</option>
                          <option value="tab">Tabulation (\t)</option>
                        </select>
                        <button onClick={() => setLocalTemplates(localTemplates.filter(t => t.id !== tpl.id))} className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg">
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-3">
                      <div className="bg-slate-50 p-4 rounded-2xl grid grid-cols-12 gap-4 text-[9px] font-black uppercase text-slate-400 tracking-widest border-b border-slate-100">
                        <div className="col-span-3">Entête CSV</div>
                        <div className="col-span-2">Type</div>
                        <div className="col-span-5">Source / Pattern</div>
                        <div className="col-span-2 text-right">Action</div>
                      </div>
                      {tpl.columns.map((col, cIdx) => (
                        <div key={cIdx} className="grid grid-cols-12 gap-4 items-center bg-white p-2 border border-slate-100 rounded-xl hover:shadow-md transition-all">
                          <div className="col-span-3">
                            <input value={col.header} onChange={(e) => {
                              const newCols = [...tpl.columns];
                              newCols[cIdx].header = e.target.value;
                              updateTemplate(tpl.id, { columns: newCols });
                            }} className="w-full bg-slate-50 px-3 py-2 rounded-lg text-xs font-black outline-none border border-transparent focus:border-indigo-600" />
                          </div>
                          <div className="col-span-2">
                            <select value={col.type} onChange={(e) => {
                              const newCols = [...tpl.columns];
                              newCols[cIdx].type = e.target.value as any;
                              updateTemplate(tpl.id, { columns: newCols });
                            }} className="w-full bg-slate-50 px-3 py-2 rounded-lg text-xs font-black outline-none border border-transparent focus:border-indigo-600 appearance-none">
                              <option value="field">Champ</option>
                              <option value="static">Statique</option>
                              <option value="composite">Composé</option>
                            </select>
                          </div>
                          <div className="col-span-5">
                            <input value={col.value} onChange={(e) => {
                              const newCols = [...tpl.columns];
                              newCols[cIdx].value = e.target.value;
                              updateTemplate(tpl.id, { columns: newCols });
                            }} className="w-full bg-slate-50 px-3 py-2 rounded-lg text-xs font-bold font-mono outline-none border border-transparent focus:border-indigo-600" />
                          </div>
                          <div className="col-span-2 text-right">
                            <button onClick={() => {
                              const newCols = tpl.columns.filter((_, i) => i !== cIdx);
                              updateTemplate(tpl.id, { columns: newCols });
                            }} className="p-2 text-slate-300 hover:text-rose-500"><Trash2 className="w-4 h-4" /></button>
                          </div>
                        </div>
                      ))}
                      <button onClick={() => addColumn(tpl.id)} className="w-full py-4 border-2 border-dashed border-slate-200 rounded-2xl text-[10px] font-black uppercase text-slate-400 tracking-widest hover:border-indigo-300 hover:text-indigo-600 transition-all flex items-center justify-center">
                        <Plus className="w-4 h-4 mr-2" /> Ajouter une colonne
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'lookups' && (
              <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="flex justify-between items-center">
                  <h3 className="text-xl font-black text-slate-900 tracking-tight">Lookup Tables (Transcodage)</h3>
                  <button onClick={() => setLocalLookups([...localLookups, { id: crypto.randomUUID(), name: 'Nouvelle Table', entries: [] }])} className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center">
                    <Plus className="w-4 h-4 mr-2" /> Créer Table
                  </button>
                </div>
                {localLookups.map(table => (
                   <div key={table.id} className="p-8 border-2 border-slate-200 rounded-[2.5rem] bg-white space-y-4">
                      <div className="flex justify-between">
                         <input value={table.name} onChange={(e) => setLocalLookups(localLookups.map(l => l.id === table.id ? {...l, name: e.target.value} : l))} className="text-lg font-black outline-none border-b-2 border-transparent focus:border-indigo-600" />
                         <button onClick={() => setLocalLookups(localLookups.filter(l => l.id !== table.id))} className="text-rose-500 p-2"><Trash2 className="w-5 h-5" /></button>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                         {table.entries.map((entry, eIdx) => (
                           <div key={eIdx} className="flex items-center space-x-2">
                              <input placeholder="Source" value={entry.key} onChange={(e) => {
                                const newEnt = [...table.entries];
                                newEnt[eIdx].key = e.target.value;
                                setLocalLookups(localLookups.map(l => l.id === table.id ? {...l, entries: newEnt} : l));
                              }} className="flex-1 bg-slate-50 px-3 py-2 rounded-lg text-xs font-black" />
                              <ArrowDownLeft className="w-4 h-4 text-indigo-400 -rotate-90" />
                              <input placeholder="Cible" value={entry.value} onChange={(e) => {
                                const newEnt = [...table.entries];
                                newEnt[eIdx].value = e.target.value;
                                setLocalLookups(localLookups.map(l => l.id === table.id ? {...l, entries: newEnt} : l));
                              }} className="flex-1 bg-indigo-50 px-3 py-2 rounded-lg text-xs font-black text-indigo-700" />
                              <button onClick={() => {
                                 const newEnt = table.entries.filter((_, i) => i !== eIdx);
                                 setLocalLookups(localLookups.map(l => l.id === table.id ? {...l, entries: newEnt} : l));
                              }}><X className="w-4 h-4 text-slate-300" /></button>
                           </div>
                         ))}
                         <button onClick={() => {
                            const newEnt = [...table.entries, { key: '', value: '' }];
                            setLocalLookups(localLookups.map(l => l.id === table.id ? {...l, entries: newEnt} : l));
                         }} className="col-span-2 py-3 border-2 border-dashed border-slate-200 rounded-xl text-[10px] font-black uppercase text-slate-400">Ajouter Entrée</button>
                      </div>
                   </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="px-8 py-5 bg-slate-50 border-t border-slate-100 flex justify-end items-center space-x-4 shrink-0">
          <button onClick={onClose} className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-600 transition-colors">Cancel</button>
          <button onClick={handleSaveAll} className="bg-slate-900 text-white px-10 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl hover:bg-black transition-all flex items-center">
            <Save className="w-4 h-4 mr-2" /> Commit Changes
          </button>
        </div>
      </div>
    </div>
  );
};

const TabButton = ({ icon: Icon, label, active, onClick }: any) => (
  <button 
    onClick={onClick}
    className={`w-full flex items-center space-x-3 px-5 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all
      ${active ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-100' : 'text-slate-400 hover:bg-white hover:text-slate-900'}`}
  >
    <Icon className="w-5 h-5" />
    <span>{label}</span>
  </button>
);

const FormGroup = ({ label, value, onChange, placeholder, type = "text" }: any) => (
  <div className="space-y-1.5">
    <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider ml-1">{label}</label>
    <input 
      type={type} 
      value={value} 
      onChange={(e) => onChange(e.target.value)} 
      placeholder={placeholder}
      className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 outline-none focus:border-indigo-600 focus:bg-white text-sm font-bold text-slate-800 transition-all"
    />
  </div>
);
