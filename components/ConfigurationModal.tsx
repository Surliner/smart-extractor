
import React, { useState, useMemo, useEffect } from 'react';
import { Settings, X, Database, Search, UploadCloud, Plus, Trash2, ChevronLeft, ChevronRight, BarChart3, Users, Zap, ShieldCheck, Download, Save, FileSpreadsheet, FileJson, Layers, CloudLightning, BookOpen, Info, CreditCard, Landmark, Percent } from 'lucide-react';
import { ErpConfig, LookupTable, ExportTemplate, PartnerMasterData, XmlMappingProfile } from '../types';

const MD_PAGE_SIZE = 15;

const FIELD_GROUPS = [
  { name: 'Identité', fields: [{ id: 'invoiceNumber', label: 'N° Facture' }, { id: 'invoiceDate', label: 'Date Facture' }, { id: 'invoiceType', label: 'Type Doc' }] },
  { name: 'Vendeur', fields: [{ id: 'supplier', label: 'Nom' }, { id: 'supplierSiret', label: 'SIRET' }, { id: 'supplierVat', label: 'TVA' }, { id: 'supplierErpCode', label: 'Code ERP' }] },
  { name: 'Finances', fields: [{ id: 'amountExclVat', label: 'Total HT' }, { id: 'totalVat', label: 'Total TVA' }, { id: 'amountInclVat', label: 'Total TTC' }, { id: 'currency', label: 'Devise' }] }
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
      m.name.toLowerCase().includes(s) || 
      m.siret.includes(s) || 
      (m.erpCode && m.erpCode.toLowerCase().includes(s)) ||
      (m.iban && m.iban.toLowerCase().includes(s))
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
        // Ordre CSV attendu : Nom;CodeERP;SIRET;TVA;IBAN;BIC
        return { 
          id: crypto.randomUUID(), 
          name: c[0]?.trim(), 
          erpCode: c[1]?.trim(), 
          siret: c[2]?.replace(/\s/g, ''), 
          vatNumber: c[3]?.trim(), 
          iban: c[4]?.replace(/\s/g, ''), 
          bic: c[5]?.trim() 
        } as PartnerMasterData;
      }).filter(Boolean) as PartnerMasterData[];
      setLocalMasterData(prev => [...imported, ...prev]);
      alert(`${imported.length} tiers importés avec succès.`);
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
                  <StatCard icon={Zap} label="Mode" value="Flash-Opt" color="purple" />
                </div>
                <div className="bg-slate-900 rounded-[2.5rem] p-10 text-white">
                  <h4 className="text-lg font-black uppercase mb-4 tracking-tighter">Performance & Cost-Efficiency</h4>
                  <p className="text-xs text-slate-400 leading-relaxed font-medium">Pipeline optimisé pour <b>Render</b>. Prompt Gemini 3 Flash compressé pour une facturation minimale. Support complet de la norme EN16931.</p>
                </div>
              </div>
            )}

            {activeTab === 'masterdata' && (
              <div className="space-y-8 animate-in fade-in">
                <div className="flex justify-between items-end">
                  <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                    <input 
                      type="text" 
                      placeholder="Rechercher nom, siret, erp ou iban..." 
                      value={mdSearch} 
                      onChange={e => {setMdSearch(e.target.value); setMdPage(1);}} 
                      className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-[10px] font-black uppercase outline-none focus:bg-white" 
                    />
                  </div>
                  <div className="flex space-x-3">
                    <label className="px-6 py-3 bg-white border border-slate-200 rounded-xl text-[10px] font-black uppercase cursor-pointer hover:bg-slate-50 transition-all flex items-center shadow-sm">
                      <UploadCloud className="w-4 h-4 mr-2 text-indigo-600" /> Import CSV
                      <input type="file" accept=".csv" onChange={handleImportCSV} className="hidden" />
                    </label>
                    <button 
                      onClick={() => setLocalMasterData([{id: crypto.randomUUID(), name: 'Nouveau Tiers', erpCode: '', siret: '', vatNumber: '', iban: '', bic: ''}, ...localMasterData])} 
                      className="px-6 py-3 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase flex items-center shadow-lg hover:bg-indigo-700"
                    >
                      <Plus className="w-4 h-4 mr-2" /> Ajouter
                    </button>
                  </div>
                </div>

                <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-x-auto custom-scrollbar">
                  <table className="w-full text-left border-collapse min-w-[1200px]">
                    <thead className="bg-slate-50 text-[8px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                      <tr>
                        <th className="px-6 py-4 w-64">Nom Tiers</th>
                        <th className="px-6 py-4 w-32">Code ERP</th>
                        <th className="px-6 py-4 w-40">SIRET</th>
                        <th className="px-6 py-4 w-40">N° TVA</th>
                        <th className="px-6 py-4 w-64">IBAN</th>
                        <th className="px-6 py-4 w-32">BIC/SWIFT</th>
                        <th className="px-6 py-4 text-right w-24">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {paginatedMD.map(m => (
                        <tr key={m.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-6 py-4">
                            <input 
                              value={m.name} 
                              onChange={e => setLocalMasterData(prev => prev.map(x => x.id === m.id ? {...x, name: e.target.value} : x))} 
                              className="bg-transparent outline-none font-bold text-xs w-full focus:text-indigo-600" 
                            />
                          </td>
                          <td className="px-6 py-4">
                            <input 
                              value={m.erpCode} 
                              onChange={e => setLocalMasterData(prev => prev.map(x => x.id === m.id ? {...x, erpCode: e.target.value} : x))} 
                              className="bg-transparent outline-none font-black text-indigo-600 text-[10px] w-full uppercase" 
                            />
                          </td>
                          <td className="px-6 py-4">
                            <input 
                              value={m.siret} 
                              onChange={e => setLocalMasterData(prev => prev.map(x => x.id === m.id ? {...x, siret: e.target.value.replace(/\s/g, '')} : x))} 
                              className="bg-transparent outline-none font-mono text-[10px] w-full" 
                            />
                          </td>
                          <td className="px-6 py-4">
                            <input 
                              value={m.vatNumber || ''} 
                              onChange={e => setLocalMasterData(prev => prev.map(x => x.id === m.id ? {...x, vatNumber: e.target.value} : x))} 
                              className="bg-transparent outline-none font-mono text-[10px] w-full" 
                              placeholder="FR..."
                            />
                          </td>
                          <td className="px-6 py-4">
                            <input 
                              value={m.iban || ''} 
                              onChange={e => setLocalMasterData(prev => prev.map(x => x.id === m.id ? {...x, iban: e.target.value.replace(/\s/g, '')} : x))} 
                              className="bg-transparent outline-none font-mono text-[10px] w-full" 
                              placeholder="FR76..."
                            />
                          </td>
                          <td className="px-6 py-4">
                            <input 
                              value={m.bic || ''} 
                              onChange={e => setLocalMasterData(prev => prev.map(x => x.id === m.id ? {...x, bic: e.target.value} : x))} 
                              className="bg-transparent outline-none font-mono text-[10px] w-full" 
                              placeholder="BIC..."
                            />
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button onClick={() => setLocalMasterData(prev => prev.filter(x => x.id !== m.id))} className="text-slate-300 hover:text-rose-500 transition-colors">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex items-center justify-between py-4 border-t border-slate-50">
                  <div className="flex flex-col">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{filteredMD.length} Tiers au total</p>
                    <p className="text-[8px] font-bold text-slate-300 uppercase mt-1">Format Import : Nom;CodeERP;SIRET;TVA;IBAN;BIC</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button onClick={() => setMdPage(p => Math.max(1, p-1))} disabled={mdPage === 1} className="p-2 border border-slate-200 rounded-lg disabled:opacity-30 hover:bg-slate-50"><ChevronLeft className="w-4 h-4" /></button>
                    <span className="text-[10px] font-black text-indigo-600 px-3">Page {mdPage} / {mdTotalPages || 1}</span>
                    <button onClick={() => setMdPage(p => Math.min(mdTotalPages, p+1))} disabled={mdPage === mdTotalPages} className="p-2 border border-slate-200 rounded-lg disabled:opacity-30 hover:bg-slate-50"><ChevronRight className="w-4 h-4" /></button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'templates' && (
              <div className="space-y-10 animate-in fade-in">
                <div className="flex justify-between items-end">
                  <h3 className="text-2xl font-black text-slate-900 uppercase">Blueprints CSV</h3>
                  <button onClick={() => setLocalTemplates([{id: crypto.randomUUID(), name: 'Nouveau Blueprint', separator: 'semicolon', columns: []}, ...localTemplates])} className="bg-indigo-600 text-white px-6 py-3 rounded-xl text-[10px] font-black uppercase flex items-center shadow-lg"><Plus className="w-4 h-4 mr-2" /> Nouveau Template</button>
                </div>
                {localTemplates.map(tpl => (
                  <div key={tpl.id} className="p-8 border border-slate-200 rounded-[2rem] bg-slate-50 relative group">
                    <button onClick={() => setLocalTemplates(prev => prev.filter(t => t.id !== tpl.id))} className="absolute top-6 right-6 text-slate-300 hover:text-rose-500"><Trash2 className="w-5 h-5" /></button>
                    <div className="grid grid-cols-2 gap-6 mb-6">
                      <div className="space-y-2"><label className="text-[9px] font-black uppercase text-slate-400 ml-1">Nom du template</label><input value={tpl.name} onChange={e=>setLocalTemplates(prev=>prev.map(t=>t.id===tpl.id?{...t, name:e.target.value}:t))} className="w-full px-6 py-3 rounded-xl border border-slate-200 outline-none font-bold text-xs" /></div>
                      <div className="space-y-2"><label className="text-[9px] font-black uppercase text-slate-400 ml-1">Séparateur</label><select value={tpl.separator} onChange={e=>setLocalTemplates(prev=>prev.map(t=>t.id===tpl.id?{...t, separator:e.target.value as any}:t))} className="w-full px-6 py-3 rounded-xl border border-slate-200 outline-none font-bold text-xs"><option value="semicolon">Point-virgule (;)</option><option value="comma">Virgule (,)</option></select></div>
                    </div>
                    <div className="bg-white p-6 rounded-2xl space-y-3">
                      <p className="text-[10px] font-black uppercase text-slate-400 mb-3">Mappage Colonnes</p>
                      {tpl.columns.map((col, idx) => (
                        <div key={idx} className="flex space-x-3">
                           <input placeholder="Entête" value={col.header} onChange={e=>setLocalTemplates(prev=>prev.map(t=>t.id===tpl.id?{...t, columns: t.columns.map((c, i)=>i===idx?{...c, header:e.target.value}:c)}:t))} className="flex-1 px-4 py-2 bg-slate-50 border border-slate-100 rounded-lg text-xs font-bold" />
                           <select value={col.value} onChange={e=>setLocalTemplates(prev=>prev.map(t=>t.id===tpl.id?{...t, columns: t.columns.map((c, i)=>i===idx?{...c, value:e.target.value}:c)}:t))} className="w-48 px-4 py-2 bg-slate-50 border border-slate-100 rounded-lg text-xs font-bold">
                             {FIELD_GROUPS.map(g => (
                               <optgroup key={g.name} label={g.name}>{g.fields.map(f => <option key={f.id} value={f.id}>{f.label}</option>)}</optgroup>
                             ))}
                           </select>
                           <button onClick={()=>setLocalTemplates(prev=>prev.map(t=>t.id===tpl.id?{...t, columns: t.columns.filter((_, i)=>i!==idx)}:t))} className="p-2 text-slate-300 hover:text-rose-500"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      ))}
                      <button onClick={()=>setLocalTemplates(prev=>prev.map(t=>t.id===tpl.id?{...t, columns: [...t.columns, {header:'Champ', type:'field', value:'invoiceNumber'}]}:t))} className="text-[10px] font-black uppercase text-indigo-600 px-4 py-2 hover:bg-indigo-50 rounded-lg"><Plus className="w-3 h-3 mr-1 inline" /> Ajouter</button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'xml' && (
              <div className="space-y-10 animate-in fade-in">
                 <div className="flex justify-between items-end"><h3 className="text-2xl font-black text-slate-900 uppercase">Profils XML RFE</h3></div>
                 <div className="p-10 border border-slate-200 rounded-[2.5rem] bg-indigo-50/30 flex flex-col items-center justify-center space-y-4">
                    <Info className="w-10 h-10 text-indigo-500" />
                    <p className="text-xs font-black uppercase text-slate-500 text-center">Les flux XML Factur-X sont gérés nativement<br/>selon le profil Comfort EN16931.</p>
                 </div>
              </div>
            )}

            {activeTab === 'lookups' && (
              <div className="space-y-10 animate-in fade-in">
                <div className="flex justify-between items-end"><h3 className="text-2xl font-black text-slate-900 uppercase">Transcodage ERP</h3><button onClick={()=>setLocalLookups([{id:crypto.randomUUID(), name:'Table Transcodage', entries:[]}, ...localLookups])} className="bg-indigo-600 text-white px-6 py-3 rounded-xl text-[10px] font-black uppercase flex items-center shadow-lg"><Plus className="w-4 h-4 mr-2" /> Nouvelle Table</button></div>
                {localLookups.map(tbl => (
                  <div key={tbl.id} className="p-8 border border-slate-200 rounded-[2rem] bg-slate-50">
                    <input value={tbl.name} onChange={e=>setLocalLookups(prev=>prev.map(t=>t.id===tbl.id?{...t, name:e.target.value}:t))} className="bg-transparent font-black text-slate-900 uppercase text-sm mb-6 outline-none border-b border-transparent focus:border-indigo-200" />
                    <div className="space-y-2">
                       {tbl.entries.map((ent, idx) => (
                         <div key={idx} className="flex space-x-3">
                            <input placeholder="Source (IA)" value={ent.key} onChange={e=>setLocalLookups(prev=>prev.map(t=>t.id===tbl.id?{...t, entries: t.entries.map((en, i)=>i===idx?{...en, key:e.target.value}:en)}:t))} className="flex-1 px-4 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold" />
                            <input placeholder="Code ERP" value={ent.value} onChange={e=>setLocalLookups(prev=>prev.map(t=>t.id===tbl.id?{...t, entries: t.entries.map((en, i)=>i===idx?{...en, value:e.target.value}:en)}:t))} className="flex-1 px-4 py-2 bg-white border border-slate-200 rounded-lg text-xs font-black text-indigo-600" />
                            <button onClick={()=>setLocalLookups(prev=>prev.map(t=>t.id===tbl.id?{...t, entries: t.entries.filter((_, i)=>i!==idx)}:t))} className="p-2 text-slate-300 hover:text-rose-500"><Trash2 className="w-4 h-4" /></button>
                         </div>
                       ))}
                       <button onClick={()=>setLocalLookups(prev=>prev.map(t=>t.id===tbl.id?{...t, entries:[...t.entries, {key:'', value:''}]}:t))} className="text-[10px] font-black uppercase text-indigo-600 mt-2"><Plus className="w-3 h-3 mr-1 inline" /> Ajouter une entrée</button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'erp' && (
              <div className="space-y-10 animate-in fade-in">
                <div className="flex justify-between items-end"><h3 className="text-2xl font-black text-slate-900 uppercase">Passerelle ERP Gateway</h3></div>
                <div className="p-10 border border-slate-200 rounded-[2.5rem] bg-slate-50 space-y-8">
                  <div className="flex items-center space-x-4 p-4 bg-white rounded-2xl border border-slate-100">
                    <CloudLightning className={`w-6 h-6 ${localErp.enabled ? 'text-indigo-600' : 'text-slate-300'}`} />
                    <div className="flex-1"><p className="text-sm font-black text-slate-900 uppercase">Activer la synchronisation</p><p className="text-[9px] font-bold text-slate-400 uppercase">Push automatique des données validées</p></div>
                    <button onClick={()=>setLocalErp({...localErp, enabled: !localErp.enabled})} className={`w-14 h-8 rounded-full relative transition-colors ${localErp.enabled ? 'bg-indigo-600' : 'bg-slate-300'}`}><div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-all ${localErp.enabled ? 'left-7' : 'left-1'}`}></div></button>
                  </div>
                  <div className="grid grid-cols-1 gap-6">
                    <div className="space-y-2"><label className="text-[10px] font-black uppercase text-slate-400 ml-1">Endpoint API</label><input placeholder="https://votre-erp.com/api/v1/invoices" value={localErp.apiUrl} onChange={e=>setLocalErp({...localErp, apiUrl:e.target.value})} className="w-full px-6 py-4 rounded-2xl border border-slate-200 outline-none font-bold text-xs" /></div>
                    <div className="space-y-2"><label className="text-[10px] font-black uppercase text-slate-400 ml-1">Clé API / Token</label><input type="password" value={localErp.apiKey} onChange={e=>setLocalErp({...localErp, apiKey:e.target.value})} className="w-full px-6 py-4 rounded-2xl border border-slate-200 outline-none font-bold text-xs" /></div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'glossary' && (
              <div className="space-y-10 animate-in fade-in">
                <div className="flex justify-between items-end"><h3 className="text-2xl font-black text-slate-900 uppercase">Glossaire Factur-X / RFE</h3></div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    {bt:'BT-1', label:'Invoice Number', desc:'Identifiant unique de la facture.'},
                    {bt:'BT-2', label:'Issue Date', desc:'Date d\'émission de la facture.'},
                    {bt:'BT-27', label:'Seller Name', desc:'Raison sociale du vendeur.'},
                    {bt:'BT-29', label:'Seller ID (SIRET)', desc:'Identifiant légal du vendeur (France).'},
                    {bt:'BT-31', label:'VAT ID', desc:'N° TVA intracommunautaire.'},
                    {bt:'BT-112', label:'Grand Total', desc:'Montant TTC à payer.'}
                  ].map(item => (
                    <div key={item.bt} className="p-5 border border-slate-100 rounded-2xl bg-slate-50">
                       <p className="text-[10px] font-black text-indigo-600 mb-1">{item.bt}</p>
                       <p className="text-xs font-black text-slate-900 uppercase">{item.label}</p>
                       <p className="text-[10px] text-slate-500 font-medium mt-1">{item.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="px-10 py-6 bg-slate-50 border-t border-slate-100 flex justify-end items-center space-x-6 shrink-0">
          <button onClick={onClose} className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-600">Fermer sans enregistrer</button>
          <button onClick={handleSaveAll} className="bg-slate-950 text-white px-12 py-5 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-2xl hover:bg-black transition-all flex items-center border-b-4 border-slate-800 active:scale-95"><Save className="w-5 h-5 mr-3" /> Appliquer les Réglages</button>
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
        <div className={`p-8 rounded-[2.5rem] border ${colors[color]} flex flex-col space-y-3`}>
            <Icon className="w-6 h-6" />
            <p className="text-3xl font-black">{value}</p>
            <p className="text-[10px] font-black uppercase tracking-widest opacity-70">{label}</p>
        </div>
    );
};
