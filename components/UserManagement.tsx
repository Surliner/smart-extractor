
import React, { useState, useEffect } from 'react';
import { UserProfile, UserRole, Company } from '../types';
import { Shield, User, X, ShieldCheck, Building2, Plus, Globe, UserPlus, Key, CheckCircle, Clock, Trash2 } from 'lucide-react';
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

  const [showAddUser, setShowAddUser] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserPass, setNewUserPass] = useState('');
  const [newUserCompany, setNewUserCompany] = useState('');

  const isSuperAdmin = userRole === 'SUPER_ADMIN';

  const fetchAll = async () => {
    try {
        const u = await dbService.getAllUsers();
        setUsers(u);
        const c = await dbService.getAllCompanies();
        setCompanies(c);
    } catch (e) { console.error(e); }
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

  const handleApprove = async (username: string) => {
    try {
        await dbService.approveUser(username);
        fetchAll();
    } catch (e: any) { alert(e.message); }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await dbService.createAdminUser({
          username: newUserName,
          password: newUserPass,
          role: 'ADMIN',
          companyId: newUserCompany || (companies[0]?.id)
      });
      setShowAddUser(false);
      fetchAll();
    } catch (e: any) { alert(e.message); }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/95 flex items-center justify-center z-[110] backdrop-blur-2xl p-6">
      <div className="bg-white rounded-[3rem] shadow-2xl border border-slate-200 w-full max-w-6xl h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95">
        
        <div className="px-10 py-6 border-b border-slate-100 flex justify-between items-center bg-white">
          <div className="flex items-center space-x-6">
            <div className="bg-indigo-600 p-3 rounded-2xl text-white"><ShieldCheck className="w-8 h-8" /></div>
            <div>
                <h2 className="text-2xl font-black text-slate-900 uppercase italic">
                  {isSuperAdmin ? "SaaS Control Hub" : "Gestion Tiers"}
                </h2>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">
                  Connecté en tant que {userRole}
                </p>
            </div>
          </div>
          <button onClick={onClose} className="p-3 text-slate-300 hover:text-rose-500 transition-all"><X className="w-8 h-8" /></button>
        </div>

        <div className="flex-1 overflow-hidden flex">
            <div className="w-64 bg-slate-50 border-r border-slate-100 p-6 space-y-2">
              <NavBtn icon={User} label="Utilisateurs" active={activeSubTab === 'users'} onClick={() => setActiveSubTab('users')} />
              {isSuperAdmin && <NavBtn icon={Building2} label="Clients SaaS" active={activeSubTab === 'companies'} onClick={() => setActiveSubTab('companies')} />}
            </div>

            <div className="flex-1 overflow-y-auto p-10 bg-white">
                {activeSubTab === 'companies' ? (
                  <div className="space-y-8 animate-in fade-in">
                    <div className="flex justify-between items-end border-b border-slate-100 pb-8">
                      <div>
                        <h3 className="text-2xl font-black text-slate-900">Clients SaaS</h3>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Gérez vos instances clients indépendantes</p>
                      </div>
                      <button onClick={() => setShowAddCompany(true)} className="bg-indigo-600 text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center shadow-lg hover:bg-indigo-700 transition-all">
                        <Plus className="w-4 h-4 mr-2" /> Nouveau Client
                      </button>
                    </div>

                    {showAddCompany && (
                        <form onSubmit={handleCreateCompany} className="p-8 bg-indigo-50 border border-indigo-100 rounded-[2rem] flex items-end space-x-4 animate-in slide-in-from-top-4">
                            <div className="flex-1">
                                <label className="text-[10px] font-black uppercase text-indigo-400 block mb-2">Nom du Client / Entreprise</label>
                                <input value={newCompanyName} onChange={e=>setNewCompanyName(e.target.value)} className="w-full px-5 py-3.5 rounded-2xl border border-indigo-200 outline-none focus:border-indigo-600" placeholder="Ex: Groupe Logistique Nord" />
                            </div>
                            <button type="submit" className="bg-indigo-600 text-white px-8 py-4 rounded-2xl text-[10px] font-black uppercase">Valider</button>
                            <button type="button" onClick={()=>setShowAddCompany(false)} className="text-indigo-400 p-4">Annuler</button>
                        </form>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {companies.map(comp => (
                        <div key={comp.id} className="p-8 bg-slate-50 rounded-[2.5rem] border border-slate-100 flex items-center justify-between group hover:bg-white hover:border-indigo-100 transition-all">
                          <div className="flex items-center space-x-5">
                            <div className="p-4 bg-white rounded-2xl border border-slate-200 group-hover:border-indigo-200 transition-all"><Building2 className="w-6 h-6 text-indigo-500" /></div>
                            <div>
                                <p className="text-lg font-black text-slate-900">{comp.name}</p>
                                <p className="text-[9px] font-mono text-slate-400 mt-1">{comp.id}</p>
                            </div>
                          </div>
                          <div className="flex flex-col items-end">
                             <span className="text-[10px] font-black bg-emerald-50 text-emerald-600 px-3 py-1 rounded-full uppercase">Actif</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-8 animate-in fade-in">
                    <div className="flex justify-between items-end border-b border-slate-100 pb-8">
                      <div>
                        <h3 className="text-2xl font-black text-slate-900">Utilisateurs</h3>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Autorisations d'accès aux partitions client</p>
                      </div>
                    </div>

                    <div className="bg-white rounded-[2rem] border border-slate-100 overflow-hidden shadow-sm">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                <tr>
                                    <th className="px-8 py-5">Identité</th>
                                    <th className="px-8 py-5">Société</th>
                                    <th className="px-8 py-5">Statut</th>
                                    <th className="px-8 py-5">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {users.map(u => (
                                    <tr key={u.username} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-8 py-5">
                                            <div className="flex flex-col">
                                                <span className="text-sm font-black text-slate-900">{u.username}</span>
                                                <span className="text-[10px] font-black text-indigo-500 uppercase">{u.role}</span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-5 text-sm font-bold text-slate-500">{u.companyName || 'N/A'}</td>
                                        <td className="px-8 py-5">
                                            {u.isApproved ? (
                                                <span className="flex items-center text-emerald-600 font-black uppercase text-[10px]">
                                                    <CheckCircle className="w-4 h-4 mr-2" /> Actif
                                                </span>
                                            ) : (
                                                <span className="flex items-center text-amber-500 font-black uppercase text-[10px]">
                                                    <Clock className="w-4 h-4 mr-2" /> En attente
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-8 py-5">
                                            {!u.isApproved && (isSuperAdmin || userRole === 'ADMIN') && (
                                                <button onClick={() => handleApprove(u.username)} className="bg-emerald-600 text-white px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg active:scale-95 transition-all">Approuver</button>
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
    <button onClick={onClick} className={`w-full flex items-center space-x-4 px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${active ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-100' : 'text-slate-400 hover:bg-white hover:text-slate-900'}`}>
      <Icon className="w-5 h-5" />
      <span>{label}</span>
    </button>
);
