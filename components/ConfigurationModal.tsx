
import React, { useState, useEffect } from 'react';
import { Settings, Save, X, Database, FileSpreadsheet, Plus, Trash2, CloudLightning, FileJson, Layers, BookOpen, Info, Landmark, Percent, Tag, Code2, ChevronDown, Check } from 'lucide-react';
import { ErpConfig, LookupTable, ExportTemplate, PartnerMasterData, XmlMappingProfile, ExportColumn } from '../types';

const FIELD_GROUPS = [
  {
    name: 'Identité du Document',
    fields: [
      { id: 'invoiceType', label: 'Type de Document', bt: 'BT-3', desc: 'Code du type de facture (380: Facture, 381: Avoir).' },
      { id: 'invoiceNumber', label: 'Numéro Facture', bt: 'BT-1', desc: 'Identifiant unique de la facture.' },
      { id: 'invoiceDate', label: 'Date d\'émission', bt: 'BT-2', desc: 'Date à laquelle la facture a été émise (JJ/MM/AAAA).' },
      { id: 'dueDate', label: 'Date d\'échéance', bt: 'BT-9', desc: 'Date limite de paiement.' },
      { id: 'currency', label: 'Devise', bt: 'BT-5', desc: 'Code ISO 4217 de la devise (ex: EUR, USD).' },
      { id: 'businessProcessId', label: 'Profil Processus', bt: 'BT-23', desc: 'Identifiant du profil de gestion (ex: Factur-X).' },
    ]
  },
  {
    name: 'Références & Logistique',
    fields: [
      { id: 'poNumber', label: 'N° Commande (PO)', bt: 'BT-13', desc: 'Référence du bon de commande associé.' },
      { id: 'buyerReference', label: 'Réf. Acheteur', bt: 'BT-10', desc: 'Identifiant de référence fourni par l\'acheteur.' },
      { id: 'contractNumber', label: 'N° Contrat', bt: 'BT-12', desc: 'Référence du contrat cadre.' },
      { id: 'deliveryNoteNumber', label: 'N° Bon Livraison', bt: 'BT-16', desc: 'Référence du document de réception.' },
      { id: 'projectReference', label: 'Réf. Projet', bt: 'BT-11', desc: 'Identifiant du projet associé.' },
      { id: 'deliveryDate', label: 'Date de Livraison', bt: 'BT-72', desc: 'Date réelle de livraison des biens/services.' },
      { id: 'receivingAdviceNumber', label: 'N° Avis Réception', bt: 'BT-15', desc: 'Référence du bordereau de réception.' },
    ]
  },
  {
    name: 'Vendeur (Fournisseur)',
    fields: [
      { id: 'supplier', label: 'Nom Vendeur', bt: 'BT-27', desc: 'Raison sociale complète de l\'émetteur.' },
      { id: 'supplierSiret', label: 'SIRET Vendeur', bt: 'BT-29', desc: 'Identifiant SIRET (14 chiffres) du siège ou établissement.' },
      { id: 'supplierVat', label: 'TVA Vendeur', bt: 'BT-31', desc: 'Numéro de TVA intracommunautaire du vendeur.' },
      { id: 'supplierAddress', label: 'Adresse Vendeur', bt: 'BG-5', desc: 'Adresse complète (rue, ville, CP, pays).' },
      { id: 'supplierErpCode', label: 'Code ERP Vendeur', bt: 'N/A', desc: 'Identifiant pivot pour l\'intégration comptable.' },
    ]
  },
  {
    name: 'Acheteur (Client)',
    fields: [
      { id: 'buyerName', label: 'Nom Acheteur', bt: 'BT-44', desc: 'Raison sociale du client destinataire.' },
      { id: 'buyerSiret', label: 'SIRET Acheteur', bt: 'BT-47', desc: 'Identifiant légal de l\'acheteur.' },
      { id: 'buyerVat', label: 'TVA Acheteur', bt: 'BT-48', desc: 'Numéro de TVA intracommunautaire de l\'acheteur.' },
      { id: 'buyerAddress', label: 'Adresse Acheteur', bt: 'BG-8', desc: 'Adresse de facturation complète du client.' },
      { id: 'buyerErpCode', label: 'Code Client ERP', bt: 'N/A', desc: 'Code client dans votre système comptable.' },
    ]
  },
  {
    name: 'Montants & Taxes',
    fields: [
      { id: 'amountExclVat', label: 'Total HT', bt: 'BT-109', desc: 'Somme des montants HT des lignes.' },
      { id: 'totalVat', label: 'Total TVA', bt: 'BT-110', desc: 'Montant total de la taxe sur la valeur ajoutée.' },
      { id: 'amountInclVat', label: 'Total TTC', bt: 'BT-112', desc: 'Montant net à payer (Total HT + TVA).' },
      { id: 'globalDiscount', label: 'Remise Globale', bt: 'BT-107', desc: 'Montant de la remise appliquée au total HT.' },
      { id: 'globalCharge', label: 'Frais Globaux', bt: 'BT-108', desc: 'Montant des frais annexes (port, emballage).' },
      { id: 'prepaidAmount', label: 'Montant Déjà Payé', bt: 'BT-113', desc: 'Somme déjà réglée (acomptes).' },
    ]
  },
  {
    name: 'Paiement & Banque',
    fields: [
      { id: 'iban', label: 'IBAN', bt: 'BT-84', desc: 'Numéro de compte bancaire international.' },
      { id: 'bic', label: 'BIC', bt: 'BT-85', desc: 'Code SWIFT d\'identification de la banque.' },
      { id: 'paymentMethod', label: 'Mode de Paiement', bt: 'BT-81', desc: 'Libellé du mode de règlement.' },
      { id: 'paymentMeansCode', label: 'Code UNCL4461', bt: 'BT-81', desc: 'Code numérique du mode de paiement (ex: 30: Virement).' },
      { id: 'paymentTerms', label: 'Conditions Paiement', bt: 'BT-20', desc: 'Description textuelle des délais de règlement.' },
      { id: 'paymentReference', label: 'Référence Paiement', bt: 'BT-83', desc: 'Libellé à faire figurer sur le virement.' },
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

  const handleAddXmlProfile = () => {
    setLocalXmlProfiles([{ 
      id: crypto.randomUUID(), 
      name: 'Nouveau Profil XML', 
      rootTag: 'ExportInvoices', 
      itemTag: 'Invoice', 
      mappings: [{ btId: 'invoiceNumber', xmlTag: 'InvoiceID', enabled: true }]
    }, ...localXmlProfiles]);
  };

  const handleAddLookup = () => {
    setLocalLookups([{ id: crypto.randomUUID(), name: 'Table Transcodage', entries: [] }, ...localLookups]);
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-[110] p-4">
      <div className="bg-white rounded-[2.5rem] shadow-2xl border border-slate-200 w-full max-w-7xl h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95">
        
        <div className="px-10 py-6 border-b border-slate-100 flex justify-between items-center bg-white shrink-0">
          <div className="flex items-center space-x-6">
            <div className="bg-slate-950 p-3 rounded-2xl text-white shadow-xl"><Settings className="w-6 h-6" /></div>
            <div>
              <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Hub de Configuration</h2>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Gouvernance & Mappages SaaS</p>
            </div>
          </div>
          <button onClick={onClose} className="p-3 text-slate-400 hover:text-rose-500 transition-colors bg-slate-50 rounded-xl"><X className="w-6 h-6" /></button>
        </div>

        <div className="flex-1 flex overflow-hidden bg-slate-50">
          <div className="w-72 bg-white border-r border-slate-200 p-6 space-y-2 shrink-0 overflow-y-auto custom-scrollbar">
            <NavBtn icon={Database} label="Master Data" active={activeTab === 'masterdata'} onClick={() => setActiveTab('masterdata')} />
            <NavBtn icon={FileSpreadsheet} label="Templates CSV" active={activeTab === 'templates'} onClick={() => setActiveTab('templates')} />
            <NavBtn icon={FileJson} label="Profils XML" active={activeTab === 'xml'} onClick={() => setActiveTab('xml')} />
            <NavBtn icon={Layers} label="Transcodage" active={activeTab === 'lookups'} onClick={() => setActiveTab('lookups')} />
            <NavBtn icon={CloudLightning} label="ERP Sync" active={activeTab === 'erp'} onClick={() => setActiveTab('erp')} />
            <div className="pt-6 mt-4 border-t border-slate-100">
               <NavBtn icon={BookOpen} label="Glossaire Factur-X" active={activeTab === 'glossary'} onClick={() => setActiveTab('glossary')} />
            </div>
          </div>

          <div className="flex-1 p-10 overflow-y-auto bg-white custom-scrollbar">
            {activeTab === 'masterdata' && (
                <div className="space-y-8 animate-in fade-in">
                    <Header title="Données Maîtresses Tiers" desc="Référentiel utilisé pour le vidéo codage et l'enrichissement des données ERP.">
                        <button onClick={handleAddMasterData} className="bg-indigo-600 text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center shadow-xl hover:bg-indigo-700 transition-all"><Plus className="w-4 h-4 mr-2" /> Ajouter un Tiers</button>
                    </Header>
                    {localMasterData.map(m => (
                        <div key={m.id} className="p-8 bg-slate-50 rounded-[2.5rem] border border-slate-100 space-y-6 relative group hover:bg-white hover:border-indigo-100 transition-all duration-300">
                            <button onClick={() => setLocalMasterData(prev => prev.filter(x => x.id !== m.id))} className="absolute top-8 right-8 text-slate-300 hover:text-rose-500 transition-colors"><Trash2 className="w-5 h-5" /></button>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                <Input label="Raison Sociale" value={m.name} onChange={(v:string)=>setLocalMasterData(prev=>prev.map(x=>x.id===m.id?{...x, name:v}:x))} />
                                <Input label="Code ERP" value={m.erpCode} onChange={(v:string)=>setLocalMasterData(prev=>prev.map(x=>x.id===m.id?{...x, erpCode:v}:x))} />
                                <Input label="SIRET" value={m.siret} onChange={(v:string)=>setLocalMasterData(prev=>prev.map(x=>x.id===m.id?{...x, siret:v}:x))} />
                                <Input label="Numéro TVA" value={m.vatNumber} onChange={(v:string)=>setLocalMasterData(prev=>prev.map(x=>x.id===m.id?{...x, vatNumber:v}:x))} />
                                <Input label="IBAN" value={m.iban} onChange={(v:string)=>setLocalMasterData(prev=>prev.map(x=>x.id===m.id?{...x, iban:v.replace(/\s/g, "")}:x))} />
                                <Input label="BIC / SWIFT" value={m.bic} onChange={(v:string)=>setLocalMasterData(prev=>prev.map(x=>x.id===m.id?{...x, bic:v}:x))} />
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {activeTab === 'templates' && (
                <div className="space-y-10 animate-in fade-in">
                    <Header title="Blueprints d'Export CSV" desc="Structurez vos exports plats pour une intégration directe dans votre comptabilité.">
                        <button onClick={handleAddTemplate} className="bg-indigo-600 text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center shadow-xl hover:bg-indigo-700 transition-all"><Plus className="w-4 h-4 mr-2" /> Nouveau Blueprint</button>
                    </Header>
                    {localTemplates.map(tpl => (
                        <div key={tpl.id} className="p-10 border-2 border-slate-100 rounded-[3rem] bg-slate-50/50 mb-8 relative">
                            <button onClick={() => setLocalTemplates(prev => prev.filter(t => t.id !== tpl.id))} className="absolute top-10 right-10 text-slate-300 hover:text-rose-500 transition-colors"><Trash2 className="w-5 h-5" /></button>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                              <Input label="Nom du Template" value={tpl.name} onChange={(v:string)=>setLocalTemplates(prev=>prev.map(t=>t.id===tpl.id?{...t, name:v}:t))} />
                              <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Séparateur de Fichier</label>
                                <div className="flex bg-white p-1 rounded-2xl border border-slate-200">
                                  <SepBtn label="Point-virgule (;)" active={tpl.separator === 'semicolon'} onClick={() => setLocalTemplates(prev=>prev.map(t=>t.id===tpl.id?{...t, separator:'semicolon'}:t))} />
                                  <SepBtn label="Virgule (,)" active={tpl.separator === 'comma'} onClick={() => setLocalTemplates(prev=>prev.map(t=>t.id===tpl.id?{...t, separator:'comma'}:t))} />
                                  <SepBtn label="Tabulation (txt)" active={tpl.separator === 'tab'} onClick={() => setLocalTemplates(prev=>prev.map(t=>t.id===tpl.id?{...t, separator:'tab'}:t))} />
                                </div>
                              </div>
                            </div>
                            <div className="space-y-3 bg-white p-8 rounded-[2.5rem] shadow-inner">
                              <p className="text-[10px] font-black uppercase text-slate-400 mb-4 tracking-widest">Configuration des Colonnes</p>
                              {tpl.columns?.map((col, idx) => (
                                <div key={idx} className="flex space-x-3 items-center animate-in slide-in-from-left-2">
                                  <input placeholder="Libellé Entête" value={col.header} onChange={e=>setLocalTemplates(prev=>prev.map(t=>t.id===tpl.id?{...t, columns: t.columns.map((c, i)=>i===idx?{...c, header:e.target.value}:c)}:t))} className="flex-1 px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold outline-none focus:bg-white focus:border-indigo-500 transition-all" />
                                  <select value={col.value} onChange={e=>setLocalTemplates(prev=>prev.map(t=>t.id===tpl.id?{...t, columns: t.columns.map((c, i)=>i===idx?{...c, value:e.target.value}:c)}:t))} className="w-72 px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold outline-none focus:bg-white focus:border-indigo-500 transition-all">
                                    {FIELD_GROUPS.map(group => (
                                      <optgroup key={group.name} label={group.name}>
                                        {group.fields.map(f => <option key={f.id} value={f.id}>{f.label}</option>)}
                                      </optgroup>
                                    ))}
                                  </select>
                                  <button onClick={()=>setLocalTemplates(prev=>prev.map(t=>t.id===tpl.id?{...t, columns: t.columns.filter((_, i)=>i!==idx)}:t))} className="p-3 text-slate-300 hover:text-rose-500 transition-all"><Trash2 className="w-4 h-4" /></button>
                                </div>
                              ))}
                              <button onClick={() => setLocalTemplates(prev => prev.map(t => t.id === tpl.id ? { ...t, columns: [...(t.columns || []), { header: 'Nouveau Champ', type: 'field', value: 'invoiceNumber' }] } : t))} className="mt-4 px-6 py-3 text-[10px] font-black uppercase tracking-widest text-indigo-600 bg-indigo-50 rounded-xl flex items-center hover:bg-indigo-100 transition-all"><Plus className="w-3 h-3 mr-2" /> Ajouter une colonne</button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {activeTab === 'xml' && (
                <div className="space-y-10 animate-in fade-in">
                    <Header title="Profils de Mapping XML" desc="Générez des fichiers XML personnalisés pour vos échanges EDI ou l'importation de documents structurés.">
                        <button onClick={handleAddXmlProfile} className="bg-indigo-600 text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center shadow-xl hover:bg-indigo-700 transition-all"><Plus className="w-4 h-4 mr-2" /> Nouveau Profil XML</button>
                    </Header>
                    {localXmlProfiles.map(prof => (
                        <div key={prof.id} className="p-10 border-2 border-slate-100 rounded-[3rem] bg-slate-50/50 mb-8 relative">
                            <button onClick={() => setLocalXmlProfiles(prev => prev.filter(p => p.id !== prof.id))} className="absolute top-10 right-10 text-slate-300 hover:text-rose-500 transition-colors"><Trash2 className="w-5 h-5" /></button>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                              <Input label="Nom du Profil" value={prof.name} onChange={(v:string)=>setLocalXmlProfiles(prev=>prev.map(p=>p.id===prof.id?{...p, name:v}:p))} />
                              <Input label="Balise Racine (Root)" value={prof.rootTag} onChange={(v:string)=>setLocalXmlProfiles(prev=>prev.map(p=>p.id===prof.id?{...p, rootTag:v}:p))} />
                              <Input label="Balise de Facture (Item)" value={prof.itemTag} onChange={(v:string)=>setLocalXmlProfiles(prev=>prev.map(p=>p.id===prof.id?{...p, itemTag:v}:p))} />
                            </div>
                            <div className="space-y-3 bg-white p-8 rounded-[2.5rem] shadow-inner">
                                <p className="text-[10px] font-black uppercase text-slate-400 mb-4 tracking-widest">Mappings de Balises</p>
                                {prof.mappings?.map((m, idx) => (
                                  <div key={idx} className="flex space-x-3 items-center animate-in slide-in-from-left-2">
                                    <select value={m.btId} onChange={e=>setLocalXmlProfiles(prev=>prev.map(p=>p.id===prof.id?{...p, mappings: p.mappings.map((mapping, i)=>i===idx?{...mapping, btId: e.target.value}:mapping)}:p))} className="w-72 px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold outline-none focus:bg-white focus:border-indigo-500 transition-all">
                                      {FIELD_GROUPS.map(group => (
                                        <optgroup key={group.name} label={group.name}>
                                          {group.fields.map(f => <option key={f.id} value={f.id}>{f.label}</option>)}
                                        </optgroup>
                                      ))}
                                    </select>
                                    <div className="flex-none p-2 text-slate-300"><Code2 className="w-4 h-4" /></div>
                                    <input placeholder="Nom du Tag XML (ex: InvoiceID)" value={m.xmlTag} onChange={e=>setLocalXmlProfiles(prev=>prev.map(p=>p.id===prof.id?{...p, mappings: p.mappings.map((mapping, i)=>i===idx?{...mapping, xmlTag: e.target.value}:mapping)}:p))} className="flex-1 px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-xs font-mono font-bold outline-none focus:bg-white focus:border-indigo-500 transition-all" />
                                    <button onClick={()=>setLocalXmlProfiles(prev=>prev.map(p=>p.id===prof.id?{...p, mappings: p.mappings.filter((_, i)=>i!==idx)}:p))} className="p-3 text-slate-300 hover:text-rose-500 transition-all"><Trash2 className="w-4 h-4" /></button>
                                  </div>
                                ))}
                                <button onClick={() => setLocalXmlProfiles(prev => prev.map(p => p.id === prof.id ? { ...p, mappings: [...(p.mappings || []), { btId: 'invoiceNumber', xmlTag: 'InvoiceNumber', enabled: true }] } : p))} className="mt-4 px-6 py-3 text-[10px] font-black uppercase tracking-widest text-indigo-600 bg-indigo-50 rounded-xl flex items-center hover:bg-indigo-100 transition-all"><Plus className="w-3 h-3 mr-2" /> Ajouter un mapping</button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {activeTab === 'lookups' && (
                <div className="space-y-10 animate-in fade-in">
                    <Header title="Tables de Transcodage" desc="Mappez les valeurs hétérogènes extraites par l'IA vers vos codes internes ERP immuables.">
                        <button onClick={handleAddLookup} className="bg-indigo-600 text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center shadow-xl hover:bg-indigo-700 transition-all"><Plus className="w-4 h-4 mr-2" /> Nouvelle Table</button>
                    </Header>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      {localLookups.map(table => (
                        <div key={table.id} className="p-8 bg-slate-50 border border-slate-200 rounded-[2.5rem] space-y-4 relative">
                            <button onClick={() => setLocalLookups(prev => prev.filter(t => t.id !== table.id))} className="absolute top-8 right-8 text-rose-300 hover:text-rose-500 transition-all"><Trash2 className="w-4 h-4" /></button>
                            <Input label="Nom de la Table" value={table.name} onChange={(v:string)=>setLocalLookups(prev=>prev.map(t=>t.id===table.id?{...t, name:v}:t))} />
                            <div className="space-y-2 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
                               {(table.entries || []).map((entry, eIdx) => (
                                 <div key={eIdx} className="flex space-x-2">
                                   <input value={entry.key} onChange={e=>setLocalLookups(prev=>prev.map(t=>t.id===table.id?{...t, entries:t.entries.map((en, i)=>i===eIdx?{...en, key:e.target.value}:en)}:t))} className="flex-1 bg-white border border-slate-200 p-2 rounded-xl text-xs font-bold" placeholder="IA Source" />
                                   <input value={entry.value} onChange={e=>setLocalLookups(prev=>prev.map(t=>t.id===table.id?{...t, entries:t.entries.map((en, i)=>i===eIdx?{...en, value:e.target.value}:en)}:t))} className="flex-1 bg-white border border-slate-200 p-2 rounded-xl text-xs font-bold text-indigo-600" placeholder="Code ERP" />
                                   <button onClick={()=>setLocalLookups(prev=>prev.map(t=>t.id===table.id?{...t, entries:t.entries.filter((_, i)=>i!==eIdx)}:t))} className="text-rose-400 p-2"><X className="w-4 h-4" /></button>
                                 </div>
                               ))}
                               <button onClick={()=>setLocalLookups(prev=>prev.map(t=>t.id===table.id?{...t, entries:[...(t.entries || []), {key:'', value:''}]}:t))} className="text-[9px] font-black uppercase text-indigo-500 hover:underline pt-2">+ Ajouter correspondance</button>
                            </div>
                        </div>
                      ))}
                    </div>
                </div>
            )}

            {activeTab === 'erp' && (
              <div className="max-w-2xl space-y-10 animate-in fade-in">
                <Header title="Passerelle ERP Sync" desc="Connectez l'extracteur directement à vos endpoints API de production pour une synchronisation temps réel." />
                <div className="bg-slate-900 rounded-[3rem] p-12 text-white shadow-2xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform"><CloudLightning className="w-32 h-32" /></div>
                    <div className="flex items-center justify-between mb-10 relative z-10">
                        <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Statut de la passerelle : {localErp.enabled ? 'OPÉRATIONNEL' : 'DÉSACTIVÉ'}</span>
                        <button onClick={()=>setLocalErp({...localErp, enabled:!localErp.enabled})} className={`w-16 h-8 rounded-full p-1.5 transition-all ${localErp.enabled?'bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.5)]':'bg-white/20'}`}>
                            <div className={`w-5 h-5 bg-white rounded-full transition-all ${localErp.enabled?'translate-x-8':'translate-x-0'}`}></div>
                        </button>
                    </div>
                    <div className="space-y-8 relative z-10">
                        <Input label="Endpoint API ERP" value={localErp.apiUrl} onChange={(v:string)=>setLocalErp({...localErp, apiUrl:v})} theme="dark" placeholder="https://votre-erp.com/api/v1/invoices" />
                        <Input label="Clé Secrète / API Token" type="password" value={localErp.apiKey} onChange={(v:string)=>setLocalErp({...localErp, apiKey:v})} theme="dark" placeholder="Bearer xxxxxxxxx" />
                    </div>
                </div>
              </div>
            )}

            {activeTab === 'glossary' && (
                <div className="space-y-10 animate-in fade-in">
                    <Header title="Référentiel Sémantique Factur-X" desc="Définitions techniques et métier des Business Terms (BT) de la norme européenne EN16931." />
                    <div className="space-y-12">
                        {FIELD_GROUPS.map(group => (
                          <div key={group.name} className="space-y-6">
                            <h4 className="text-[12px] font-black text-slate-900 uppercase tracking-[0.2em] flex items-center">
                              <div className="w-1.5 h-1.5 bg-indigo-600 rounded-full mr-3"></div>
                              {group.name}
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {group.fields.map(f => (
                                    <div key={f.id} className="p-8 bg-slate-50 border border-slate-100 rounded-[2rem] hover:bg-white hover:shadow-2xl transition-all duration-300 group">
                                        <div className="flex justify-between items-start mb-3">
                                          <span className="text-[12px] font-black text-slate-900 uppercase leading-tight group-hover:text-indigo-600 transition-colors">{f.label}</span>
                                          <span className="text-[9px] font-mono font-black text-indigo-500 bg-indigo-50 px-2 py-1 rounded border border-indigo-100 tracking-tighter">BT-{f.bt}</span>
                                        </div>
                                        <p className="text-[10px] text-slate-500 font-bold leading-relaxed">{f.desc}</p>
                                        <div className="mt-4 pt-4 border-t border-slate-200/50 flex items-center text-[8px] font-black text-slate-400 uppercase tracking-widest">
                                          <Code2 className="w-3 h-3 mr-2" /> ID Mapping: {f.id}
                                        </div>
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

        <div className="px-10 py-6 bg-slate-50 border-t border-slate-100 flex justify-end items-center space-x-6 shrink-0">
          <button onClick={onClose} className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-600 transition-colors">Fermer sans enregistrer</button>
          <button onClick={handleSaveAll} className="bg-slate-950 text-white px-12 py-5 rounded-[1.5rem] text-[10px] font-black uppercase tracking-[0.2em] shadow-2xl hover:bg-black transition-all active:scale-95 flex items-center border-b-4 border-slate-800">
            <Save className="w-5 h-5 mr-3" /> Appliquer les Réglages Société
          </button>
        </div>
      </div>
    </div>
  );
};

const NavBtn = ({ icon: Icon, label, active, onClick }: any) => (
  <button onClick={onClick} className={`w-full flex items-center space-x-5 px-8 py-5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${active ? 'bg-indigo-600 text-white shadow-2xl scale-105' : 'text-slate-400 hover:bg-slate-50 hover:text-slate-900'}`}>
    <Icon className={`w-6 h-6 ${active ? 'text-white' : 'text-slate-300'}`} />
    <span>{label}</span>
  </button>
);

const Header = ({ title, desc, children }: any) => (
  <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end pb-10 border-b border-slate-100 mb-10 gap-6">
    <div className="max-w-2xl">
      <h3 className="text-3xl font-black text-slate-900 tracking-tight">{title}</h3>
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-3 leading-relaxed">{desc}</p>
    </div>
    <div className="shrink-0">{children}</div>
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
      className={`w-full px-6 py-4 rounded-2xl border outline-none transition-all text-sm font-bold shadow-sm
        ${theme==='dark' 
          ? 'bg-white/5 border-white/10 text-white placeholder-white/20 focus:border-white/40' 
          : 'bg-white border-slate-200 text-slate-900 placeholder-slate-300 focus:border-indigo-600 focus:shadow-indigo-50'}`}
    />
  </div>
);

const SepBtn = ({ label, active, onClick }: any) => (
  <button onClick={onClick} className={`flex-1 py-3 text-[9px] font-black uppercase rounded-xl transition-all ${active ? 'bg-slate-950 text-white shadow-lg' : 'text-slate-400 hover:text-slate-900'}`}>
    {label}
  </button>
);
