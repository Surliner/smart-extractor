
import React, { useState, useEffect } from 'react';
import { UserProfile, UserRole, Company } from '../types';
import { User, X, ShieldCheck, Building2, Plus, CheckCircle, Clock, Trash2, ShieldAlert, Save, RefreshCw, Cpu, Activity, BarChart3 } from 'lucide-react';
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
  userRole 
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'users' | 'companies'>('users');
  const [companies, setCompanies] = useState<Company[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  
  const [showAddCompany, setShowAddCompany] = useState(false);
  const [newCompanyName, setNewCompanyName] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const isSuperAdmin = userRole === 'SUPER_ADMIN';

  const fetchAll = async () => {
    setIsLoading(true);
    try {
        const [u, c] = await Promise.all([
            dbService.getAllUsers(),
            dbService.getAllCompanies()
        ]);
        setUsers(u);
        setCompanies(c);
    } catch (e) { console.error(e); }
    setIsLoading(false);
  };

  useEffect(() => {
    if (isOpen) fetchAll();
  }, [isOpen]);

  const handleCreateCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCompanyName.trim()) return;
    try {
      await dbService.createCompany(newCompanyName);
      setNewCompanyName('');
      setShowAddCompany(false);
      fetchAll();
    } catch (e: any) { alert(e.message); }
  };

  const handleUpdateUser = async (username: string, role: UserRole, companyId: string, isApproved: boolean) => {
    try {
        await dbService.updateUser(username, { role, companyId, isApproved });
        fetchAll();
    } catch (e: any) { alert(e.message); }
  };

  const handleDeleteUser = async (username: string) => {
    if (username.toLowerCase() === 'admin') {
      alert("Master Admin cannot be deleted.");
      return;
    }
    if (!confirm(`Delete user ${username}?`)) return;
    try {
        await dbService.deleteUser(username);
        fetchAll();
    } catch (e: any) { alert(e.message); }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/95 flex items-center justify-center z-[110] backdrop-blur-2xl p-6">
      <div className="bg-white rounded-[3rem] shadow-2xl border border-slate-200 w-full max-w-7xl h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95">
        
        <div className="px-10 py-6 border-b border-slate-100 flex justify-between items-center bg-white shrink-0">
          <div className="flex items-center space-x-6">
            <div className="bg-indigo-600 p-3 rounded-2xl text-white shadow-xl shadow-indigo-100"><ShieldCheck className="w-8 h-8" /></div>
            <div>
                <h2 className="text-2xl font-black text-slate-900 uppercase italic">
                  {isSuperAdmin ? "SaaS Partition Hub" : "Gestion des Accès Tiers"}
                </h2>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">
                  Connecté : {userRole}
                </p>
            </div>
          </div>
          <button onClick={onClose} className="p-3 text-slate-300 hover:text-rose-500 transition-all rounded-xl hover:bg-rose-50"><X className="w-8 h-8" /></button>
        </div>

        <div className="flex-1 overflow-hidden flex">
            <div className="w-72 bg-slate-50 border-r border-slate-100 p-8 space-y-2 shrink-0">
              <NavBtn icon={User} label="Utilisateurs" active={activeSubTab === 'users'} onClick={() => setActiveSubTab('users')} />
              {isSuperAdmin && <NavBtn icon={Building2} label="Clients SaaS" active={activeSubTab === 'companies'} onClick={() => setActiveSubTab('companies')} />}
              <div className="pt-10 flex flex-col items-center space-y-4">
                  <div className="w-full p-4 bg-white rounded-2xl border border-slate-200 shadow-sm">
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Utilisateurs</p>
                    <p className="text-2xl font-black text-slate-900">{users.length}</p>
                  </div>
                  <button onClick={fetchAll} className="text-[10px] font-black uppercase text-slate-400 hover:text-indigo-600 flex items-center transition-colors">
                    <RefreshCw className={`w-3 h-3 mr-2 ${isLoading ? 'animate-spin' : ''}`} /> Rafraîchir les données
                  </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-12 bg-white relative">
                {activeSubTab === 'companies' ? (
                  <div className="space-y-10 animate-in fade-in">
                    <div className="flex justify-between items-end border-b border-slate-100 pb-10">
                      <div>
                        <h3 className="text-3xl font-black text-slate-900">Partitionnement Clients</h3>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">Instances isolées par partition UUID</p>
                      </div>
                      <button onClick={() => setShowAddCompany(true)} className="bg-indigo-600 text-white px-8 py-4 rounded-[1.5rem] text-[10px] font-black uppercase shadow-xl hover:bg-indigo-700 transition-all">
                        <Plus className="w-5 h-5 mr-3" /> Nouveau Client
                      </button>
                    </div>

                    {showAddCompany && (
                        <form onSubmit={handleCreateCompany} className="p-10 bg-indigo-50 border border-indigo-100 rounded-[2.5rem] flex items-end space-x-6 animate-in slide-in-from-top-6">
                            <div className="flex-1">
                                <label className="text-[10px] font-black uppercase text-indigo-400 block mb-3 ml-2">Raison Sociale Client</label>
                                <input value={newCompanyName} onChange={e=>setNewCompanyName(e.target.value)} className="w-full px-6 py-4 rounded-2xl border border-indigo-200 outline-none focus:border-indigo-600 text-sm font-bold bg-white shadow-sm" placeholder="Ex: Groupe Industriel Alpha" />
                            </div>
                            <button type="submit" className="bg-indigo-600 text-white px-10 py-5 rounded-2xl text-[10px] font-black uppercase shadow-lg">Créer l'instance</button>
                            <button type="button" onClick={()=>setShowAddCompany(false)} className="text-indigo-400 p-5 font-bold text-[10px] uppercase">Annuler</button>
                        </form>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      {companies.map(comp => (
                        <div key={comp.id} className="p-10 bg-slate-50 rounded-[3rem] border border-slate-100 flex items-center justify-between group hover:bg-white hover:shadow-2xl transition-all duration-300">
                          <div className="flex items-center space-x-6">
                            <div className="p-5 bg-white rounded-3xl border border-slate-200 group-hover:border-indigo-200 shadow-sm"><Building2 className="w-8 h-8 text-indigo-500" /></div>
                            <div>
                                <p className="text-xl font-black text-slate-900">{comp.name}</p>
                                <p className="text-[9px] font-mono text-slate-400 mt-2">UUID: {comp.id}</p>
                            </div>
                          </div>
                          <span className="text-[10px] font-black bg-emerald-50 text-emerald-600 px-4 py-1.5 rounded-full uppercase border border-emerald-100">Actif</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-10 animate-in fade-in">
                    <div className="flex justify-between items-end border-b border-slate-100 pb-10">
                      <div>
                        <h3 className="text-3xl font-black text-slate-900">Audit des Accès & Activité</h3>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">Contrôle des rôles et supervision des consommations</p>
                      </div>
                    </div>

                    <div className="bg-white rounded-[2.5rem] border border-slate-100 overflow-hidden shadow-sm">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                                <tr>
                                    <th className="px-8 py-6">Utilisateur</th>
                                    <th className="px-8 py-6">Partition / Client</th>
                                    <th className="px-8 py-6">Rôle / Droits</th>
                                    <th className="px-8 py-6 text-center">Extractions</th>
                                    <th className="px-8 py-6 text-center">Tokens IA</th>
                                    <th className="px-8 py-6">Statut</th>
                                    <th className="px-8 py-6 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {users.map(u => (
                                    <tr key={u.username} className="hover:bg-slate-50/50 transition-colors group">
                                        <td className="px-8 py-6">
                                            <div className="flex flex-col">
                                              <span className="text-sm font-black text-slate-900">{u.username}</span>
                                              <span className="text-[8px] font-bold text-slate-400 uppercase mt-1">Créé le {new Date(u.createdAt).toLocaleDateString()}</span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <select 
                                              disabled={!isSuperAdmin && userRole !== 'ADMIN' || u.username === 'admin'}
                                              value={u.companyId}
                                              onChange={(e) => handleUpdateUser(u.username, u.role, e.target.value, u.isApproved)}
                                              className="bg-slate-50 border border-slate-200 p-3 rounded-2xl text-[10px] font-black uppercase w-56 outline-none focus:border-indigo-500 disabled:opacity-30 transition-all"
                                            >
                                              {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                            </select>
                                        </td>
                                        <td className="px-8 py-6">
                                            <select 
                                              disabled={!isSuperAdmin || u.username === 'admin'}
                                              value={u.role}
                                              onChange={(e) => handleUpdateUser(u.username, e.target.value as UserRole, u.companyId, u.isApproved)}
                                              className="bg-slate-50 border border-slate-200 p-3 rounded-2xl text-[10px] font-black uppercase w-32 outline-none focus:border-indigo-500 disabled:opacity-30 transition-all"
                                            >
                                              <option value="USER">User</option>
                                              <option value="ADMIN">Admin</option>
                                              {isSuperAdmin && <option value="SUPER_ADMIN">Super Admin</option>}
                                            </select>
                                        </td>
                                        <td className="px-8 py-6 text-center">
                                            <div className="flex flex-col items-center">
                                              <Activity className="w-3 h-3 text-indigo-400 mb-1" />
                                              <span className="text-[11px] font-black text-slate-900">{u.stats?.extractRequests || 0}</span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6 text-center">
                                            <div className="flex flex-col items-center">
                                              <BarChart3 className="w-3 h-3 text-purple-400 mb-1" />
                                              <span className="text-[11px] font-black text-slate-900">{(u.stats?.totalTokens || 0).toLocaleString()}</span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <button 
                                              disabled={u.username === 'admin'}
                                              onClick={() => handleUpdateUser(u.username, u.role, u.companyId, !u.isApproved)}
                                              className={`flex items-center font-black uppercase text-[10px] px-4 py-2 rounded-full border transition-all ${u.isApproved ? 'bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-100' : 'bg-amber-50 text-amber-500 border-amber-100 hover:bg-amber-100 animate-pulse'}`}
                                            >
                                              {u.isApproved ? <CheckCircle className="w-3 h-3 mr-2" /> : <Clock className="w-3 h-3 mr-2" />}
                                              {u.isApproved ? 'Autorisé' : 'Validation'}
                                            </button>
                                        </td>
                                        <td className="px-8 py-6 text-right">
                                            {u.username.toLowerCase() !== 'admin' && (
                                              <button onClick={() => handleDeleteUser(u.username)} className="p-3 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"><Trash2 className="w-5 h-5" /></button>
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

const NavBtn = ({ icon: Icon, label, active, onClick }: any) => (
    <button onClick={onClick} className={`w-full flex items-center space-x-5 px-8 py-5 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest transition-all ${active ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-100 scale-105' : 'text-slate-400 hover:bg-white hover:text-slate-900'}`}>
      <Icon className={`w-6 h-6 ${active ? 'text-white' : 'text-slate-300 group-hover:text-slate-600'}`} />
      <span>{label}</span>
    </button>
);
