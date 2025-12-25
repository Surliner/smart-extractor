
import React, { useState, useEffect } from 'react';
import { Settings, Save, X, Database, FileSpreadsheet, Plus, Trash2, CloudLightning, FileJson, Layers, BookOpen, Info, Landmark, Percent } from 'lucide-react';
import { ErpConfig, LookupTable, ExportTemplate, PartnerMasterData, XmlMappingProfile } from '../types';

const FIELD_GROUPS = [
  {
    name: 'Identité Document',
    fields: [
      { id: 'invoiceNumber', label: 'Numéro Facture', bt: 'BT-1', desc: 'Identifiant unique de la facture.' },
      { id: 'invoiceDate', label: 'Date Facture', bt: 'BT-2', desc: 'Date d\'émission au format JJ/MM/AAAA.' },
      { id: 'dueDate', label: 'Échéance', bt: 'BT-9', desc: 'Date limite de paiement.' },
      { id: 'currency', label: 'Devise', bt: 'BT-5', desc: 'Code ISO 4217 (ex: EUR).' },
    ]
  },
  {
    name: 'Tiers & Banque',
    fields: [
      { id: 'supplier', label: 'Nom Fournisseur', bt: 'BT-27', desc: 'Raison sociale du vendeur.' },
      { id: 'supplierSiret', label: 'SIRET Fournisseur', bt: 'BT-29', desc: 'Identifiant légal (14 chiffres).' },
      { id: 'supplierErpCode', label: 'Code ERP Tiers', bt: 'N/A', desc: 'Code pivot comptable.' },
      { id: 'iban', label: 'IBAN', bt: 'BT-84', desc: 'Numéro de compte bancaire.' },
      { id: 'bic', label: 'BIC', bt: 'BT-85', desc: 'Code SWIFT de la banque.' },
    ]
  },
  {
    name: 'Montants',
    fields: [
      { id: 'amountExclVat', label: 'Total HT', bt: 'BT-109', desc: 'Somme hors taxes.' },
      { id: 'totalVat', label: 'Total TVA', bt: 'BT-110', desc: 'Montant de la taxe.' },
      { id: 'amountInclVat', label: 'Total TTC', bt: 'BT-112', desc: 'Montant net à payer.' },
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
  const [activeTab, setActiveTab] = useState<'masterdata' | 'templates' | 'xml' | 'lookups' | 'erp' | 'glossary'>('masterdata');
  
  const [localErp, setLocalErp] = useState<ErpConfig>(erpConfig || { apiUrl: '', apiKey: '', enabled: false });
  const [localMasterData, setLocalMasterData] = useState<PartnerMasterData[]>(masterData || []);
  const [localTemplates, setLocalTemplates] = useState<ExportTemplate[]>(templates || []);
  const [localXmlProfiles, setLocalXmlProfiles] = useState<XmlMappingProfile[]>(xmlProfiles || []);
  const [localLookups, setLocalLookups] = useState<LookupTable[]>(lookupTables || []);

  useEffect(() => {
    if (isOpen) {
      setLocalErp(erpConfig || { apiUrl: '', apiKey: '', enabled: false });
      setLocalMasterData(masterData || []);
      setLocalTemplates(templates || []);
      setLocalXmlProfiles(xmlProfiles || []);
      setLocalLookups(lookupTables || []);
    }
  }, [isOpen, erpConfig, masterData, templates, xmlProfiles, lookupTables]);

  if (!isOpen) return null;

  const handleSaveAll = () => {
    onSaveErp(localErp);
    onSaveMasterData(localMasterData);
    onSaveLookups(localLookups);
    onSaveTemplates(localTemplates);
    onSaveXmlProfiles(localXmlProfiles);
    onClose();
  };

  const handleAddMasterData = () => {
    setLocalMasterData([{ id: crypto.randomUUID(), name: 'Nouveau Partenaire', erpCode: '', siret: '', vatNumber: '', iban: '', bic: '' }, ...localMasterData]);
  };

  const handleAddTemplate = () => {
    setLocalTemplates([{ id: crypto.randomUUID(), name: 'Template Export', separator: 'semicolon', columns: [] }, ...localTemplates]);
  };

  const handleAddLookup = () => {
    setLocalLookups([{ id: crypto.randomUUID(), name: 'Table Transcodage', entries: [] }, ...localLookups]);
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-[110] p-4">
      <div className="bg-white rounded-[2.5rem] shadow-2xl border border-slate-200 w-full max-w-7xl h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95">
        
        <div className="px-10 py-6 border-b border-slate-100 flex justify-between items-center bg-white shrink-0">
          <div className="flex items-center space-x-6">
            <div className="bg-slate-950 p-3 rounded-2xl text-white"><Settings className="w-6 h-6" /></div>
            <div>
              <h2 className="text-2xl font-black text-slate-900 uppercase">Hub de Configuration</h2>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">SaaS Partition Management</p>
            </div>
          </div>
          <button onClick={onClose} className="p-3 text-slate-400 hover:text-rose-500 transition-colors bg-slate-50 rounded-xl"><X className="w-6 h-6" /></button>
        </div>

        <div className="flex-1 flex overflow-hidden bg-slate-50">
          <div className="w-72 bg-white border-r border-slate-200 p-6 space-y-2 shrink-0 overflow-y-auto">
            <NavBtn icon={Database} label="Master Data" active={activeTab === 'masterdata'} onClick={() => setActiveTab('masterdata')} />
            <NavBtn icon={FileSpreadsheet} label="Templates CSV" active={activeTab === 'templates'} onClick={() => setActiveTab('templates')} />
            <NavBtn icon={FileJson} label="Profils XML" active={activeTab === 'xml'} onClick={() => setActiveTab('xml')} />
            <NavBtn icon={Layers} label="Transcodage" active={activeTab === 'lookups'} onClick={() => setActiveTab('lookups')} />
            <NavBtn icon={CloudLightning} label="ERP Sync" active={activeTab === 'erp'} onClick={() => setActiveTab('erp')} />
            <div className="pt-6 mt-4 border-t border-slate-100">
               <NavBtn icon={BookOpen} label="Glossaire" active={activeTab === 'glossary'} onClick={() => setActiveTab('glossary')} />
            </div>
          </div>

          <div className="flex-1 p-10 overflow-y-auto bg-white">
            {activeTab === 'masterdata' && (
                <div className="space-y-8 animate-in fade-in">
                    <Header title="Données Maîtresses Partenaires" desc="Référentiel pour Video Codage Automatique">
                        <button onClick={handleAddMasterData} className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center shadow-lg"><Plus className="w-4 h-4 mr-2" /> Ajouter Partenaire</button>
                    </Header>
                    {localMasterData.map(m => (
                        <div key={m.id} className="p-8 bg-slate-50 rounded-[2rem] border border-slate-100 space-y-6 relative group">
                            <button onClick={() => setLocalMasterData(prev => prev.filter(x => x.id !== m.id))} className="absolute top-8 right-8 text-slate-300 hover:text-rose-500 transition-colors"><Trash2 className="w-5 h-5" /></button>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                <Input label="Dénomination Officielle" value={m.name} onChange={(v:string)=>setLocalMasterData(prev=>prev.map(x=>x.id===m.id?{...x, name:v}:x))} />
                                <Input label="Code ERP Pivot" value={m.erpCode} onChange={(v:string)=>setLocalMasterData(prev=>prev.map(x=>x.id===m.id?{...x, erpCode:v}:x))} />
                                <Input label="SIRET (Clé de match)" value={m.siret} onChange={(v:string)=>setLocalMasterData(prev=>prev.map(x=>x.id===m.id?{...x, siret:v}:x))} />
                                <Input label="Numéro de TVA" value={m.vatNumber} onChange={(v:string)=>setLocalMasterData(prev=>prev.map(x=>x.id===m.id?{...x, vatNumber:v}:x))} />
                                <Input label="IBAN" value={m.iban} onChange={(v:string)=>setLocalMasterData(prev=>prev.map(x=>x.id===m.id?{...x, iban:v.replace(/\s/g, "")}:x))} />
                                <Input label="BIC / SWIFT" value={m.bic} onChange={(v:string)=>setLocalMasterData(prev=>prev.map(x=>x.id===m.id?{...x, bic:v}:x))} />
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {activeTab === 'templates' && (
                <div className="space-y-10 animate-in fade-in">
                    <Header title="Export Blueprints (CSV)" desc="Structurez vos exports pour votre comptabilité">
                        <button onClick={handleAddTemplate} className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center shadow-lg"><Plus className="w-4 h-4 mr-2" /> Nouveau Template</button>
                    </Header>
                    {localTemplates.map(tpl => (
                        <div key={tpl.id} className="p-8 border-2 border-slate-100 rounded-[2.5rem] bg-slate-50/50 mb-8 relative">
                            <button onClick={() => setLocalTemplates(prev => prev.filter(t => t.id !== tpl.id))} className="absolute top-8 right-8 text-slate-300 hover:text-rose-500"><Trash2 className="w-5 h-5" /></button>
                            <Input label="Nom du Template" value={tpl.name} onChange={(v:string)=>setLocalTemplates(prev=>prev.map(t=>t.id===tpl.id?{...t, name:v}:t))} className="mb-6 max-w-md" />
                            <div className="space-y-3 bg-white p-6 rounded-3xl shadow-inner">
                              {tpl.columns?.map((col, idx) => (
                                <div key={idx} className="flex space-x-2 items-center animate-in slide-in-from-left-2">
                                  <input value={col.header} onChange={e=>setLocalTemplates(prev=>prev.map(t=>t.id===tpl.id?{...t, columns: t.columns.map((c, i)=>i===idx?{...c, header:e.target.value}:c)}:t))} className="bg-slate-50 border border-slate-200 p-2 rounded-xl text-xs font-bold flex-1" />
                                  <select value={col.value} onChange={e=>setLocalTemplates(prev=>prev.map(t=>t.id===tpl.id?{...t, columns: t.columns.map((c, i)=>i===idx?{...c, value:e.target.value}:c)}:t))} className="bg-slate-50 border border-slate-200 p-2 rounded-xl text-xs font-bold w-48">
                                    {FLAT_FIELDS.map(f => <option key={f.id} value={f.id}>{f.label}</option>)}
                                  </select>
                                  <button onClick={()=>setLocalTemplates(prev=>prev.map(t=>t.id===tpl.id?{...t, columns: t.columns.filter((_, i)=>i!==idx)}:t))} className="text-rose-500 p-2 hover:bg-rose-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                                </div>
                              ))}
                              <button onClick={() => setLocalTemplates(prev => prev.map(t => t.id === tpl.id ? { ...t, columns: [...(t.columns || []), { header: 'Nouveau Champ', type: 'field', value: 'invoiceNumber' }] } : t))} className="text-[10px] font-black uppercase text-indigo-600 flex items-center pt-2 hover:underline"><Plus className="w-3 h-3 mr-1" /> Ajouter une colonne</button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {activeTab === 'lookups' && (
                <div className="space-y-10 animate-in fade-in">
                    <Header title="Transcodage de Valeurs" desc="Mappez les extractions vers vos codes ERP">
                        <button onClick={handleAddLookup} className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center shadow-lg"><Plus className="w-4 h-4 mr-2" /> Nouvelle Table</button>
                    </Header>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      {localLookups.map(table => (
                        <div key={table.id} className="p-8 bg-slate-50 border border-slate-200 rounded-[2.5rem] space-y-4 relative">
                            <button onClick={() => setLocalLookups(prev => prev.filter(t => t.id !== table.id))} className="absolute top-8 right-8 text-rose-300 hover:text-rose-500"><Trash2 className="w-4 h-4" /></button>
                            <Input label="Nom de la Table" value={table.name} onChange={(v:string)=>setLocalLookups(prev=>prev.map(t=>t.id===table.id?{...t, name:v}:t))} />
                            <div className="space-y-2 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
                               {(table.entries || []).map((entry, eIdx) => (
                                 <div key={eIdx} className="flex space-x-2">
                                   <input value={entry.key} onChange={e=>setLocalLookups(prev=>prev.map(t=>t.id===table.id?{...t, entries:t.entries.map((en, i)=>i===eIdx?{...en, key:e.target.value}:en)}:t))} className="flex-1 bg-white border border-slate-200 p-2 rounded-xl text-xs font-bold" placeholder="IA Source" />
                                   <input value={entry.value} onChange={e=>setLocalLookups(prev=>prev.map(t=>t.id===table.id?{...t, entries:t.entries.map((en, i)=>i===eIdx?{...en, value:e.target.value}:en)}:t))} className="flex-1 bg-white border border-slate-200 p-2 rounded-xl text-xs font-bold" placeholder="Code ERP" />
                                   <button onClick={()=>setLocalLookups(prev=>prev.map(t=>t.id===table.id?{...t, entries:t.entries.filter((_, i)=>i!==eIdx)}:t))} className="text-rose-400 p-2"><X className="w-4 h-4" /></button>
                                 </div>
                               ))}
                               <button onClick={()=>setLocalLookups(prev=>prev.map(t=>t.id===table.id?{...t, entries:[...(t.entries || []), {key:'', value:''}]}:t))} className="text-[9px] font-black uppercase text-indigo-500 hover:underline">+ Ajouter correspondance</button>
                            </div>
                        </div>
                      ))}
                    </div>
                </div>
            )}

            {activeTab === 'erp' && (
              <div className="max-w-2xl space-y-10 animate-in fade-in">
                <Header title="Passerelle ERP Sync" desc="Liaison directe avec vos outils comptables" />
                <div className="bg-slate-900 rounded-[3rem] p-12 text-white shadow-2xl">
                    <div className="flex items-center justify-between mb-10">
                        <span className="text-[10px] font-black uppercase text-slate-400">Statut de la passerelle : {localErp.enabled ? 'ACTIF' : 'DÉSACTIVÉ'}</span>
                        <button onClick={()=>setLocalErp({...localErp, enabled:!localErp.enabled})} className={`w-16 h-8 rounded-full p-1.5 transition-all ${localErp.enabled?'bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.5)]':'bg-white/20'}`}>
                            <div className={`w-5 h-5 bg-white rounded-full transition-all ${localErp.enabled?'translate-x-8':'translate-x-0'}`}></div>
                        </button>
                    </div>
                    <div className="space-y-8">
                        <Input label="Endpoint API ERP" value={localErp.apiUrl} onChange={(v:string)=>setLocalErp({...localErp, apiUrl:v})} theme="dark" placeholder="https://votre-erp.com/api/v1/invoices" />
                        <Input label="Clé Secrète / API Token" type="password" value={localErp.apiKey} onChange={(v:string)=>setLocalErp({...localErp, apiKey:v})} theme="dark" placeholder="Bearer xxxxxxxxx" />
                    </div>
                </div>
              </div>
            )}

            {activeTab === 'glossary' && (
                <div className="space-y-8 animate-in fade-in">
                    <Header title="Glossaire des Champs IA" desc="Définitions techniques Factur-X / EN16931" />
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {FLAT_FIELDS.map(f => (
                            <div key={f.id} className="p-8 bg-slate-50 border border-slate-100 rounded-[2rem] hover:bg-white hover:shadow-2xl transition-all duration-300">
                                <span className="text-[12px] font-black text-slate-900 uppercase block mb-1">{f.label}</span>
                                <span className="text-[8px] font-mono text-indigo-600 bg-indigo-50 px-2 py-1 rounded border border-indigo-100 mb-4 inline-block tracking-widest">IA-MAPPING: {f.id}</span>
                                <p className="text-[10px] text-slate-500 font-bold leading-relaxed">{f.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}
          </div>
        </div>

        <div className="px-10 py-6 bg-slate-50 border-t border-slate-100 flex justify-end items-center space-x-4 shrink-0">
          <button onClick={onClose} className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-600 transition-colors">Fermer sans enregistrer</button>
          <button onClick={handleSaveAll} className="bg-slate-950 text-white px-12 py-5 rounded-[1.5rem] text-[10px] font-black uppercase tracking-[0.2em] shadow-2xl hover:bg-black transition-all active:scale-95 flex items-center">
            <Save className="w-5 h-5 mr-3" /> Enregistrer les réglages société
          </button>
        </div>
      </div>
    </div>
  );
};

const NavBtn = ({ icon: Icon, label, active, onClick }: any) => (
  <button onClick={onClick} className={`w-full flex items-center space-x-5 px-8 py-5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${active ? 'bg-indigo-600 text-white shadow-2xl shadow-indigo-100' : 'text-slate-400 hover:bg-slate-50 hover:text-slate-900'}`}>
    <Icon className={`w-6 h-6 ${active ? 'text-white' : 'text-slate-300'}`} />
    <span>{label}</span>
  </button>
);

const Header = ({ title, desc, children }: any) => (
  <div className="flex justify-between items-end pb-10 border-b border-slate-100 mb-10">
    <div>
      <h3 className="text-3xl font-black text-slate-900 tracking-tight">{title}</h3>
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">{desc}</p>
    </div>
    {children}
  </div>
);

const Input = ({ label, value, onChange, placeholder, type="text", theme="light", className="" }: any) => (
  <div className={`space-y-3 ${className}`}>
    <label className={`text-[10px] font-black uppercase tracking-widest ml-1 ${theme==='dark'?'text-white/40':'text-slate-400'}`}>{label}</label>
    <input 
      type={type} 
      value={value} 
      onChange={e=>onChange(e.target.value)} 
      placeholder={placeholder}
      className={`w-full px-6 py-4 rounded-2xl border outline-none transition-all text-sm font-bold 
        ${theme==='dark' 
          ? 'bg-white/5 border-white/10 text-white placeholder-white/20 focus:border-white/40' 
          : 'bg-white border-slate-200 text-slate-900 placeholder-slate-300 focus:border-indigo-600 focus:shadow-lg focus:shadow-indigo-50'}`}
    />
  </div>
);
