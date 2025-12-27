
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { X, Save, CheckCircle, AlertTriangle, LayoutList, Truck, Receipt, Package, ShieldCheck, CloudLightning, Banknote, Percent, Trash2, Plus, BadgeCheck, ShieldAlert, ListChecks, FileCode, RefreshCw } from 'lucide-react';
import { InvoiceData, InvoiceItem, InvoiceType, LookupTable, PartnerMasterData, VatBreakdown } from '../types';
import { generateFacturXXML } from '../services/facturXService';

// --- Utils for Matching ---
const normalizeName = (name: string): string => {
  return name.toLowerCase()
    .replace(/\b(sarl|sas|sa|eurl|snc|sci|corp|inc|ltd)\b/g, '')
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
};

const cleanNumeric = (str: string | undefined | null): string => {
  if (!str) return "";
  return String(str).replace(/\D/g, "");
};

const findMatches = (name: string, masterData: PartnerMasterData[]): PartnerMasterData[] => {
  if (!name || name.length < 3) return [];
  const normalizedSearch = normalizeName(name);
  return masterData.filter(m => {
    const normalizedMaster = normalizeName(m.name);
    return normalizedMaster.includes(normalizedSearch) || normalizedSearch.includes(normalizedMaster);
  }).slice(0, 5);
};

// --- Constants ---
const VAT_CATEGORIES = [
  { code: 'S', label: 'Standard' },
  { code: 'Z', label: 'Zéro' },
  { code: 'E', label: 'Exonéré' },
  { code: 'AE', label: 'Autoliquidation' },
  { code: 'G', label: 'Export' },
  { code: 'K', label: 'Intracommu.' },
  { code: 'O', label: 'Hors Champ' },
];

const FormInput = ({ label, value, onChange, type = "text", placeholder, btId, required, multiline, className = "", themeColor = "indigo", badge, source, suggestions, onSelectSuggestion }: any) => {
  const colorMap: Record<string, string> = {
    indigo: "focus-within:border-indigo-500 text-slate-900 bg-slate-50/50",
    orange: "focus-within:border-orange-500 text-slate-900 bg-slate-50/50",
    purple: "focus-within:border-purple-500 text-slate-900 bg-slate-50/50",
    slate: "focus-within:border-slate-500 text-slate-900 bg-slate-50/50",
    emerald: "focus-within:border-emerald-500 text-slate-900 bg-slate-50/50"
  };

  return (
    <div className={`flex flex-col space-y-0.5 relative ${className}`}>
      <div className="flex justify-between items-center px-1">
        <label className="text-[9px] font-black uppercase text-slate-500 tracking-[0.05em] flex items-center">
          {label} {required && <span className="text-rose-500 font-bold ml-1">*</span>}
          {source === 'MASTER_DATA' && <span className="ml-2 bg-emerald-100 text-emerald-600 px-1.5 py-0.5 rounded text-[7px] font-black border border-emerald-200">MASTER MATCHED</span>}
        </label>
        <div className="flex space-x-1.5 items-center">
            {badge && badge}
            {btId && <span className="text-[7px] font-mono font-black bg-slate-100 px-1 py-0.5 rounded border border-slate-200 text-slate-400">BT-{btId}</span>}
        </div>
      </div>
      <div className={`relative flex items-center border rounded-lg overflow-hidden transition-all duration-150 bg-white ${source === 'MASTER_DATA' ? 'border-emerald-500 shadow-sm shadow-emerald-50' : 'border-slate-200'} ${colorMap[themeColor] || colorMap.indigo}`}>
        {multiline ? (
          <textarea value={value || ''} onChange={(e) => onChange(e.target.value)} rows={2} placeholder={placeholder} className="w-full px-2.5 py-1.5 text-xs bg-transparent outline-none text-slate-900 font-bold resize-none h-auto" />
        ) : (
          <input type={type} value={value || ''} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="w-full px-2.5 py-1.5 text-xs bg-transparent outline-none text-slate-900 font-bold h-8" />
        )}
      </div>
      {suggestions && suggestions.length > 0 && (
        <div className="mt-1 flex flex-wrap gap-1 z-20">
          {suggestions.map((s: PartnerMasterData) => (
            <button key={s.id} onClick={() => onSelectSuggestion(s)} className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[7px] font-black text-slate-600 hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 shadow-sm">{s.name}</button>
          ))}
        </div>
      )}
    </div>
  );
};

