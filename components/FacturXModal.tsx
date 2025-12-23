
import React, { useState, useEffect, useMemo } from 'react';
import { X, Save, CheckCircle, AlertTriangle, Download, Plus, Trash2, LayoutList, Truck, Receipt, Package, ShieldCheck, Globe, Briefcase, Landmark, Percent, Hash, Calendar as CalendarIcon, Coins, ChevronDown, Calculator, Info, FileCode, Eye, EyeOff, FileSearch, ExternalLink, Settings2, CloudLightning, Shield, Clock, CreditCard, StickyNote, Box, FileDown, FileCheck, Banknote, ListChecks, ShieldAlert, BadgeCheck } from 'lucide-react';
import { InvoiceData, InvoiceItem, InvoiceType, LookupTable, OperationCategory, TaxPointType, FacturXProfile } from '../types';
import { generateFacturXXML } from '../services/facturXService';

// --- Constants ---
const STANDARD_VAT_RATE = 20.0;

const COMMON_UNITS = [
  { code: 'C62', label: 'PCE (Pièce)' },
  { code: 'HUR', label: 'HUR (Heure)' },
  { code: 'DAY', label: 'DAY (Jour)' },
  { code: 'LTR', label: 'LTR (Litre)' },
  { code: 'KGM', label: 'KGM (Kilogramme)' },
  { code: 'MTQ', label: 'MTQ (Mètre Cube)' },
  { code: 'MTR', label: 'MTR (Mètre)' },
  { code: 'MTK', label: 'MTK (Mètre Carré)' },
  { code: 'ANN', label: 'ANN (Année)' },
  { code: 'MON', label: 'MON (Mois)' },
  { code: 'E48', label: 'E48 (Forfait / Service)' },
];

const FormInput = ({ label, value, onChange, type = "text", placeholder, btId, required, multiline, className = "", themeColor = "indigo", badge }: any) => {
  const colorMap: Record<string, string> = {
    indigo: "focus-within:border-indigo-600 focus-within:ring-indigo-600/10 text-slate-950 bg-slate-50",
    orange: "focus-within:border-orange-600 focus-within:ring-orange-600/10 text-slate-950 bg-slate-50",
    purple: "focus-within:border-purple-600 focus-within:ring-purple-600/10 text-slate-950 bg-slate-50",
    slate: "focus-within:border-slate-600 focus-within:ring-slate-600/10 text-slate-950 bg-slate-50",
    emerald: "focus-within:border-emerald-600 focus-within:ring-emerald-600/10 text-slate-950 bg-slate-50"
  };

  return (
    <div className={`flex flex-col space-y-1 ${className}`}>
      <div className="flex justify-between items-center px-1">
        <label className="text-[10px] font-black uppercase text-slate-700 tracking-wider">
          {label} {required && <span className="text-red-600 font-bold">*</span>}
        </label>
        <div className="flex space-x-2">
            {badge && badge}
            {btId && (
            <span className="text-[8px] font-mono font-bold bg-slate-200 px-1.5 py-0.5 rounded border border-slate-300 text-slate-600">
                {btId}
            </span>
            )}
        </div>
      </div>
      <div className={`relative flex items-center border-2 border-slate-300 rounded-xl overflow-hidden transition-all duration-200 group bg-white shadow-sm ${colorMap[themeColor] || colorMap.indigo}`}>
        {multiline ? (
          <textarea
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            rows={2}
            placeholder={placeholder}
            className="w-full px-3 py-2 text-sm bg-transparent outline-none text-slate-950 font-bold resize-none placeholder-slate-400"
          />
        ) : (
          <input
            type={type}
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="w-full px-3 py-2 text-sm bg-transparent outline-none text-slate-950 font-bold placeholder-slate-400"
          />
        )}
      </div>
    </div>
  );
};

