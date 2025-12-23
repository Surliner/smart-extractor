
import React, { useState } from 'react';
import { UserProfile, UserRole } from '../types';
import { Shield, User, BrainCircuit, X, Trash2, ShieldCheck, RefreshCcw, Eye, EyeOff, Lock, UserCog, Database, Clock, Activity, ListChecks } from 'lucide-react';

interface UserManagementProps {
  isOpen: boolean;
  onClose: () => void;
  users: UserProfile[];
  currentUser: string;
  onUpdateRole: (username: string, newRole: UserRole) => void;
  onDeleteUser: (username: string) => void;
  onResetPassword: (username: string, newPass: string) => void;
}

export const UserManagement: React.FC<UserManagementProps> = ({ 
  isOpen, 
  onClose, 
  users, 
  currentUser,
  onUpdateRole,
  onDeleteUser,
  onResetPassword
}) => {
  const [revealedPasswords, setRevealedPasswords] = useState<Set<string>>(new Set());
  const [selectedUser, setSelectedUser] = useState<string | null>(null);

  if (!isOpen) return null;

  const togglePassword = (username: string) => {
    setRevealedPasswords(prev => {
        const next = new Set(prev);
        if (next.has(username)) next.delete(username);
        else next.add(username);
        return next;
    });
  };

  const handleForceReset = (username: string) => {
    const newPass = prompt(`System Override: Enter new credential for user "${username}":`, "123456");
    if (newPass) {
        onResetPassword(username, newPass);
        alert(`Access key for ${username} updated successfully.`);
    }
  };

  const activeUserDetail = users.find(u => u.username === selectedUser);

  return (
    <div className="fixed inset-0 bg-slate-950/90 flex items-center justify-center z-[100] backdrop-blur-xl p-8">
      <div className="bg-white rounded-[3rem] shadow-[0_60px_150px_-30px_rgba(0,0,0,0.5)] border border-slate-200 w-full max-w-7xl h-[90vh] flex flex-col overflow-hidden">
        
        <div className="px-12 py-10 border-b border-slate-100 flex justify-between items-center bg-white shrink-0">
          <div className="flex items-center space-x-6">
            <div className="bg-slate-950 p-5 rounded-[2rem] text-indigo-400 shadow-2xl">
               <ShieldCheck className="w-10 h-10" />
            </div>
            <div>
                <h2 className="text-4xl font-black text-slate-900 tracking-tighter">System Intelligence</h2>
                <p className="text-[10px] font-black text-slate-400 mt-2 uppercase tracking-[0.4em] flex items-center">
                  <UserCog className="w-3 h-3 mr-2" /> Unified Instance Authorization & Auditing
                </p>
            </div>
          </div>
          <button onClick={onClose} className="p-4 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-full transition-all active:scale-90">
            <X className="w-10 h-10" />
          </button>
        </div>

        <div className="flex-1 overflow-hidden flex bg-slate-50">
            {/* User List */}
            <div className={`flex-1 overflow-y-auto p-12 custom-scrollbar transition-all ${selectedUser ? 'w-2/3' : 'w-full'}`}>
                <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-xl overflow-hidden">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-slate-400 uppercase font-black text-[9px] tracking-[0.2em] border-b border-slate-200">
                            <tr>
                                <th className="px-10 py-6">User Profile</th>
                                <th className="px-6 py-6 text-center">Security</th>
                                <th className="px-6 py-6 text-center">AI Load</th>
                                <th className="px-6 py-6 text-center">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {users.map(user => (
                                <tr key={user.username} className={`group cursor-pointer transition-all ${user.username === selectedUser ? 'bg-indigo-50/50' : 'hover:bg-slate-50/30'}`} onClick={() => setSelectedUser(user.username)}>
                                    <td className="px-10 py-8">
                                        <div className="flex items-center">
                                            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mr-6 shadow-md ${user.role === 'ADMIN' ? 'bg-indigo-600 text-white shadow-indigo-200' : 'bg-slate-900 text-slate-400'}`}>
                                                {user.role === 'ADMIN' ? <Shield className="w-7 h-7" /> : <User className="w-7 h-7" />}
                                            </div>
                                            <div>
                                                <div className="font-black text-slate-900 text-xl tracking-tight">{user.username}</div>
                                                <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">
                                                    Créé le {new Date(user.createdAt).toLocaleDateString()}
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-8 text-center">
                                        <span className={`inline-flex items-center px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-[0.2em] ${user.role === 'ADMIN' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-500'}`}>
                                            {user.role}
                                        </span>
                                    </td>
                                    <td className="px-6 py-8 text-center">
                                        <div className="flex flex-col items-center">
                                            <div className="flex items-center space-x-2 text-slate-900 font-black text-lg">
                                                <BrainCircuit className="w-4 h-4 text-indigo-400" />
                                                <span>{Math.round(user.stats.totalTokens / 1000)}k</span>
                                            </div>
                                            <span className="text-[8px] font-black uppercase text-slate-400 mt-1">Tokens Used</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-8 text-center">
                                        <div className="flex justify-center space-x-2">
                                            <button onClick={(e) => { e.stopPropagation(); togglePassword(user.username); }} className="p-2 text-slate-400 hover:text-indigo-600 bg-white rounded-lg border border-slate-200">
                                                {revealedPasswords.has(user.username) ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                            </button>
                                            <button onClick={(e) => { e.stopPropagation(); handleForceReset(user.username); }} className="p-2 text-slate-400 hover:text-indigo-600 bg-white rounded-lg border border-slate-200">
                                                <RefreshCcw className="w-4 h-4" />
                                            </button>
                                            {user.username !== currentUser && (
                                                <button onClick={(e) => { e.stopPropagation(); onDeleteUser(user.username); }} className="p-2 text-slate-300 hover:text-rose-600 bg-white rounded-lg border border-slate-200">
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Audit Sidebar / Monitoring Panel */}
            {selectedUser && activeUserDetail && (
                <div className="w-1/3 bg-slate-900 text-white p-12 overflow-y-auto custom-scrollbar border-l border-white/5 animate-in slide-in-from-right duration-300">
                    <div className="flex justify-between items-start mb-10">
                        <div className="flex items-center space-x-4">
                            <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center">
                                <Activity className="w-8 h-8 text-indigo-400" />
                            </div>
                            <div>
                                <h3 className="text-2xl font-black">{activeUserDetail.username}</h3>
                                <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">User Monitoring Node</p>
                            </div>
                        </div>
                        <button onClick={() => setSelectedUser(null)} className="p-2 hover:bg-white/10 rounded-full"><X className="w-5 h-5" /></button>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-10">
                        <div className="p-6 bg-white/5 border border-white/10 rounded-[2rem]">
                            <span className="text-[9px] font-black uppercase text-slate-500 block mb-2">Extractions</span>
                            <span className="text-3xl font-black">{activeUserDetail.stats.extractRequests}</span>
                        </div>
                        <div className="p-6 bg-white/5 border border-white/10 rounded-[2rem]">
                            <span className="text-[9px] font-black uppercase text-slate-500 block mb-2">Role Control</span>
                            <button 
                                onClick={() => onUpdateRole(activeUserDetail.username, activeUserDetail.role === 'ADMIN' ? 'USER' : 'ADMIN')}
                                className={`text-[10px] font-black uppercase tracking-widest px-4 py-1.5 rounded-lg mt-1 transition-all ${activeUserDetail.role === 'ADMIN' ? 'bg-indigo-600 text-white' : 'bg-slate-700 text-slate-300'}`}
                            >
                                {activeUserDetail.role}
                            </button>
                        </div>
                    </div>

                    <div className="space-y-8">
                        <div>
                            <h4 className="flex items-center text-[11px] font-black uppercase tracking-[0.2em] text-indigo-400 mb-4">
                                <Clock className="w-4 h-4 mr-2" /> Connexion History
                            </h4>
                            <div className="space-y-3">
                                {(activeUserDetail.loginHistory || []).slice(0, 10).map((ts, i) => (
                                    <div key={i} className="flex justify-between items-center p-4 bg-white/5 rounded-2xl border border-white/5">
                                        <span className="text-xs font-mono">{new Date(ts).toLocaleDateString()}</span>
                                        <span className="text-xs text-slate-500">{new Date(ts).toLocaleTimeString()}</span>
                                    </div>
                                ))}
                                {(!activeUserDetail.loginHistory || activeUserDetail.loginHistory.length === 0) && (
                                    <p className="text-xs text-slate-600 italic">No history available</p>
                                )}
                            </div>
                        </div>

                        <div>
                            <h4 className="flex items-center text-[11px] font-black uppercase tracking-[0.2em] text-indigo-400 mb-4">
                                <ListChecks className="w-4 h-4 mr-2" /> Activity Stream
                            </h4>
                            <div className="space-y-4">
                                {(activeUserDetail.activityLog || []).map((act) => (
                                    <div key={act.id} className="relative pl-6 pb-6 border-l border-white/10 last:pb-0">
                                        <div className="absolute left-[-5px] top-0 w-[9px] h-[9px] rounded-full bg-indigo-500"></div>
                                        <div className="text-[10px] font-black text-slate-500 mb-1">{new Date(act.timestamp).toLocaleString()}</div>
                                        <div className="text-sm font-bold text-white">{act.action}</div>
                                        {act.details && <div className="text-xs text-slate-400 mt-1">{act.details}</div>}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};