const Group = ({ title, icon: Icon, children, actions, variant = "indigo", className = "", fullHeight = true }: any) => {
  const iconColors: Record<string, string> = {
    indigo: "bg-indigo-600", orange: "bg-orange-600", purple: "bg-purple-600", slate: "bg-slate-700", emerald: "bg-emerald-600"
  };
  return (
    <div className={`rounded-2xl border border-slate-200 bg-white flex flex-col ${fullHeight ? 'h-full' : 'h-auto'} overflow-hidden shadow-sm ${className}`}>
      <div className="px-4 py-2 bg-slate-50/80 border-b border-slate-100 flex justify-between items-center shrink-0">
        <div className="flex items-center space-x-2">
          {Icon && <div className={`p-1 rounded-md text-white ${iconColors[variant]}`}><Icon className="w-3 h-3" /></div>}
          <h3 className="text-[9px] font-black uppercase tracking-widest text-slate-600">{title}</h3>
        </div>
        {actions && <div className="flex space-x-1.5">{actions}</div>}
      </div>
      <div className={`p-4 ${fullHeight ? 'flex-1' : ''}`}>{children}</div>
    </div>
  );
};

export const FacturXModal: React.FC<{ 
  isOpen: boolean; onClose: () => void; invoice: InvoiceData; onSave: (u: InvoiceData) => void; 
  lookupTables: LookupTable[]; masterData?: PartnerMasterData[]; 
}> = ({ isOpen, onClose, invoice, onSave, masterData = [] }) => {
  const [data, setData] = useState<InvoiceData>(() => ({ 
    ...invoice, 
    items: (invoice.items || []).map(it => ({ ...it, unitOfMeasure: it.unitOfMeasure || 'C62', lineVatCategory: it.lineVatCategory || 'S' })),
    vatBreakdowns: invoice.vatBreakdowns || [],
    roundingAmount: invoice.roundingAmount || 0,
    prepaidAmount: invoice.prepaidAmount || 0
  }));
  const [activeTab, setActiveTab] = useState<'form' | 'xml'>('form');
  const [showPdf, setShowPdf] = useState(true);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [supplierSuggestions, setSupplierSuggestions] = useState<PartnerMasterData[]>([]);

  useEffect(() => {
    if (data.fileData) {
      const byteCharacters = atob(data.fileData);
      const byteNumbers = new Uint8Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) byteNumbers[i] = byteCharacters.charCodeAt(i);
      const blob = new Blob([byteNumbers], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      setPdfUrl(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [data.fileData]);

  const handleApplyMasterSuggestion = useCallback((tier: PartnerMasterData, type: 'SUPPLIER' | 'BUYER') => {
    setData(prev => {
      const isS = type === 'SUPPLIER';
      return {
        ...prev,
        [isS ? 'supplier' : 'buyerName']: tier.name,
        [isS ? 'supplierSiret' : 'buyerSiret']: tier.siret,
        [isS ? 'supplierVat' : 'buyerVat']: tier.vatNumber,
        [isS ? 'supplierErpCode' : 'buyerErpCode']: tier.erpCode, 
        [isS ? 'iban' : 'buyerIban']: tier.iban || prev[isS ? 'iban' : 'buyerIban'],
        [isS ? 'isMasterMatched' : 'isBuyerMasterMatched']: true
      };
    });
    setSupplierSuggestions([]);
  }, []);

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
      const existing = breakdownMap.get(key) || { vatCategory: cat, vatRate: rate, vatTaxableAmount: 0, vatAmount: 0 };
      existing.vatTaxableAmount += (item.amount || 0);
      existing.vatAmount += ((item.amount || 0) * rate / 100);
      breakdownMap.set(key, existing);
    });

    const vats = Array.from(breakdownMap.values()).map(b => ({ ...b, vatTaxableAmount: Number(b.vatTaxableAmount.toFixed(2)), vatAmount: Number(b.vatAmount.toFixed(2)) }));
    const totalVAT = vats.reduce((sum, b) => sum + b.vatAmount, 0);
    const inclVat = taxBasisTotal + totalVAT;
    const due = inclVat - (data.prepaidAmount || 0) + (data.roundingAmount || 0);

    setData(prev => ({ ...prev, amountExclVat: Number(taxBasisTotal.toFixed(2)), totalVat: Number(totalVAT.toFixed(2)), amountInclVat: Number(inclVat.toFixed(2)), amountDueForPayment: Number(due.toFixed(2)), vatBreakdowns: vats }));
  }, [data.items, data.globalCharge, data.globalDiscount, data.prepaidAmount, data.roundingAmount]);

  const auditChecks = useMemo(() => [
      { id: 'BT-1', label: 'N° Facture', status: !!data.invoiceNumber, mandatory: true },
      { id: 'BT-29', label: 'SIRET Vendeur', status: cleanNumeric(data.supplierSiret).length === 14, mandatory: true },
      { id: 'BT-84', label: 'IBAN Vendeur', status: cleanNumeric(data.iban).length >= 14, mandatory: true },
      { id: 'BG-23', label: 'Ventilation TVA', status: (data.vatBreakdowns?.length || 0) > 0, mandatory: true },
    ], [data]);

  const handleUpdateItem = (idx: number, field: keyof InvoiceItem, value: any) => {
    const items = [...(data.items || [])];
    items[idx] = { ...items[idx], [field]: value };
    if (['quantity', 'unitPrice'].includes(field)) items[idx].amount = Number(((items[idx].quantity || 0) * (items[idx].unitPrice || 0)).toFixed(2));
    setData({ ...data, items });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
      <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-[1780px] h-[94vh] flex flex-col overflow-hidden">
        <div className="px-6 py-3 border-b border-slate-200 flex justify-between items-center bg-white shrink-0">
          <div className="flex items-center space-x-4">
            <div className="bg-indigo-600 p-2 rounded-xl text-white shadow-lg"><ShieldCheck className="w-5 h-5" /></div>
            <div><h2 className="text-base font-black text-slate-900 uppercase">Audit RFE 2026 Compliant</h2><p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">Standard EN16931 Comfort</p></div>
          </div>
          <div className="flex items-center space-x-3">
            <button onClick={() => setShowPdf(!showPdf)} className="px-4 py-1.5 rounded-lg text-[9px] font-black uppercase bg-slate-50 text-slate-500 border border-slate-200">{showPdf ? 'Masquer PDF' : 'Voir PDF'}</button>
            <div className="bg-slate-50 p-1 rounded-xl flex border border-slate-200">
                <button onClick={() => setActiveTab('form')} className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase ${activeTab === 'form' ? 'bg-white text-indigo-600 shadow-sm border border-slate-100' : 'text-slate-400'}`}>Formulaire</button>
                <button onClick={() => setActiveTab('xml')} className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase ${activeTab === 'xml' ? 'bg-white text-indigo-600 shadow-sm border border-slate-100' : 'text-slate-400'}`}>CII XML</button>
            </div>
            <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-rose-500 transition-all"><X className="w-5 h-5" /></button>
          </div>
        </div>

        <div className="flex-1 flex overflow-hidden bg-slate-50">
          {showPdf && pdfUrl && <div className="hidden lg:flex flex-[0_0_35%] border-r border-slate-200"><iframe src={pdfUrl} className="w-full h-full" /></div>}
          <div className="flex-1 overflow-y-auto p-5 space-y-5 custom-scrollbar">
            {activeTab === 'form' ? (
              <>
                <div className="grid grid-cols-12 gap-5">
                    <Group title="Identité Document" icon={LayoutList} variant="slate" className="col-span-8">
                        <div className="grid grid-cols-5 gap-3">
                            <FormInput label="N° Facture" value={data.invoiceNumber} onChange={(v:any)=>setData({...data, invoiceNumber:v})} btId="1" required />
                            <FormInput label="Date Facture" value={data.invoiceDate} onChange={(v:any)=>setData({...data, invoiceDate:v})} btId="2" required />
                            <FormInput label="Échéance" value={data.dueDate} onChange={(v:any)=>setData({...data, dueDate:v})} btId="9" />
                            <FormInput label="Point Taxe" value={data.taxPointDate} onChange={(v:any)=>setData({...data, taxPointDate:v})} btId="7" />
                            <FormInput label="Devise" value={data.currency} onChange={(v:any)=>setData({...data, currency:v.toUpperCase()})} btId="5" />
                        </div>
                    </Group>
                    <Group title="Partition ERP" icon={CloudLightning} variant="purple" className="col-span-4">
                        <div className="grid grid-cols-2 gap-3">
                           <FormInput label="Code VND" value={data.supplierErpCode} onChange={(v:any)=>setData({...data, supplierErpCode:v})} themeColor="purple" />
                           <FormInput label="Code ACH" value={data.buyerErpCode} onChange={(v:any)=>setData({...data, buyerErpCode:v})} themeColor="purple" />
                        </div>
                    </Group>
                </div>
                <div className="grid grid-cols-2 gap-5">
                    <Group title="Vendeur (BT-27)" icon={Truck} variant="indigo">
                        <FormInput label="Nom" value={data.supplier} onChange={(v:any)=>setData({...data, supplier:v})} btId="27" required className="mb-3" />
                        <div className="grid grid-cols-2 gap-3">
                            <FormInput label="SIRET" value={data.supplierSiret} onChange={(v:any)=>setData({...data, supplierSiret:v})} btId="29" required />
                            <FormInput label="IBAN" value={data.iban} onChange={(v:any)=>setData({...data, iban:v.replace(/\s/g, "")})} btId="84" required />
                        </div>
                    </Group>
                    <Group title="Acheteur (BT-44)" icon={Receipt} variant="orange">
                        <FormInput label="Nom" value={data.buyerName} onChange={(v:any)=>setData({...data, buyerName:v})} btId="44" required className="mb-3" themeColor="orange" />
                        <div className="grid grid-cols-2 gap-3">
                            <FormInput label="SIRET" value={data.buyerSiret} onChange={(v:any)=>setData({...data, buyerSiret:v})} btId="47" required themeColor="orange" />
                            <FormInput label="TVA" value={data.buyerVat} onChange={(v:any)=>setData({...data, buyerVat:v})} btId="48" themeColor="orange" />
                        </div>
                    </Group>
                </div>
                <Group title="Lignes de Facture (BG-25)" icon={Package} variant="slate">
                    <table className="w-full text-xs">
                        <thead className="bg-slate-50 text-[10px] uppercase text-slate-500 font-black"><tr><th className="px-3 py-2 text-left">Description</th><th className="px-3 py-2 text-right">Qté</th><th className="px-3 py-2 text-right">P.U</th><th className="px-3 py-2 text-right">HT</th></tr></thead>
                        <tbody>{data.items?.map((it, i) => (
                            <tr key={i}><td className="p-1"><input value={it.description} onChange={e=>handleUpdateItem(i, 'description', e.target.value)} className="w-full border p-1 rounded font-bold" /></td><td className="p-1"><input type="number" value={it.quantity||0} onChange={e=>handleUpdateItem(i, 'quantity', Number(e.target.value))} className="w-20 text-right border p-1 rounded font-black" /></td><td className="p-1"><input type="number" value={it.unitPrice||0} onChange={e=>handleUpdateItem(i, 'unitPrice', Number(e.target.value))} className="w-24 text-right border p-1 rounded font-black" /></td><td className="p-1 text-right font-black">{(it.amount||0).toFixed(2)} €</td></tr>
                        ))}</tbody>
                    </table>
                </Group>
                <div className="grid grid-cols-3 gap-5">
                    <Group title="Ventilation TVA (BG-23)" icon={Percent} variant="emerald">
                        {data.vatBreakdowns?.map((v, i) => (
                            <div key={i} className="flex justify-between p-2 bg-emerald-50 border border-emerald-100 rounded-lg mb-2">
                                <span className="text-[10px] font-black uppercase text-emerald-700">TVA {v.vatCategory} ({v.vatRate}%)</span>
                                <span className="font-mono text-[10px] font-black">{v.vatAmount.toFixed(2)} €</span>
                            </div>
                        ))}
                    </Group>
                    <div className="col-span-2 bg-slate-950 p-8 rounded-[2rem] text-white flex justify-between items-center shadow-xl">
                        <div><p className="text-[10px] font-black uppercase text-indigo-400 tracking-widest">NET À PAYER (BT-115)</p><h3 className="text-5xl font-black font-mono">{(data.amountDueForPayment || 0).toFixed(2)} <span className="text-xl opacity-30">{data.currency}</span></h3></div>
                        <div className="text-right space-y-1 opacity-50 text-[10px] font-black uppercase">
                            <p>Total HT: {(data.amountExclVat||0).toFixed(2)}</p>
                            <p>Total TVA: {(data.totalVat||0).toFixed(2)}</p>
                        </div>
                    </div>
                </div>
              </>
            ) : (
              <div className="bg-slate-900 h-full p-10 font-mono text-[11px] text-emerald-400 whitespace-pre overflow-auto"><pre>{generateFacturXXML(data)}</pre></div>
            )}
          </div>
        </div>

        <div className="px-10 py-4 border-t border-slate-200 flex justify-end items-center space-x-4 bg-white shrink-0">
          <button onClick={onClose} className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Retour</button>
          <button onClick={() => { onSave(data); onClose(); }} className="bg-slate-950 text-white px-12 py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-xl hover:bg-black flex items-center"><Save className="w-5 h-5 mr-3" /> Valider & Sauvegarder</button>
        </div>
      </div>
    </div>
  );
};
