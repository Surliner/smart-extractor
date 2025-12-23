
import React, { useState, useEffect, useMemo } from 'react';
import { UploadCloud, Loader2, Cpu, LogOut, Settings, Zap, Users, CloudLightning } from 'lucide-react';
import { extractInvoiceData } from './services/geminiService';
import { dbService } from './services/databaseService';
import { InvoiceData, ErpStatus, ProcessingLog, ErpConfig, UserProfile, UserRole, PartnerMasterData, LookupTable, ExportTemplate } from './types';
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

const MASTER_ADMINS_LIST = ['Jean Duhamel', 'admin', 'manager']; 
const MASTER_ADMINS = MASTER_ADMINS_LIST.map(name => name.toLowerCase().trim());

const App: React.FC = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [currentUser, setCurrentUser] = useState<string | null>(localStorage.getItem('invoice-session-active-user'));
  const [allInvoices, setAllInvoices] = useState<InvoiceData[]>([]);
  const [memory, setMemory] = useState<Set<string>>(new Set());
  const [logs, setLogs] = useState<ProcessingLog[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showConfig, setShowConfig] = useState(false);
  const [showUserManagement, setShowUserManagement] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processProgress, setProcessProgress] = useState({ current: 0, total: 0 });
  const [invoiceDirection, setInvoiceDirection] = useState<'INBOUND' | 'OUTBOUND'>('INBOUND');
  
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

  const currentUserProfile = useMemo(() => users.find(u => u.username === currentUser), [users, currentUser]);
  const isAdmin = currentUserProfile?.role === 'ADMIN';

  // Chargement Initial (Backend ou Local)
  useEffect(() => {
    const loadData = async () => {
      if (currentUser) {
        const dbUsers = await dbService.getAllUsers();
        setUsers(dbUsers);
        
        const dbInvoices = await dbService.getInvoices(currentUser, isAdmin ? 'ADMIN' : 'USER');
        setAllInvoices(dbInvoices);
        
        const keys = dbInvoices.map(inv => createDedupKey(inv.supplier, inv.invoiceNumber));
        setMemory(new Set(keys));
      } else {
        const localUsers = localStorage.getItem('smart-invoice-users');
        if (localUsers) setUsers(JSON.parse(localUsers));
      }
    };
    loadData();
  }, [currentUser, isAdmin]);

  // Sauvegarde persistante (Local fallback)
  useEffect(() => { 
    localStorage.setItem('smart-invoice-users', JSON.stringify(users));
    localStorage.setItem('invoice-queue-persistent-all', JSON.stringify(allInvoices));
    localStorage.setItem('invoice-dedup-memory', JSON.stringify(Array.from(memory)));
    localStorage.setItem('invoice-erp-config', JSON.stringify(erpConfig));
  }, [users, allInvoices, memory, erpConfig]);

  const visibleInvoices = useMemo(() => {
    if (!currentUser) return [];
    if (isAdmin) return allInvoices;
    return allInvoices.filter(inv => inv.owner === currentUser);
  }, [allInvoices, currentUser, isAdmin]);

  const addActivity = (username: string, action: string, details?: string) => {
    const newActivity = { id: crypto.randomUUID(), timestamp: new Date().toISOString(), action, details };
    setUsers(prev => {
        const updated = prev.map(u => {
            if (u.username === username) {
                const newProfile = {
                    ...u,
                    activityLog: [newActivity, ...(u.activityLog || [])].slice(0, 100)
                };
                dbService.syncUserStats(username, newProfile.stats, newActivity);
                return newProfile;
            }
            return u;
        });
        return updated;
    });
  };

  const processFiles = async (files: FileList | null) => {
    if (!files || files.length === 0 || !currentUser) return;
    setIsProcessing(true);
    const totalFiles = files.length;
    setProcessProgress({ current: 0, total: totalFiles });
    
    for (const file of Array.from(files)) {
      try {
        const base64Data = await new Promise<string>((resolve) => {
          const reader = new FileReader(); 
          reader.onload = () => resolve((reader.result as string).split(',')[1]); 
          reader.readAsDataURL(file);
        });
        
        const result = await extractInvoiceData(base64Data, file.type, file.name, 'ULTIMATE', invoiceDirection, true);
        const inv = { ...result.invoice, owner: currentUser };
        
        const uniqueKey = createDedupKey(inv.supplier, inv.invoiceNumber);
        if (memory.has(uniqueKey)) {
            addLog(`Doublon ignoré : ${inv.invoiceNumber}`, 'warning');
        } else {
            setAllInvoices(prev => [...prev, { ...inv, erpStatus: ErpStatus.PENDING }]);
            setMemory(prev => new Set(prev).add(uniqueKey));
            dbService.saveInvoice(inv); // Sync Backend
            
            addLog(`Extraite : ${inv.invoiceNumber}`, 'success');
            
            setUsers(prev => prev.map(u => {
              if (u.username === currentUser) {
                return {
                  ...u,
                  stats: {
                    ...u.stats,
                    extractRequests: u.stats.extractRequests + 1,
                    totalTokens: u.stats.totalTokens + result.usage.totalTokens,
                    lastActive: new Date().toISOString()
                  }
                };
              }
              return u;
            }));
            addActivity(currentUser, "Extraction Facture", `${inv.invoiceNumber} (${inv.supplier})`);
        }
      } catch (error: any) { 
        addLog(`Erreur ${file.name} : ${error.message}`, 'error'); 
      } finally {
        setProcessProgress(prev => ({ ...prev, current: prev.current + 1 }));
      }
    }
    setIsProcessing(false);
  };

  const addLog = (message: string, type: ProcessingLog['type'] = 'info') => {
    setLogs(prev => [...prev, { id: crypto.randomUUID(), timestamp: new Date(), message, type }]);
  };

  const handleLogout = () => {
    if (currentUser) addActivity(currentUser, "Déconnexion");
    setCurrentUser(null);
    localStorage.removeItem('invoice-session-active-user');
    setLogs([]);
  };

  if (!currentUser) {
    return (
      <LoginScreen 
        onLogin={(u) => {
          setCurrentUser(u.username);
          localStorage.setItem('invoice-session-active-user', u.username);
          handleLoginUpdate(u.username);
        }} 
        users={users} 
        onRegister={(un, pw, sq, sa) => {
          handleRegister(un, pw, sq, sa);
        }} 
        onResetPassword={(u, p) => setUsers(prev => prev.map(usr => usr.username === u ? { ...usr, password: p } : usr))} 
      />
    );
  }

  function handleLoginUpdate(un: string) {
    setUsers(prev => prev.map(u => {
      if (u.username === un) {
        return {
          ...u,
          stats: { ...u.stats, lastLogin: new Date().toISOString() },
          loginHistory: [new Date().toISOString(), ...(u.loginHistory || [])].slice(0, 50)
        };
      }
      return u;
    }));
    addActivity(un, "Connexion");
  }

  function handleRegister(un: string, pw: string, sq: string, sa: string) {
    const isMaster = MASTER_ADMINS.includes(un.toLowerCase().trim());
    const newUser: UserProfile = { 
      username: un, password: pw, 
      role: (users.length === 0 || isMaster) ? 'ADMIN' : 'USER', 
      createdAt: new Date().toISOString(), 
      stats: { extractRequests: 0, totalTokens: 0, lastActive: new Date().toISOString() },
      loginHistory: [new Date().toISOString()],
      activityLog: [{ id: crypto.randomUUID(), timestamp: new Date().toISOString(), action: "Création compte" }],
      securityQuestion: sq, securityAnswer: sa 
    };
    setUsers(prev => [...prev, newUser]);
    setCurrentUser(un);
    localStorage.setItem('invoice-session-active-user', un);
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans pb-12">
      <ConfigurationModal 
        isOpen={showConfig} onClose={() => setShowConfig(false)} 
        erpConfig={erpConfig} onSaveErp={setErpConfig} 
        lookupTables={lookupTables} onSaveLookups={setLookupTables} 
        templates={templates} onSaveTemplates={setTemplates} 
        masterData={masterData} onSaveMasterData={setMasterData}
      />

      {isAdmin && (
        <UserManagement 
          isOpen={showUserManagement} onClose={() => setShowUserManagement(false)} 
          users={users} currentUser={currentUser} 
          onUpdateRole={(u, r) => setUsers(prev => prev.map(usr => usr.username === u ? { ...usr, role: r } : usr))} 
          onDeleteUser={(u) => {
              setUsers(prev => prev.filter(usr => usr.username !== u));
              setAllInvoices(prev => prev.filter(inv => inv.owner !== u));
          }} 
          onResetPassword={(u, p) => setUsers(prev => prev.map(usr => usr.username === u ? { ...usr, password: p } : usr))} 
        />
      )}

      <header className="bg-slate-950 px-8 h-20 flex items-center justify-between sticky top-0 z-50 border-b border-white/5">
          <div className="flex items-center space-x-6">
            <div className="bg-indigo-600 p-2 rounded-xl text-white"><Cpu className="w-6 h-6" /></div>
            <h1 className="text-lg font-black text-white tracking-[0.2em] uppercase">Invoice Command</h1>
          </div>
          <div className="flex items-center space-x-4">
             <div className="text-right mr-4 hidden md:block">
                <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">{currentUser}</p>
                <p className="text-[9px] text-slate-500 font-bold">{isAdmin ? 'System Admin' : 'Standard User'}</p>
             </div>
             {isAdmin && (
                <button onClick={() => setShowUserManagement(true)} className="p-3 bg-white/5 text-slate-300 hover:text-white rounded-2xl border border-white/10 hover:bg-white/10 transition-all"><Users className="w-5 h-5" /></button>
             )}
             <button onClick={() => setShowConfig(true)} className="p-3 bg-white/5 text-slate-300 hover:text-white rounded-2xl border border-white/10 hover:bg-white/10 transition-all"><Settings className="w-5 h-5" /></button>
             <button onClick={handleLogout} className="p-3 bg-white/5 text-slate-300 hover:text-rose-500 rounded-2xl border border-white/10 hover:bg-rose-500/10 transition-all"><LogOut className="w-5 h-5" /></button>
          </div>
      </header>

      <main className="max-w-[1700px] mx-auto px-6 py-8 space-y-8">
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
          <div className="xl:col-span-9 space-y-8">
             <div 
              className={`bg-white rounded-[3rem] border-2 border-dashed p-12 flex flex-col items-center justify-center text-center space-y-6 transition-all duration-300 relative overflow-hidden ${isProcessing ? 'border-indigo-500 bg-indigo-50/20' : 'border-slate-100'} cursor-pointer`}
              onClick={() => !isProcessing && document.getElementById('file-upload')?.click()}
            >
              <input id="file-upload" type="file" multiple accept="application/pdf" onChange={(e) => processFiles(e.target.files)} className="hidden" />
              <div className="flex flex-col items-center relative z-10">
                <div className={`p-6 rounded-[2rem] mb-6 shadow-2xl ${invoiceDirection === 'INBOUND' ? 'bg-indigo-600' : 'bg-purple-600'} text-white`}>
                   {isProcessing ? <Loader2 className="w-10 h-10 animate-spin" /> : <UploadCloud className="w-10 h-10" />}
                </div>
                <h2 className="text-3xl font-black text-slate-900 tracking-tight">{isProcessing ? `Traitement de ${processProgress.total} fichiers...` : `Déposer vos factures ici`}</h2>
                {isProcessing && (
                  <div className="w-64 h-2 bg-slate-100 rounded-full mt-6 overflow-hidden border border-slate-200">
                    <div className="h-full bg-indigo-600 transition-all duration-500" style={{ width: `${(processProgress.current / processProgress.total) * 100}%` }}></div>
                  </div>
                )}
              </div>
            </div>

            <InvoiceTable 
                invoices={visibleInvoices} selectedIds={selectedIds} 
                onToggleSelection={(id) => setSelectedIds(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; })}
                onToggleAll={() => setSelectedIds(selectedIds.size === visibleInvoices.length ? new Set() : new Set(visibleInvoices.map(i => i.id)))} 
                onUpdate={(id, data) => setAllInvoices(prev => prev.map(inv => inv.id === id ? { ...inv, ...data } : inv))} 
                onUpdateItem={() => {}} onDeleteItem={() => {}} 
                lookupTables={lookupTables} templates={templates}
            />
          </div>

          <div className="xl:col-span-3 space-y-8">
             <div className="bg-slate-900 rounded-[3rem] p-10 flex flex-col text-white shadow-2xl relative overflow-hidden">
               <h3 className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.4em] mb-10 border-b border-white/5 pb-6">Flux Direction</h3>
               <div className="space-y-4">
                  <div className="flex p-1.5 bg-white/5 rounded-2xl border border-white/10">
                     <button onClick={() => setInvoiceDirection('INBOUND')} className={`flex-1 py-3 text-[9px] font-black uppercase tracking-widest rounded-xl ${invoiceDirection === 'INBOUND' ? 'bg-indigo-600' : 'text-slate-500'}`}>Inbound</button>
                     <button onClick={() => setInvoiceDirection('OUTBOUND')} className={`flex-1 py-3 text-[9px] font-black uppercase tracking-widest rounded-xl ${invoiceDirection === 'OUTBOUND' ? 'bg-purple-600' : 'text-slate-500'}`}>Outbound</button>
                  </div>
                  <button className="w-full py-5 rounded-2xl bg-indigo-600 text-white font-black uppercase text-[11px] tracking-[0.2em] shadow-2xl flex items-center justify-center"><Zap className="w-5 h-5 mr-3" /> Transférer vers Sage</button>
               </div>
            </div>
            <ProcessingLogs logs={logs} />
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;
