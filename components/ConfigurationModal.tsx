
import React, { useState, useRef, useMemo } from 'react';
import { Settings, Save, X, Server, Database, FileSpreadsheet, Plus, Trash2, Edit2, GripVertical, ChevronDown, Upload, CloudLightning, ShieldCheck, Search, FileDown, Table, Layers, ArrowDownLeft, BookOpen, Info, HelpCircle, Code, UserPlus, FileJson, Package, LayoutTemplate, Tag } from 'lucide-react';
import { ErpConfig, LookupTable, ExportTemplate, PartnerMasterData, SageX3Config, ExportColumn, XmlMappingProfile } from '../types';

// --- DATA DICTIONARY ---
const FIELD_GROUPS = [
  {
    name: 'Identification Document',
    fields: [
      { id: 'invoiceNumber', label: 'Numéro de Facture', bt: 'BT-1', desc: 'Identifiant unique' },
      { id: 'invoiceDate', label: 'Date de Facture', bt: 'BT-2', desc: 'Date d\'émission' },
      { id: 'invoiceType', label: 'Type de Document', bt: 'BT-3', desc: 'Facture ou Avoir' },
      { id: 'currency', label: 'Devise', bt: 'BT-5', desc: 'Code ISO (EUR, USD...)' },
    ]
  },
  {
    name: 'Fournisseur (Vendeur)',
    fields: [
      { id: 'supplier', label: 'Nom Fournisseur', bt: 'BT-27', desc: 'Raison sociale' },
      { id: 'supplierSiret', label: 'SIRET Fournisseur', bt: 'BT-29', desc: '14 chiffres' },
      { id: 'supplierVat', label: 'TVA Fournisseur', bt: 'BT-31', desc: 'TVA intracommunautaire' },
      { id: 'supplierErpCode', label: 'Code Tiers ERP', bt: 'N/A', desc: 'Mapping Sage/ERP' },
    ]
  },
  {
    name: 'Totaux Financiers',
    fields: [
      { id: 'amountExclVat', label: 'Total HT', bt: 'BT-109', desc: 'Base imposable' },
      { id: 'totalVat', label: 'Total TVA', bt: 'BT-110', desc: 'Somme des taxes' },
      { id: 'amountInclVat', label: 'Total TTC', bt: 'BT-112', desc: 'Net à payer' },
    ]
  },
  {
    name: 'Lignes de Détail',
    fields: [
      { id: 'articleId', label: 'Réf Article', bt: 'BT-155', desc: 'Code produit' },
      { id: 'description', label: 'Désignation', bt: 'BT-154', desc: 'Libellé de ligne' },
      { id: 'quantity', label: 'Quantité', bt: 'BT-129', desc: 'Nombre d\'unités' },
      { id: 'unitPrice', label: 'Prix Unitaire', bt: 'BT-146', desc: 'Net de remise' },
      { id: 'amount', label: 'Total Ligne HT', bt: 'BT-131', desc: 'Q x P' },
    ]
  }
];

const FLAT_FIELDS = FIELD_GROUPS.flatMap(g => g.fields);

interface ConfigurationModalProps {
  isOpen: boolean;
  onClose: () => void;
  erpConfig: ErpConfig;
  onSaveErp: (config: ErpConfig) => void;
  lookupTables: LookupTable[];
  onSaveLookups: (tables: LookupTable[]) => void;
  templates: ExportTemplate[];
  onSaveTemplates: (templates: ExportTemplate[]) => void;
  xmlProfiles: XmlMappingProfile[];
  onSaveXmlProfiles: (profiles: XmlMappingProfile[]) => void;
  masterData: PartnerMasterData[];
  onSaveMasterData: (data: PartnerMasterData[]) => void;
}

