
import React, { useState, useEffect, useMemo } from 'react';
import { X, Save, CheckCircle, AlertTriangle, Download, Plus, Trash2, LayoutList, Truck, Receipt, Package, ShieldCheck, Globe, Briefcase, Landmark, Percent, Hash, Calendar as CalendarIcon, Coins, ChevronDown, Calculator, Info, FileCode, Eye, EyeOff, FileSearch, ExternalLink, Settings2, CloudLightning, Shield, Clock, CreditCard, StickyNote, Box, FileDown, FileCheck, Banknote, ListChecks, ShieldAlert, BadgeCheck, Database, ListTodo } from 'lucide-react';
import { InvoiceData, InvoiceItem, InvoiceType, LookupTable, OperationCategory, TaxPointType, FacturXProfile, PartnerMasterData, VatBreakdown } from '../types';
import { generateFacturXXML } from '../services/facturXService';

// --- Constants ---
const STANDARD_VAT_RATE = 20.0;
const VAT_CATEGORIES = [
  { code: 'S', label: 'Standard' },
  { code: 'Z', label: 'Zéro' },
  { code: 'E', label: 'Exonéré' },
  { code: 'AE', label: 'Autoliquidation' },
  { code: 'G', label: 'Export' },
];

const FormInput = ({ label, value, onChange, type = "text", placeholder, btId, required, multiline, className = "", themeColor = "indigo", badge, source }: any) => {
  const colorMap: Record<string, string> = {
    indigo: "focus-within:border-indigo-500 focus-within:ring-indigo-500/10 text-slate-900 bg-slate-50/50",
    orange: "focus-within:border-orange-500 focus-within:ring-orange-500/10 text-slate-900 bg-slate-50/50",
    purple: "focus-within:border-purple-500 focus-within:ring-purple-500/10 text-slate-900 bg-slate-50/50",
    slate: "focus-within:border-slate-500 focus-within:ring-slate-500/10 text-slate-900 bg-slate-50/50",
    emerald: "focus-within:border-emerald-500 focus-within:ring-emerald-500/10 text-slate-900 bg-slate-50/50"
  };

  return (
    <div className={`flex flex-col space-y-0.5 ${className}`}>
      <div className="flex justify-between items-center px-1">
        <label className="text-[9px] font-black uppercase text-slate-500 tracking-[0.05em] flex items-center">
          {label} {required && <span className="text-rose-500 font-bold ml-1">*</span>}
          {source === 'MASTER_DATA' && <span className="ml-2 bg-emerald-100 text-emerald-600 px-1.5 py-0.5 rounded text-[7px] font-black border border-emerald-200">MASTER</span>}
        </label>
        <div className="flex space-x-1.5 items-center">
            {badge && badge}
            {btId && (
            <span className="text-[7px] font-mono font-black bg-slate-100 px-1 py-0.5 rounded border border-slate-200 text-slate-400">
                BT-{btId}
            </span>
            )}
        </div>
      </div>
      <div className={`relative flex items-center border rounded-lg overflow-hidden transition-all duration-150 group bg-white ${source === 'MASTER_DATA' ? 'border-emerald-500 shadow-sm shadow-emerald-50' : 'border-slate-200'} ${colorMap[themeColor] || colorMap.indigo}`}>
        {multiline ? (
          <textarea
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            rows={2}
            placeholder={placeholder}
            className="w-full px-2.5 py-1.5 text-xs bg-transparent outline-none text-slate-900 font-bold resize-none placeholder-slate-300 leading-tight"
          />
        ) : (
          <input
            type={type}
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="w-full px-2.5 py-1.5 text-xs bg-transparent outline-none text-slate-900 font-bold placeholder-slate-300 h-8"
          />
        )}
      </div>
    </div>
  );
};

const Group = ({ title, icon: Icon, children, actions, variant = "indigo", className = "", fullHeight = true }: any) => {
  const iconColors: Record<string, string> = {
    indigo: "bg-indigo-600",
    orange: "bg-orange-600",
    purple: "bg-purple-600",
    slate: "bg-slate-700",
    emerald: "bg-emerald-600"
  };

  return (
    <div className={`rounded-2xl border border-slate-200 bg-white flex flex-col ${fullHeight ? 'h-full' : 'h-auto'} overflow-hidden transition-all duration-300 shadow-sm ${className}`}>
      <div className="px-4 py-2 bg-slate-50/80 border-b border-slate-100 flex justify-between items-center shrink-0">
        <div className="flex items-center space-x-2">
          {Icon && (
            <div className={`p-1 rounded-md shadow-sm text-white ${iconColors[variant]}`}>
              <Icon className="w-3 h-3" />
            </div>
          )}
          <h3 className="text-[9px] font-black uppercase tracking-widest text-slate-600">{title}</h3>
        </div>
        {actions && <div className="flex space-x-1.5">{actions}</div>}
      </div>
      <div className={`p-4 ${fullHeight ? 'flex-1' : ''}`}>{children}</div>
    </div>
  );
};

