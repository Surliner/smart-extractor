
import React, { useState, useMemo, useEffect } from 'react';
import { UserProfile, UserRole, Company } from '../types';
import { Shield, User, X, ShieldCheck, Building2, Plus, Globe, UserPlus, Key, CheckCircle, Clock } from 'lucide-react';
import { dbService } from '../services/databaseService';

interface UserManagementProps {
  isOpen: boolean;
  onClose: () => void;
  users: UserProfile[];
  currentUser: string;
  userRole: UserRole;
  onUpdateRole: (username: string, newRole: UserRole) => void;
  onDeleteUser: (username: string) => void;
  onResetPassword: (username: string, newPass: string) => void;
}

export const UserManagement: React.FC<UserManagementProps> = ({ 
  isOpen, 
  onClose, 
  users: initialUsers, 
  userRole 
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'users' | 'companies'>('users');
  const [companies, setCompanies] = useState<Company[]>([]);
  const [users, setUsers] = useState<UserProfile[]>(initialUsers);
  const [showAddUser, setShowAddUser] = useState(false);
  
  const [newUserName, setNewUserName] = useState('');
  const [newUserPass, setNewUserPass] = useState('');
  const [newUserCompany, setNewUserCompany] = useState('');

  const isSuperAdmin = userRole === 'SUPER_ADMIN';

  const fetchAll = async () => {
    try {
        const u = await dbService.getAllUsers();
        setUsers(u);
        if (isSuperAdmin) {
            const c = await dbService.getAllCompanies();
            setCompanies(c);
        }
    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    if (isOpen) {
      fetchAll();
    }
  }, [isOpen, isSuperAdmin]);

  const handleCreateCompany = async () => {
    const name = prompt("Nom du nouveau client / entreprise :");
    if (name) {
      const newComp = await dbService.createCompany(name);
      setCompanies([newComp, ...companies]);
    }
  };

  const handleApprove = async (username: string) => {
    try {
        await dbService.approveUser(username);
        fetchAll();
    } catch (e: any) { alert(e.message); }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    await dbService.createAdminUser({
        username: newUserName,
        password: newUserPass,
        role: 'ADMIN',
        companyId: newUserCompany || (companies[0]?.id)
    });
    setShowAddUser(false);
    fetchAll();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/95 flex items-center justify-center z-[110] backdrop-blur-2xl p-6">
      <div className="bg-white rounded-[3rem] shadow-2xl border border-slate-200 w-full max-w-6xl h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">
        
        <div className="px-10 py-6 border-b border-slate-100 flex justify-between items-center shrink-0">
          <div className="flex items-center space-x-6">
            <div className="bg-indigo-600 p-3 rounded-2xl text-white">
               <ShieldCheck className="w-8 h-8" />
            </div>
            <div>
                <h2 className="text-2xl font-black text-slate-900 uppercase italic">
                  {isSuperAdmin ? "SaaS Control Hub" : "Gestion Utilisateurs"}
                </h2>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Connecté en tant que {userRole}
                </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-300 hover:text-rose-500 rounded-xl transition-all">
            <X className="w-8 h-8" />
          </button>
        </div>

        <div className="flex-1 overflow-hidden flex">
            {isSuperAdmin && (
              <div className="w-56 bg-slate-50 border-r border-slate-100 p-4 space-y-2">
                <button onClick={() => setActiveSubTab('users')} className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-[10px] font-black uppercase ${activeSubTab === 'users' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-white'}`}>
                    <User className="w-4 h-4" /> <span>Utilisateurs</span>
                </button>
                <button onClick={() => setActiveSubTab('companies')} className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-[10px] font-black uppercase ${activeSubTab === 'companies' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-white'}`}>
                    <Building2 className="w-4 h-4" /> <span>Entreprises</span>
                </button>
              </div>
            )}

            <div className="flex-1 overflow-y-auto p-10">
                {activeSubTab === 'companies' ? (
                  <div className="space-y-6">
                    <div className="flex justify-between items-end mb-8">
                      <h3 className="text-xl font-black text-slate-900">Clients SaaS</h3>
                      <button onClick={handleCreateCompany} className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center shadow-lg">
                        <Plus className="w-4 h-4 mr-2" /> Créer Client
                      </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {companies.map(comp => (
                        <div key={comp.id} className="p-6 bg-slate-50 rounded-2xl border border-slate-100 flex justify-between items-center">
                          <div className="flex items-center space-x-4">
                            <Building2 className="w-6 h-6 text-indigo-500" />
                            <div>
                                <p className="text-sm font-black text-slate-900">{comp.name}</p>
                                <p className="text-[9px] font-mono text-slate-400">{comp.id}</p>
                            </div>
                          </div>
                          <span className="text-[8px] font-black bg-white px-2 py-1 rounded-lg border border-slate-100 uppercase">Actif</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="flex justify-between items-end mb-8">
                      <h3 className="text-xl font-black text-slate-900">Utilisateurs</h3>
                      {isSuperAdmin && (
                        <button onClick={() => setShowAddUser(true)} className="bg-slate-950 text-white px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center">
                          <UserPlus className="w-4 h-4 mr-2" /> Créer Admin Client
                        </button>
                      )}
                    </div>

                    {showAddUser && (
                        <form onSubmit={handleCreateUser} className="bg-indigo-50 p-6 rounded-2xl border border-indigo-100 grid grid-cols-3 gap-4 mb-8">
                            <div>
                                <label className="text-[9px] font-black uppercase text-indigo-400 block mb-1">Identifiant</label>
                                <input value={newUserName} onChange={e=>setNewUserName(e.target.value)} className="w-full px-4 py-2 rounded-lg border border-indigo-100 outline-none" placeholder="nom.prenom" />
                            </div>
                            <div>
                                <label className="text-[9px] font-black uppercase text-indigo-400 block mb-1">Mot de passe</label>
                                <input type="password" value={newUserPass} onChange={e=>setNewUserPass(e.target.value)} className="w-full px-4 py-2 rounded-lg border border-indigo-100 outline-none" placeholder="******" />
                            </div>
                            <div>
                                <label className="text-[9px] font-black uppercase text-indigo-400 block mb-1">Client Rattaché</label>
                                <select value={newUserCompany} onChange={e=>setNewUserCompany(e.target.value)} className="w-full px-4 py-2 rounded-lg border border-indigo-100 outline-none">
                                    {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </div>
                            <div className="col-span-3 flex justify-end">
                                <button type="submit" className="bg-indigo-600 text-white px-6 py-2 rounded-xl text-[10px] font-black uppercase">Valider Création</button>
                            </div>
                        </form>
                    )}

                    <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                <tr>
                                    <th className="px-6 py-4">Utilisateur</th>
                                    <th className="px-6 py-4">Société</th>
                                    <th className="px-6 py-4">Statut</th>
                                    <th className="px-6 py-4">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {users.map(u => (
                                    <tr key={u.username} className="text-xs group">
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="font-black text-slate-900">{u.username}</span>
                                                <span className="text-[8px] font-black text-indigo-500 uppercase">{u.role}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-slate-500">
                                            <div className="flex items-center space-x-2">
                                                <Building2 className="w-3 h-3" /> <span>{u.companyName || 'N/A'}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            {u.isApproved ? (
                                                <span className="flex items-center text-emerald-600 font-black uppercase text-[9px]">
                                                    <CheckCircle className="w-3 h-3 mr-1" /> Actif
                                                </span>
                                            ) : (
                                                <span className="flex items-center text-amber-500 font-black uppercase text-[9px]">
                                                    <Clock className="w-3 h-3 mr-1" /> En attente
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            {!u.isApproved && (isSuperAdmin || userRole === 'ADMIN') && (
                                                <button 
                                                    onClick={() => handleApprove(u.username)}
                                                    className="bg-emerald-500 hover:bg-emerald-600 text-white px-3 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest shadow-sm transition-all active:scale-95"
                                                >
                                                    Approuver
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                  </div>
                )}
            </div>
        </div>
      </div>
    </div>
  );
};