const Group = ({ title, icon: Icon, children, actions, variant = "indigo", className = "" }: any) => {
  const variants: Record<string, string> = {
    indigo: "border-indigo-200 bg-white",
    orange: "border-orange-200 bg-white",
    purple: "border-purple-200 bg-white",
    slate: "border-slate-200 bg-white",
    emerald: "border-emerald-200 bg-white"
  };

  const iconColors: Record<string, string> = {
    indigo: "bg-indigo-600",
    orange: "bg-orange-600",
    purple: "bg-purple-600",
    slate: "bg-slate-700",
    emerald: "bg-emerald-600"
  };

  return (
    <div className={`rounded-[2rem] border-2 flex flex-col h-fit overflow-hidden transition-all duration-300 shadow-md ${variants[variant]} ${className}`}>
      <div className="px-5 py-3 bg-slate-100 border-b border-slate-200 flex justify-between items-center shrink-0">
        <div className="flex items-center space-x-3">
          {Icon && (
            <div className={`p-1.5 rounded-lg shadow-sm text-white ${iconColors[variant]}`}>
              <Icon className="w-3.5 h-3.5" />
            </div>
          )}
          <h3 className="text-[10px] font-black uppercase tracking-[0.1em] text-slate-800">{title}</h3>
        </div>
        {actions && <div className="flex space-x-2">{actions}</div>}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
};

export const FacturXModal: React.FC<{ 
  isOpen: boolean; 
  onClose: () => void; 
  invoice: InvoiceData; 
  onSave: (u: InvoiceData) => void; 
  lookupTables: LookupTable[];
  isAdmin?: boolean;
}> = ({ isOpen, onClose, invoice, onSave, lookupTables, isAdmin = true }) => {
  const [data, setData] = useState<InvoiceData>(() => ({ 
    ...invoice, 
    items: invoice.items || [],
    operationCategory: invoice.operationCategory || 'GOODS',
    taxPointType: invoice.taxPointType || 'DEBIT',
    facturXProfile: invoice.facturXProfile || FacturXProfile.COMFORT
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

  const handleDownloadPdf = () => {
    if (!pdfUrl) return;
    const link = document.createElement('a');
    link.href = pdfUrl;
    link.download = data.originalFilename || `facture_${data.invoiceNumber}.pdf`;
    link.click();
  };

  useEffect(() => {
    if (data.items) {
      const lineTotalHT = data.items.reduce((sum, item) => sum + (item.amount || 0), 0);
      const charge = data.globalCharge || 0;
      const discount = data.globalDiscount || 0;
      const taxBasisTotal = lineTotalHT + charge - discount;

      const mainTaxRate = data.items.length > 0 ? (data.items[0].taxRate || STANDARD_VAT_RATE) : STANDARD_VAT_RATE;
      const vatOnLines = data.items.reduce((sum, item) => sum + ((item.amount || 0) * (item.taxRate || 0) / 100), 0);
      const vatOnCharge = (charge * mainTaxRate / 100);
      const vatOnDiscount = (discount * mainTaxRate / 100);

      const totalVAT = vatOnLines + vatOnCharge - vatOnDiscount;
      const totalTTC = taxBasisTotal + totalVAT;

      if (Math.abs(taxBasisTotal - (data.amountExclVat || 0)) > 0.01 || Math.abs(totalTTC - (data.amountInclVat || 0)) > 0.01) {
          setData(prev => ({
              ...prev,
              amountExclVat: parseFloat(taxBasisTotal.toFixed(2)),
              totalVat: parseFloat(totalVAT.toFixed(2)),
              amountInclVat: parseFloat(totalTTC.toFixed(2))
          }));
      }
    }
  }, [data.items, data.globalCharge, data.globalDiscount]);

  const xml = useMemo(() => generateFacturXXML(data), [data]);

  const auditChecks = useMemo(() => {
    const checks = [
      { id: 'BT-1', label: 'N° Facture', status: !!data.invoiceNumber, mandatory: true },
      { id: 'BT-2', label: 'Date Facture', status: !!data.invoiceDate, mandatory: true },
      { id: 'BT-27', label: 'Nom Fournisseur', status: !!data.supplier, mandatory: true },
      { id: 'BT-29', label: 'SIRET Fournisseur', status: !!data.supplierSiret && data.supplierSiret.length >= 9, mandatory: true },
      { id: 'BT-44', label: 'Nom Acheteur', status: !!data.buyerName, mandatory: true },
      { id: 'BT-47', label: 'SIRET Acheteur', status: !!data.buyerSiret && data.buyerSiret.length >= 9, mandatory: true },
      { id: 'BG-25', label: 'Lignes extraites', status: (data.items?.length || 0) > 0, mandatory: true },
      { id: 'ARITH', label: 'Cohérence Totaux', status: Math.abs((data.amountInclVat || 0) - ((data.amountExclVat || 0) + (data.totalVat || 0))) < 0.05, mandatory: true },
    ];
    return checks;
  }, [data]);

  const handleUpdateItem = (idx: number, field: keyof InvoiceItem, value: any) => {
    const newItems = [...(data.items || [])];
    const item = { ...newItems[idx], [field]: value };
    
    if (['grossPrice', 'discount', 'quantity'].includes(field)) {
        const gross = parseFloat(String(item.grossPrice)) || 0;
        const disc = parseFloat(String(item.discount)) || 0;
        const q = parseFloat(String(item.quantity)) || 0;
        
        item.unitPrice = parseFloat((gross - disc).toFixed(4));
        item.amount = parseFloat((q * (item.unitPrice || 0)).toFixed(2));
    } else if (field === 'unitPrice') {
        const q = parseFloat(String(item.quantity)) || 0;
        const p = parseFloat(String(value)) || 0;
        item.amount = parseFloat((q * p).toFixed(2));
    }
    
    newItems[idx] = item;
    setData({ ...data, items: newItems });
  };

  const removeItem = (idx: number) => {
    const newItems = (data.items || []).filter((_, i) => i !== idx);
    setData(prev => ({ ...prev, items: newItems }));
  };

  const addItem = () => {
    setData(prev => ({ 
      ...prev, 
      items: [
        ...(prev.items || []), 
        { articleId: '', description: 'Nouvelle ligne', quantity: 1, unitOfMeasure: 'C62', grossPrice: 0, discount: 0, unitPrice: 0, amount: 0, taxRate: STANDARD_VAT_RATE }
      ] 
    }));
  };

  if (!isOpen) return null;

  const isMinimumProfile = data.facturXProfile === FacturXProfile.MINIMUM;

  return (
    <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-md flex items-center justify-center z-[100] p-4 lg:p-6">
      <div className="bg-white rounded-[3rem] shadow-[0_40px_120px_-20px_rgba(0,0,0,0.8)] w-full max-w-[1850px] h-[95vh] flex flex-col overflow-hidden border-4 border-slate-300">
        
        <div className="px-8 py-4 border-b-2 border-slate-200 flex justify-between items-center bg-white shrink-0">
          <div className="flex items-center space-x-6">
            <div className="bg-indigo-600 p-3 rounded-2xl text-white shadow-xl shadow-indigo-100">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-3">
                <h2 className="text-xl font-black text-slate-950 tracking-tight leading-none uppercase">Audit Form : Advanced Control</h2>
                {isAdmin && (
                  <span className="bg-indigo-600 text-white text-[8px] font-black px-2 py-0.5 rounded-full flex items-center tracking-[0.2em] shadow-lg">
                    <Shield className="w-2.5 h-2.5 mr-1" /> ROOT ACCESS
                  </span>
                )}
              </div>
              <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.3em] mt-2 flex items-center">
                 <Globe className="w-3 h-3 mr-2 text-indigo-600" /> Secure Synchronization Panel
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <button onClick={handleDownloadPdf} className="flex items-center space-x-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border-2 border-slate-300">
               <FileDown className="w-4 h-4" />
               <span>PDF Source</span>
            </button>
            <button onClick={() => setShowPdf(!showPdf)} className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border-2 ${showPdf ? 'bg-indigo-100 text-indigo-700 border-indigo-200' : 'bg-slate-100 text-slate-600 border-slate-300'}`}>
              {showPdf ? 'Masquer PDF' : 'Voir PDF'}
            </button>
            <div className="bg-slate-100 p-1 rounded-xl flex border-2 border-slate-300">
                <button onClick={() => setActiveTab('form')} className={`px-6 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'form' ? 'bg-white text-indigo-600 shadow-md' : 'text-slate-500 hover:text-slate-800'}`}>Audit Form</button>
                <button onClick={() => setActiveTab('xml')} className={`px-6 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'xml' ? 'bg-white text-indigo-600 shadow-md' : 'text-slate-500 hover:text-slate-800'}`}>XML Output</button>
            </div>
            <button onClick={onClose} className="p-2 text-slate-500 hover:text-red-600 transition-all rounded-full bg-slate-100 border-2 border-slate-300"><X className="w-8 h-8" /></button>
          </div>
        </div>

        <div className="flex-1 flex overflow-hidden bg-slate-200">
          {showPdf && pdfUrl && (
            <div className="hidden lg:flex flex-[0_0_40%] flex-col bg-slate-400 border-r-4 border-slate-300 relative animate-in slide-in-from-left duration-300 overflow-hidden">
              <iframe src={pdfUrl} className="w-full h-full border-none" title="PDF Viewer" />
            </div>
          )}

          <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col bg-slate-100 relative">
            {activeTab === 'form' ? (
              <div className="flex h-full">
                {/* Main Content Scroll Area */}
                <div className="flex-1 p-8 space-y-8 overflow-y-auto">
                    
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                      <Group title="Concordance Master Hub" icon={CloudLightning} variant="purple" className="lg:col-span-4 h-full">
                          <div className="space-y-4">
                            <div className={`p-4 rounded-2xl border-2 flex items-center space-x-4 ${data.isMasterMatched ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'}`}>
                                <div className={`p-2 rounded-xl text-white ${data.isMasterMatched ? 'bg-emerald-600' : 'bg-amber-600'}`}>
                                  {data.isMasterMatched ? <CheckCircle className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
                                </div>
                                <div>
                                  <p className="text-[10px] font-black uppercase text-slate-950 tracking-wider leading-none">
                                      {data.isMasterMatched ? 'ERP Match : Synchronized' : 'Unmapped Tiers Profile'}
                                    </p>
                                  <p className="text-[8px] font-black text-slate-600 mt-1 uppercase">Source: {data.isMasterMatched ? 'Sage X3 Referent' : 'AI Analysis'}</p>
                                </div>
                            </div>
                            <FormInput label="Code Tiers ERP" value={data.supplierErpCode} onChange={(v:any)=>setData({...data, supplierErpCode:v})} themeColor="purple" badge={data.isMasterMatched && <span className="bg-emerald-600 text-white px-1.5 py-0.5 rounded text-[7px] font-black uppercase">Verified</span>} />
                          </div>
                      </Group>

                      <Group title="Structure & Références Documentaires" icon={LayoutList} variant="slate" className="lg:col-span-8 h-full">
                          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                            <FormInput label="N° Facture" value={data.invoiceNumber} onChange={(v:any)=>setData({...data, invoiceNumber:v})} btId="BT-1" required themeColor="slate" />
                            <FormInput label="Date Document" value={data.invoiceDate} onChange={(v:any)=>setData({...data, invoiceDate:v})} btId="BT-2" required themeColor="slate" />
                            <FormInput label="Devise" value={data.currency} onChange={(v:any)=>setData({...data, currency:v.toUpperCase()})} btId="BT-5" themeColor="slate" />
                            <FormInput label="Profil Factur-X" value={data.facturXProfile} onChange={(v:any)=>setData({...data, facturXProfile:v})} btId="BT-1" themeColor="slate" />
                          </div>
                          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
                            <FormInput label="N° Commande (PO)" value={data.poNumber} onChange={(v:any)=>setData({...data, poNumber:v})} btId="BT-13" themeColor="slate" />
                            <FormInput label="Référence Client" value={data.buyerReference} onChange={(v:any)=>setData({...data, buyerReference:v})} btId="BT-10" themeColor="slate" />
                            <FormInput label="N° Contrat" value={data.contractNumber} onChange={(v:any)=>setData({...data, contractNumber:v})} btId="BT-12" themeColor="slate" />
                            <FormInput label="Réf Projet" value={data.projectReference} onChange={(v:any)=>setData({...data, projectReference:v})} btId="BT-11" themeColor="slate" />
                          </div>
                      </Group>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <Group title="Émetteur (Fournisseur - BG-4)" icon={Truck} variant="indigo">
                          <FormInput label="Raison Sociale" value={data.supplier} onChange={(v:any)=>setData({...data, supplier:v})} btId="BT-27" required className="mb-4" themeColor="indigo" />
                          <div className="grid grid-cols-2 gap-4 mb-4">
                            <FormInput label="SIRET" value={data.supplierSiret} onChange={(v:any)=>setData({...data, supplierSiret:v})} btId="BT-29" required themeColor="indigo" />
                            <FormInput label="TVA Intracom." value={data.supplierVat} onChange={(v:any)=>setData({...data, supplierVat:v})} btId="BT-31" required themeColor="indigo" />
                          </div>
                          <FormInput label="Adresse du Siège" value={data.supplierAddress} onChange={(v:any)=>setData({...data, supplierAddress:v})} btId="BG-5" multiline themeColor="indigo" />
                      </Group>
                      <Group title="Destinataire (Acheteur - BG-7)" icon={Receipt} variant="orange">
                          <FormInput label="Raison Sociale Client" value={data.buyerName} onChange={(v:any)=>setData({...data, buyerName:v})} btId="BT-44" required className="mb-4" themeColor="orange" />
                          <div className="grid grid-cols-2 gap-4 mb-4">
                            <FormInput label="SIRET Acheteur" value={data.buyerSiret} onChange={(v:any)=>setData({...data, buyerSiret:v})} btId="BT-47" required themeColor="orange" />
                            <FormInput label="TVA Acheteur" value={data.buyerVat} onChange={(v:any)=>setData({...data, buyerVat:v})} btId="BT-48" themeColor="orange" />
                          </div>
                          <FormInput label="Adresse de Facturation" value={data.buyerAddress} onChange={(v:any)=>setData({...data, buyerAddress:v})} btId="BG-8" multiline themeColor="orange" />
                      </Group>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                      <Group title="Logistique & Périodes (BG-13)" icon={Box} variant="slate" className="lg:col-span-7">
                        <div className="grid grid-cols-2 gap-4">
                          <FormInput label="N° Bon de Livraison" value={data.deliveryNoteNumber} onChange={(v:any)=>setData({...data, deliveryNoteNumber:v})} btId="BT-16" themeColor="slate" />
                          <FormInput label="Date Livraison Effective" value={data.deliveryDate} onChange={(v:any)=>setData({...data, deliveryDate:v})} btId="BT-72" themeColor="slate" />
                          <FormInput label="Fait Générateur (Point Taxe)" value={data.taxPointDate} onChange={(v:any)=>setData({...data, taxPointDate:v})} btId="BT-3" themeColor="slate" />
                          <div className="grid grid-cols-2 gap-2">
                            <FormInput label="Période Début" value={data.billingPeriodStart} onChange={(v:any)=>setData({...data, billingPeriodStart:v})} btId="BT-73" themeColor="slate" />
                            <FormInput label="Période Fin" value={data.billingPeriodEnd} onChange={(v:any)=>setData({...data, billingPeriodEnd:v})} btId="BT-74" themeColor="slate" />
                          </div>
                        </div>
                      </Group>
                      <Group title="Notes de Document (BT-22)" icon={StickyNote} variant="indigo" className="lg:col-span-5">
                        <FormInput label="Commentaires Libres" value={data.notes} onChange={(v:any)=>setData({...data, notes:v})} btId="BT-22" multiline className="h-full" themeColor="indigo" placeholder="Observations internes, conditions de règlement spécifiques..." />
                      </Group>
                    </div>

                    <Group 
                      title="Lignes de Facturation (BG-25)" 
                      icon={Package} 
                      variant="slate"
                      className={`${isMinimumProfile ? "opacity-40 grayscale" : ""} w-full`}
                      actions={!isMinimumProfile && <button onClick={addItem} className="bg-slate-900 text-white px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg hover:bg-black transition-all">Ajouter Ligne</button>}
                    >
                      <div className="w-full rounded-2xl border-2 border-slate-300 overflow-x-auto shadow-inner bg-white custom-scrollbar">
                        <table className="w-full text-[11px] border-collapse min-w-[1200px]">
                          <thead className="bg-slate-100 text-[10px] font-black uppercase text-slate-800 border-b-2 border-slate-300 sticky top-0 z-10">
                            <tr>
                              <th className="px-3 py-3 text-left w-32">Référence</th>
                              <th className="px-3 py-3 text-left">Désignation</th>
                              <th className="px-3 py-3 text-right w-20">Qté</th>
                              <th className="px-3 py-3 text-left w-28">Unité</th>
                              <th className="px-3 py-3 text-right w-28">P.U Brut</th>
                              <th className="px-3 py-3 text-right w-24">Remise</th>
                              <th className="px-3 py-3 text-right w-28 bg-indigo-50">P.U Net</th>
                              <th className="px-3 py-3 text-right w-20">TVA%</th>
                              <th className="px-3 py-3 text-right w-32 bg-slate-200">Montant HT</th>
                              <th className="w-12"></th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200">
                            {(data.items || []).map((item, idx) => (
                              <tr key={idx} className="hover:bg-slate-50 transition-colors group">
                                <td className="p-2">
                                  <input 
                                    value={item.articleId} 
                                    onChange={e=>handleUpdateItem(idx, 'articleId', e.target.value)} 
                                    className="w-full bg-slate-50 border-2 border-slate-200 rounded-lg px-2 py-1.5 outline-none font-mono text-[10px] font-black text-slate-950 focus:bg-white focus:border-indigo-600 transition-all" 
                                  />
                                </td>
                                <td className="p-2">
                                  <input 
                                    value={item.description} 
                                    onChange={e=>handleUpdateItem(idx, 'description', e.target.value)} 
                                    className="w-full bg-slate-50 border-2 border-slate-200 rounded-lg px-2 py-1.5 outline-none font-black text-slate-950 focus:bg-white focus:border-indigo-600 transition-all" 
                                  />
                                </td>
                                <td className="p-2">
                                  <input 
                                    type="number" 
                                    value={item.quantity || ''} 
                                    onChange={e=>handleUpdateItem(idx, 'quantity', parseFloat(e.target.value))} 
                                    className="w-full text-right bg-slate-50 border-2 border-slate-200 rounded-lg px-2 py-1.5 outline-none font-black text-slate-950 focus:bg-white focus:border-indigo-600 transition-all" 
                                  />
                                </td>
                                <td className="p-2">
                                  <select 
                                    value={item.unitOfMeasure || 'C62'} 
                                    onChange={e=>handleUpdateItem(idx, 'unitOfMeasure', e.target.value)} 
                                    className="w-full bg-slate-50 border-2 border-slate-200 rounded-lg px-2 py-1.5 outline-none font-black text-slate-950 focus:bg-white focus:border-indigo-600 transition-all"
                                  >
                                    {COMMON_UNITS.map(u => (
                                      <option key={u.code} value={u.code}>{u.label}</option>
                                    ))}
                                  </select>
                                </td>
                                <td className="p-2">
                                  <input 
                                    type="number" 
                                    value={item.grossPrice || ''} 
                                    onChange={e=>handleUpdateItem(idx, 'grossPrice', parseFloat(e.target.value))} 
                                    className="w-full text-right bg-slate-50 border-2 border-slate-200 rounded-lg px-2 py-1.5 outline-none font-black text-slate-950 focus:bg-white focus:border-indigo-600 transition-all" 
                                  />
                                </td>
                                <td className="p-2">
                                  <input 
                                    type="number" 
                                    value={item.discount || ''} 
                                    onChange={e=>handleUpdateItem(idx, 'discount', parseFloat(e.target.value))} 
                                    className="w-full text-right bg-rose-50 border-2 border-rose-100 rounded-lg px-2 py-1.5 outline-none text-rose-900 font-black focus:bg-white focus:border-indigo-600 transition-all" 
                                  />
                                </td>
                                <td className="p-2 bg-indigo-50/50">
                                  <input 
                                    type="number" 
                                    value={item.unitPrice || ''} 
                                    onChange={e=>handleUpdateItem(idx, 'unitPrice', parseFloat(e.target.value))} 
                                    className="w-full text-right bg-transparent border-2 border-indigo-200 rounded-lg px-2 py-1.5 outline-none text-indigo-900 font-black focus:bg-white focus:border-indigo-600 transition-all" 
                                  />
                                </td>
                                <td className="p-2">
                                  <input 
                                    type="number" 
                                    value={item.taxRate || ''} 
                                    onChange={e=>handleUpdateItem(idx, 'taxRate', parseFloat(e.target.value))} 
                                    className="w-full text-right bg-slate-50 border-2 border-slate-200 rounded-lg px-2 py-1.5 outline-none font-black text-slate-950 focus:bg-white focus:border-indigo-600 transition-all" 
                                  />
                                </td>
                                <td className="p-2 text-right font-black font-mono text-slate-950 bg-slate-100">{(item.amount || 0).toFixed(2)}</td>
                                <td className="p-2 text-center">
                                  <button 
                                    onClick={() => removeItem(idx)} 
                                    className="text-slate-400 hover:text-red-600 p-2 hover:bg-red-100 rounded-lg transition-all"
                                    title="Supprimer la ligne"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </td>
                              </tr>
                            ))}
                            {(!data.items || data.items.length === 0) && (
                              <tr>
                                <td colSpan={10} className="px-4 py-8 text-center text-slate-400 font-black uppercase tracking-widest bg-slate-50 italic">Aucune donnée de ligne extraite</td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </Group>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <Group title="Informations de Paiement (BG-16)" icon={Landmark} variant="slate">
                            <div className="space-y-4">
                              <FormInput label="IBAN du bénéficiaire" value={data.iban} onChange={(v:any)=>setData({...data, iban:v.replace(/\s/g, "")})} btId="BT-84" themeColor="slate" badge={data.isMasterMatched && <span className="bg-emerald-600 text-white px-1.5 py-0.5 rounded text-[7px] font-black uppercase">ERP SYNC</span>} />
                              <div className="grid grid-cols-2 gap-3">
                                <FormInput label="BIC / SWIFT" value={data.bic} onChange={(v:any)=>setData({...data, bic:v})} btId="BT-85" themeColor="slate" />
                                <FormInput label="Code Moyen UN" value={data.paymentMeansCode} onChange={(v:any)=>setData({...data, paymentMeansCode:v})} btId="BT-81" themeColor="slate" />
                              </div>
                              <FormInput label="Référence du Virement" value={data.paymentReference} onChange={(v:any)=>setData({...data, paymentReference:v})} btId="BT-83" themeColor="slate" />
                            </div>
                        </Group>
                        <Group title="Ajustements Globaux (BG-20)" icon={Percent} variant="slate">
                            <div className="space-y-4">
                              <FormInput label="Remise Globale HT" value={data.globalDiscount} onChange={(v:any)=>setData({...data, globalDiscount: parseFloat(v) || 0})} btId="BT-107" themeColor="slate" />
                              <FormInput label="Frais Logistique HT" value={data.globalCharge} onChange={(v:any)=>setData({...data, globalCharge: parseFloat(v) || 0})} btId="BT-108" themeColor="slate" />
                              <FormInput label="Mode de Paiement" value={data.paymentMethod} onChange={(v:any)=>setData({...data, paymentMethod:v})} btId="BT-82" themeColor="slate" />
                              <FormInput label="Date Échéance Limite" value={data.dueDate} onChange={(v:any)=>setData({...data, dueDate:v})} btId="BT-9" themeColor="slate" />
                            </div>
                        </Group>
                        
                        <div className="bg-slate-900 text-white p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden flex flex-col justify-center h-full border-4 border-slate-700">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600/20 rounded-full blur-[100px] -mr-32 -mt-32"></div>
                            <div className="space-y-5 relative z-10">
                              <div className="flex justify-between items-center text-[11px] font-black uppercase text-slate-400 tracking-widest">
                                <span>Base HT Taxable</span>
                                <span className="font-mono text-xl text-white">{(data.amountExclVat || 0).toFixed(2)}</span>
                              </div>
                              <div className="flex justify-between items-center text-[11px] font-black uppercase text-indigo-400 tracking-widest">
                                <span>Consolidation TVA (BG-23)</span>
                                <span className="font-mono text-xl text-indigo-400">{(data.totalVat || 0).toFixed(2)}</span>
                              </div>
                              <div className="h-0.5 bg-white/10 my-4"></div>
                              <div className="flex flex-col">
                                <span className="text-[11px] font-black uppercase text-slate-400 tracking-[0.4em] mb-3">Montant Net à Payer</span>
                                <div className="flex items-baseline space-x-3">
                                  <span className="text-5xl font-black font-mono tracking-tighter text-white">{(data.amountInclVat || 0).toFixed(2)}</span>
                                  <span className="text-xl opacity-50 font-bold">{data.currency}</span>
                                </div>
                              </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Audit Sidebar - Right */}
                <div className="w-80 bg-white border-l-2 border-slate-200 shrink-0 h-full p-6 space-y-6 flex flex-col">
                  <div className="flex items-center space-x-3 mb-2">
                    <div className="p-2 bg-slate-900 rounded-xl text-white">
                      <ListChecks className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-[11px] font-black uppercase text-slate-900 tracking-widest">Analyse de Conformité</h4>
                      <p className="text-[9px] font-black text-slate-400 uppercase">Factur-X / Sage X3 Match</p>
                    </div>
                  </div>

                  <div className="space-y-4 flex-1 overflow-y-auto pr-2 custom-scrollbar">
                    {auditChecks.map((check) => (
                      <div key={check.id} className={`p-4 rounded-2xl border-2 flex items-start space-x-3 transition-all ${check.status ? 'bg-emerald-50 border-emerald-100' : 'bg-rose-50 border-rose-100 animate-pulse'}`}>
                        <div className={`mt-0.5 p-1 rounded-md text-white ${check.status ? 'bg-emerald-500' : 'bg-rose-500'}`}>
                          {check.status ? <BadgeCheck className="w-3.5 h-3.5" /> : <ShieldAlert className="w-3.5 h-3.5" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-center">
                            <p className={`text-[10px] font-black uppercase tracking-tight ${check.status ? 'text-emerald-700' : 'text-rose-700'}`}>{check.label}</p>
                            <span className="text-[8px] font-mono font-bold px-1.5 py-0.5 rounded bg-white/50 border border-black/5">{check.id}</span>
                          </div>
                          <p className={`text-[9px] mt-1 font-bold ${check.status ? 'text-emerald-600/70' : 'text-rose-600/70'}`}>
                            {check.status ? 'Donnée validée' : 'Information manquante'}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="pt-6 border-t-2 border-slate-100 space-y-4">
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                      <div className="flex justify-between items-center text-[9px] font-black uppercase text-slate-500 mb-2">
                        <span>Items Control</span>
                        <span>{(data.items?.length || 0)} / {(data.items?.length || 0)} OK</span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500 w-full"></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-slate-900 h-full p-12 overflow-hidden flex flex-col shadow-inner">
                 <div className="flex-1 bg-black/60 rounded-3xl p-10 font-mono text-xs text-emerald-400 overflow-y-auto custom-scrollbar border-2 border-slate-700 shadow-2xl">
                    <pre className="selection:bg-emerald-500/30">{xml}</pre>
                 </div>
              </div>
            )}
          </div>
        </div>

        <div className="px-10 py-6 border-t-2 border-slate-200 flex justify-end items-center space-x-4 bg-slate-50 shrink-0">
          <button onClick={onClose} className="text-[10px] font-black text-slate-600 uppercase tracking-widest hover:text-slate-950 transition-colors">Abandonner Modifications</button>
          <button onClick={() => { onSave(data); onClose(); }} className="bg-slate-950 text-white px-10 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-2xl hover:bg-black transition-all flex items-center active:scale-95">
            <FileCheck className="w-5 h-5 mr-3" /> Valider Audit & Sauvegarder
          </button>
        </div>
      </div>
    </div>
  );
};
