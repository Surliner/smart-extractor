
import React, { useState, useMemo, useEffect } from 'react';
import { Settings, X, Database, Search, UploadCloud, Plus, Trash2, ChevronLeft, ChevronRight, BarChart3, Users, Zap, ShieldCheck, Download, Save, FileSpreadsheet, FileJson, Layers, CloudLightning, BookOpen, Info, CreditCard, Landmark, Percent, ListTodo, AlertTriangle } from 'lucide-react';
import { ErpConfig, LookupTable, ExportTemplate, PartnerMasterData, XmlMappingProfile } from '../types';

const MD_PAGE_SIZE = 15;

const FIELD_GROUPS = [
  { name: 'Identité Document', fields: [
    { id: 'invoiceType', label: 'Type Document (BT-3)' },
    { id: 'invoiceNumber', label: 'N° Facture (BT-1)' },
    { id: 'invoiceDate', label: 'Date Facture (BT-2)' },
    { id: 'dueDate', label: 'Date Échéance (BT-9)' },
    { id: 'taxPointDate', label: 'Point de Taxe (BT-7)' },
    { id: 'currency', label: 'Devise ISO (BT-5)' },
    { id: 'businessProcessId', label: 'Profil Standard (BT-24)' },
    { id: 'invoiceNote', label: 'Notes Facture (BT-22)' },
    { id: 'extractionMode', label: 'Mode IA' },
    { id: 'direction', label: 'Sens Flux' }
  ]},
  { name: 'Vendeur (Seller)', fields: [
    { id: 'supplier', label: 'Nom Vendeur (BT-27)' },
    { id: 'supplierSiret', label: 'SIRET Vendeur (BT-29) ⚠️' },
    { id: 'supplierVat', label: 'TVA Vendeur (BT-31) ⚠️' },
    { id: 'supplierErpCode', label: 'Code ERP Vendeur' },
    { id: 'supplierAddress', label: 'Adresse Vendeur (BG-5)' },
    { id: 'iban', label: 'IBAN Vendeur (BT-84) ⚠️' },
    { id: 'bic', label: 'BIC/SWIFT Vendeur (BT-85)' }
  ]},
  { name: 'Acheteur (Buyer)', fields: [
    { id: 'buyerName', label: 'Nom Acheteur (BT-44)' },
    { id: 'buyerSiret', label: 'SIRET Acheteur (BT-47) ⚠️' },
    { id: 'buyerVat', label: 'TVA Acheteur (BT-48) ⚠️' },
    { id: 'buyerErpCode', label: 'Code ERP Acheteur' },
    { id: 'buyerAddress', label: 'Adresse Acheteur (BG-8)' }
  ]},
  { name: 'Références & Logistique', fields: [
    { id: 'poNumber', label: 'N° Commande (BT-13)' },
    { id: 'buyerReference', label: 'Réf. Acheteur (BT-10) ⚠️' },
    { id: 'contractNumber', label: 'N° Contrat (BT-12)' },
    { id: 'deliveryNoteNumber', label: 'N° Bon Livraison (BT-16)' },
    { id: 'projectReference', label: 'Réf. Projet (BT-11)' },
    { id: 'deliveryDate', label: 'Date Livraison (BT-72)' }
  ]},
  { name: 'Totaux Financiers', fields: [
    { id: 'amountExclVat', label: 'Total HT Net (BT-109)' },
    { id: 'totalVat', label: 'Total TVA (BT-110)' },
    { id: 'amountInclVat', label: 'Total TTC (BT-112)' },
    { id: 'prepaidAmount', label: 'Montant Acomptes (BT-113)' },
    { id: 'globalDiscount', label: 'Remises Totales (BT-107)' },
    { id: 'globalCharge', label: 'Frais Totaux (BT-108)' },
    { id: 'paymentMethod', label: 'Mode Paiement' },
    { id: 'paymentMeansCode', label: 'Code UN/CEFACT (BT-81)' },
    { id: 'paymentTermsText', label: 'Conditions Paiement (BT-20)' }
  ]},
  { name: '⚠️ Ventilation TVA (BG-23) OBLIGATOIRE', fields: [
    { id: 'vatBreakdowns', label: 'Détail TVA (Array JSON)' },
    { id: 'vatCategory', label: 'Catégorie TVA (BT-118)' },
    { id: 'vatRate', label: 'Taux % (BT-119)' },
    { id: 'vatTaxableAmount', label: 'Base HT (BT-116)' },
    { id: 'vatAmount', label: 'Montant TVA (BT-117)' }
  ]},
  { name: 'Détail des Lignes (BG-25)', fields: [
    { id: 'articleId', label: 'Ligne: Réf. Article (BT-128)' },
    { id: 'description', label: 'Ligne: Désignation (BT-129)' },
    { id: 'quantity', label: 'Ligne: Quantité (BT-131)' },
    { id: 'unitOfMeasure', label: 'Ligne: Unité (BT-130)' },
    { id: 'unitPrice', label: 'Ligne: P.U. Net (BT-146)' },
    { id: 'grossPrice', label: 'Ligne: P.U. Brut (BT-149)' },
    { id: 'discount', label: 'Ligne: Remise % (BT-147)' },
    { id: 'lineAllowanceAmount', label: 'Ligne: Remise € (BT-136)' },
    { id: 'lineChargeAmount', label: 'Ligne: Frais € (BT-141)' },
    { id: 'taxRate', label: 'Ligne: Taux TVA % (BT-152)' },
    { id: 'lineVatCategory', label: 'Ligne: Catégorie TVA (BT-151) ⚠️' },
    { id: 'amount', label: 'Ligne: Montant HT (BT-131)' }
  ]}
];

