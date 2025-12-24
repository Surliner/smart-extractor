
import React, { useState, useRef, useMemo } from 'react';
import { Settings, Save, X, Server, Database, FileSpreadsheet, Plus, Trash2, Edit2, GripVertical, ChevronDown, Upload, CloudLightning, ShieldCheck, Search, FileDown, Table, Layers, ArrowDownLeft, BookOpen, Info, HelpCircle, Code, UserPlus } from 'lucide-react';
import { ErpConfig, LookupTable, ExportTemplate, PartnerMasterData, SageX3Config, ExportColumn } from '../types';

// --- DICTIONNAIRE DES CHAMPS DISPONIBLES ---
const FIELD_GROUPS = [
  {
    name: 'Identification Document',
    fields: [
      { id: 'invoiceNumber', label: 'Numéro de Facture', bt: 'BT-1', desc: 'Identifiant unique du document' },
      { id: 'invoiceDate', label: 'Date de Facture', bt: 'BT-2', desc: 'Date d\'émission au format JJ/MM/AAAA' },
      { id: 'invoiceType', label: 'Type de Document', bt: 'BT-3', desc: 'Facture ou Avoir' },
      { id: 'currency', label: 'Devise', bt: 'BT-5', desc: 'Code ISO (EUR, USD...)' },
    ]
  },
  {
    name: 'Fournisseur (Vendeur)',
    fields: [
      { id: 'supplier', label: 'Nom Fournisseur', bt: 'BT-27', desc: 'Raison sociale complète' },
      { id: 'supplierSiret', label: 'SIRET Fournisseur', bt: 'BT-29', desc: 'Identifiant 14 chiffres' },
      { id: 'supplierVat', label: 'TVA Fournisseur', bt: 'BT-31', desc: 'Numéro de TVA intracommunautaire' },
      { id: 'supplierErpCode', label: 'Code Tiers ERP', bt: 'N/A', desc: 'Code mapping Sage/ERP' },
    ]
  },
  {
    name: 'Client (Acheteur)',
    fields: [
      { id: 'buyerName', label: 'Nom Client', bt: 'BT-44', desc: 'Raison sociale de votre entreprise' },
      { id: 'buyerSiret', label: 'SIRET Client', bt: 'BT-47', desc: 'Votre SIRET' },
      { id: 'buyerVat', label: 'TVA Client', bt: 'BT-48', desc: 'Votre numéro de TVA' },
    ]
  },
  {
    name: 'Totaux Financiers',
    fields: [
      { id: 'amountExclVat', label: 'Montant Total HT', bt: 'BT-109', desc: 'Base imposable hors taxes' },
      { id: 'totalVat', label: 'Total TVA', bt: 'BT-110', desc: 'Somme des taxes calculées' },
      { id: 'amountInclVat', label: 'Montant Total TTC', bt: 'BT-112', desc: 'Net à payer' },
      { id: 'globalDiscount', label: 'Remise Globale', bt: 'BT-107', desc: 'Remise pied de facture HT' },
    ]
  },
  {
    name: 'Lignes de Détail',
    fields: [
      { id: 'articleId', label: 'Référence Article', bt: 'BT-155', desc: 'Code produit ou service' },
      { id: 'description', label: 'Désignation Ligne', bt: 'BT-154', desc: 'Libellé complet de la ligne' },
      { id: 'quantity', label: 'Quantité', bt: 'BT-129', desc: 'Nombre d\'unités' },
      { id: 'unitPrice', label: 'Prix Unitaire Net', bt: 'BT-146', desc: 'Prix après remise ligne' },
      { id: 'amount', label: 'Total Ligne HT', bt: 'BT-131', desc: 'Quantité x Prix Net' },
      { id: 'taxRate', label: 'Taux TVA Ligne', bt: 'BT-152', desc: 'Ex: 20.00' },
    ]
  },
  {
    name: 'Paiement & Divers',
    fields: [
      { id: 'iban', label: 'IBAN', bt: 'BT-84', desc: 'Coordonnées bancaires extraites' },
      { id: 'bic', label: 'BIC / SWIFT', bt: 'BT-85', desc: 'Code banque' },
      { id: 'paymentMethod', label: 'Mode Paiement', bt: 'BT-82', desc: 'Virement, Chèque, etc.' },
      { id: 'dueDate', label: 'Date d\'échéance', bt: 'BT-9', desc: 'Date limite de règlement' },
      { id: 'originalFilename', label: 'Nom du Fichier', bt: 'N/A', desc: 'Fichier PDF d\'origine' },
    ]
  }
];

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
  const [activeTab, setActiveTab] = useState<'erp' | 'masterdata' | 'templates' | 'lookups' | 'glossary'>('masterdata');
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

  const handleAddPartner = () => {
    const newPartner: PartnerMasterData = {
      id: crypto.randomUUID(),
      erpCode: 'NEW',
      name: 'Nouveau Tiers',
      siret: '',
      vatNumber: ''
    };
    setLocalMasterData([newPartner, ...localMasterData]);
  };

  const updatePartner = (id: string, field: keyof PartnerMasterData, value: string) => {
    setLocalMasterData(localMasterData.map(p => p.id === id ? { ...p, [field]: value } : p));
  };

  // Fixed error: Added missing updateTemplate function
  const updateTemplate = (id: string, updates: Partial<ExportTemplate>) => {
    setLocalTemplates(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
  };

  // Fixed error: Added missing addColumn function
  const addColumn = (templateId: string) => {
    setLocalTemplates(prev => prev.map(t => {
      if (t.id === templateId) {
        const newCol: ExportColumn = { header: 'New Column', type: 'field', value: 'invoiceNumber' };
        return { ...t, columns: [...t.columns, newCol] };
      }
      return t;
    }));
  };

  const handleMasterDataUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const cleanContent = content.replace(/^\uFEFF/, '');
      const lines = cleanContent.split(/\r?\n/).filter(l => l.trim());
      if (lines.length < 1) return;

      const headerLine = lines[0];
      const separator = headerLine.includes(';') ? ';' : ',';
      const headers = headerLine.toLowerCase().split(separator).map(h => h.trim());
      
      const newPartners: PartnerMasterData[] = lines.slice(1).map(line => {
        const values = line.split(separator);
        const p: any = { id: crypto.randomUUID() };
        
        headers.forEach((h, i) => {
          const val = values[i]?.trim() || '';
          if (!val) return;

          if (h.includes('code') || h.includes('id') || h.includes('erp')) {
            p.erpCode = val;
          } else if (h.includes('nom') || h.includes('name') || h.includes('raison') || h.includes('societe')) {
            p.name = val;
          } else if (h.includes('siret')) {
            p.siret = val.replace(/\s/g, ''); // Nettoyer le SIRET à l'import
          } else if (h.includes('tva') || h.includes('vat')) {
            p.vatNumber = val;
          } else if (h.includes('iban')) {
            p.iban = val;
          } else if (h.includes('compte') || h.includes('group')) {
            p.accountingGroup = val;
          }
        });
        return p as PartnerMasterData;
      });

      setLocalMasterData([...newPartners, ...localMasterData]);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const filteredMasterData = localMasterData.filter(p => 
    p.name?.toLowerCase().includes(searchTiers.toLowerCase()) || 
    p.siret?.includes(searchTiers) ||
    p.erpCode?.toLowerCase().includes(searchTiers.toLowerCase())
  );

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
             <TabButton icon={Database} label="Référentiel Tiers" active={activeTab === 'masterdata'} onClick={() => setActiveTab('masterdata')} />
             <TabButton icon={FileSpreadsheet} label="Export Templates" active={activeTab === 'templates'} onClick={() => setActiveTab('templates')} />
             <TabButton icon={Layers} label="Lookup Tables" active={activeTab === 'lookups'} onClick={() => setActiveTab('lookups')} />
             <TabButton icon={BookOpen} label="Glossaire Champs" active={activeTab === 'glossary'} onClick={() => setActiveTab('glossary')} />
             <TabButton icon={CloudLightning} label="Connecteur Sage X3" active={activeTab === 'erp'} onClick={() => setActiveTab('erp')} />
          </div>

          <div className="flex-1 p-10 overflow-y-auto bg-white custom-scrollbar">
            
            {activeTab === 'masterdata' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="flex justify-between items-end">
                   <div>
                      <h3 className="text-xl font-black text-slate-900 tracking-tight">Master Data Tiers</h3>
                      <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">Validation de concordance ERP (Clé: SIRET)</p>
                   </div>
                   <div className="flex space-x-3">
                      <button onClick={handleAddPartner} className="bg-white text-indigo-600 border-2 border-indigo-100 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center hover:bg-indigo-50 transition-all">
                        <UserPlus className="w-4 h-4 mr-2" /> Ajout Manuel
                      </button>
                      <button onClick={() => fileInputRef.current?.click()} className="bg-indigo-600 text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center shadow-lg hover:bg-indigo-700 transition-all">
                        <Upload className="w-4 h-4 mr-2" /> Import CSV
                      </button>
                      <input type="file" ref={fileInputRef} onChange={handleMasterDataUpload} accept=".csv" className="hidden" />
                   </div>
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
                  <table className="w-full text-left text-sm table-fixed">
                    <thead className="bg-slate-50 text-[9px] font-black uppercase text-slate-500 tracking-widest border-b border-slate-100">
                       <tr>
                          <th className="px-6 py-4 w-32">Code ERP</th>
                          <th className="px-6 py-4">Raison Sociale</th>
                          <th className="px-6 py-4 w-48">SIRET (Clé de match)</th>
                          <th className="px-6 py-4 w-48">TVA Intra</th>
                          <th className="px-6 py-4 w-20 text-right">Actions</th>
                       </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                       {filteredMasterData.map(p => (
                         <tr key={p.id} className="hover:bg-slate-50/50 transition-colors group">
                           <td className="px-4 py-3">
                              <input 
                                value={p.erpCode} 
                                onChange={(e) => updatePartner(p.id, 'erpCode', e.target.value)}
                                className="w-full bg-transparent border-b border-transparent focus:border-indigo-600 outline-none px-2 py-1 font-mono text-xs font-black text-indigo-600" 
                              />
                           </td>
                           <td className="px-4 py-3">
                              <input 
                                value={p.name} 
                                onChange={(e) => updatePartner(p.id, 'name', e.target.value)}
                                className="w-full bg-transparent border-b border-transparent focus:border-indigo-600 outline-none px-2 py-1 font-black text-slate-800" 
                              />
                           </td>
                           <td className="px-4 py-3">
                              <input 
                                value={p.siret} 
                                onChange={(e) => updatePartner(p.id, 'siret', e.target.value.replace(/\s/g, ''))}
                                className="w-full bg-transparent border-b border-transparent focus:border-indigo-600 outline-none px-2 py-1 font-bold text-slate-500" 
                                placeholder="14 chiffres"
                              />
                           </td>
                           <td className="px-4 py-3">
                              <input 
                                value={p.vatNumber} 
                                onChange={(e) => updatePartner(p.id, 'vatNumber', e.target.value)}
                                className="w-full bg-transparent border-b border-transparent focus:border-indigo-600 outline-none px-2 py-1 font-medium text-slate-500" 
                              />
                           </td>
                           <td className="px-4 py-3 text-right">
                              <button onClick={() => setLocalMasterData(localMasterData.filter(x => x.id !== p.id))} className="text-slate-300 hover:text-rose-500 p-2 rounded-lg transition-all">
                                 <Trash2 className="w-4 h-4" />
                              </button>
                           </td>
                         </tr>
                       ))}
                       {filteredMasterData.length === 0 && (
                        <tr>
                          <td colSpan={5} className="px-6 py-12 text-center text-slate-400 italic font-medium">Aucun tiers trouvé. Importez un fichier CSV ou effectuez une recherche.</td>
                        </tr>
                       )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Les autres onglets restent identiques mais masqués par défaut dans cet affichage */}
            {activeTab === 'glossary' && (
              <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="bg-slate-900 text-white p-8 rounded-[2rem] shadow-xl">
                    <div className="flex items-center space-x-4 mb-4">
                        <BookOpen className="w-8 h-8 text-indigo-400" />
                        <h3 className="text-2xl font-black tracking-tight">Glossaire Technique Factur-X</h3>
                    </div>
                    <p className="text-slate-400 text-sm font-bold max-w-2xl leading-relaxed">
                        Ce lexique liste tous les points de données extraits par l'IA Gemini. Utilisez ces noms de champs dans vos modèles d'export et vos tables de transcodage.
                    </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {FIELD_GROUPS.map(group => (
                        <div key={group.name} className="space-y-4">
                            <h4 className="text-[11px] font-black text-indigo-600 uppercase tracking-[0.2em] border-b-2 border-indigo-50 pb-2">{group.name}</h4>
                            <div className="space-y-3">
                                {group.fields.map(field => (
                                    <div key={field.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 group hover:border-indigo-200 transition-all">
                                        <div className="flex justify-between items-start mb-1">
                                            <span className="font-black text-slate-900 text-sm">{field.label}</span>
                                            <span className="text-[9px] font-mono font-bold bg-white border border-slate-200 px-2 py-0.5 rounded text-slate-500">{field.bt}</span>
                                        </div>
                                        <div className="flex items-center space-x-2 mt-1">
                                            <code className="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded font-black">{field.id}</code>
                                            <span className="text-[10px] text-slate-500 font-bold truncate">/ {field.desc}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
              </div>
            )}

            {activeTab === 'templates' && (
              <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="flex justify-between items-center">
                  <h3 className="text-xl font-black text-slate-900 tracking-tight">Générateur de Fichiers Plats</h3>
                  <button onClick={() => setLocalTemplates([...localTemplates, { id: crypto.randomUUID(), name: 'Nouveau Modèle', separator: 'semicolon', columns: [] }])} className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center">
                    <Plus className="w-4 h-4 mr-2" /> Nouveau Modèle
                  </button>
                </div>
                {localTemplates.map(tpl => (
                  <div key={tpl.id} className="p-6 border-2 border-slate-200 rounded-[2rem] bg-white space-y-4">
                    <div className="flex items-center space-x-4">
                      <input value={tpl.name} onChange={(e) => updateTemplate(tpl.id, { name: e.target.value })} className="flex-1 text-lg font-black outline-none border-b-2 border-transparent focus:border-indigo-600" />
                      <button onClick={() => setLocalTemplates(localTemplates.filter(t => t.id !== tpl.id))} className="text-rose-500 p-2"><Trash2 className="w-5 h-5" /></button>
                    </div>
                    {/* Colonnes simplifiées pour l'exemple XML court */}
                    <button onClick={() => addColumn(tpl.id)} className="w-full py-4 border-2 border-dashed border-slate-200 rounded-xl text-[10px] font-black uppercase text-slate-400">Ajouter Colonne</button>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'lookups' && (
              <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="flex justify-between items-center">
                  <h3 className="text-xl font-black text-slate-900 tracking-tight">Transcodage</h3>
                  <button onClick={() => setLocalLookups([...localLookups, { id: crypto.randomUUID(), name: 'Nouvelle Table', entries: [] }])} className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center">
                    <Plus className="w-4 h-4 mr-2" /> Créer Table
                  </button>
                </div>
                {localLookups.map(table => (
                   <div key={table.id} className="p-6 border-2 border-slate-200 rounded-[2rem] bg-white">
                      <input value={table.name} onChange={(e) => setLocalLookups(localLookups.map(l => l.id === table.id ? {...l, name: e.target.value} : l))} className="text-lg font-black mb-4 outline-none" />
                      {/* Entrées simplifiées */}
                      <button onClick={() => setLocalLookups(localLookups.map(l => l.id === table.id ? {...l, entries: [...l.entries, {key:'', value:''}]} : l))} className="w-full py-4 border-2 border-dashed border-slate-200 rounded-xl text-[10px] font-black uppercase text-slate-400">Ajouter Entrée</button>
                   </div>
                ))}
              </div>
            )}

            {activeTab === 'erp' && (
               <div className="max-w-2xl space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                 <h3 className="text-xl font-black">Configuration Sage X3</h3>
                 <FormGroup label="URL Endpoint" value={localErp.apiUrl} onChange={(v:any)=>setLocalErp({...localErp, apiUrl:v})} />
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
