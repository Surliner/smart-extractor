
import React, { useState, useEffect } from 'react';
import { Settings, Save, X, Database, FileSpreadsheet, Plus, Trash2, CloudLightning, ShieldCheck, FileJson, Layers, Landmark, Tag, ArrowRightLeft, LayoutTemplate, Building2, Code2, GripVertical, Info, Settings2, FileText, ChevronDown, PlayCircle, TableProperties, BookOpen, Search, HelpCircle, BadgeCheck, FileSearch, ExternalLink } from 'lucide-react';
import { ErpConfig, LookupTable, ExportTemplate, PartnerMasterData, SageX3Config, ExportColumn, XmlMappingProfile, InvoiceData, InvoiceType } from '../types';
import { processCell } from '../services/exportService';

const FIELD_GROUPS = [
  {
    name: 'Identité Document',
    fields: [
      { id: 'invoiceNumber', label: 'Numéro Facture', bt: 'BT-1', desc: 'Identifiant unique de la facture (Invoice Number).' },
      { id: 'invoiceDate', label: 'Date Facture', bt: 'BT-2', desc: 'Date d\'émission du document au format JJ/MM/AAAA.' },
      { id: 'dueDate', label: 'Échéance', bt: 'BT-9', desc: 'Date limite de paiement.' },
      { id: 'currency', label: 'Devise', bt: 'BT-5', desc: 'Code ISO 4217 de la monnaie (ex: EUR, USD).' },
      { id: 'invoiceType', label: 'Type Facture', bt: 'BT-3', desc: 'Code type (380=Facture, 381=Avoir).' },
    ]
  },
  {
    name: 'Tiers & Banque',
    fields: [
      { id: 'supplier', label: 'Nom Fournisseur', bt: 'BT-27', desc: 'Raison sociale de l\'entité émettrice.' },
      { id: 'supplierSiret', label: 'SIRET Fournisseur', bt: 'BT-29', desc: 'Identifiant légal français (14 chiffres).' },
      { id: 'supplierVat', label: 'TVA Fournisseur', bt: 'BT-31', desc: 'Numéro de TVA intracommunautaire du vendeur.' },
      { id: 'supplierErpCode', label: 'Code ERP Tiers', bt: 'N/A', desc: 'Identifiant pivot pour l\'intégration comptable Sage/ERP.' },
      { id: 'buyerName', label: 'Nom Acheteur', bt: 'BT-44', desc: 'Désignation du client final.' },
      { id: 'iban', label: 'IBAN', bt: 'BT-84', desc: 'International Bank Account Number pour le règlement.' },
      { id: 'bic', label: 'BIC', bt: 'BT-85', desc: 'Bank Identifier Code (SWIFT).' },
    ]
  },
  {
    name: 'Montants & Totaux',
    fields: [
      { id: 'amountExclVat', label: 'Total HT', bt: 'BT-109', desc: 'Somme des montants HT hors remises globales.' },
      { id: 'totalVat', label: 'Total TVA', bt: 'BT-110', desc: 'Montant total de la taxe sur la valeur ajoutée.' },
      { id: 'amountInclVat', label: 'Total TTC', bt: 'BT-112', desc: 'Montant net à payer (Grand Total Amount).' },
      { id: 'globalDiscount', label: 'Remise Globale', bt: 'BT-107', desc: 'Remise appliquée au niveau de l\'en-tête HT.' },
      { id: 'globalCharge', label: 'Frais Globaux', bt: 'BT-108', desc: 'Frais annexes (port, emballage) au niveau en-tête.' },
    ]
  },
  {
    name: 'Lignes de Détail',
    fields: [
      { id: 'articleId', label: 'Réf Article', bt: 'BT-155', desc: 'Référence catalogue ou code barre du produit.' },
      { id: 'description', label: 'Désignation', bt: 'BT-154', desc: 'Libellé complet de la ligne de service ou produit.' },
      { id: 'quantity', label: 'Quantité', bt: 'BT-129', desc: 'Nombre d\'unités facturées.' },
      { id: 'unitPrice', label: 'Prix Unitaire', bt: 'BT-146', desc: 'Prix net HT par unité de mesure.' },
      { id: 'amount', label: 'Total Ligne HT', bt: 'BT-131', desc: 'Montant total HT de la ligne (Qté x P.U).' },
      { id: 'taxRate', label: 'Taux TVA Ligne', bt: 'BT-152', desc: 'Pourcentage de taxe applicable à cette ligne.' },
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
  const [searchTerm, setSearchTerm] = useState('');
  
  const [localErp, setLocalErp] = useState<ErpConfig>(erpConfig);
  const [localMasterData, setLocalMasterData] = useState<PartnerMasterData[]>(masterData);
  const [localTemplates, setLocalTemplates] = useState<ExportTemplate[]>(templates);
  const [localXmlProfiles, setLocalXmlProfiles] = useState<XmlMappingProfile[]>(xmlProfiles);
  const [localLookups, setLocalLookups] = useState<LookupTable[]>(lookupTables);

  useEffect(() => {
    if (isOpen) {
      setLocalErp(erpConfig);
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
    const newItem: PartnerMasterData = {
        id: crypto.randomUUID(),
        erpCode: '',
        name: 'Nouveau Partenaire',
        siret: '',
        vatNumber: ''
    };
    setLocalMasterData([newItem, ...localMasterData]);
  };

  const updateMasterData = (id: string, updates: Partial<PartnerMasterData>) => {
    setLocalMasterData(prev => prev.map(m => m.id === id ? { ...m, ...updates } : m));
  };

  const filteredGlossary = FIELD_GROUPS.map(group => ({
    ...group,
    fields: group.fields.filter(f => 
        f.label.toLowerCase().includes(searchTerm.toLowerCase()) || 
        f.bt.toLowerCase().includes(searchTerm.toLowerCase())
    )
  })).filter(group => group.fields.length > 0);

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-[110] p-4">
      <div className="bg-white rounded-[2.5rem] shadow-2xl border border-slate-200 w-full max-w-7xl h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95">
        
        <div className="px-10 py-6 border-b border-slate-100 flex justify-between items-center shrink-0">
          <div className="flex items-center space-x-6">
            <div className="bg-slate-950 p-3 rounded-2xl text-white"><Settings className="w-6 h-6" /></div>
            <div>
              <h2 className="text-2xl font-black text-slate-900 uppercase">Hub de Configuration</h2>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Extraction & Contrôle Export</p>
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
                    <Header title="Données Maîtresses Partenaires" desc="Référentiel Tiers pour réconciliation ERP automatique">
                        <button onClick={handleAddMasterData} className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center shadow-lg"><Plus className="w-4 h-4 mr-2" /> Ajouter Partenaire</button>
                    </Header>
                    <div className="grid grid-cols-1 gap-4">
                        {localMasterData.map(m => (
                            <div key={m.id} className="p-6 bg-slate-50 rounded-2xl border border-slate-100 flex flex-wrap gap-4 items-end">
                                <div className="flex-1 min-w-[200px]"><Input label="Nom Partenaire" value={m.name} onChange={(v:string)=>updateMasterData(m.id, {name:v})} /></div>
                                <div className="w-40"><Input label="Code ERP" value={m.erpCode} onChange={(v:string)=>updateMasterData(m.id, {erpCode:v})} /></div>
                                <div className="w-48"><Input label="SIRET" value={m.siret} onChange={(v:string)=>updateMasterData(m.id, {siret:v})} /></div>
                                <div className="w-48"><Input label="TVA" value={m.vatNumber} onChange={(v:string)=>updateMasterData(m.id, {vatNumber:v})} /></div>
                                <button onClick={() => setLocalMasterData(prev => prev.filter(x => x.id !== m.id))} className="p-3 text-slate-300 hover:text-rose-500"><Trash2 className="w-5 h-5" /></button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {activeTab === 'templates' && (
                <div className="space-y-10 animate-in fade-in">
                    <Header title="Templates CSV" desc="Structurez vos exports plats pour votre comptabilité">
                        <button onClick={() => setLocalTemplates([{id: crypto.randomUUID(), name:'Export Standard', separator:'semicolon', columns:[]}, ...localTemplates])} className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center shadow-lg"><Plus className="w-4 h-4 mr-2" /> Nouveau Template</button>
                    </Header>
                    {localTemplates.map(tpl => (
                        <div key={tpl.id} className="p-8 border-2 border-slate-100 rounded-[2.5rem] bg-slate-50/50 mb-8 relative">
                            <button onClick={() => setLocalTemplates(prev => prev.filter(t => t.id !== tpl.id))} className="absolute top-8 right-8 text-slate-300 hover:text-rose-500"><Trash2 className="w-5 h-5" /></button>
                            <Input label="Nom du Template" value={tpl.name} onChange={(v:string)=>setLocalTemplates(prev=>prev.map(t=>t.id===tpl.id?{...t, name:v}:t))} className="mb-6 max-w-md" />
                            {/* Columns management here similar to previous implementation if needed */}
                        </div>
                    ))}
                </div>
            )}

            {activeTab === 'erp' && (
              <div className="max-w-2xl space-y-10 animate-in fade-in">
                <Header title="Paramètres ERP" desc="Configuration de la passerelle de synchronisation Sage X3 / Autre" />
                <div className="bg-slate-900 rounded-[2.5rem] p-10 text-white shadow-2xl">
                    <div className="flex items-center justify-between mb-8">
                        <span className="text-[10px] font-black uppercase text-slate-400">Statut de la connexion : {localErp.enabled ? 'ACTIF' : 'DÉSACTIVÉ'}</span>
                        <button onClick={()=>setLocalErp({...localErp, enabled:!localErp.enabled})} className={`w-14 h-7 rounded-full p-1 transition-all ${localErp.enabled?'bg-emerald-500':'bg-white/20'}`}>
                            <div className={`w-5 h-5 bg-white rounded-full transition-all ${localErp.enabled?'translate-x-7':'translate-x-0'}`}></div>
                        </button>
                    </div>
                    <div className="space-y-6">
                        <Input label="URL de l'API ERP" value={localErp.apiUrl} onChange={(v:string)=>setLocalErp({...localErp, apiUrl:v})} theme="dark" />
                        <Input label="Clé d'accès / Token" type="password" value={localErp.apiKey} onChange={(v:string)=>setLocalErp({...localErp, apiKey:v})} theme="dark" />
                    </div>
                </div>
              </div>
            )}

            {activeTab === 'glossary' && (
                <div className="space-y-8 animate-in fade-in">
                    <Header title="Glossaire Technique" desc="Champs Factur-X / EN16931 supportés par l'IA" />
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                        {FLAT_FIELDS.map(f => (
                            <div key={f.id} className="p-6 bg-slate-50 border border-slate-100 rounded-3xl">
                                <span className="text-[11px] font-black text-slate-900 uppercase block mb-1">{f.label}</span>
                                <span className="text-[8px] font-mono text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100 mb-2 inline-block">BT: {f.bt}</span>
                                <p className="text-[10px] text-slate-500 font-bold leading-relaxed">{f.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}
          </div>
        </div>

        <div className="px-10 py-6 bg-slate-50 border-t border-slate-100 flex justify-end items-center space-x-4 shrink-0">
          <button onClick={onClose} className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-600 transition-colors">Fermer</button>
          <button onClick={handleSaveAll} className="bg-slate-950 text-white px-10 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-2xl hover:bg-black transition-all active:scale-95 flex items-center">
            <Save className="w-5 h-5 mr-3" /> Appliquer à la Société
          </button>
        </div>
      </div>
    </div>
  );
};

const NavBtn = ({ icon: Icon, label, active, onClick }: any) => (
  <button onClick={onClick} className={`w-full flex items-center space-x-4 px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${active ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-100' : 'text-slate-400 hover:bg-slate-50 hover:text-slate-900'}`}>
    <Icon className="w-5 h-5" />
    <span>{label}</span>
  </button>
);

const Header = ({ title, desc, children }: any) => (
  <div className="flex justify-between items-end pb-8 border-b border-slate-100 mb-8">
    <div>
      <h3 className="text-2xl font-black text-slate-900 tracking-tight">{title}</h3>
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">{desc}</p>
    </div>
    {children}
  </div>
);

const Input = ({ label, value, onChange, placeholder, type="text", theme="light", className="" }: any) => (
  <div className={`space-y-2 ${className}`}>
    <label className={`text-[9px] font-black uppercase tracking-widest ml-1 ${theme==='dark'?'text-white/40':'text-slate-400'}`}>{label}</label>
    <input 
      type={type} 
      value={value} 
      onChange={e=>onChange(e.target.value)} 
      placeholder={placeholder}
      className={`w-full px-5 py-3 rounded-2xl border outline-none transition-all text-xs font-bold 
        ${theme==='dark' 
          ? 'bg-white/5 border-white/10 text-white focus:border-white/40' 
          : 'bg-white border-slate-200 text-slate-800 focus:border-indigo-600'}`}
    />
  </div>
);
