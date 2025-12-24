
import React, { useState, useMemo } from 'react';
import { Settings, Save, X, Database, FileSpreadsheet, Plus, Trash2, CloudLightning, ShieldCheck, FileJson, Layers, Landmark, Tag, ArrowRightLeft, LayoutTemplate, Building2, Code2, GripVertical, Info, Settings2, FileText, ChevronDown, PlayCircle, TableProperties } from 'lucide-react';
import { ErpConfig, LookupTable, ExportTemplate, PartnerMasterData, SageX3Config, ExportColumn, XmlMappingProfile, InvoiceData, InvoiceType } from '../types';
import { processCell } from '../services/exportService';

const FIELD_GROUPS = [
  {
    name: 'Identité Document',
    fields: [
      { id: 'invoiceNumber', label: 'Numéro Facture', bt: 'BT-1' },
      { id: 'invoiceDate', label: 'Date Facture', bt: 'BT-2' },
      { id: 'dueDate', label: 'Échéance', bt: 'BT-9' },
      { id: 'currency', label: 'Devise', bt: 'BT-5' },
      { id: 'invoiceType', label: 'Type Facture', bt: 'BT-3' },
    ]
  },
  {
    name: 'Tiers & Banque',
    fields: [
      { id: 'supplier', label: 'Nom Fournisseur', bt: 'BT-27' },
      { id: 'supplierSiret', label: 'SIRET Fournisseur', bt: 'BT-29' },
      { id: 'supplierVat', label: 'TVA Fournisseur', bt: 'BT-31' },
      { id: 'supplierErpCode', label: 'Code ERP Tiers', bt: 'N/A' },
      { id: 'buyerName', label: 'Nom Acheteur', bt: 'BT-44' },
      { id: 'iban', label: 'IBAN', bt: 'BT-84' },
      { id: 'bic', label: 'BIC', bt: 'BT-85' },
    ]
  },
  {
    name: 'Montants & Totaux',
    fields: [
      { id: 'amountExclVat', label: 'Total HT', bt: 'BT-109' },
      { id: 'totalVat', label: 'Total TVA', bt: 'BT-110' },
      { id: 'amountInclVat', label: 'Total TTC', bt: 'BT-112' },
      { id: 'globalDiscount', label: 'Remise Globale', bt: 'BT-107' },
      { id: 'globalCharge', label: 'Frais Globaux', bt: 'BT-108' },
    ]
  },
  {
    name: 'Lignes de Détail',
    fields: [
      { id: 'articleId', label: 'Réf Article', bt: 'BT-155' },
      { id: 'description', label: 'Désignation', bt: 'BT-154' },
      { id: 'quantity', label: 'Quantité', bt: 'BT-129' },
      { id: 'unitPrice', label: 'Prix Unitaire', bt: 'BT-146' },
      { id: 'amount', label: 'Total Ligne HT', bt: 'BT-131' },
      { id: 'taxRate', label: 'Taux TVA Ligne', bt: 'BT-152' },
    ]
  }
];

const FLAT_FIELDS = FIELD_GROUPS.flatMap(g => g.fields);