export const FacturXModal: React.FC<{ 
  isOpen: boolean; 
  onClose: () => void; 
  invoice: InvoiceData; 
  onSave: (u: InvoiceData) => void; 
  lookupTables: LookupTable[];
  masterData?: PartnerMasterData[];
  isAdmin?: boolean;
}> = ({ isOpen, onClose, invoice, onSave, lookupTables, masterData = [], isAdmin = true }) => {
  const [data, setData] = useState<InvoiceData>(() => ({ 
    ...invoice, 
    items: (invoice.items || []).map(it => ({ ...it, unitOfMeasure: it.unitOfMeasure || 'C62', lineVatCategory: it.lineVatCategory || 'S' })),
    vatBreakdowns: invoice.vatBreakdowns || []
  }));
  const [activeTab, setActiveTab] = useState<'form' | 'xml'>('form');
  const [showPdf, setShowPdf] = useState(true);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  useEffect(() => {
    if (data.fileData) {
      try {
        const byteCharacters = atob(data.fileData);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        setPdfUrl(url);
        return () => URL.revokeObjectURL(url);
      } catch (e) {
        console.error("PDF Blob Creation Error:", e);
      }
    }
  }, [data.fileData]);

  // Recalcul dynamique des totaux et de la ventilation TVA (BG-23)
  useEffect(() => {
    if (!data.items) return;

    const lineTotalHT = data.items.reduce((sum, item) => sum + (item.amount || 0), 0);
    const charge = data.globalCharge || 0;
    const discount = data.globalDiscount || 0;
    const taxBasisTotal = lineTotalHT + charge - discount;

    const breakdownMap = new Map<string, VatBreakdown>();

    data.items.forEach(item => {
      const rate = item.taxRate || 0;
      const cat = item.lineVatCategory || 'S';
      const key = `${rate}-${cat}`;

      const existing = breakdownMap.get(key) || {
        vatCategory: cat,
        vatRate: rate,
        vatTaxableAmount: 0,
        vatAmount: 0
      };

      existing.vatTaxableAmount += (item.amount || 0);
      existing.vatAmount += ((item.amount || 0) * rate / 100);
      breakdownMap.set(key, existing);
    });

    const vatBreakdowns = Array.from(breakdownMap.values()).map(b => ({
      ...b,
      vatTaxableAmount: parseFloat(b.vatTaxableAmount.toFixed(2)),
      vatAmount: parseFloat(b.vatAmount.toFixed(2))
    }));

    const totalVAT = vatBreakdowns.reduce((sum, b) => sum + b.vatAmount, 0);
    const amountInclVat = taxBasisTotal + totalVAT;

    if (Math.abs(taxBasisTotal - (data.amountExclVat || 0)) > 0.01 || 
        Math.abs(amountInclVat - (data.amountInclVat || 0)) > 0.01 ||
        JSON.stringify(vatBreakdowns) !== JSON.stringify(data.vatBreakdowns)) {
      setData(prev => ({
        ...prev,
        amountExclVat: parseFloat(taxBasisTotal.toFixed(2)),
        totalVat: parseFloat(totalVAT.toFixed(2)),
        amountInclVat: parseFloat(amountInclVat.toFixed(2)),
        vatBreakdowns
      }));
    }
  }, [data.items, data.globalCharge, data.globalDiscount]);

  const xml = useMemo(() => generateFacturXXML(data), [data]);

  const auditChecks = useMemo(() => [
      { id: 'BT-1', label: 'N° Facture', status: !!data.invoiceNumber, mandatory: true },
      { id: 'BT-2', label: 'Date Facture', status: !!data.invoiceDate, mandatory: true },
      { id: 'BT-3', label: 'Type Document', status: !!data.invoiceType, mandatory: true },
      { id: 'BT-5', label: 'Devise ISO', status: !!data.currency, mandatory: true },
      { id: 'BT-9', label: 'Date Échéance', status: !!data.dueDate, mandatory: false },
      { id: 'BT-20', label: 'Cond. Paiement', status: !!data.paymentTermsText, mandatory: false },
      { id: 'BT-27', label: 'Nom Vendeur', status: !!data.supplier, mandatory: true },
      { id: 'BT-29', label: 'SIRET Vendeur', status: !!data.supplierSiret && data.supplierSiret.replace(/\s/g, '').length === 14, mandatory: true },
      { id: 'BT-31', label: 'TVA Vendeur', status: !!data.supplierVat && data.supplierVat.startsWith('FR'), mandatory: true },
      { id: 'BT-44', label: 'Nom Acheteur', status: !!data.buyerName, mandatory: true },
      { id: 'BT-47', label: 'SIRET Acheteur', status: !!data.buyerSiret && data.buyerSiret.replace(/\s/g, '').length === 14, mandatory: true },
      { id: 'BT-48', label: 'TVA Acheteur', status: !!data.buyerVat, mandatory: false },
      { id: 'BT-84', label: 'IBAN Vendeur', status: !!data.iban && data.iban.length >= 14, mandatory: true },
      { id: 'BT-109', label: 'Total HT', status: (data.amountExclVat || 0) > 0, mandatory: true },
      { id: 'BT-112', label: 'Total TTC', status: (data.amountInclVat || 0) > 0, mandatory: true },
      { id: 'BG-23', label: 'Ventilation TVA', status: (data.vatBreakdowns?.length || 0) > 0, mandatory: true },
      { id: 'BG-25', label: 'Lignes (BT-151)', status: (data.items?.length || 0) > 0 && data.items?.every(i => !!i.lineVatCategory), mandatory: true },
    ], [data]);

  const handleUpdateItem = (idx: number, field: keyof InvoiceItem, value: any) => {
    const newItems = [...(data.items || [])];
    const item = { ...newItems[idx], [field]: value };
    
    if (['grossPrice', 'discount', 'quantity', 'unitPrice'].includes(field)) {
      const q = parseFloat(String(item.quantity)) || 0;
      const p = parseFloat(String(item.unitPrice)) || 0;
      item.amount = parseFloat((q * p).toFixed(2));
    }
    
    newItems[idx] = item;
    setData({ ...data, items: newItems });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-sm flex items-center justify-center z-[100] p-3 lg:p-4">
      <div className="bg-white rounded-[2rem] shadow-[0_30px_90px_-15px_rgba(0,0,0,0.5)] w-full max-w-[1780px] h-[94vh] flex flex-col overflow-hidden border border-slate-200">
        
        <div className="px-6 py-3 border-b border-slate-200 flex justify-between items-center bg-white shrink-0">
          <div className="flex items-center space-x-4">
            <div className="bg-indigo-600 p-2 rounded-xl text-white shadow-lg"><ShieldCheck className="w-5 h-5" /></div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base font-black text-slate-900 uppercase">Audit RFE 2026 Compliant</h2>
                <span className="bg-emerald-100 text-emerald-600 text-[7px] font-black px-1.5 py-0.5 rounded-full tracking-widest uppercase">Standard EN16931</span>
              </div>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">Gouvernance Sémantique CII Comfort</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <button onClick={() => setShowPdf(!showPdf)} className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest border transition-all ${showPdf ? 'bg-indigo-50 text-indigo-600 border-indigo-100' : 'bg-white text-slate-500 border-slate-200'}`}>
              {showPdf ? 'Masquer PDF' : 'Voir PDF'}
            </button>
            <div className="bg-slate-50 p-1 rounded-xl flex border border-slate-200">
                <button onClick={() => setActiveTab('form')} className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest ${activeTab === 'form' ? 'bg-white text-indigo-600 shadow-sm border border-slate-100' : 'text-slate-400'}`}>Audit</button>
                <button onClick={() => setActiveTab('xml')} className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest ${activeTab === 'xml' ? 'bg-white text-indigo-600 shadow-sm border border-slate-100' : 'text-slate-400'}`}>CII XML</button>
            </div>
            <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg transition-all"><X className="w-5 h-5" /></button>
          </div>
        </div>

        <div className="flex-1 flex overflow-hidden bg-slate-50">
          {showPdf && pdfUrl && (
            <div className="hidden lg:flex flex-[0_0_35%] flex-col bg-slate-100 border-r border-slate-200 relative animate-in slide-in-from-left duration-300">
              <iframe src={pdfUrl} className="w-full h-full border-none" title="PDF Source" />
            </div>
          )}

          <div className="flex-1 overflow-hidden flex flex-col bg-slate-50">
            {activeTab === 'form' ? (
              <div className="flex h-full overflow-hidden">
                <div className="flex-1 p-5 space-y-5 overflow-y-auto custom-scrollbar">
                    
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                      <Group title="Identité Document" icon={LayoutList} variant="slate" className="lg:col-span-8">
                          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                            <FormInput label="N° Facture" value={data.invoiceNumber} onChange={(v:any)=>setData({...data, invoiceNumber:v})} btId="1" required themeColor="slate" />
                            <FormInput label="Date Facture" value={data.invoiceDate} onChange={(v:any)=>setData({...data, invoiceDate:v})} btId="2" required themeColor="slate" />
                            <FormInput label="Date Échéance" value={data.dueDate} onChange={(v:any)=>setData({...data, dueDate:v})} btId="9" themeColor="slate" />
                            <FormInput label="Devise" value={data.currency} onChange={(v:any)=>setData({...data, currency:v.toUpperCase()})} btId="5" themeColor="slate" />
                          </div>
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mt-4">
                            <FormInput label="Notes Facture" value={data.invoiceNote} onChange={(v:any)=>setData({...data, invoiceNote:v})} btId="22" multiline themeColor="slate" />
                            <FormInput label="Conditions Paiement" value={data.paymentTermsText} onChange={(v:any)=>setData({...data, paymentTermsText:v})} btId="20" multiline themeColor="slate" />
                          </div>
                      </Group>
                      
                      <Group title="Partition & MasterData" icon={CloudLightning} variant="purple" className="lg:col-span-4">
                        <div className="space-y-3">
                           <div className="p-3 bg-white border border-slate-100 rounded-xl flex items-center space-x-3">
                              <div className="p-1.5 bg-emerald-500 rounded-lg text-white shadow-sm"><Database className="w-4 h-4" /></div>
                              <div className="flex-1 min-w-0">
                                 <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Référentiel Vendeur</p>
                                 <p className="text-[10px] font-black text-slate-900 truncate">{data.supplier || 'Non identifié'}</p>
                              </div>
                           </div>
                           <div className="grid grid-cols-2 gap-3">
                              <FormInput label="Code ERP VND" value={data.supplierErpCode} onChange={(v:any)=>setData({...data, supplierErpCode:v})} themeColor="purple" />
                              <FormInput label="Code ERP ACH" value={data.buyerErpCode} onChange={(v:any)=>setData({...data, buyerErpCode:v})} themeColor="purple" />
                           </div>
                        </div>
                      </Group>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                      <Group title="Vendeur (BT-27)" icon={Truck} variant="indigo">
                          <FormInput label="Raison Sociale" value={data.supplier} onChange={(v:any)=>setData({...data, supplier:v})} btId="27" required className="mb-3" themeColor="indigo" />
                          <div className="grid grid-cols-2 gap-3 mb-3">
                            <FormInput label="SIRET" value={data.supplierSiret} onChange={(v:any)=>setData({...data, supplierSiret:v})} btId="29" required themeColor="indigo" />
                            <FormInput label="TVA Intra" value={data.supplierVat} onChange={(v:any)=>setData({...data, supplierVat:v})} btId="31" themeColor="indigo" />
                          </div>
                          <FormInput label="IBAN Vendeur" value={data.iban} onChange={(v:any)=>setData({...data, iban:v.replace(/\s/g, "")})} btId="84" required themeColor="indigo" />
                      </Group>
                      <Group title="Acheteur (BT-44)" icon={Receipt} variant="orange">
                          <FormInput label="Nom Client" value={data.buyerName} onChange={(v:any)=>setData({...data, buyerName:v})} btId="44" required className="mb-3" themeColor="orange" />
                          <div className="grid grid-cols-2 gap-3 mb-3">
                            <FormInput label="SIRET Client" value={data.buyerSiret} onChange={(v:any)=>setData({...data, buyerSiret:v})} btId="47" required themeColor="orange" />
                            <FormInput label="TVA Client" value={data.buyerVat} onChange={(v:any)=>setData({...data, buyerVat:v})} btId="48" themeColor="orange" />
                          </div>
                          <FormInput label="Adresse Facturation" value={data.buyerAddress} onChange={(v:any)=>setData({...data, buyerAddress:v})} btId="BG-8" multiline themeColor="orange" />
                      </Group>
                    </div>

                    <Group title="Détails des Lignes (BG-25)" icon={Package} variant="slate" fullHeight={false}>
                      <div className="w-full rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
                        <div className="overflow-x-auto custom-scrollbar">
                          <table className="w-full text-[10px] border-collapse table-auto min-w-[1000px]">
                            <thead className="bg-slate-50 text-[8px] font-black uppercase text-slate-500 border-b border-slate-200 sticky top-0 z-10">
                              <tr>
                                <th className="px-3 py-4 text-left w-[8%]">Réf.</th>
                                <th className="px-3 py-4 text-left w-[35%]">Désignation (BT-129)</th>
                                <th className="px-3 py-4 text-right w-[6%]">Qté</th>
                                <th className="px-3 py-4 text-left w-[12%] bg-indigo-50/20">TVA (BT-151)</th>
                                <th className="px-3 py-4 text-right w-[8%]">P.U Brut</th>
                                <th className="px-3 py-4 text-right w-[10%] bg-indigo-50/30">P.U Net</th>
                                <th className="px-3 py-4 text-right w-[6%]">TVA%</th>
                                <th className="px-3 py-4 text-right w-[15%] bg-slate-100/50">Montant HT</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {(data.items || []).map((item, idx) => (
                                <tr key={idx} className="hover:bg-slate-50/50 transition-colors group">
                                  <td className="p-1.5"><input value={item.articleId} onChange={e=>handleUpdateItem(idx, 'articleId', e.target.value)} className="w-full bg-transparent border border-transparent focus:border-indigo-200 rounded px-1.5 py-1 outline-none font-mono text-[9px]" /></td>
                                  <td className="p-1.5"><input value={item.description} onChange={e=>handleUpdateItem(idx, 'description', e.target.value)} className="w-full bg-transparent border border-transparent focus:border-indigo-200 rounded px-1.5 py-1 outline-none font-bold" /></td>
                                  <td className="p-1.5"><input type="number" value={item.quantity || ''} onChange={e=>handleUpdateItem(idx, 'quantity', parseFloat(e.target.value))} className="w-full text-right bg-transparent border border-transparent focus:border-indigo-200 rounded px-1.5 py-1 outline-none font-black" /></td>
                                  <td className="p-1.5 bg-indigo-50/10">
                                    <select 
                                      value={item.lineVatCategory || 'S'} 
                                      onChange={e=>handleUpdateItem(idx, 'lineVatCategory', e.target.value)} 
                                      className="w-full bg-white border border-slate-200 rounded px-2 py-1 outline-none font-black text-[9px] appearance-none cursor-pointer"
                                    >
                                      {VAT_CATEGORIES.map(c => <option key={c.code} value={c.code}>{c.label} ({c.code})</option>)}
                                    </select>
                                  </td>
                                  <td className="p-1.5"><input type="number" value={item.grossPrice || ''} onChange={e=>handleUpdateItem(idx, 'grossPrice', parseFloat(e.target.value))} className="w-full text-right bg-transparent border border-transparent focus:border-indigo-200 rounded px-1.5 py-1 outline-none font-black" /></td>
                                  <td className="p-1.5 bg-indigo-50/10 text-right font-black text-indigo-600">{(item.unitPrice || 0).toFixed(4)}</td>
                                  <td className="p-1.5"><input type="number" value={item.taxRate || ''} onChange={e=>handleUpdateItem(idx, 'taxRate', parseFloat(e.target.value))} className="w-full text-right bg-transparent border border-transparent focus:border-indigo-200 rounded px-1.5 py-1 outline-none font-black" /></td>
                                  <td className="p-1.5 text-right font-black font-mono text-slate-700 bg-slate-50">{(item.amount || 0).toFixed(2)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </Group>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                        <Group title="Ventilation TVA (BG-23)" icon={Percent} variant="emerald">
                            <div className="space-y-3">
                              {data.vatBreakdowns?.map((v, i) => (
                                <div key={i} className="flex items-center justify-between p-3 bg-emerald-50 rounded-xl border border-emerald-100 animate-in zoom-in-95">
                                   <div className="flex flex-col">
                                     <span className="text-[8px] font-black uppercase text-emerald-600">Base HT ({v.vatCategory} - {v.vatRate}%)</span>
                                     <span className="text-[10px] font-black text-emerald-900">{v.vatTaxableAmount.toLocaleString()} €</span>
                                   </div>
                                   <div className="flex flex-col items-end">
                                     <span className="text-[8px] font-black uppercase text-emerald-600">Montant TVA</span>
                                     <span className="text-[10px] font-black text-emerald-900">{v.vatAmount.toLocaleString()} €</span>
                                   </div>
                                </div>
                              ))}
                              {(!data.vatBreakdowns || data.vatBreakdowns.length === 0) && <p className="text-[9px] text-slate-400 italic font-bold">Calcul automatique au prochain audit...</p>}
                            </div>
                        </Group>

                        <Group title="Ajustements & Frais" icon={Calculator} variant="slate">
                            <div className="space-y-4">
                              <FormInput label="Remise Globale HT" value={data.globalDiscount} onChange={(v:any)=>setData({...data, globalDiscount: parseFloat(v) || 0})} btId="107" themeColor="slate" />
                              <FormInput label="Frais Logistiques HT" value={data.globalCharge} onChange={(v:any)=>setData({...data, globalCharge: parseFloat(v) || 0})} btId="108" themeColor="slate" />
                            </div>
                        </Group>
                        
                        <div className="bg-slate-950 text-white p-8 rounded-[2rem] shadow-2xl border-b-4 border-indigo-600 flex flex-col justify-center space-y-4">
                           <div className="flex justify-between items-center text-[10px] font-black uppercase text-slate-500 tracking-widest">
                             <span>Total HT Net (BT-109)</span>
                             <span className="font-mono text-xl">{(data.amountExclVat || 0).toFixed(2)}</span>
                           </div>
                           <div className="flex justify-between items-center text-[10px] font-black uppercase text-indigo-400 tracking-widest">
                             <span>Total TVA (BT-110)</span>
                             <span className="font-mono text-xl">{(data.totalVat || 0).toFixed(2)}</span>
                           </div>
                           <div className="h-px bg-white/10 my-1"></div>
                           <div className="flex flex-col">
                             <span className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] mb-2">Total TTC à Payer (BT-112)</span>
                             <div className="flex items-baseline space-x-2">
                               <span className="text-4xl font-black font-mono tracking-tighter">{(data.amountInclVat || 0).toFixed(2)}</span>
                               <span className="text-base opacity-40 font-black tracking-tight">{data.currency}</span>
                             </div>
                           </div>
                        </div>
                    </div>
                </div>

                <div className="w-[320px] bg-white border-l border-slate-200 h-full p-6 space-y-6 flex flex-col overflow-y-auto custom-scrollbar shrink-0">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-slate-950 rounded-xl text-white shadow-lg shadow-slate-200"><ListChecks className="w-5 h-5" /></div>
                    <h4 className="text-[11px] font-black uppercase text-slate-900 tracking-tight">Checklist RFE 2026</h4>
                  </div>
                  <div className="space-y-3">
                    {auditChecks.map((check) => (
                      <div key={check.id} className={`px-4 py-2.5 rounded-2xl border flex items-start space-x-3 transition-all ${check.status ? 'bg-emerald-50 border-emerald-100 opacity-80' : 'bg-rose-50 border-rose-100 shadow-sm'}`}>
                        <div className={`mt-0.5 p-1 rounded-md text-white shadow-sm shrink-0 ${check.status ? 'bg-emerald-500' : 'bg-rose-500'}`}>
                          {check.status ? <BadgeCheck className="w-3.5 h-3.5" /> : <ShieldAlert className="w-3.5 h-3.5" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-[10px] font-black uppercase tracking-tight truncate ${check.status ? 'text-emerald-800' : 'text-rose-800'}`}>{check.label}</p>
                          <p className={`text-[8px] font-bold uppercase ${check.status ? 'text-emerald-600/60' : 'text-rose-600/60'}`}>{check.id}</p>
                        </div>
                        {check.mandatory && !check.status && <div className="text-[7px] font-black text-rose-600 uppercase bg-white border border-rose-200 px-1 rounded">REQUIS</div>}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-slate-900 h-full p-10 font-mono text-[11px] text-emerald-400 overflow-y-auto custom-scrollbar">
                 <pre className="selection:bg-emerald-500/20">{xml}</pre>
              </div>
            )}
          </div>
        </div>

        <div className="px-10 py-4 border-t border-slate-200 flex justify-end items-center space-x-4 bg-white shrink-0">
          <button onClick={onClose} className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-600 transition-colors">Retour</button>
          <button onClick={() => { onSave(data); onClose(); }} className="bg-slate-950 text-white px-12 py-4 rounded-[1.2rem] text-[10px] font-black uppercase tracking-[0.2em] shadow-2xl hover:bg-black transition-all flex items-center active:scale-95 border-b-2 border-slate-800">
            <FileCheck className="w-5 h-5 mr-3" /> Valider & Archiver Audit
          </button>
        </div>
      </div>
    </div>
  );
};
