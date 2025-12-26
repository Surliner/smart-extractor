
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { UploadCloud, Loader2, Cpu, LogOut, Settings, Zap, Users, CloudLightning, ShieldCheck, Inbox, Archive } from 'lucide-react';
import { extractInvoiceData } from './services/geminiService';
import { dbService } from './services/databaseService';
import { InvoiceData, ErpStatus, ProcessingLog, ErpConfig, UserProfile, UserRole, PartnerMasterData, LookupTable, ExportTemplate, XmlMappingProfile } from './types';
import { ProcessingLogs } from './components/ProcessingLogs';
import { InvoiceTable } from './components/InvoiceTable';
import { LoginScreen } from './components/LoginScreen';
import { ConfigurationModal } from './components/ConfigurationModal';
import { UserManagement } from './components/UserManagement';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<string | null>(localStorage.getItem('invoice-session-active-user'));
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [allInvoices, setAllInvoices] = useState<InvoiceData[]>([]);
  const [logs, setLogs] = useState<ProcessingLog[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showConfig, setShowConfig] = useState(false);
  const [showUserMgmt, setShowUserMgmt] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processProgress, setProcessProgress] = useState({ current: 0, total: 0 });
  const [isInitializing, setIsInitializing] = useState(true);
  const [viewMode, setViewMode] = useState<'ACTIVE' | 'ARCHIVED'>('ACTIVE');
  
  const [erpConfig, setErpConfig] = useState<ErpConfig>({ apiUrl: '', apiKey: '', enabled: false });
  const [masterData, setMasterData] = useState<PartnerMasterData[]>([]);
  const [lookupTables, setLookupTables] = useState<LookupTable[]>([]);
  const [templates, setTemplates] = useState<ExportTemplate[]>([]);
  const [xmlProfiles, setXmlProfiles] = useState<XmlMappingProfile[]>([]);

  useEffect(() => {
    const initSession = async () => {
      if (currentUser) {
        try {
          const profile = await dbService.getSessionProfile(currentUser);
          await applyProfileData(profile);
        } catch (e) {
          console.error("Session re-hydration failed:", e);
          handleLogout();
        }
      }
      setIsInitializing(false);
    };
    initSession();
  }, []);

  const applyProfileData = async (profile: UserProfile) => {
    setUserProfile(profile);
    const cfg = profile.companyConfig || {};
    setErpConfig(cfg.erpConfig || { apiUrl: '', apiKey: '', enabled: false });
    setMasterData(cfg.masterData || []);
    setLookupTables(cfg.lookupTables || []);
    setTemplates(cfg.templates || []);
    setXmlProfiles(cfg.xmlProfiles || []);

    try {
      const [invoices, userLogs] = await Promise.all([
        dbService.getInvoices(profile.companyId),
        dbService.getLogs(profile.username)
      ]);
      setAllInvoices(invoices);
      setLogs(userLogs);
    } catch (e) {
      console.error("Failed to fetch session data:", e);
    }
  };

  const handleLogin = async (profile: UserProfile) => {
    setCurrentUser(profile.username);
    localStorage.setItem('invoice-session-active-user', profile.username);
    await applyProfileData(profile);
  };

  const syncConfigToCloud = useCallback(async () => {
    if (!userProfile) return;
    const config = { erpConfig, masterData, lookupTables, templates, xmlProfiles };
    await dbService.saveCompanyConfig(userProfile.companyId, config);
    setUserProfile(prev => prev ? { ...prev, companyConfig: config } : null);
  }, [userProfile, erpConfig, masterData, lookupTables, templates, xmlProfiles]);

  const handleLogout = () => {
    localStorage.removeItem('invoice-session-active-user');
    setCurrentUser(null);
    setUserProfile(null);
    setAllInvoices([]);
    setLogs([]);
  };

  const handleInvoiceUpdate = async (id: string, updates: Partial<InvoiceData>) => {
    if (!userProfile) return;
    setAllInvoices(prev => {
      const newInvoices = prev.map(inv => inv.id === id ? { ...inv, ...updates } : inv);
      const updatedInvoice = newInvoices.find(i => i.id === id);
      if (updatedInvoice) {
        const payload = { ...updatedInvoice, owner: userProfile.username, companyId: userProfile.companyId };
        dbService.saveInvoice(payload).catch(e => console.error("Persistence error:", e));
      }
      return newInvoices;
    });
  };

  const handleDeleteInvoices = async (ids: string[]) => {
    try {
      await dbService.deleteInvoices(ids);
      setAllInvoices(prev => prev.filter(inv => !ids.includes(inv.id)));
      setSelectedIds(new Set());
      addLog(`${ids.length} facture(s) supprimée(s)`, 'warning');
    } catch (e: any) {
      alert("Erreur lors de la suppression : " + e.message);
    }
  };

  const handleArchiveInvoices = async (ids: string[], archived: boolean) => {
    try {
      await dbService.archiveInvoices(ids, archived);
      setAllInvoices(prev => prev.map(inv => ids.includes(inv.id) ? { ...inv, isArchived: archived } : inv));
      setSelectedIds(new Set());
      addLog(`${ids.length} facture(s) ${archived ? 'archivée(s)' : 'désarchivée(s)'}`, 'info');
    } catch (e: any) {
      alert("Erreur lors de l'archivage : " + e.message);
    }
  };

  const processFiles = async (files: FileList | null) => {
    if (!files || !userProfile) return;
    setIsProcessing(true);
    setProcessProgress({ current: 0, total: files.length });
    for (const file of Array.from(files)) {
      try {
        const base64Data = await new Promise<string>((resolve) => {
          const reader = new FileReader(); 
          reader.onload = () => resolve((reader.result as string).split(',')[1]); 
          reader.readAsDataURL(file);
        });
        const result = await extractInvoiceData(base64Data, file.type, file.name, 'ULTIMATE', 'INBOUND', userProfile.companyId, true);
        const inv = { ...result.invoice, owner: userProfile.username, companyId: userProfile.companyId, extractedAt: new Date().toISOString() };
        await dbService.saveInvoice(inv);
        await dbService.updateUserStats(userProfile.username, result.usage.totalTokens);
        setAllInvoices(prev => [inv, ...prev]);
        await addLog(`Facture ${inv.invoiceNumber} extraite (${result.usage.totalTokens} tokens utilisés)`, 'success');
      } catch (err: any) {
        await addLog(`Erreur : ${file.name} - ${err.message}`, 'error');
      } finally {
        setProcessProgress(prev => ({ ...prev, current: prev.current + 1 }));
      }
    }
    setIsProcessing(false);
  };

  const addLog = async (message: string, type: ProcessingLog['type'] = 'info') => {
    if (!userProfile) return;
    await dbService.saveLog(userProfile.username, message, type);
    const newLogs = await dbService.getLogs(userProfile.username);
    setLogs(newLogs);
  };

  const filteredInvoices = useMemo(() => {
    return allInvoices.filter(inv => viewMode === 'ARCHIVED' ? inv.isArchived : !inv.isArchived);
  }, [allInvoices, viewMode]);

  if (isInitializing) {
    return <div className="min-h-screen bg-slate-950 flex items-center justify-center"><Loader2 className="w-12 h-12 text-indigo-500 animate-spin" /></div>;
  }

  if (!currentUser || !userProfile) return <LoginScreen onLogin={handleLogin} users={allUsers} onRegister={() => {}} onResetPassword={() => {}} />;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans pb-24">
      <header className="bg-slate-950 px-8 h-20 flex items-center justify-between sticky top-0 z-50 shadow-xl border-b border-white/5">
        <div className="flex items-center space-x-6">
          <div className="bg-indigo-600 p-2.5 rounded-xl text-white shadow-lg shadow-indigo-500/20"><Cpu className="w-6 h-6" /></div>
          <div><h1 className="text-xl font-black text-white tracking-[0.2em] uppercase">Invoice Command</h1><div className="flex items-center space-x-2 mt-0.5"><span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">{userProfile?.companyName}</span></div></div>
        </div>
        <div className="flex items-center space-x-4">
          {(userProfile?.role === 'ADMIN' || userProfile?.role === 'SUPER_ADMIN') && (
            <button onClick={() => setShowUserMgmt(true)} className="flex items-center space-x-3 px-5 py-2.5 bg-indigo-600/10 text-indigo-400 hover:bg-indigo-600 hover:text-white rounded-2xl border border-indigo-600/20 transition-all font-black uppercase text-[10px] tracking-widest"><Users className="w-5 h-5" /><span>{userProfile?.role === 'SUPER_ADMIN' ? 'SaaS Portal' : 'Gestion Tiers'}</span></button>
          )}
          <button onClick={() => setShowConfig(true)} className="p-3 bg-white/5 text-slate-400 hover:text-white rounded-2xl border border-white/10 hover:bg-white/10 transition-all"><Settings className="w-6 h-6" /></button>
          <button onClick={handleLogout} className="p-3 bg-white/5 text-slate-400 hover:text-rose-500 rounded-2xl border border-white/10 hover:bg-rose-500/10 transition-all"><LogOut className="w-6 h-6" /></button>
        </div>
      </header>

      <main className="max-w-[1700px] mx-auto px-10 py-10 space-y-10">
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-10">
          <div className="xl:col-span-9 space-y-10">
            <div onClick={() => !isProcessing && document.getElementById('f-up')?.click()} className={`bg-white rounded-[3rem] border-4 border-dashed p-16 flex flex-col items-center justify-center text-center space-y-8 transition-all cursor-pointer hover:border-indigo-400 hover:bg-indigo-50/20 ${isProcessing ? 'opacity-50 pointer-events-none' : 'border-slate-100 shadow-sm'}`}>
              <input id="f-up" type="file" multiple accept="application/pdf" onChange={(e) => processFiles(e.target.files)} className="hidden" />
              <div className="p-8 bg-indigo-600 rounded-[2.5rem] shadow-2xl text-white">{isProcessing ? <Loader2 className="w-12 h-12 animate-spin" /> : <UploadCloud className="w-12 h-12" />}</div>
              <div><h2 className="text-3xl font-black text-slate-950 tracking-tight">{isProcessing ? `Extraction en cours...` : 'Déposez vos factures PDF'}</h2><p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest mt-2">Partition client : {userProfile?.companyName}</p></div>
            </div>

            <div className="flex items-center space-x-4 mb-2">
                <button onClick={() => setViewMode('ACTIVE')} className={`flex items-center space-x-2 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'ACTIVE' ? 'bg-slate-900 text-white shadow-xl' : 'bg-white border border-slate-200 text-slate-400 hover:bg-slate-50'}`}><Inbox className="w-4 h-4" /><span>Actives ({allInvoices.filter(i => !i.isArchived).length})</span></button>
                <button onClick={() => setViewMode('ARCHIVED')} className={`flex items-center space-x-2 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'ARCHIVED' ? 'bg-slate-900 text-white shadow-xl' : 'bg-white border border-slate-200 text-slate-400 hover:bg-slate-50'}`}><Archive className="w-4 h-4" /><span>Archives ({allInvoices.filter(i => i.isArchived).length})</span></button>
            </div>

            <InvoiceTable 
              invoices={filteredInvoices} 
              selectedIds={selectedIds}
              isArchiveView={viewMode === 'ARCHIVED'}
              onToggleSelection={(id) => setSelectedIds(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; })}
              onToggleAll={() => setSelectedIds(selectedIds.size === filteredInvoices.length ? new Set() : new Set(filteredInvoices.map(i => i.id)))}
              onUpdate={handleInvoiceUpdate}
              onDeleteInvoices={handleDeleteInvoices}
              onArchiveInvoices={handleArchiveInvoices}
              onSyncInvoices={() => {}}
              lookupTables={lookupTables}
              templates={templates}
              xmlProfiles={xmlProfiles}
              masterData={masterData}
            />
          </div>
          <div className="xl:col-span-3"><ProcessingLogs logs={logs} /></div>
        </div>
      </main>

      <ConfigurationModal isOpen={showConfig} onClose={() => { syncConfigToCloud(); setShowConfig(false); }} erpConfig={erpConfig} onSaveErp={setErpConfig} lookupTables={lookupTables} onSaveLookups={setLookupTables} templates={templates} onSaveTemplates={setTemplates} xmlProfiles={xmlProfiles} onSaveXmlProfiles={setXmlProfiles} masterData={masterData} onSaveMasterData={setMasterData} />
      {userProfile && <UserManagement isOpen={showUserMgmt} onClose={() => setShowUserMgmt(false)} users={allUsers} currentUser={userProfile.username} currentUserCompanyId={userProfile.companyId} userRole={userProfile.role} onUpdateRole={() => {}} onDeleteUser={() => {}} onResetPassword={() => {}} />}
    </div>
  );
};

export default App;