const MOCK_PREVIEW_INVOICE: InvoiceData = {
  id: 'MOCK-PREVIEW',
  invoiceNumber: 'INV-2025-099',
  invoiceDate: '15/05/2025',
  dueDate: '15/06/2025',
  supplier: 'SOCIETE EXEMPLE SAS',
  supplierSiret: '12345678900014',
  supplierVat: 'FR12345678901',
  supplierErpCode: 'FR0012',
  buyerName: 'CLIENT FINAL SARL',
  amountInclVat: 1200.00,
  amountExclVat: 1000.00,
  totalVat: 200.00,
  currency: 'EUR',
  invoiceType: InvoiceType.INVOICE,
  iban: 'FR7630006000011234567890123',
  bic: 'BNPPARPPXXX',
  originalFilename: 'facture_sample.pdf',
  items: [
    { articleId: 'PRD-100', description: 'Prestation Expertise IA', quantity: 1, unitPrice: 1000, amount: 1000, taxRate: 20 }
  ]
};

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
  const [activeTab, setActiveTab] = useState<'masterdata' | 'templates' | 'xml' | 'lookups' | 'erp'>('templates');
  
  const [localErp, setLocalErp] = useState<ErpConfig>(erpConfig);
  const [localMasterData, setLocalMasterData] = useState<PartnerMasterData[]>(masterData);
  const [localTemplates, setLocalTemplates] = useState<ExportTemplate[]>(templates);
  const [localXmlProfiles, setLocalXmlProfiles] = useState<XmlMappingProfile[]>(xmlProfiles || []);
  const [localLookups, setLocalLookups] = useState<LookupTable[]>(lookupTables);

  if (!isOpen) return null;

  const handleSaveAll = () => {
    onSaveErp(localErp);
    onSaveMasterData(localMasterData);
    onSaveLookups(localLookups);
    onSaveTemplates(localTemplates);
    onSaveXmlProfiles(localXmlProfiles);
    onClose();
  };

  const handleAddTemplate = () => {
    const newTpl: ExportTemplate = {
      id: crypto.randomUUID(),
      name: 'Nouveau Template CSV',
      separator: 'semicolon',
      columns: [
        { header: 'N_FACTURE', type: 'field', value: 'invoiceNumber', defaultValue: '' },
        { header: 'DATE', type: 'field', value: 'invoiceDate', defaultValue: '' },
        { header: 'TOTAL_TTC', type: 'field', value: 'amountInclVat', defaultValue: '0.00' }
      ]
    };
    setLocalTemplates([newTpl, ...localTemplates]);
  };

  const updateTemplate = (id: string, updates: Partial<ExportTemplate>) => {
    setLocalTemplates(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
  };

  const addColumn = (templateId: string) => {
    setLocalTemplates(prev => prev.map(t => {
      if (t.id === templateId) {
        return {
          ...t,
          columns: [...t.columns, { header: 'NEW_COL', type: 'field', value: 'invoiceNumber', defaultValue: '' }]
        };
      }
      return t;
    }));
  };

  const removeColumn = (templateId: string, colIndex: number) => {
    setLocalTemplates(prev => prev.map(t => {
      if (t.id === templateId) {
        return {
          ...t,
          columns: t.columns.filter((_, i) => i !== colIndex)
        };
      }
      return t;
    }));
  };

  const updateColumn = (templateId: string, colIndex: number, updates: Partial<ExportColumn>) => {
    setLocalTemplates(prev => prev.map(t => {
      if (t.id === templateId) {
        const newCols = [...t.columns];
        newCols[colIndex] = { ...newCols[colIndex], ...updates };
        return { ...t, columns: newCols };
      }
      return t;
    }));
  };

  const handleAddXmlProfile = () => {
    const newProfile: XmlMappingProfile = {
      id: crypto.randomUUID(),
      name: 'Nouveau Profil XML',
      rootTag: 'ROOT',
      itemTag: 'ITEM',
      mappings: FLAT_FIELDS.map(f => ({ btId: f.id, xmlTag: f.id.toUpperCase(), enabled: true }))
    };
    setLocalXmlProfiles([newProfile, ...localXmlProfiles]);
  };

  const getPreviewRow = (template: ExportTemplate) => {
    const inv = MOCK_PREVIEW_INVOICE;
    const item = inv.items![0];
    const context = { ...inv, ...item, invoice: inv, item: item };
    const sep = template.separator === 'semicolon' ? ';' : template.separator === 'tab' ? '\t' : ',';
    
    return template.columns.map(col => {
      let val = processCell(col, context, localLookups);
      if (val.includes(sep) || val.includes('"')) {
        val = `"${val.replace(/"/g, '""')}"`;
      }
      return val;
    }).join(sep);
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-[110] p-4">
      <div className="bg-white rounded-[2.5rem] shadow-2xl border border-slate-200 w-full max-w-7xl h-[92vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="px-10 py-6 border-b border-slate-100 flex justify-between items-center bg-white shrink-0">
          <div className="flex items-center space-x-6">
            <div className="bg-slate-950 p-3 rounded-2xl text-white">
              <Settings className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight uppercase">Configuration Hub</h2>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mt-1">Smart Extraction & Export Control</p>
            </div>
          </div>
          <button onClick={onClose} className="p-3 text-slate-400 hover:text-rose-500 transition-colors bg-slate-50 rounded-xl"><X className="w-6 h-6" /></button>
        </div>

        <div className="flex-1 flex overflow-hidden bg-slate-50">
          {/* Sidebar Navigation */}
          <div className="w-72 bg-white border-r border-slate-200 p-6 space-y-2 shrink-0 overflow-y-auto custom-scrollbar">
            <NavBtn icon={Database} label="Master Data" active={activeTab === 'masterdata'} onClick={() => setActiveTab('masterdata')} />
            <NavBtn icon={FileSpreadsheet} label="Flat Templates" active={activeTab === 'templates'} onClick={() => setActiveTab('templates')} />
            <NavBtn icon={FileJson} label="XML Blueprints" active={activeTab === 'xml'} onClick={() => setActiveTab('xml')} />
            <NavBtn icon={Layers} label="Transcoding" active={activeTab === 'lookups'} onClick={() => setActiveTab('lookups')} />
            <NavBtn icon={CloudLightning} label="Sage X3 Setup" active={activeTab === 'erp'} onClick={() => setActiveTab('erp')} />
          </div>

          {/* Content Area */}
          <div className="flex-1 p-10 overflow-y-auto bg-white custom-scrollbar">
            
            {/* FLAT TEMPLATES */}
            {activeTab === 'templates' && (
              <div className="space-y-10 animate-in fade-in duration-300">
                <Header title="File Export Templates" desc="Bâtissez vos structures de fichiers CSV ou TXT sur mesure">
                  <button onClick={handleAddTemplate} className="bg-indigo-600 text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-95">
                    <Plus className="w-4 h-4 mr-2" /> Nouveau Template
                  </button>
                </Header>

                {localTemplates.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-slate-100 rounded-[3rem] bg-slate-50/50">
                    <div className="p-6 bg-white rounded-3xl shadow-sm mb-4">
                      <FileSpreadsheet className="w-10 h-10 text-slate-300" />
                    </div>
                    <p className="text-sm font-black text-slate-400 uppercase tracking-widest">Aucun template configuré</p>
                    <button onClick={handleAddTemplate} className="mt-4 text-[10px] font-black text-indigo-600 uppercase tracking-widest hover:text-indigo-800 underline">Créer votre premier template maintenant</button>
                  </div>
                ) : (
                  <div className="space-y-12">
                    {localTemplates.map((tpl) => (
                      <div key={tpl.id} className="bg-white border-2 border-slate-100 rounded-[3rem] p-10 relative group shadow-sm hover:border-indigo-100 transition-all">
                        <button onClick={() => setLocalTemplates(prev => prev.filter(t => t.id !== tpl.id))} className="absolute top-10 right-10 p-3 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-2xl transition-all">
                          <Trash2 className="w-6 h-6" />
                        </button>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 mb-10 border-b border-slate-50 pb-10">
                          <div className="space-y-4">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center"><Settings2 className="w-3 h-3 mr-2" /> Identification</label>
                            <Input label="Nom du Template" value={tpl.name} onChange={(v: string) => updateTemplate(tpl.id, { name: v })} placeholder="Ex: Export Sage Achats" />
                          </div>
                          <div className="space-y-4">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center"><FileText className="w-3 h-3 mr-2" /> Format de Fichier</label>
                            <div className="flex flex-col space-y-1">
                              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Séparateur de colonnes</label>
                              <select 
                                value={tpl.separator} 
                                onChange={(e) => updateTemplate(tpl.id, { separator: e.target.value as any })}
                                className="w-full px-5 py-4 rounded-2xl border border-slate-200 bg-slate-50 text-xs font-black outline-none focus:border-indigo-600 focus:bg-white transition-all appearance-none cursor-pointer"
                              >
                                <option value="semicolon">Point-virgule (;)</option>
                                <option value="comma">Virgule (,)</option>
                                <option value="tab">Tabulation (\t)</option>
                              </select>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-6">
                          <div className="flex justify-between items-end mb-2">
                             <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center"><LayoutTemplate className="w-3 h-3 mr-2" /> Structure des Colonnes</label>
                             <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">{tpl.columns.length} Colonnes</span>
                          </div>
                          
                          <div className="space-y-3">
                            {tpl.columns.map((col, cIdx) => (
                              <div key={cIdx} className="flex flex-col p-4 bg-slate-50 rounded-3xl border border-slate-100 group/col hover:bg-white hover:border-indigo-100 transition-all space-y-4">
                                <div className="flex items-center space-x-3">
                                  <div className="p-2 text-slate-300 cursor-grab active:cursor-grabbing"><GripVertical className="w-4 h-4" /></div>
                                  <div className="flex-1 min-w-0 grid grid-cols-12 gap-3 items-end">
                                    <div className="col-span-3">
                                      <input 
                                        value={col.header} 
                                        onChange={(e) => updateColumn(tpl.id, cIdx, { header: e.target.value.toUpperCase() })}
                                        className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-[10px] font-black text-slate-900 outline-none focus:border-indigo-600"
                                        placeholder="HEADER"
                                      />
                                      <p className="text-[7px] font-black text-slate-400 uppercase mt-1 ml-1">Libellé Colonne</p>
                                    </div>

                                    <div className="col-span-2">
                                      <select 
                                        value={col.type} 
                                        onChange={(e) => updateColumn(tpl.id, cIdx, { type: e.target.value as any })}
                                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-[9px] font-black uppercase text-indigo-600 outline-none"
                                      >
                                        <option value="field">Extrait IA</option>
                                        <option value="static">Statique</option>
                                        <option value="lookup">Lookup</option>
                                      </select>
                                      <p className="text-[7px] font-black text-slate-400 uppercase mt-1 ml-1">Source Donnée</p>
                                    </div>

                                    <div className="col-span-5">
                                      {col.type === 'field' ? (
                                        <select 
                                          value={col.value} 
                                          onChange={(e) => updateColumn(tpl.id, cIdx, { value: e.target.value })}
                                          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-[10px] font-bold text-slate-700 outline-none"
                                        >
                                          {FIELD_GROUPS.map(g => (
                                            <optgroup key={g.name} label={g.name} className="text-[8px] uppercase tracking-widest text-slate-400">
                                              {g.fields.map(f => (
                                                <option key={f.id} value={f.id}>{f.label} ({f.bt})</option>
                                              ))}
                                            </optgroup>
                                          ))}
                                        </select>
                                      ) : col.type === 'static' ? (
                                        <input 
                                          value={col.value} 
                                          onChange={(e) => updateColumn(tpl.id, cIdx, { value: e.target.value })}
                                          className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-[10px] font-bold text-slate-900 outline-none"
                                          placeholder="Valeur fixe..."
                                        />
                                      ) : (
                                        <div className="flex space-x-2">
                                          <select 
                                            value={col.value} 
                                            onChange={(e) => updateColumn(tpl.id, cIdx, { value: e.target.value })}
                                            className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-2 text-[10px] font-bold text-slate-700 outline-none"
                                          >
                                            {FLAT_FIELDS.map(f => <option key={f.id} value={f.id}>{f.label}</option>)}
                                          </select>
                                          <select 
                                            value={col.lookupTableId} 
                                            onChange={(e) => updateColumn(tpl.id, cIdx, { lookupTableId: e.target.value })}
                                            className="flex-1 bg-indigo-50 border border-indigo-100 rounded-xl px-3 py-2 text-[9px] font-black uppercase text-indigo-600 outline-none"
                                          >
                                            <option value="">Table...</option>
                                            {localLookups.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                                          </select>
                                        </div>
                                      )}
                                      <p className="text-[7px] font-black text-slate-400 uppercase mt-1 ml-1">Sélecteur de Valeur</p>
                                    </div>

                                    <div className="col-span-2 flex justify-end">
                                      <button onClick={() => removeColumn(tpl.id, cIdx)} className="p-2 text-slate-300 hover:text-rose-500 transition-colors opacity-0 group-hover/col:opacity-100">
                                        <Trash2 className="w-4 h-4" />
                                      </button>
                                    </div>
                                  </div>
                                </div>
                                
                                <div className="border-t border-slate-100/50 pt-3 flex items-center space-x-6">
                                  <div className="flex-1 flex items-center space-x-3">
                                    <Tag className="w-3 h-3 text-slate-300" />
                                    <div className="flex-1">
                                      <input 
                                        value={col.defaultValue || ''} 
                                        onChange={(e) => updateColumn(tpl.id, cIdx, { defaultValue: e.target.value })}
                                        className="w-full bg-transparent border-b border-transparent hover:border-slate-200 focus:border-indigo-400 text-[10px] font-bold text-slate-500 outline-none px-1 py-0.5 transition-all"
                                        placeholder="Valeur par défaut si vide..."
                                      />
                                    </div>
                                  </div>
                                  <div className="flex items-center text-[8px] font-black text-slate-300 uppercase tracking-widest italic">
                                    <Info className="w-2.5 h-2.5 mr-1" /> Requis pour le mapping ERP strict
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>

                          <button onClick={() => addColumn(tpl.id)} className="w-full py-5 border-2 border-dashed border-slate-100 rounded-[2rem] text-[10px] font-black uppercase text-slate-400 hover:border-indigo-200 hover:bg-indigo-50/30 hover:text-indigo-600 transition-all flex items-center justify-center">
                            <Plus className="w-4 h-4 mr-2" /> Ajouter une colonne
                          </button>
                        </div>

                        {/* Live Preview Section */}
                        <div className="mt-10 bg-slate-900 rounded-[2rem] p-8 text-white relative overflow-hidden shadow-2xl">
                          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl -mr-16 -mt-16"></div>
                          <div className="flex items-center justify-between mb-6">
                             <div className="flex items-center space-x-3">
                                <PlayCircle className="w-5 h-5 text-indigo-400" />
                                <div>
                                   <p className="text-[10px] font-black uppercase tracking-widest text-indigo-300">Live Preview Output</p>
                                   <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">Basé sur une facture d'exemple fictive</p>
                                </div>
                             </div>
                             <div className="flex items-center space-x-1.5 bg-white/5 px-3 py-1.5 rounded-xl border border-white/5">
                                <TableProperties className="w-3 h-3 text-slate-500" />
                                <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">Preview Mode</span>
                             </div>
                          </div>
                          
                          <div className="bg-black/40 rounded-2xl p-6 font-mono text-xs overflow-x-auto custom-scrollbar border border-white/5">
                             <div className="text-slate-500 mb-2 select-none">{tpl.columns.map(c => c.header).join(tpl.separator === 'semicolon' ? ';' : tpl.separator === 'tab' ? '\t' : ',')}</div>
                             <div className="text-emerald-400 selection:bg-emerald-500/20">{getPreviewRow(tpl)}</div>
                          </div>
                          <div className="mt-4 flex items-center justify-center text-[7px] font-black uppercase tracking-[0.3em] text-slate-600">
                             Visualisation temps réel • Auto-escape inclus • Separator: {tpl.separator}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* MASTER DATA */}
            {activeTab === 'masterdata' && (
              <div className="space-y-8 animate-in fade-in duration-300">
                <Header title="Tiers Référentiels" desc="Auto-complétion intelligente via SIRET">
                  <button onClick={() => setLocalMasterData([{id: crypto.randomUUID(), erpCode:'', name:'Nouveau Tiers', siret:'', vatNumber:'', iban:'', bic:''}, ...localMasterData])} className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center shadow-lg hover:bg-indigo-700"><Plus className="w-4 h-4 mr-2" /> Nouveau Tiers</button>
                </Header>
                <div className="space-y-4">
                  {localMasterData.map(p => (
                    <div key={p.id} className="p-8 border border-slate-100 rounded-[2rem] bg-slate-50/50 hover:bg-white hover:border-indigo-100 transition-all group relative">
                      <button onClick={()=>setLocalMasterData(prev=>prev.filter(x=>x.id!==p.id))} className="absolute top-6 right-6 p-2 text-slate-300 hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100"><Trash2 className="w-5 h-5" /></button>
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <div className="space-y-4">
                          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center"><Building2 className="w-3 h-3 mr-2" /> Identité ERP</label>
                          <Input label="Code Sage" value={p.erpCode} onChange={(v:any)=>setLocalMasterData(prev=>prev.map(x=>x.id===p.id?{...x, erpCode:v}:x))} />
                          <Input label="Raison Sociale" value={p.name} onChange={(v:any)=>setLocalMasterData(prev=>prev.map(x=>x.id===p.id?{...x, name:v}:x))} />
                        </div>
                        <div className="space-y-4">
                          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center"><ShieldCheck className="w-3 h-3 mr-2" /> Fiscalité</label>
                          <Input label="SIRET" value={p.siret} onChange={(v:any)=>setLocalMasterData(prev=>prev.map(x=>x.id===p.id?{...x, siret:v.replace(/\s/g,'')}:x))} />
                          <Input label="N° TVA" value={p.vatNumber} onChange={(v:any)=>setLocalMasterData(prev=>prev.map(x=>x.id===p.id?{...x, vatNumber:v}:x))} />
                        </div>
                        <div className="space-y-4">
                          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center"><Landmark className="w-3 h-3 mr-2" /> Bancaire</label>
                          <Input label="IBAN" value={p.iban || ''} onChange={(v:any)=>setLocalMasterData(prev=>prev.map(x=>x.id===p.id?{...x, iban:v.replace(/\s/g,'')}:x))} />
                          <Input label="BIC" value={p.bic || ''} onChange={(v:any)=>setLocalMasterData(prev=>prev.map(x=>x.id===p.id?{...x, bic:v}:x))} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* XML BLUEPRINTS */}
            {activeTab === 'xml' && (
              <div className="space-y-8 animate-in fade-in duration-300">
                <Header title="Mappeur XML Personnalisé" desc="Définissez vos propres balises et sauvegardes d'export">
                  <button onClick={handleAddXmlProfile} className="bg-slate-950 text-white px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center shadow-lg"><LayoutTemplate className="w-4 h-4 mr-2" /> Créer Blueprint</button>
                </Header>
                {localXmlProfiles.map(prof => (
                  <div key={prof.id} className="p-8 border-2 border-slate-100 rounded-[2.5rem] bg-white relative group shadow-sm hover:border-indigo-100 transition-all">
                    <button onClick={()=>setLocalXmlProfiles(prev=>prev.filter(p=>p.id!==prof.id))} className="absolute top-8 right-8 text-slate-300 hover:text-rose-500"><Trash2 className="w-5 h-5" /></button>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8 border-b border-slate-50 pb-8">
                      <Input label="Nom du Profil" value={prof.name} onChange={(v:any)=>setLocalXmlProfiles(prev=>prev.map(p=>p.id===prof.id?{...p, name:v}:p))} />
                      <Input label="Balise Racine" value={prof.rootTag} onChange={(v:any)=>setLocalXmlProfiles(prev=>prev.map(p=>p.id===prof.id?{...p, rootTag:v}:p))} />
                      <Input label="Balise Ligne" value={prof.itemTag} onChange={(v:any)=>setLocalXmlProfiles(prev=>prev.map(p=>p.id===prof.id?{...p, itemTag:v}:p))} />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {prof.mappings.map((m, mIdx) => (
                        <div key={m.btId} className={`flex items-center space-x-3 p-4 rounded-2xl border transition-all ${m.enabled ? 'bg-indigo-50 border-indigo-100' : 'bg-slate-50 border-slate-200 opacity-60'}`}>
                          <input type="checkbox" checked={m.enabled} onChange={e=>{
                            const newMaps = [...prof.mappings]; newMaps[mIdx].enabled = e.target.checked;
                            setLocalXmlProfiles(prev=>prev.map(p=>p.id===prof.id?{...p, mappings:newMaps}:p));
                          }} className="w-4 h-4 rounded text-indigo-600" />
                          <div className="flex-1 min-w-0">
                            <p className="text-[8px] font-black text-slate-400 uppercase mb-1 truncate">{FLAT_FIELDS.find(f=>f.id===m.btId)?.label}</p>
                            <input value={m.xmlTag} onChange={e=>{
                              const newMaps = [...prof.mappings]; newMaps[mIdx].xmlTag = e.target.value.toUpperCase();
                              setLocalXmlProfiles(prev=>prev.map(p=>p.id===prof.id?{...p, mappings:newMaps}:p));
                            }} className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 text-[10px] font-black outline-none focus:border-indigo-600" />
                          </div>
                          <Code2 className="w-4 h-4 text-indigo-300" />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* TRANSCODING */}
            {activeTab === 'lookups' && (
              <div className="space-y-8 animate-in fade-in duration-300">
                <Header title="Tables de Correspondance" desc="Transcodage de données pour l'intégration ERP">
                  <button onClick={() => setLocalLookups([{id: crypto.randomUUID(), name:'Nouvelle Table', entries:[]}, ...localLookups])} className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center shadow-lg"><Plus className="w-4 h-4 mr-2" /> Créer Table</button>
                </Header>
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                  {localLookups.map(table => (
                    <div key={table.id} className="p-8 border border-slate-100 rounded-[2.5rem] bg-slate-50/50 relative group shadow-sm hover:bg-white transition-all">
                      <button onClick={()=>setLocalLookups(prev=>prev.filter(l=>l.id!==table.id))} className="absolute top-8 right-8 text-slate-300 hover:text-rose-500"><Trash2 className="w-4 h-4" /></button>
                      <input value={table.name} onChange={e=>setLocalLookups(prev=>prev.map(l=>l.id===table.id?{...l, name:e.target.value}:l))} className="text-sm font-black text-slate-900 border-b-2 border-slate-100 focus:border-indigo-600 outline-none w-full mb-6 bg-transparent" />
                      <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                        {table.entries.map((ent, eIdx) => (
                          <div key={eIdx} className="flex items-center space-x-3">
                            <input value={ent.key} onChange={e=>{
                              const entries = [...table.entries]; entries[eIdx].key = e.target.value;
                              setLocalLookups(prev=>prev.map(l=>l.id===table.id?{...l, entries}:l));
                            }} className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-2 text-[10px] font-bold" placeholder="IA Output (Source)" />
                            <ArrowRightLeft className="w-3 h-3 text-indigo-400 shrink-0" />
                            <input value={ent.value} onChange={e=>{
                              const entries = [...table.entries]; entries[eIdx].value = e.target.value;
                              setLocalLookups(prev=>prev.map(l=>l.id===table.id?{...l, entries}:l));
                            }} className="flex-1 bg-indigo-600 text-white border border-indigo-600 rounded-xl px-4 py-2 text-[10px] font-black" placeholder="ERP Code (Target)" />
                            <button onClick={()=>{
                              const entries = table.entries.filter((_, i) => i !== eIdx);
                              setLocalLookups(prev=>prev.map(l=>l.id===table.id?{...l, entries}:l));
                            }} className="text-slate-300 hover:text-rose-500 p-1"><X className="w-4 h-4" /></button>
                          </div>
                        ))}
                        <button onClick={()=>{
                          const entries = [...table.entries, {key:'', value:''}];
                          setLocalLookups(prev=>prev.map(l=>l.id===table.id?{...l, entries}:l));
                        }} className="w-full py-4 border-2 border-dashed border-slate-200 rounded-2xl text-[9px] font-black uppercase text-slate-400 hover:text-indigo-600 hover:border-indigo-200 transition-all">Ajouter Entrée</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* SAGE X3 SETUP */}
            {activeTab === 'erp' && (
              <div className="max-w-3xl space-y-12 animate-in fade-in duration-300">
                <Header title="Connecteur Sage X3" desc="Synchronisation directe via Web Services" />
                <div className="p-10 bg-slate-900 rounded-[3rem] shadow-2xl text-white relative overflow-hidden">
                  <CloudLightning className="w-24 h-24 absolute -right-6 -top-6 text-white/10" />
                  <div className="flex items-center justify-between mb-10">
                    <div className="flex items-center space-x-4">
                      <div className="p-3 bg-white/10 rounded-2xl"><ShieldCheck className="w-6 h-6" /></div>
                      <span className="text-xs font-black uppercase tracking-[0.2em]">Service Status: {localErp.enabled ? 'Linked' : 'Offline'}</span>
                    </div>
                    <button onClick={()=>setLocalErp({...localErp, enabled:!localErp.enabled})} className={`w-14 h-7 rounded-full p-1 transition-all ${localErp.enabled?'bg-indigo-500':'bg-white/20'}`}>
                      <div className={`w-5 h-5 bg-white rounded-full transition-all ${localErp.enabled?'translate-x-7':'translate-x-0'}`}></div>
                    </button>
                  </div>
                  <div className="space-y-8">
                    <Input label="Sage X3 Endpoint" value={localErp.apiUrl} onChange={(v:any)=>setLocalErp({...localErp, apiUrl:v})} theme="dark" />
                    <div className="grid grid-cols-2 gap-8">
                      <Input label="Dossier (Folder)" value={localErp.sageConfig?.folder||''} onChange={(v:any)=>setLocalErp({...localErp, sageConfig: {...(localErp.sageConfig||{} as SageX3Config), folder:v}})} theme="dark" />
                      <Input label="Utilisateur" value={localErp.sageConfig?.user||''} onChange={(v:any)=>setLocalErp({...localErp, sageConfig: {...(localErp.sageConfig||{} as SageX3Config), user:v}})} theme="dark" />
                    </div>
                    <Input label="API Key / Token" type="password" value={localErp.apiKey} onChange={(v:any)=>setLocalErp({...localErp, apiKey:v})} theme="dark" />
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>

        {/* Footer */}
        <div className="px-10 py-6 bg-slate-50 border-t border-slate-100 flex justify-end items-center space-x-4 shrink-0">
          <button onClick={onClose} className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-600 transition-colors">Abandonner</button>
          <button onClick={handleSaveAll} className="bg-slate-950 text-white px-12 py-5 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest shadow-2xl hover:bg-black transition-all flex items-center active:scale-95 border-b-4 border-slate-800">
            <Save className="w-5 h-5 mr-3" /> Commit Changes
          </button>
        </div>
      </div>
    </div>
  );
};

const NavBtn = ({ icon: Icon, label, active, onClick }: any) => (
  <button onClick={onClick} className={`w-full flex items-center space-x-4 px-6 py-5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${active ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-100' : 'text-slate-400 hover:bg-slate-50 hover:text-slate-900'}`}>
    <Icon className="w-5 h-5" />
    <span>{label}</span>
  </button>
);

const Header = ({ title, desc, children }: any) => (
  <div className="flex justify-between items-end pb-10 border-b border-slate-100 mb-10">
    <div>
      <h3 className="text-3xl font-black text-slate-900 tracking-tighter">{title}</h3>
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">{desc}</p>
    </div>
    {children}
  </div>
);

const Input = ({ label, value, onChange, placeholder, type="text", theme="light" }: any) => (
  <div className="space-y-2 flex-1">
    <label className={`text-[9px] font-black uppercase tracking-widest ml-1 ${theme==='dark'?'text-white/40':'text-slate-400'}`}>{label}</label>
    <input 
      type={type} 
      value={value} 
      onChange={e=>onChange(e.target.value)} 
      placeholder={placeholder}
      className={`w-full px-5 py-3.5 rounded-2xl border outline-none transition-all text-xs font-bold 
        ${theme==='dark' 
          ? 'bg-white/5 border-white/10 text-white placeholder-white/20 focus:border-white/40' 
          : 'bg-slate-50 border-slate-200 text-slate-800 focus:bg-white focus:border-indigo-600 focus:shadow-lg'}`}
    />
  </div>
);
