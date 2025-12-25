
import React, { useState, useEffect, useCallback } from 'react';
import { UploadCloud, Loader2, Cpu, LogOut, Settings, Zap, Users, CloudLightning, ShieldCheck } from 'lucide-react';
import { extractInvoiceData } from './services/geminiService';
import { dbService } from './services/databaseService';
import { InvoiceData, ErpStatus, ProcessingLog, ErpConfig, UserProfile, UserRole, PartnerMasterData, LookupTable, ExportTemplate, XmlMappingProfile } from './types';
import { ProcessingLogs } from './components/ProcessingLogs';
import { InvoiceTable } from './components/InvoiceTable';
import { LoginScreen } from './components/LoginScreen';
import { ConfigurationModal } from './components/ConfigurationModal';
import { UserManagement } from './components/UserManagement';

const createDedupKey = (supplier: string, invoiceNumber: string) => {
  const normSupplier = supplier.toLowerCase().replace(/[^a-z0-9]/g, '');
  const normInvNum = invoiceNumber.toLowerCase().replace(/[^a-z0-9]/g, '');
  return `${normInvNum}_${normSupplier}`;
};

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
  
  // Settings synchronisés
  const [erpConfig, setErpConfig] = useState<ErpConfig>({ apiUrl: '', apiKey: '', enabled: false });
  const [masterData, setMasterData] = useState<PartnerMasterData[]>([]);
  const [lookupTables, setLookupTables] = useState<LookupTable[]>([]);
  const [templates, setTemplates] = useState<ExportTemplate[]>([]);
  const [xmlProfiles, setXmlProfiles] = useState<XmlMappingProfile[]>([]);

  // Initialisation Multi-tenant
  useEffect(() => {
    if (currentUser && !userProfile) {
        // En cas de refresh, on demande à l'utilisateur de se reconnecter pour recharger son profil complet
    }
  }, [currentUser, userProfile]);

  const handleLogin = (profile: UserProfile) => {
    setUserProfile(profile);
    setCurrentUser(profile.username);
    localStorage.setItem('invoice-session-active-user', profile.username);
    
    // Charger la config entreprise
    const cfg = profile.companyConfig || {};
    setErpConfig(cfg.erpConfig || { apiUrl: '', apiKey: '', enabled: false });
    setMasterData(cfg.masterData || []);
    setLookupTables(cfg.lookupTables || []);
    setTemplates(cfg.templates || []);
    setXmlProfiles(cfg.xmlProfiles || []);

    // Charger les factures
    dbService.getInvoices(profile.username).then(setAllInvoices);
  };

  const syncConfigToCloud = useCallback(async () => {
    if (!userProfile) return;
    const config = { erpConfig, masterData, lookupTables, templates, xmlProfiles };
    await dbService.saveCompanyConfig(userProfile.companyId, config);
  }, [userProfile, erpConfig, masterData, lookupTables, templates, xmlProfiles]);

  const handleLogout = () => {
    localStorage.removeItem('invoice-session-active-user');
    setCurrentUser(null);
    setUserProfile(null);
    setAllInvoices([]);
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
        const inv = { ...result.invoice, owner: userProfile.username, companyId: userProfile.companyId };
        
        setAllInvoices(prev => [inv, ...prev]);
        await dbService.saveInvoice(inv);
        addLog(`Facture extraite : ${inv.invoiceNumber}`, 'success');
      } catch (err: any) {
        addLog(`Erreur : ${file.name} - ${err.message}`, 'error');
      } finally {
        setProcessProgress(prev => ({ ...prev, current: prev.current + 1 }));
      }
    }
    setIsProcessing(false);
  };

  const addLog = (message: string, type: ProcessingLog['type'] = 'info') => {
    setLogs(prev => [...prev, { id: crypto.randomUUID(), timestamp: new Date(), message, type }]);
  };

  if (!currentUser) return (
    <LoginScreen 
      onLogin={handleLogin} 
      users={allUsers} 
      onRegister={() => {}} 
      onResetPassword={() => {}} 
    />
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans pb-24">
      <header className="bg-slate-950 px-8 h-20 flex items-center justify-between sticky top-0 z-50 shadow-xl border-b border-white/5">
        <div className="flex items-center space-x-6">
          <div className="bg-indigo-600 p-2.5 rounded-xl text-white shadow-lg"><Cpu className="w-6 h-6" /></div>
          <div>
            <h1 className="text-xl font-black text-white tracking-[0.2em] uppercase">Invoice Command</h1>
            <div className="flex items-center space-x-2 mt-0.5">
               <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">{userProfile?.companyName}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          {(userProfile?.role === 'ADMIN' || userProfile?.role === 'SUPER_ADMIN') && (
            <button 
              onClick={() => setShowUserMgmt(true)} 
              className="flex items-center space-x-3 px-5 py-2.5 bg-indigo-600/10 text-indigo-400 hover:bg-indigo-600 hover:text-white rounded-2xl border border-indigo-600/20 transition-all font-black uppercase text-[10px] tracking-widest"
            >
              <Users className="w-5 h-5" />
              <span>{userProfile?.role === 'SUPER_ADMIN' ? 'SaaS Portal' : 'Gestion Tiers'}</span>
            </button>
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
              <div className="p-8 bg-indigo-600 rounded-[2.5rem] shadow-2xl text-white">
                {isProcessing ? <Loader2 className="w-12 h-12 animate-spin" /> : <UploadCloud className="w-12 h-12" />}
              </div>
              <div>
                <h2 className="text-3xl font-black text-slate-950 tracking-tight">{isProcessing ? `Extraction...` : 'Déposez vos factures'}</h2>
                <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest mt-2">Partition client : {userProfile?.companyName}</p>
              </div>
            </div>

            <InvoiceTable 
              invoices={allInvoices} 
              selectedIds={selectedIds}
              onToggleSelection={(id) => setSelectedIds(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; })}
              onToggleAll={() => setSelectedIds(selectedIds.size === allInvoices.length ? new Set() : new Set(allInvoices.map(i => i.id)))}
              onUpdate={(id, data) => setAllInvoices(prev => prev.map(inv => inv.id === id ? { ...inv, ...data } : inv))}
              onDeleteInvoices={() => {}}
              onSyncInvoices={() => {}}
              lookupTables={lookupTables}
              templates={templates}
              xmlProfiles={xmlProfiles}
            />
          </div>
          <div className="xl:col-span-3">
            <ProcessingLogs logs={logs} />
          </div>
        </div>
      </main>

      <ConfigurationModal 
        isOpen={showConfig} onClose={() => { syncConfigToCloud(); setShowConfig(false); }}
        erpConfig={erpConfig} onSaveErp={setErpConfig}
        lookupTables={lookupTables} onSaveLookups={setLookupTables}
        templates={templates} onSaveTemplates={setTemplates}
        xmlProfiles={xmlProfiles} onSaveXmlProfiles={setXmlProfiles}
        masterData={masterData} onSaveMasterData={setMasterData}
      />

      {userProfile && (
        <UserManagement 
          isOpen={showUserMgmt}
          onClose={() => setShowUserMgmt(false)}
          users={allUsers}
          currentUser={userProfile.username}
          userRole={userProfile.role}
          onUpdateRole={() => {}}
          onDeleteUser={() => {}}
          onResetPassword={() => {}}
        />
      )}
    </div>
  );
};

export default App;
