
import React, { useState, useMemo } from 'react';
import { UserProfile, UserRole } from '../types';
import { Shield, User, BrainCircuit, X, Trash2, ShieldCheck, RefreshCcw, Eye, EyeOff, Lock, UserCog, Database, Clock, Activity, ListChecks, ArrowUpRight, TrendingUp, Zap, FileSearch } from 'lucide-react';

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

  const stats = useMemo(() => {
    return {
      totalUsers: users.length,
      totalExtractions: users.reduce((acc, u) => acc + (u.stats?.extractRequests || 0), 0),
      totalTokens: users.reduce((acc, u) => acc + (u.stats?.totalTokens || 0), 0),
      admins: users.filter(u => u.role === 'ADMIN').length
    };
  }, [users]);

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
    }
  };

  const activeUserDetail = users.find(u => u.username === selectedUser);

  return (
    <div className="fixed inset-0 bg-slate-950/95 flex items-center justify-center z-[110] backdrop-blur-2xl p-4 lg:p-10">
      <div className="bg-white rounded-[3.5rem] shadow-[0_60px_150px_-30px_rgba(0,0,0,0.6)] border border-slate-200 w-full max-w-[1800px] h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">
        
        {/* Header Section */}
        <div className="px-12 py-8 border-b border-slate-100 flex justify-between items-center bg-white shrink-0">
          <div className="flex items-center space-x-8">
            <div className="bg-indigo-600 p-5 rounded-[2rem] text-white shadow-2xl shadow-indigo-500/20">
               <ShieldCheck className="w-10 h-10" />
            </div>
            <div>
                <h2 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic">User Intelligence Center</h2>
                <p className="text-[11px] font-black text-slate-400 mt-2 uppercase tracking-[0.5em] flex items-center">
                  <UserCog className="w-4 h-4 mr-2 text-indigo-500" /> Administrative Instance Control & Data Monitoring
                </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-12">
            <div className="flex space-x-10">
               <StatMinimal label="Active Nodes" value={stats.totalUsers} />
               <StatMinimal label="Total Tokens" value={`${(stats.totalTokens / 1000000).toFixed(2)}M`} color="text-indigo-600" />
               <StatMinimal label="Extractions" value={stats.totalExtractions} />
            </div>
            <button onClick={onClose} className="p-4 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-3xl transition-all">
              <X className="w-10 h-10" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-hidden flex bg-slate-50">
            {/* Main Data Grid */}
            <div className={`flex-1 overflow-y-auto p-12 custom-scrollbar transition-all duration-500 ${selectedUser ? 'w-[65%]' : 'w-full'}`}>
                <div className="grid grid-cols-1 gap-6">
                    <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-xl overflow-hidden">
                        <table className="w-full text-sm text-left border-collapse">
                            <thead className="bg-slate-50/80 text-slate-400 uppercase font-black text-[10px] tracking-[0.2em] border-b border-slate-200">
                                <tr>
                                    <th className="px-10 py-6">Identity & Partition</th>
                                    <th className="px-6 py-6 text-center">Authorization</th>
                                    <th className="px-6 py-6">Extraction Load</th>
                                    <th className="px-10 py-6 text-right">System Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {users.map(user => (
                                    <tr 
                                      key={user.username} 
                                      onClick={() => setSelectedUser(user.username)}
                                      className={`group cursor-pointer transition-all duration-200 ${user.username === selectedUser ? 'bg-indigo-50/50' : 'hover:bg-slate-50/50'}`}
                                    >
                                        <td className="px-10 py-7">
                                            <div className="flex items-center">
                                                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mr-6 shadow-lg border-2 ${user.role === 'ADMIN' ? 'bg-indigo-600 text-white border-indigo-400' : 'bg-slate-900 text-slate-500 border-slate-700'}`}>
                                                    {user.role === 'ADMIN' ? <Shield className="w-7 h-7" /> : <User className="w-7 h-7" />}
                                                </div>
                                                <div>
                                                    <div className="font-black text-slate-900 text-xl tracking-tight flex items-center">
                                                      {user.username}
                                                      {user.username === currentUser && <span className="ml-3 px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[8px] font-black uppercase rounded">You</span>}
                                                    </div>
                                                    <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1.5 flex items-center">
                                                        <Clock className="w-3 h-3 mr-1.5" /> Initialized on {new Date(user.createdAt).toLocaleDateString()}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-7 text-center">
                                            <span className={`inline-flex items-center px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-[0.2em] shadow-sm border ${user.role === 'ADMIN' ? 'bg-indigo-50 text-indigo-700 border-indigo-100' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                                                {user.role}
                                            </span>
                                        </td>
                                        <td className="px-6 py-7">
                                            <div className="flex flex-col space-y-2">
                                                <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                                                   <span className="text-slate-400">{user.stats?.extractRequests || 0} Docs</span>
                                                   <span className="text-indigo-600">{Math.round((user.stats?.totalTokens || 0) / 1000)}k tkn</span>
                                                </div>
                                                <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                   <div className="h-full bg-indigo-600 rounded-full" style={{ width: `${Math.min(100, (user.stats?.totalTokens || 0) / 10000)}%` }}></div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-10 py-7 text-right">
                                            <div className="flex justify-end space-x-3 opacity-0 group-hover:opacity-100 transition-all">
                                                <button onClick={(e) => { e.stopPropagation(); togglePassword(user.username); }} className="p-2.5 text-slate-400 hover:text-indigo-600 bg-white rounded-xl border border-slate-200 shadow-sm transition-all hover:scale-110">
                                                    {revealedPasswords.has(user.username) ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                                </button>
                                                <button onClick={(e) => { e.stopPropagation(); handleForceReset(user.username); }} className="p-2.5 text-slate-400 hover:text-amber-600 bg-white rounded-xl border border-slate-200 shadow-sm transition-all hover:scale-110">
                                                    <RefreshCcw className="w-4 h-4" />
                                                </button>
                                                {user.username !== currentUser && (
                                                    <button onClick={(e) => { e.stopPropagation(); onDeleteUser(user.username); }} className="p-2.5 text-slate-300 hover:text-rose-600 bg-white rounded-xl border border-slate-200 shadow-sm transition-all hover:scale-110">
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
            </div>

            {/* Comprehensive Audit Panel */}
            {selectedUser && activeUserDetail && (
                <div className="w-[35%] bg-slate-900 text-white p-12 overflow-y-auto custom-scrollbar border-l border-white/5 animate-in slide-in-from-right duration-500 relative">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600/10 rounded-full blur-[100px] -mr-32 -mt-32"></div>
                    
                    <div className="flex justify-between items-start mb-12 relative z-10">
                        <div className="flex items-center space-x-6">
                            <div className="w-20 h-20 bg-indigo-600 rounded-[1.5rem] flex items-center justify-center shadow-2xl shadow-indigo-600/40">
                                <Activity className="w-10 h-10 text-white" />
                            </div>
                            <div>
                                <h3 className="text-3xl font-black tracking-tight">{activeUserDetail.username}</h3>
                                <p className="text-[10px] font-black uppercase text-indigo-400 tracking-widest mt-1">Real-time Activity Node</p>
                            </div>
                        </div>
                        <button onClick={() => setSelectedUser(null)} className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl transition-all"><X className="w-6 h-6 text-slate-400" /></button>
                    </div>

                    <div className="grid grid-cols-2 gap-6 mb-12 relative z-10">
                        <DashboardCard label="Success Ratio" value="98%" icon={Zap} color="emerald" />
                        <DashboardCard label="Role Priority" value={activeUserDetail.role} icon={Shield} color="indigo" onClick={() => onUpdateRole(activeUserDetail.username, activeUserDetail.role === 'ADMIN' ? 'USER' : 'ADMIN')} interactive />
                    </div>

                    <div className="space-y-12 relative z-10">
                        <div>
                            <div className="flex justify-between items-center mb-6">
                                <h4 className="flex items-center text-[12px] font-black uppercase tracking-[0.3em] text-slate-500">
                                    <Clock className="w-4 h-4 mr-2 text-indigo-400" /> Session History
                                </h4>
                                <span className="text-[9px] font-black uppercase bg-white/5 px-2 py-0.5 rounded text-slate-600">Last 10 entries</span>
                            </div>
                            <div className="space-y-3">
                                {(activeUserDetail.loginHistory || []).slice(0, 10).map((ts, i) => (
                                    <div key={i} className="flex justify-between items-center p-5 bg-white/5 rounded-3xl border border-white/5 hover:bg-white/10 transition-all group">
                                        <div className="flex items-center space-x-4">
                                            <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full group-hover:scale-150 transition-all"></div>
                                            <span className="text-xs font-bold text-slate-200">{new Date(ts).toLocaleDateString()}</span>
                                        </div>
                                        <span className="text-xs font-mono text-slate-500">{new Date(ts).toLocaleTimeString()}</span>
                                    </div>
                                ))}
                                {(!activeUserDetail.loginHistory || activeUserDetail.loginHistory.length === 0) && (
                                    <div className="py-10 text-center bg-white/5 rounded-3xl border border-dashed border-white/10">
                                       <p className="text-xs text-slate-600 font-bold uppercase tracking-widest italic">No entry logs found in partition</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div>
                            <div className="flex justify-between items-center mb-6">
                                <h4 className="flex items-center text-[12px] font-black uppercase tracking-[0.3em] text-slate-500">
                                    <ListChecks className="w-4 h-4 mr-2 text-emerald-400" /> Activity Stream
                                </h4>
                                <FileSearch className="w-4 h-4 text-slate-700" />
                            </div>
                            <div className="space-y-6">
                                {(activeUserDetail.activityLog || []).map((act) => (
                                    <div key={act.id} className="relative pl-8 pb-8 border-l border-white/10 last:pb-0">
                                        <div className="absolute left-[-5px] top-0 w-[9px] h-[9px] rounded-full bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]"></div>
                                        <div className="text-[10px] font-black text-slate-600 mb-1.5 uppercase tracking-widest">{new Date(act.timestamp).toLocaleString()}</div>
                                        <div className="text-sm font-black text-white leading-tight">{act.action}</div>
                                        {act.details && <div className="text-[11px] font-medium text-slate-400 mt-2 bg-white/5 p-3 rounded-xl border border-white/5">{act.details}</div>}
                                    </div>
                                ))}
                                {(!activeUserDetail.activityLog || activeUserDetail.activityLog.length === 0) && (
                                    <div className="py-10 text-center bg-white/5 rounded-3xl border border-dashed border-white/10">
                                       <p className="text-xs text-slate-600 font-bold uppercase tracking-widest italic">No activity recorded in audit trail</p>
                                    </div>
                                )}
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

const StatMinimal = ({ label, value, color = "text-slate-900" }: any) => (
  <div className="text-center">
    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</p>
    <p className={`text-2xl font-black tracking-tighter ${color}`}>{value}</p>
  </div>
);

const DashboardCard = ({ label, value, icon: Icon, color, onClick, interactive }: any) => {
  const colors: any = {
    indigo: "bg-indigo-600/10 border-indigo-600/20 text-indigo-400",
    emerald: "bg-emerald-600/10 border-emerald-600/20 text-emerald-400"
  };
  
  return (
    <div 
      onClick={onClick}
      className={`p-6 rounded-[2rem] border transition-all ${colors[color]} ${interactive ? 'cursor-pointer hover:bg-opacity-20 active:scale-95' : ''}`}
    >
      <div className="flex justify-between items-center mb-4">
        <span className="text-[10px] font-black uppercase tracking-widest opacity-60">{label}</span>
        <Icon className="w-4 h-4" />
      </div>
      <div className="flex items-center justify-between">
        <span className="text-2xl font-black text-white">{value}</span>
        {interactive && <ArrowUpRight className="w-5 h-5 opacity-40" />}
      </div>
    </div>
  );
};