const GLOSSARY_DATA = [
  {
    category: "En-tête & Identité (Header)",
    items: [
      { bt: 'BT-1', label: 'Invoice Number', desc: 'Identifiant unique de la facture (ex: FAC-2024-001).' },
      { bt: 'BT-2', label: 'Issue Date', desc: 'Date d\'émission légale du document.' },
      { bt: 'BT-3', label: 'Invoice Type Code', desc: 'Code du type de document (380=Facture, 381=Avoir).' },
      { bt: 'BT-9', label: 'Payment Due Date', desc: 'Date à laquelle le paiement est exigible.' },
      { bt: 'BT-5', label: 'Currency Code', desc: 'Code devise ISO 4217 (ex: EUR).' },
      { bt: 'BT-10', label: 'Buyer Reference', desc: 'Référence fournie par l\'acheteur pour son suivi interne.' },
      { bt: 'BT-22', label: 'Invoice Note', desc: 'Commentaire ou mention légale additionnelle.' },
      { bt: 'BT-24', label: 'Business Process ID', desc: 'Identifiant du processus métier standardisé.' }
    ]
  },
  {
    category: "Vendeur (Seller)",
    items: [
      { bt: 'BT-27', label: 'Seller Name', desc: 'Raison sociale complète de l\'émetteur.' },
      { bt: 'BT-29', label: 'Seller ID (SIRET)', desc: 'Identifiant légal (SIRET 14 chiffres en France).' },
      { bt: 'BT-31', label: 'Seller VAT ID', desc: 'N° de TVA intracommunautaire du vendeur.' },
      { bt: 'BT-34', label: 'Seller Address', desc: 'Adresse géographique complète du siège du vendeur.' },
      { bt: 'BT-30', label: 'Seller Legal Registration', desc: 'Identifiant d\'enregistrement légal (ex: RCS).' }
    ]
  },
  {
    category: "Acheteur (Buyer)",
    items: [
      { bt: 'BT-44', label: 'Buyer Name', desc: 'Raison sociale complète du client acheteur.' },
      { bt: 'BT-47', label: 'Buyer ID (SIRET)', desc: 'Identifiant légal SIRET du client.' },
      { bt: 'BT-48', label: 'Buyer VAT ID', desc: 'N° de TVA intracommunautaire du client.' },
      { bt: 'BT-49', label: 'Buyer Address', desc: 'Adresse de facturation du client.' }
    ]
  },
  {
    category: "Règlement (Payment)",
    items: [
      { bt: 'BT-20', label: 'Payment Terms', desc: 'Conditions de règlement textuelles.' },
      { bt: 'BT-81', label: 'Payment Means Code', desc: 'Code du mode de paiement (30=Virement, 48=Carte, etc.).' },
      { bt: 'BT-83', label: 'Payment Reference', desc: 'Libellé à utiliser lors du virement (ex: N° Facture).' },
      { bt: 'BT-84', label: 'IBAN', desc: 'Identifiant de compte bancaire international.' },
      { bt: 'BT-85', label: 'BIC/SWIFT', desc: 'Code d\'identification de la banque.' }
    ]
  },
  {
    category: "⚠️ Ventilation TVA (BG-23) - Obligatoire",
    items: [
      { bt: 'BT-116', label: 'VAT Taxable Amount', desc: 'Base HT pour un taux donné. Somme des lignes à ce taux.' },
      { bt: 'BT-117', label: 'VAT Amount', desc: 'Montant TVA calculé = Base × Taux. Requis pour chaque taux.' },
      { bt: 'BT-118', label: 'VAT Category Code', desc: 'S=Standard, Z=Zéro, E=Exonéré, AE=Autoliquidation, G=Export.' },
      { bt: 'BT-119', label: 'VAT Rate %', desc: 'Taux TVA: 20.00, 10.00, 5.50, 2.10, 0.00. Deux décimales.' },
      { bt: 'BT-120', label: 'Exemption Reason', desc: 'Texte justificatif si exonération (ex: Art.293B CGI).' }
    ]
  },
  {
    category: "Totaux Financiers (Monetary Summation)",
    items: [
      { bt: 'BT-106', label: 'Net Amount', desc: 'Somme des montants HT des lignes.' },
      { bt: 'BT-107', label: 'Allowances Total', desc: 'Somme des remises au niveau en-tête.' },
      { bt: 'BT-108', label: 'Charges Total', desc: 'Somme des frais au niveau en-tête.' },
      { bt: 'BT-109', label: 'Total HT', desc: 'Montant total hors taxes du document.' },
      { bt: 'BT-110', label: 'Total VAT', desc: 'Montant total de la TVA.' },
      { bt: 'BT-112', label: 'Total TTC', desc: 'Montant total TTC de la facture.' },
      { bt: 'BT-113', label: 'Prepaid Amount', desc: 'Montant des acomptes déjà réglés.' },
      { bt: 'BT-115', label: 'Amount Due', desc: 'Montant net à payer (TTC - Acomptes).' }
    ]
  },
  {
    category: "Lignes (Invoice Lines)",
    items: [
      { bt: 'BT-126', label: 'Line ID', desc: 'Identifiant de la ligne (1, 2, 3...).' },
      { bt: 'BT-129', label: 'Item Name', desc: 'Désignation de l\'article ou service.' },
      { bt: 'BT-131', label: 'Quantity', desc: 'Quantité facturée pour la ligne.' },
      { bt: 'BT-136', label: 'Line Allowance', desc: 'Montant remise appliquée sur la ligne en €.' },
      { bt: 'BT-141', label: 'Line Charge', desc: 'Montant frais ajoutés sur la ligne en €.' },
      { bt: 'BT-146', label: 'Net Price', desc: 'Prix unitaire net de remise.' },
      { bt: 'BT-149', label: 'Gross Price', desc: 'Prix unitaire brut avant remise.' },
      { bt: 'BT-151', label: 'VAT Category', desc: 'Code catégorie TVA ligne (S, Z, E, AE). OBLIGATOIRE.' },
      { bt: 'BT-152', label: 'VAT Rate', desc: 'Taux de TVA applicable en pourcentage.' }
    ]
  }
];

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
  const [activeTab, setActiveTab] = useState<'stats' | 'masterdata' | 'templates' | 'xml' | 'lookups' | 'erp' | 'glossary'>('stats');
  
  const [localMasterData, setLocalMasterData] = useState<PartnerMasterData[]>(masterData || []);
  const [localTemplates, setLocalTemplates] = useState<ExportTemplate[]>(templates || []);
  const [localLookups, setLocalLookups] = useState<LookupTable[]>(lookupTables || []);
  const [localXmlProfiles, setLocalXmlProfiles] = useState<XmlMappingProfile[]>(xmlProfiles || []);
  const [localErp, setLocalErp] = useState<ErpConfig>(erpConfig || { apiUrl: '', apiKey: '', enabled: false });

  const [mdSearch, setMdSearch] = useState('');
  const [mdPage, setMdPage] = useState(1);

  useEffect(() => { 
    if (isOpen) {
      setLocalMasterData(masterData || []);
      setLocalTemplates(templates || []);
      setLocalLookups(lookupTables || []);
      setLocalXmlProfiles(xmlProfiles || []);
      setLocalErp(erpConfig || { apiUrl: '', apiKey: '', enabled: false });
    }
  }, [isOpen, masterData, templates, lookupTables, xmlProfiles, erpConfig]);

  const filteredMD = useMemo(() => {
    const s = mdSearch.toLowerCase();
    return localMasterData.filter(m => 
      m.name.toLowerCase().includes(s) || m.siret.includes(s) || (m.erpCode && m.erpCode.toLowerCase().includes(s))
    );
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
        return { 
          id: crypto.randomUUID(), name: c[0]?.trim(), erpCode: c[1]?.trim(), 
          siret: c[2]?.replace(/\s/g, ''), vatNumber: c[3]?.trim() || '', 
          iban: c[4]?.replace(/\s/g, '') || '', bic: c[5]?.trim() || '' 
        } as PartnerMasterData;
      }).filter(Boolean) as PartnerMasterData[];
      setLocalMasterData(prev => [...imported, ...prev]);
      alert(`${imported.length} tiers importés.`);
    };
    reader.readAsText(file);
  };

  const handleSaveAll = () => {
    onSaveMasterData(localMasterData);
    onSaveTemplates(localTemplates);
    onSaveLookups(localLookups);
    onSaveXmlProfiles(localXmlProfiles);
    onSaveErp(localErp);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-[110] p-4">
      <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-7xl h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95">
        <div className="px-10 py-6 border-b border-slate-100 flex justify-between items-center bg-white shrink-0">
          <div className="flex items-center space-x-6">
            <div className="bg-slate-950 p-3 rounded-2xl text-white shadow-xl"><Settings className="w-6 h-6" /></div>
            <div><h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Configuration Hub</h2><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">SaaS Enterprise Governance</p></div>
          </div>
          <button onClick={onClose} className="p-3 text-slate-400 hover:text-rose-500 bg-slate-50 rounded-xl"><X className="w-6 h-6" /></button>
        </div>

        <div className="flex-1 flex overflow-hidden">
          <div className="w-64 bg-slate-50 border-r border-slate-100 p-6 space-y-1.5 shrink-0 overflow-y-auto custom-scrollbar">
            <NavBtn icon={BarChart3} label="Dashboard" active={activeTab === 'stats'} onClick={() => setActiveTab('stats')} />
            <NavBtn icon={Database} label="Master Data" active={activeTab === 'masterdata'} onClick={() => setActiveTab('masterdata')} />
            <NavBtn icon={FileSpreadsheet} label="Templates CSV" active={activeTab === 'templates'} onClick={() => setActiveTab('templates')} />
            <NavBtn icon={FileJson} label="Profils XML" active={activeTab === 'xml'} onClick={() => setActiveTab('xml')} />
            <NavBtn icon={Layers} label="Transcodage" active={activeTab === 'lookups'} onClick={() => setActiveTab('lookups')} />
            <NavBtn icon={CloudLightning} label="Passerelle ERP" active={activeTab === 'erp'} onClick={() => setActiveTab('erp')} />
            <div className="pt-6 mt-4 border-t border-slate-200"><NavBtn icon={BookOpen} label="Glossaire" active={activeTab === 'glossary'} onClick={() => setActiveTab('glossary')} /></div>
          </div>

          <div className="flex-1 p-10 overflow-y-auto custom-scrollbar bg-white">
            {activeTab === 'stats' && (
              <div className="space-y-10 animate-in fade-in">
                <div className="grid grid-cols-3 gap-8">
                  <StatCard icon={Users} label="Tiers en Base" value={localMasterData.length.toLocaleString()} color="indigo" />
                  <StatCard icon={ShieldCheck} label="Conformité RFE" value="100%" color="emerald" />
                  <StatCard icon={Zap} label="Mode" value="RFE-Compliant" color="purple" />
                </div>
                <div className="bg-slate-900 rounded-[2.5rem] p-10 text-white shadow-inner">
                  <h4 className="text-lg font-black uppercase mb-4 tracking-tighter">Performance & RFE Readiness 2026</h4>
                  <p className="text-xs text-slate-400 leading-relaxed font-medium">Pipeline optimisé pour l'extraction EN16931. Support complet de la ventilation TVA (BG-23) et des identifiants sémantiques BT de la réforme fiscale française.</p>
                </div>
              </div>
            )}

            {activeTab === 'masterdata' && (
              <div className="space-y-8 animate-in fade-in">
                <div className="flex justify-between items-end">
                  <div className="relative flex-1 max-w-md"><Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" /><input type="text" placeholder="Rechercher tiers..." value={mdSearch} onChange={e => {setMdSearch(e.target.value); setMdPage(1);}} className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-[10px] font-black uppercase outline-none focus:bg-white focus:border-indigo-200" /></div>
                  <div className="flex space-x-3">
                    <label className="px-6 py-3 bg-white border border-slate-200 rounded-xl text-[10px] font-black uppercase cursor-pointer hover:bg-slate-50 transition-all flex items-center shadow-sm"><UploadCloud className="w-4 h-4 mr-2" /> Import CSV<input type="file" accept=".csv" onChange={handleImportCSV} className="hidden" /></label>
                    <button onClick={() => setLocalMasterData([{id: crypto.randomUUID(), name: 'Nouveau Tiers', erpCode: '', siret: '', vatNumber: '', iban: '', bic: ''}, ...localMasterData])} className="px-6 py-3 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase flex items-center shadow-lg hover:bg-indigo-700"><Plus className="w-4 h-4 mr-2" /> Ajouter</button>
                  </div>
                </div>
                <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-x-auto custom-scrollbar">
                  <table className="w-full text-left border-collapse min-w-[1200px]">
                    <thead className="bg-slate-50 text-[8px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                      <tr>
                        <th className="px-6 py-4">Nom Tiers</th><th className="px-6 py-4">Code ERP</th><th className="px-6 py-4">SIRET</th><th className="px-6 py-4">TVA</th><th className="px-6 py-4">IBAN</th><th className="px-6 py-4">BIC</th><th className="px-6 py-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {paginatedMD.map(m => (
                        <tr key={m.id} className="hover:bg-slate-50/50">
                          <td className="px-6 py-4"><input value={m.name} onChange={e => setLocalMasterData(prev => prev.map(x => x.id === m.id ? {...x, name: e.target.value} : x))} className="bg-transparent outline-none font-bold text-xs w-full focus:text-indigo-600" /></td>
                          <td className="px-6 py-4"><input value={m.erpCode} onChange={e => setLocalMasterData(prev => prev.map(x => x.id === m.id ? {...x, erpCode: e.target.value} : x))} className="bg-transparent outline-none font-black text-indigo-600 text-xs w-full uppercase" /></td>
                          <td className="px-6 py-4"><input value={m.siret} onChange={e => setLocalMasterData(prev => prev.map(x => x.id === m.id ? {...x, siret: e.target.value} : x))} className="bg-transparent outline-none font-mono text-[10px] w-full" /></td>
                          <td className="px-6 py-4"><input value={m.vatNumber || ''} onChange={e => setLocalMasterData(prev => prev.map(x => x.id === m.id ? {...x, vatNumber: e.target.value} : x))} className="bg-transparent outline-none font-mono text-[10px] w-full" /></td>
                          <td className="px-6 py-4"><input value={m.iban || ''} onChange={e => setLocalMasterData(prev => prev.map(x => x.id === m.id ? {...x, iban: e.target.value} : x))} className="bg-transparent outline-none font-mono text-[10px] w-full" /></td>
                          <td className="px-6 py-4"><input value={m.bic || ''} onChange={e => setLocalMasterData(prev => prev.map(x => x.id === m.id ? {...x, bic: e.target.value} : x))} className="bg-transparent outline-none font-mono text-[10px] w-full" /></td>
                          <td className="px-6 py-4 text-right"><button onClick={() => setLocalMasterData(prev => prev.filter(x => x.id !== m.id))} className="text-slate-300 hover:text-rose-500"><Trash2 className="w-4 h-4" /></button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="flex items-center justify-between py-4 border-t border-slate-50">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{filteredMD.length} Tiers</p>
                  <div className="flex items-center space-x-2">
                    <button onClick={() => setMdPage(p => Math.max(1, p-1))} disabled={mdPage === 1} className="p-2 border border-slate-200 rounded-lg disabled:opacity-30"><ChevronLeft className="w-4 h-4" /></button>
                    <span className="text-[10px] font-black text-indigo-600">Page {mdPage} / {mdTotalPages || 1}</span>
                    <button onClick={() => setMdPage(p => Math.min(mdTotalPages, p+1))} disabled={mdPage === mdTotalPages} className="p-2 border border-slate-200 rounded-lg disabled:opacity-30"><ChevronRight className="w-4 h-4" /></button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'templates' && (
              <div className="space-y-10 animate-in fade-in">
                <div className="flex justify-between items-end">
                  <h3 className="text-2xl font-black text-slate-900 uppercase">Blueprints CSV</h3>
                  <button onClick={() => setLocalTemplates([{id: crypto.randomUUID(), name: 'Nouveau Blueprint', separator: 'semicolon', columns: []}, ...localTemplates])} className="bg-indigo-600 text-white px-6 py-3 rounded-xl text-[10px] font-black uppercase flex items-center shadow-lg hover:bg-indigo-700"><Plus className="w-4 h-4 mr-2" /> Nouveau Template</button>
                </div>
                {localTemplates.map(tpl => (
                  <div key={tpl.id} className="p-8 border border-slate-200 rounded-[2rem] bg-slate-50 relative group">
                    <button onClick={() => setLocalTemplates(prev => prev.filter(t => t.id !== tpl.id))} className="absolute top-6 right-6 text-slate-300 hover:text-rose-500"><Trash2 className="w-5 h-5" /></button>
                    <div className="grid grid-cols-2 gap-6 mb-6">
                      <div className="space-y-2"><label className="text-[9px] font-black uppercase text-slate-400 ml-1">Nom du template</label><input value={tpl.name} onChange={e=>setLocalTemplates(prev=>prev.map(t=>t.id===tpl.id?{...t, name:e.target.value}:t))} className="w-full px-6 py-3 rounded-xl border border-slate-200 outline-none font-bold text-xs focus:border-indigo-300" /></div>
                      <div className="space-y-2"><label className="text-[9px] font-black uppercase text-slate-400 ml-1">Séparateur</label><select value={tpl.separator} onChange={e=>setLocalTemplates(prev=>prev.map(t=>t.id===tpl.id?{...t, separator:e.target.value as any}:t))} className="w-full px-6 py-3 rounded-xl border border-slate-200 outline-none font-bold text-xs"><option value="semicolon">Point-virgule (;)</option><option value="comma">Virgule (,)</option><option value="tab">Tabulation</option></select></div>
                    </div>
                    <div className="bg-white p-6 rounded-2xl space-y-3">
                      <p className="text-[10px] font-black uppercase text-slate-400 mb-3">Mappage Colonnes (BT-IDs RFE 2026)</p>
                      {tpl.columns.map((col, idx) => (
                        <div key={idx} className="flex space-x-3">
                           <input placeholder="Entête CSV" value={col.header} onChange={e=>setLocalTemplates(prev=>prev.map(t=>t.id===tpl.id?{...t, columns: t.columns.map((c, i)=>i===idx?{...c, header:e.target.value}:c)}:t))} className="flex-1 px-4 py-2 bg-slate-50 border border-slate-100 rounded-lg text-xs font-bold" />
                           <select value={col.value} onChange={e=>setLocalTemplates(prev=>prev.map(t=>t.id===tpl.id?{...t, columns: t.columns.map((c, i)=>i===idx?{...c, value:e.target.value}:c)}:t))} className="w-64 px-4 py-2 bg-slate-50 border border-slate-100 rounded-lg text-xs font-bold">
                             {FIELD_GROUPS.map(g => (
                               <optgroup key={g.name} label={g.name}>{g.fields.map(f => <option key={f.id} value={f.id}>{f.label}</option>)}</optgroup>
                             ))}
                           </select>
                           <button onClick={()=>setLocalTemplates(prev=>prev.map(t=>t.id===tpl.id?{...t, columns: t.columns.filter((_, i)=>i!==idx)}:t))} className="p-2 text-slate-300 hover:text-rose-500"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      ))}
                      <button onClick={()=>setLocalTemplates(prev=>prev.map(t=>t.id===tpl.id?{...t, columns: [...t.columns, {header:'Champ', type:'field', value:'invoiceNumber'}]}:t))} className="text-[10px] font-black uppercase text-indigo-600 px-4 py-2 hover:bg-indigo-50 rounded-lg"><Plus className="w-3 h-3 mr-1 inline" /> Ajouter une colonne</button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'xml' && (
              <div className="space-y-10 animate-in fade-in">
                 <div className="flex justify-between items-end"><h3 className="text-2xl font-black text-slate-900 uppercase">Profils XML & Factur-X</h3></div>
                 <div className="p-10 border border-slate-200 rounded-[2.5rem] bg-indigo-50/30 flex flex-col items-center justify-center space-y-4">
                    <div className="p-4 bg-white rounded-full shadow-lg"><FileJson className="w-10 h-10 text-indigo-500" /></div>
                    <p className="text-xs font-black uppercase text-slate-500 text-center leading-relaxed">Les flux XML CII (Factur-X) sont générés nativement<br/>selon le profil <b>Comfort EN16931</b>.<br/>L'extraction IA remplit les identifiants BG/BT du standard de facturation électronique.</p>
                 </div>
              </div>
            )}

            {activeTab === 'lookups' && (
              <div className="space-y-10 animate-in fade-in">
                <div className="flex justify-between items-end"><h3 className="text-2xl font-black text-slate-900 uppercase">Transcodage & Mappage ERP</h3><button onClick={()=>setLocalLookups([{id:crypto.randomUUID(), name:'Nouvelle Table', entries:[]}, ...localLookups])} className="bg-indigo-600 text-white px-6 py-3 rounded-xl text-[10px] font-black uppercase flex items-center shadow-lg hover:bg-indigo-700"><Plus className="w-4 h-4 mr-2" /> Nouvelle Table</button></div>
                {localLookups.map(tbl => (
                  <div key={tbl.id} className="p-8 border border-slate-200 rounded-[2rem] bg-slate-50">
                    <input value={tbl.name} onChange={e=>setLocalLookups(prev=>prev.map(t=>t.id===tbl.id?{...t, name:e.target.value}:t))} className="bg-transparent font-black text-slate-900 uppercase text-sm mb-6 outline-none border-b border-transparent focus:border-indigo-200" />
                    <div className="space-y-2">
                       {tbl.entries.map((ent, idx) => (
                         <div key={idx} className="flex space-x-3">
                            <input placeholder="Libellé Source (ex: Amazon)" value={ent.key} onChange={e=>setLocalLookups(prev=>prev.map(t=>t.id===tbl.id?{...t, entries: t.entries.map((en, i)=>i===idx?{...en, key:e.target.value}:en)}:t))} className="flex-1 px-4 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold" />
                            <input placeholder="Code ERP (ex: 401AMZ)" value={ent.value} onChange={e=>setLocalLookups(prev=>prev.map(t=>t.id===tbl.id?{...t, entries: t.entries.map((en, i)=>i===idx?{...en, value:e.target.value}:en)}:t))} className="flex-1 px-4 py-2 bg-white border border-slate-200 rounded-lg text-xs font-black text-indigo-600" />
                            <button onClick={()=>setLocalLookups(prev=>prev.map(t=>t.id===tbl.id?{...t, entries: t.entries.filter((_, i)=>i!==idx)}:t))} className="p-2 text-slate-300 hover:text-rose-500"><Trash2 className="w-4 h-4" /></button>
                         </div>
                       ))}
                       <button onClick={()=>setLocalLookups(prev=>prev.map(t=>t.id===tbl.id?{...t, entries:[...t.entries, {key:'', value:''}]}:t))} className="text-[10px] font-black uppercase text-indigo-600 mt-2 hover:underline"><Plus className="w-3 h-3 mr-1 inline" /> Ajouter une entrée</button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'erp' && (
              <div className="space-y-10 animate-in fade-in">
                <div className="flex justify-between items-end"><h3 className="text-2xl font-black text-slate-900 uppercase">Passerelle ERP Gateway</h3></div>
                <div className="p-10 border border-slate-200 rounded-[2.5rem] bg-slate-50 space-y-8 shadow-inner">
                  <div className="flex items-center space-x-4 p-4 bg-white rounded-2xl border border-slate-100 shadow-sm">
                    <CloudLightning className={`w-6 h-6 ${localErp.enabled ? 'text-indigo-600' : 'text-slate-300'}`} />
                    <div className="flex-1"><p className="text-sm font-black text-slate-900 uppercase">Synchronisation Active</p><p className="text-[9px] font-bold text-slate-400 uppercase">Push automatique des données vers votre SI après audit</p></div>
                    <button onClick={()=>setLocalErp({...localErp, enabled: !localErp.enabled})} className={`w-14 h-8 rounded-full relative transition-colors ${localErp.enabled ? 'bg-indigo-600' : 'bg-slate-300'}`}><div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-all ${localErp.enabled ? 'left-7' : 'left-1'}`}></div></button>
                  </div>
                  <div className="grid grid-cols-1 gap-6">
                    <div className="space-y-2"><label className="text-[10px] font-black uppercase text-slate-400 ml-1">Endpoint REST API</label><input placeholder="https://api.votre-erp.com/v1/factures" value={localErp.apiUrl} onChange={e=>setLocalErp({...localErp, apiUrl:e.target.value})} className="w-full px-6 py-4 rounded-2xl border border-slate-200 outline-none font-bold text-xs focus:border-indigo-300 bg-white" /></div>
                    <div className="space-y-2"><label className="text-[10px] font-black uppercase text-slate-400 ml-1">Clé API / Bearer Token</label><input type="password" value={localErp.apiKey} onChange={e=>setLocalErp({...localErp, apiKey:e.target.value})} className="w-full px-6 py-4 rounded-2xl border border-slate-200 outline-none font-bold text-xs focus:border-indigo-300 bg-white" /></div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'glossary' && (
              <div className="space-y-10 animate-in fade-in">
                <div className="flex justify-between items-end">
                  <h3 className="text-2xl font-black text-slate-900 uppercase">Glossaire RFE Factur-X (EN16931)</h3>
                </div>
                <div className="space-y-12">
                  {GLOSSARY_DATA.map((group, gIdx) => (
                    <div key={gIdx} className="space-y-5">
                      <div className="flex items-center space-x-4">
                        <div className="h-px flex-1 bg-slate-100"></div>
                        <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">{group.category}</h4>
                        <div className="h-px flex-1 bg-slate-100"></div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {group.items.map(item => (
                          <div key={item.bt} className="p-5 border border-slate-100 rounded-2xl bg-slate-50 hover:bg-indigo-50 transition-colors group">
                            <div className="flex justify-between items-start mb-2">
                              <span className="text-[8px] font-black text-indigo-600 bg-white px-2 py-0.5 rounded border border-indigo-100 group-hover:border-indigo-300 shadow-sm">{item.bt}</span>
                            </div>
                            <p className="text-xs font-black text-slate-900 uppercase">{item.label}</p>
                            <p className="text-[10px] text-slate-500 font-medium mt-1 leading-relaxed">{item.desc}</p>
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
          <button onClick={onClose} className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-600 transition-colors">Abandonner</button>
          <button onClick={handleSaveAll} className="bg-slate-950 text-white px-12 py-5 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-2xl hover:bg-black transition-all flex items-center border-b-4 border-slate-800 active:scale-95"><Save className="w-5 h-5 mr-3" /> Appliquer au Core</button>
        </div>
      </div>
    </div>
  );
};

const NavBtn = ({ icon: Icon, label, active, onClick }: any) => (
  <button onClick={onClick} className={`w-full flex items-center space-x-4 px-6 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${active ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:bg-white hover:text-slate-900'}`}>
    <Icon className={`w-5 h-5 ${active ? 'text-white' : 'text-slate-300'}`} />
    <span>{label}</span>
  </button>
);

const StatCard = ({ icon: Icon, label, value, color }: any) => {
    const colors: any = { indigo: "bg-indigo-50 border-indigo-100 text-indigo-600", purple: "bg-purple-50 border-purple-100 text-purple-600", emerald: "bg-emerald-50 border-emerald-100 text-emerald-600" };
    return (
        <div className={`p-8 rounded-[2.5rem] border ${colors[color]} flex flex-col space-y-3 shadow-sm`}>
            <Icon className="w-6 h-6" />
            <p className="text-3xl font-black">{value}</p>
            <p className="text-[10px] font-black uppercase tracking-widest opacity-70">{label}</p>
        </div>
    );
};
