
import React, { useState, useEffect, useMemo } from 'react';
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
  const [memory, setMemory] = useState<Set<string>>(new Set());
  const [logs, setLogs] = useState<ProcessingLog[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showConfig, setShowConfig] = useState(false);
  const [showUserMgmt, setShowUserMgmt] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processProgress, setProcessProgress] = useState({ current: 0, total: 0 });
  
  const [erpConfig, setErpConfig] = useState<ErpConfig>(() => {
    const saved = localStorage.getItem('invoice-erp-config');
    return saved ? JSON.parse(saved) : { apiUrl: '', apiKey: '', enabled: false };
  });

  const [masterData, setMasterData] = useState<PartnerMasterData[]>(() => {
    const saved = localStorage.getItem('invoice-master-data');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [lookupTables, setLookupTables] = useState<LookupTable[]>(() => {
    const saved = localStorage.getItem('invoice-lookup-tables');
    return saved ? JSON.parse(saved) : [];
  });

  const [templates, setTemplates] = useState<ExportTemplate[]>(() => {
    const saved = localStorage.getItem('invoice-export-templates');
    return saved ? JSON.parse(saved) : [];
  });

  const [xmlProfiles, setXmlProfiles] = useState<XmlMappingProfile[]>(() => {
    const saved = localStorage.getItem('invoice-xml-profiles');
    return saved ? JSON.parse(saved) : [];
  });

  // Fetch initial data
  useEffect(() => {
    const initialize = async () => {
      // Re-fetch current profile and all users
      const users = await dbService.getAllUsers();
      setAllUsers(users);

      if (currentUser) {
        const me = users.find(u => u.username === currentUser);
        if (me) {
          setUserProfile(me);
          const dbInvoices = await dbService.getInvoices(currentUser, me.role || 'USER');
          setAllInvoices(dbInvoices);
          const keys = dbInvoices.map(inv => createDedupKey(inv.supplier, inv.invoiceNumber));
          setMemory(new Set(keys));
        } else {
          // If current user not found (e.g. deleted), logout
          localStorage.removeItem('invoice-session-active-user');
          setCurrentUser(null);
        }
      }
    };
    
    initialize();
  }, [currentUser]);

  useEffect(() => { 
    localStorage.setItem('invoice-erp-config', JSON.stringify(erpConfig));
    localStorage.setItem('invoice-master-data', JSON.stringify(masterData));
    localStorage.setItem('invoice-lookup-tables', JSON.stringify(lookupTables));
    localStorage.setItem('invoice-export-templates', JSON.stringify(templates));
    localStorage.setItem('invoice-xml-profiles', JSON.stringify(xmlProfiles));
  }, [erpConfig, masterData, lookupTables, templates, xmlProfiles]);

  const matchMasterData = (extractedSiret: string | undefined): PartnerMasterData | null => {
    if (!extractedSiret) return null;
    const clean = extractedSiret.replace(/\s/g, '');
    return masterData.find(m => m.siret.replace(/\s/g, '') === clean) || null;
  };

  const processFiles = async (files: FileList | null) => {
    if (!files || !currentUser) return;
    setIsProcessing(true);
    setProcessProgress({ current: 0, total: files.length });
    
    let totalTokens = 0;
    for (const file of Array.from(files)) {
      try {
        const base64Data = await new Promise<string>((resolve) => {
          const reader = new FileReader(); 
          reader.onload = () => resolve((reader.result as string).split(',')[1]); 
          reader.readAsDataURL(file);
        });
        
        const result = await extractInvoiceData(base64Data, file.type, file.name, 'ULTIMATE', 'INBOUND', true);
        const inv = { ...result.invoice, owner: currentUser };
        totalTokens += result.usage.totalTokens;
        
        // SMART OVERRIDE VIA MASTER DATA
        const partner = matchMasterData(inv.supplierSiret);
        if (partner) {
          inv.isMasterMatched = true;
          inv.supplierErpCode = partner.erpCode;
          if (partner.name) inv.supplier = partner.name;
          if (partner.iban) inv.iban = partner.iban;
          if (partner.bic) inv.bic = partner.bic;
          if (partner.vatNumber) inv.supplierVat = partner.vatNumber;
        }

        const key = createDedupKey(inv.supplier, inv.invoiceNumber);
        if (memory.has(key)) {
          addLog(`Doublon ignoré : ${inv.invoiceNumber}`, 'warning');
        } else {
          setAllInvoices(prev => [inv, ...prev]);
          setMemory(prev => new Set(prev).add(key));
          dbService.saveInvoice(inv);
          addLog(`Extraite : ${inv.invoiceNumber}${inv.isMasterMatched ? ' (Master match OK)' : ''}`, 'success');
        }
      } catch (err: any) {
        addLog(`Erreur : ${file.name} - ${err.message}`, 'error');
      } finally {
        setProcessProgress(prev => ({ ...prev, current: prev.current + 1 }));
      }
    }

    // Update stats
    if (userProfile) {
      const newStats = {
        ...userProfile.stats,
        extractRequests: userProfile.stats.extractRequests + files.length,
        totalTokens: userProfile.stats.totalTokens + totalTokens
      };
      dbService.syncUserStats(currentUser, newStats, {
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        action: 'BATCH_EXTRACTION',
        details: `Processed ${files.length} documents. Tokens used: ${totalTokens}`
      });
    }

    setIsProcessing(false);
  };

  const handleDeleteInvoices = (ids: string[]) => {
    if (!confirm(`Effacer ${ids.length} factures ?`)) return;
    setAllInvoices(prev => prev.filter(inv => !ids.includes(inv.id)));
    setSelectedIds(new Set());
    addLog(`${ids.length} documents effacés.`, 'info');
  };

  const handleSyncInvoices = async (ids: string[]) => {
    if (!erpConfig.enabled) return alert("ERP désactivé dans les options.");
    addLog(`Démarrage synchronisation de ${ids.length} factures...`, 'info');
    setIsProcessing(true);
    await new Promise(r => setTimeout(r, 1000));
    setAllInvoices(prev => prev.map(i => ids.includes(i.id) ? {...i, erpStatus: ErpStatus.SUCCESS} : i));
    setIsProcessing(false);
    addLog(`Synchronisation terminée.`, 'success');
  };

  const addLog = (message: string, type: ProcessingLog['type'] = 'info') => {
    setLogs(prev => [...prev, { id: crypto.randomUUID(), timestamp: new Date(), message, type }]);
  };

  const fetchUsers = async () => {
    const users = await dbService.getAllUsers();
    setAllUsers(users);
  };

  const handleRegister = async (username: string, pass: string, question?: string, answer?: string) => {
    try {
      const newUser = await dbService.registerUser({
        username,
        password: pass,
        securityQuestion: question,
        securityAnswer: answer
      });
      // Refresh user list
      fetchUsers();
      // Auto-login
      setCurrentUser(newUser.username);
      setUserProfile(newUser);
      localStorage.setItem('invoice-session-active-user', newUser.username);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleResetPassword = async (username: string, newPass: string, answer?: string) => {
    try {
      await dbService.resetPassword(username, newPass, answer || '');
      fetchUsers();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const isAdmin = userProfile?.role === 'ADMIN';

  if (!currentUser) return (
    <LoginScreen 
      onLogin={u => { setCurrentUser(u.username); setUserProfile(u); localStorage.setItem('invoice-session-active-user', u.username); }} 
      users={allUsers} 
      onRegister={handleRegister} 
      onResetPassword={handleResetPassword} 
    />
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans pb-24">
      <header className="bg-slate-950 px-8 h-20 flex items-center justify-between sticky top-0 z-50 shadow-xl border-b border-white/5">
        <div className="flex items-center space-x-6">
          <div className="bg-indigo-600 p-2.5 rounded-xl text-white shadow-lg"><Cpu className="w-6 h-6" /></div>
          <div>
            <h1 className="text-xl font-black text-white tracking-[0.2em] uppercase">Invoice Command</h1>
            <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest mt-0.5">Session: {currentUser} ({userProfile?.role})</p>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          {isAdmin && (
            <button 
              onClick={() => { fetchUsers(); setShowUserMgmt(true); }} 
              className="flex items-center space-x-3 px-5 py-2.5 bg-indigo-600/10 text-indigo-400 hover:bg-indigo-600 hover:text-white rounded-2xl border border-indigo-600/20 transition-all font-black uppercase text-[10px] tracking-widest"
            >
              <ShieldCheck className="w-5 h-5" />
              <span>Admin Panel</span>
            </button>
          )}
          <button onClick={() => setShowConfig(true)} className="p-3 bg-white/5 text-slate-400 hover:text-white rounded-2xl border border-white/10 hover:bg-white/10 transition-all"><Settings className="w-6 h-6" /></button>
          <button onClick={() => { localStorage.removeItem('invoice-session-active-user'); setCurrentUser(null); setUserProfile(null); }} className="p-3 bg-white/5 text-slate-400 hover:text-rose-500 rounded-2xl border border-white/10 hover:bg-rose-500/10 transition-all"><LogOut className="w-6 h-6" /></button>
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
                <h2 className="text-3xl font-black text-slate-950 tracking-tight">{isProcessing ? `Extraction en cours (${processProgress.current}/${processProgress.total})` : 'Déposez vos factures PDF'}</h2>
                <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest mt-2">Analyse IA Gemini Flash & Native Factur-X</p>
              </div>
            </div>

            <InvoiceTable 
              invoices={allInvoices} 
              selectedIds={selectedIds}
              onToggleSelection={(id) => setSelectedIds(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; })}
              onToggleAll={() => setSelectedIds(selectedIds.size === allInvoices.length ? new Set() : new Set(allInvoices.map(i => i.id)))}
              onUpdate={(id, data) => setAllInvoices(prev => prev.map(inv => inv.id === id ? { ...inv, ...data } : inv))}
              onDeleteInvoices={handleDeleteInvoices}
              onSyncInvoices={handleSyncInvoices}
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
        isOpen={showConfig} onClose={() => setShowConfig(false)}
        erpConfig={erpConfig} onSaveErp={setErpConfig}
        lookupTables={lookupTables} onSaveLookups={setLookupTables}
        templates={templates} onSaveTemplates={setTemplates}
        xmlProfiles={xmlProfiles} onSaveXmlProfiles={setXmlProfiles}
        masterData={masterData} onSaveMasterData={setMasterData}
      />

      {isAdmin && (
        <UserManagement 
          isOpen={showUserMgmt}
          onClose={() => setShowUserMgmt(false)}
          users={allUsers}
          currentUser={currentUser!}
          onUpdateRole={async (u, r) => { await dbService.updateUserRole(u, r); fetchUsers(); }}
          onDeleteUser={async (u) => { if(confirm(`Delete ${u}?`)) { await dbService.deleteUser(u); fetchUsers(); } }}
          onResetPassword={async (u, p) => { await dbService.resetPasswordAdmin(u, p); fetchUsers(); }}
        />
      )}
    </div>
  );
};

export default App;