export const ConfigurationModal: React.FC<ConfigurationModalProps> = ({ 
  isOpen, onClose, 
  erpConfig, onSaveErp,
  lookupTables, onSaveLookups,
  templates, onSaveTemplates,
  xmlProfiles, onSaveXmlProfiles,
  masterData, onSaveMasterData
}) => {
  const [activeTab, setActiveTab] = useState<'masterdata' | 'templates' | 'xml' | 'lookups' | 'erp' | 'glossary'>('templates');
  
  const [localErp, setLocalErp] = useState<ErpConfig>(erpConfig);
  const [localMasterData, setLocalMasterData] = useState<PartnerMasterData[]>(masterData);
  const [localTemplates, setLocalTemplates] = useState<ExportTemplate[]>(templates);
  const [localXmlProfiles, setLocalXmlProfiles] = useState<XmlMappingProfile[]>(xmlProfiles || []);
  const [localLookups, setLocalLookups] = useState<LookupTable[]>(lookupTables);
  
  const [searchTiers, setSearchTiers] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleSaveAll = () => {
    onSaveErp(localErp);
    onSaveMasterData(localMasterData);
    onSaveLookups(localLookups);
    onSaveTemplates(localTemplates);
    onSaveXmlProfiles(localXmlProfiles);
    onClose();
  };

  // --- FLAT TEMPLATES LOGIC ---
  const handleAddTemplate = () => {
    setLocalTemplates([{ id: crypto.randomUUID(), name: 'Nouveau CSV', separator: 'semicolon', columns: [] }, ...localTemplates]);
  };
  const updateTemplate = (id: string, updates: Partial<ExportTemplate>) => {
    setLocalTemplates(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
  };
  const addColumn = (id: string) => {
    setLocalTemplates(prev => prev.map(t => t.id === id ? { ...t, columns: [...t.columns, { header: 'New Col', type: 'field', value: 'invoiceNumber' }] } : t));
  };

  // --- XML PROFILES LOGIC ---
  const handleAddXmlProfile = () => {
    setLocalXmlProfiles([{ 
        id: crypto.randomUUID(), 
        name: 'Custom XML Export', 
        rootTag: 'INVOICE_DATA', 
        itemTag: 'LINE',
        mappings: FLAT_FIELDS.map(f => ({ btId: f.id, xmlTag: f.id.toUpperCase(), enabled: true }))
    }, ...localXmlProfiles]);
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-[110] p-4">
      <div className="bg-white rounded-[2.5rem] shadow-[0_40px_100px_-20px_rgba(0,0,0,0.5)] border border-slate-200 w-full max-w-7xl h-[88vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="px-10 py-5 border-b border-slate-100 flex justify-between items-center bg-white shrink-0">
          <div className="flex items-center space-x-5">
            <div className="bg-slate-950 p-2.5 rounded-2xl text-white shadow-xl">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900 tracking-tight uppercase">Configuration Hub</h2>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] mt-1">Advanced Control Panel</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-rose-500 transition-colors bg-slate-50 rounded-xl"><X className="w-6 h-6" /></button>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* Navigation Sidebar */}
          <div className="w-72 bg-slate-50 border-r border-slate-200 p-6 space-y-2 shrink-0 overflow-y-auto custom-scrollbar">
             <TabBtn icon={Database} label="Master Data" active={activeTab === 'masterdata'} onClick={() => setActiveTab('masterdata')} />
             <TabBtn icon={FileSpreadsheet} label="Flat Templates" active={activeTab === 'templates'} onClick={() => setActiveTab('templates')} />
             <TabBtn icon={FileJson} label="XML Mapping" active={activeTab === 'xml'} onClick={() => setActiveTab('xml')} />
             <TabBtn icon={Layers} label="Transcoding" active={activeTab === 'lookups'} onClick={() => setActiveTab('lookups')} />
             <TabBtn icon={CloudLightning} label="Connecteur Sage" active={activeTab === 'erp'} onClick={() => setActiveTab('erp')} />
             <TabBtn icon={BookOpen} label="Glossary" active={activeTab === 'glossary'} onClick={() => setActiveTab('glossary')} />
          </div>

          {/* Tab Content Area */}
          <div className="flex-1 p-12 overflow-y-auto bg-white custom-scrollbar">
            
            {/* MASTER DATA */}
            {activeTab === 'masterdata' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                <SectionHeader title="Référentiel Tiers" desc="Validation de concordance ERP (Clé: SIRET)">
                   <button onClick={() => setLocalMasterData([{id: crypto.randomUUID(), erpCode:'NEW', name:'Nouveau Tiers', siret:'', vatNumber:''}, ...localMasterData])} className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center shadow-lg"><Plus className="w-4 h-4 mr-2" /> Ajout Manuel</button>
                </SectionHeader>
                <div className="rounded-[2rem] border border-slate-100 overflow-hidden shadow-sm">
                  <table className="w-full text-left text-[10px] table-fixed">
                    <thead className="bg-slate-50 font-black uppercase text-slate-400 border-b border-slate-100">
                       <tr>
                          <th className="px-6 py-4 w-32">ERP Code</th>
                          <th className="px-6 py-4">Nom / Raison Sociale</th>
                          <th className="px-6 py-4 w-44">SIRET</th>
                          <th className="px-6 py-4 w-16"></th>
                       </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                       {localMasterData.map(p => (
                         <tr key={p.id} className="hover:bg-slate-50/50">
                           <td className="px-4 py-2"><input value={p.erpCode} onChange={e=>setLocalMasterData(prev=>prev.map(x=>x.id===p.id?{...x, erpCode:e.target.value}:x))} className="w-full bg-transparent border-b border-transparent focus:border-indigo-500 font-black text-indigo-600" /></td>
                           <td className="px-4 py-2"><input value={p.name} onChange={e=>setLocalMasterData(prev=>prev.map(x=>x.id===p.id?{...x, name:e.target.value}:x))} className="w-full bg-transparent border-b border-transparent focus:border-indigo-500 font-bold text-slate-800" /></td>
                           <td className="px-4 py-2"><input value={p.siret} onChange={e=>setLocalMasterData(prev=>prev.map(x=>x.id===p.id?{...x, siret:e.target.value.replace(/\s/g,'')}:x))} className="w-full bg-transparent border-b border-transparent focus:border-indigo-500 font-mono text-slate-500" /></td>
                           <td className="px-4 py-2 text-right"><button onClick={()=>setLocalMasterData(prev=>prev.filter(x=>x.id!==p.id))} className="text-slate-300 hover:text-rose-500"><Trash2 className="w-4 h-4" /></button></td>
                         </tr>
                       ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* FLAT TEMPLATES */}
            {activeTab === 'templates' && (
              <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                <SectionHeader title="Flat File Templates" desc="Générateur de fichiers plats (CSV/TXT/TAB)">
                   <button onClick={handleAddTemplate} className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center shadow-lg"><Plus className="w-4 h-4 mr-2" /> Nouveau Modèle</button>
                </SectionHeader>
                {localTemplates.map(tpl => (
                  <ConfigCard key={tpl.id} title={tpl.name} onDelete={()=>setLocalTemplates(prev=>prev.filter(t=>t.id!==tpl.id))}>
                    <div className="grid grid-cols-2 gap-4 mb-6">
                        <FormInput label="Nom du Modèle" value={tpl.name} onChange={v=>updateTemplate(tpl.id, {name:v})} />
                        <div className="flex flex-col space-y-1">
                            <label className="text-[9px] font-black uppercase text-slate-400 ml-1">Séparateur</label>
                            <select value={tpl.separator} onChange={e=>updateTemplate(tpl.id, {separator: e.target.value as any})} className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-black uppercase outline-none focus:border-indigo-600">
                                <option value="semicolon">Point-Virgule (;)</option>
                                <option value="comma">Virgule (,)</option>
                                <option value="tab">Tabulation (\t)</option>
                            </select>
                        </div>
                    </div>
                    <div className="space-y-2">
                        {tpl.columns.map((col, cIdx) => (
                           <div key={cIdx} className="grid grid-cols-12 gap-3 items-center bg-slate-50/50 p-2 rounded-xl border border-slate-100 group">
                              <div className="col-span-3">
                                <input value={col.header} onChange={e=>{
                                    const cols = [...tpl.columns]; cols[cIdx].header = e.target.value; updateTemplate(tpl.id, {columns:cols});
                                }} className="w-full bg-white px-3 py-2 rounded-lg text-[10px] font-black border border-slate-200 outline-none" placeholder="Header" />
                              </div>
                              <div className="col-span-7 flex space-x-2">
                                <select value={col.value} onChange={e=>{
                                    const cols = [...tpl.columns]; cols[cIdx].value = e.target.value; updateTemplate(tpl.id, {columns:cols});
                                }} className="flex-1 bg-white px-3 py-2 rounded-lg text-[10px] font-bold border border-slate-200 outline-none">
                                    {FLAT_FIELDS.map(f => <option key={f.id} value={f.id}>{f.label} ({f.bt})</option>)}
                                </select>
                                <select value={col.type} onChange={e=>{
                                    const cols = [...tpl.columns]; cols[cIdx].type = e.target.value as any; updateTemplate(tpl.id, {columns:cols});
                                }} className="w-24 bg-white px-3 py-2 rounded-lg text-[10px] font-black uppercase border border-slate-200">
                                    <option value="field">Field</option>
                                    <option value="static">Static</option>
                                    <option value="lookup">Map</option>
                                </select>
                              </div>
                              <div className="col-span-2 text-right">
                                <button onClick={()=>{
                                    const cols = tpl.columns.filter((_, i) => i !== cIdx); updateTemplate(tpl.id, {columns:cols});
                                }} className="p-2 text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all"><Trash2 className="w-4 h-4" /></button>
                              </div>
                           </div>
                        ))}
                        <button onClick={()=>addColumn(tpl.id)} className="w-full py-3 border-2 border-dashed border-slate-100 rounded-xl text-[9px] font-black uppercase text-slate-400 hover:border-indigo-200 hover:text-indigo-600 transition-all">Ajouter Colonne</button>
                    </div>
                  </ConfigCard>
                ))}
              </div>
            )}

            {/* XML MAPPING */}
            {activeTab === 'xml' && (
              <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                <SectionHeader title="XML Output Mapping" desc="Configurez des profils XML personnalisés">
                   <button onClick={handleAddXmlProfile} className="bg-slate-900 text-white px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center shadow-lg"><LayoutTemplate className="w-4 h-4 mr-2" /> Nouveau Profil XML</button>
                </SectionHeader>
                {localXmlProfiles.map(prof => (
                  <ConfigCard key={prof.id} title={prof.name} onDelete={()=>setLocalXmlProfiles(prev=>prev.filter(p=>p.id!==prof.id))}>
                    <div className="grid grid-cols-2 gap-4 mb-8">
                       <FormInput label="Nom du Profil" value={prof.name} onChange={v=>setLocalXmlProfiles(prev=>prev.map(p=>p.id===prof.id?{...p, name:v}:p))} />
                       <div className="grid grid-cols-2 gap-3">
                          <FormInput label="Balise Racine" value={prof.rootTag} onChange={v=>setLocalXmlProfiles(prev=>prev.map(p=>p.id===prof.id?{...p, rootTag:v}:p))} />
                          <FormInput label="Balise Item" value={prof.itemTag} onChange={v=>setLocalXmlProfiles(prev=>prev.map(p=>p.id===prof.id?{...p, itemTag:v}:p))} />
                       </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                       {prof.mappings.map((m, mIdx) => (
                         <div key={m.btId} className="flex items-center space-x-3 p-3 bg-slate-50 rounded-2xl border border-slate-100">
                            <input type="checkbox" checked={m.enabled} onChange={e=>{
                                const maps = [...prof.mappings]; maps[mIdx].enabled = e.target.checked;
                                setLocalXmlProfiles(prev=>prev.map(p=>p.id===prof.id?{...p, mappings:maps}:p));
                            }} className="w-4 h-4 rounded text-indigo-600" />
                            <div className="flex-1">
                                <p className="text-[8px] font-black text-slate-400 uppercase tracking-tighter mb-1">{FLAT_FIELDS.find(f=>f.id===m.btId)?.label}</p>
                                <input value={m.xmlTag} onChange={e=>{
                                    const maps = [...prof.mappings]; maps[mIdx].xmlTag = e.target.value.toUpperCase();
                                    setLocalXmlProfiles(prev=>prev.map(p=>p.id===prof.id?{...p, mappings:maps}:p));
                                }} className="w-full bg-white px-2 py-1 rounded-lg text-[10px] font-black border border-slate-200 outline-none focus:border-indigo-500" />
                            </div>
                            <Tag className="w-4 h-4 text-slate-200" />
                         </div>
                       ))}
                    </div>
                  </ConfigCard>
                ))}
              </div>
            )}

            {/* TRANSCODING */}
            {activeTab === 'lookups' && (
              <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                <SectionHeader title="Lookup Tables" desc="Tables de transcodage pour mapping ERP">
                   <button onClick={() => setLocalLookups([{id: crypto.randomUUID(), name:'Nouvelle Table', entries:[]}, ...localLookups])} className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center shadow-lg"><Plus className="w-4 h-4 mr-2" /> Créer Table</button>
                </SectionHeader>
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                  {localLookups.map(table => (
                    <ConfigCard key={table.id} title={table.name} onDelete={()=>setLocalLookups(prev=>prev.filter(l=>l.id!==table.id))}>
                      <input value={table.name} onChange={e=>setLocalLookups(prev=>prev.map(l=>l.id===table.id?{...l, name:e.target.value}:l))} className="text-sm font-black text-slate-900 border-b-2 border-slate-100 focus:border-indigo-600 outline-none w-full mb-4 px-1" />
                      <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                         {table.entries.map((ent, eIdx) => (
                           <div key={eIdx} className="flex items-center space-x-2">
                              <input value={ent.key} onChange={e=>{
                                 const entries = [...table.entries]; entries[eIdx].key = e.target.value;
                                 setLocalLookups(prev=>prev.map(l=>l.id===table.id?{...l, entries}:l));
                              }} className="flex-1 bg-slate-50 border border-slate-100 rounded-lg px-3 py-2 text-[10px] font-bold" placeholder="Source" />
                              <ArrowDownLeft className="w-3 h-3 text-indigo-400 shrink-0" />
                              <input value={ent.value} onChange={e=>{
                                 const entries = [...table.entries]; entries[eIdx].value = e.target.value;
                                 setLocalLookups(prev=>prev.map(l=>l.id===table.id?{...l, entries}:l));
                              }} className="flex-1 bg-indigo-50 border border-indigo-100 rounded-lg px-3 py-2 text-[10px] font-black text-indigo-700" placeholder="Target" />
                              <button onClick={()=>{
                                 const entries = table.entries.filter((_, i) => i !== eIdx);
                                 setLocalLookups(prev=>prev.map(l=>l.id===table.id?{...l, entries}:l));
                              }} className="text-slate-300 hover:text-rose-500 p-1"><X className="w-3 h-3" /></button>
                           </div>
                         ))}
                         <button onClick={()=>{
                            const entries = [...table.entries, {key:'', value:''}];
                            setLocalLookups(prev=>prev.map(l=>l.id===table.id?{...l, entries}:l));
                         }} className="w-full py-3 border border-dashed border-slate-200 rounded-xl text-[9px] font-black uppercase text-slate-400 hover:text-indigo-600 transition-all">Ajouter Entrée</button>
                      </div>
                    </ConfigCard>
                  ))}
                </div>
              </div>
            )}

            {/* SAGE X3 */}
            {activeTab === 'erp' && (
              <div className="max-w-3xl space-y-10 animate-in fade-in slide-in-from-right-4 duration-300">
                <SectionHeader title="Connecteur Sage X3" desc="Synchronisation directe via Web Services" />
                <div className="p-8 bg-indigo-600 rounded-[2.5rem] shadow-2xl text-white relative overflow-hidden">
                    <CloudLightning className="w-16 h-16 absolute -right-4 -top-4 text-white/10" />
                    <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center space-x-3">
                            <div className="p-2 bg-white/20 rounded-xl"><ShieldCheck className="w-5 h-5" /></div>
                            <span className="text-[10px] font-black uppercase tracking-widest">Statut de Liaison</span>
                        </div>
                        <button onClick={()=>setLocalErp({...localErp, enabled:!localErp.enabled})} className={`w-12 h-6 rounded-full p-1 transition-all ${localErp.enabled?'bg-emerald-400':'bg-white/20'}`}>
                           <div className={`w-4 h-4 bg-white rounded-full transition-all ${localErp.enabled?'translate-x-6':'translate-x-0'}`}></div>
                        </button>
                    </div>
                    <div className="space-y-6">
                       <FormInput label="Endpoint API Sage" value={localErp.apiUrl} onChange={v=>setLocalErp({...localErp, apiUrl:v})} theme="dark" />
                       <div className="grid grid-cols-2 gap-6">
                          <FormInput label="Dossier (Folder)" value={localErp.sageConfig?.folder||''} onChange={v=>setLocalErp({...localErp, sageConfig: {...(localErp.sageConfig||{} as SageX3Config), folder:v}})} theme="dark" />
                          <FormInput label="Utilisateur" value={localErp.sageConfig?.user||''} onChange={v=>setLocalErp({...localErp, sageConfig: {...(localErp.sageConfig||{} as SageX3Config), user:v}})} theme="dark" />
                       </div>
                       <FormInput label="Passkey / Token" type="password" value={localErp.apiKey} onChange={v=>setLocalErp({...localErp, apiKey:v})} theme="dark" />
                    </div>
                </div>
              </div>
            )}

            {/* GLOSSARY */}
            {activeTab === 'glossary' && (
              <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                <SectionHeader title="Data Dictionary" desc="Liste complète des points de données BT-IDs" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {FIELD_GROUPS.map(g => (
                        <div key={g.name} className="space-y-3">
                            <h4 className="text-[10px] font-black text-indigo-600 uppercase tracking-widest border-b-2 border-indigo-50 pb-2">{g.name}</h4>
                            <div className="space-y-2">
                                {g.fields.map(f => (
                                    <div key={f.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex justify-between items-center group hover:border-indigo-200 transition-all">
                                        <div className="min-w-0">
                                            <p className="text-[10px] font-black text-slate-900 truncate">{f.label}</p>
                                            <code className="text-[8px] text-indigo-500 font-black">{f.id}</code>
                                        </div>
                                        <span className="text-[8px] font-mono font-black bg-white px-2 py-0.5 rounded border border-slate-200 text-slate-400 group-hover:text-indigo-600 transition-colors">{f.bt}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
              </div>
            )}

          </div>
        </div>

        {/* Footer */}
        <div className="px-10 py-5 bg-slate-50 border-t border-slate-100 flex justify-end items-center space-x-4 shrink-0">
          <button onClick={onClose} className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-600 transition-colors">Discard</button>
          <button onClick={handleSaveAll} className="bg-slate-950 text-white px-12 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-2xl hover:bg-black transition-all flex items-center active:scale-95 border-b-4 border-slate-800">
            <Save className="w-4 h-4 mr-2" /> Commit All Configurations
          </button>
        </div>
      </div>
    </div>
  );
};

const TabBtn = ({ icon: Icon, label, active, onClick }: any) => (
  <button onClick={onClick} className={`w-full flex items-center space-x-3 px-5 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${active ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-100' : 'text-slate-400 hover:bg-white hover:text-slate-900'}`}>
    <Icon className="w-5 h-5" />
    <span className="truncate">{label}</span>
  </button>
);

const SectionHeader = ({ title, desc, children }: any) => (
  <div className="flex justify-between items-end pb-8 border-b border-slate-100 mb-8">
    <div>
      <h3 className="text-2xl font-black text-slate-900 tracking-tight">{title}</h3>
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">{desc}</p>
    </div>
    {children}
  </div>
);

const ConfigCard = ({ title, children, onDelete }: any) => (
  <div className="p-8 border-2 border-slate-100 rounded-[2.5rem] bg-white relative group/card shadow-sm hover:border-indigo-100 transition-all">
    <div className="flex justify-between items-center mb-6">
       <div className="flex items-center space-x-3">
          <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
          <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-600">{title}</h4>
       </div>
       <button onClick={onDelete} className="p-2 text-slate-200 hover:text-rose-500 transition-colors"><Trash2 className="w-4 h-4" /></button>
    </div>
    {children}
  </div>
);

const FormInput = ({ label, value, onChange, placeholder, type="text", theme="light" }: any) => (
  <div className="space-y-1.5 flex-1">
    <label className={`text-[9px] font-black uppercase tracking-wider ml-1 ${theme==='dark'?'text-white/40':'text-slate-400'}`}>{label}</label>
    <input 
      type={type} 
      value={value} 
      onChange={e=>onChange(e.target.value)} 
      placeholder={placeholder}
      className={`w-full px-4 py-3 rounded-xl border outline-none transition-all text-xs font-bold 
        ${theme==='dark' 
          ? 'bg-white/5 border-white/10 text-white placeholder-white/20 focus:border-white/30' 
          : 'bg-slate-50 border-slate-200 text-slate-800 placeholder-slate-300 focus:border-indigo-600 focus:bg-white'}`}
    />
  </div>
);
