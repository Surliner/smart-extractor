
import React, { useState, useEffect } from 'react';
import { UserCircle, ArrowRight, ShieldCheck, Key, UserPlus, LogIn, Cpu, HelpCircle, ArrowLeft, RefreshCw, Eye, EyeOff, Info, LayoutGrid, Database, Globe, ChevronDown } from 'lucide-react';
import { UserProfile } from '../types';
import { dbService } from '../services/databaseService';

interface LoginScreenProps {
  onLogin: (user: UserProfile) => void;
  users: UserProfile[];
  onRegister: (username: string, pass: string, securityQuestion?: string, securityAnswer?: string) => void;
  onResetPassword: (username: string, newPass: string) => void;
}

const SECURITY_QUESTIONS = [
  "In what city were you born?",
  "What is your mother's maiden name?",
  "What was the name of your first pet?",
  "What was the model of your first car?",
  "What was the name of your elementary school?",
  "What is your favorite secret code word?"
];

type ViewState = 'LOGIN' | 'REGISTER' | 'RECOVER_IDENTIFY' | 'RECOVER_CHALLENGE' | 'RECOVER_RESET';

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin, users, onRegister, onResetPassword }) => {
  const [view, setView] = useState<ViewState>(users.length === 0 ? 'REGISTER' : 'LOGIN');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [securityQuestion, setSecurityQuestion] = useState(SECURITY_QUESTIONS[0]);
  const [securityAnswer, setSecurityAnswer] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [recoveryUser, setRecoveryUser] = useState<UserProfile | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setError('');
    setSuccess('');
    setShowPassword(false);
  }, [view]);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
        const user = await dbService.login(username, password);
        onLogin(user);
    } catch (err: any) {
        setError(err.message);
    } finally {
        setIsLoading(false);
    }
  };

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const cleanUser = username.trim();
    if (!cleanUser || !password.trim() || !securityAnswer.trim()) {
      setError('Mandatory fields missing for profile initialization.');
      return;
    }
    onRegister(cleanUser, password, securityQuestion, securityAnswer);
  };

  const handleRecoveryIdentify = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const user = users.find(u => u.username.toLowerCase().trim() === username.toLowerCase().trim());
    if (!user) {
      setError('Identity not found in Local Partition.');
      return;
    }
    if (!user.securityQuestion) {
      setError('Legacy profile: No security challenge configured.');
      return;
    }
    setRecoveryUser(user);
    setView('RECOVER_CHALLENGE');
  };

  const handleRecoveryChallenge = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (securityAnswer.toLowerCase().trim() === recoveryUser?.securityAnswer?.toLowerCase().trim()) {
      setView('RECOVER_RESET');
    } else {
      setError('Validation failed: Incorrect challenge response.');
    }
  };

  const handleRecoveryReset = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!newPassword.trim()) {
      setError('New credential cannot be null.');
      return;
    }
    onResetPassword(recoveryUser!.username, newPassword);
    setSuccess('Partition Credentials Updated. Redirecting...');
    setTimeout(() => { resetForm(); setView('LOGIN'); }, 2000);
  };

  const resetForm = () => {
    setUsername('');
    setPassword('');
    setSecurityAnswer('');
    setRecoveryUser(null);
    setNewPassword('');
  };

  const isInitialSetup = users.length === 0;

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 font-sans overflow-hidden">
      <div className="fixed inset-0 overflow-hidden pointer-events-none opacity-20">
         <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-indigo-600 rounded-full blur-[150px]"></div>
         <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-purple-600 rounded-full blur-[150px]"></div>
      </div>

      <div className="bg-slate-900/40 backdrop-blur-3xl rounded-[3rem] shadow-[0_50px_100px_-20px_rgba(0,0,0,0.8)] border border-white/5 p-12 w-full max-w-xl relative z-10 flex flex-col">
        
        <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-2xl p-4 mb-10 flex items-center space-x-4">
           <div className="bg-indigo-500 p-2 rounded-xl text-white">
              <Database className="w-5 h-5" />
           </div>
           <div>
              <p className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] leading-tight mb-0.5">Cloud Storage Active</p>
              <p className="text-[10px] font-bold text-slate-400 leading-tight">Profiles are now persistent on Render PostgreSQL database.</p>
           </div>
        </div>

        <div className="flex flex-col items-center mb-12">
          <div className="bg-white p-6 rounded-[2.5rem] mb-8 shadow-2xl group transition-all cursor-pointer">
            <Cpu className="w-12 h-12 text-slate-950 group-hover:scale-110 transition-transform" />
          </div>
          <h1 className="text-4xl font-black text-white tracking-tighter">
            Invoice<span className="text-indigo-500">Command</span>
          </h1>
          <div className="flex items-center mt-4 space-x-2">
             <div className={`w-2 h-2 rounded-full ${isInitialSetup ? 'bg-amber-500' : 'bg-emerald-500'}`}></div>
             <p className="text-[10px] font-black uppercase text-slate-500 tracking-[0.3em]">
               {isInitialSetup ? 'System Initialization Pending' : 'Secure Vault Active'}
             </p>
          </div>
        </div>

        <div className="flex-1">
          {error && (
            <div className="bg-rose-500/10 text-rose-400 px-5 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest flex items-center border border-rose-500/20 mb-8 animate-in slide-in-from-top-2">
               <ShieldCheck className="w-4 h-4 mr-3 shrink-0" /> {error}
            </div>
          )}
          {success && (
            <div className="bg-emerald-500/10 text-emerald-400 px-5 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest flex items-center border border-emerald-500/20 mb-8 animate-in slide-in-from-top-2">
               <RefreshCw className="w-4 h-4 mr-3 shrink-0 animate-spin" /> {success}
            </div>
          )}

          {view === 'LOGIN' && (
            <form onSubmit={handleLoginSubmit} className="space-y-6">
              <FormGroup label="System Identifier" icon={UserCircle} value={username} onChange={setUsername} placeholder="Username" theme="dark" />
              <FormGroup 
                label="Access Credential" 
                icon={Key} 
                type={showPassword ? "text" : "password"} 
                value={password} 
                onChange={setPassword} 
                placeholder="Password"
                theme="dark"
                rightElement={
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="p-2 text-slate-500 hover:text-white transition-colors">
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                }
              />
              <button disabled={isLoading} type="submit" className="w-full bg-white hover:bg-slate-100 text-slate-950 font-black uppercase text-[11px] tracking-[0.2em] py-5 rounded-[1.5rem] flex items-center justify-center transition-all shadow-2xl active:scale-95 disabled:opacity-50">
                {isLoading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <LogIn className="w-5 h-5 mr-3" />} Execute Login Sequence
              </button>
              <div className="flex justify-center">
                <button type="button" onClick={() => setView('RECOVER_IDENTIFY')} className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 hover:text-indigo-400 transition-colors">
                  Credential Recovery
                </button>
              </div>
            </form>
          )}

          {view === 'REGISTER' && (
            <form onSubmit={handleRegisterSubmit} className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              {isInitialSetup && (
                <div className="p-4 bg-indigo-600 rounded-2xl mb-2 text-center shadow-xl shadow-indigo-500/20">
                   <p className="text-[10px] font-black uppercase text-white tracking-widest">Master Admin Initialization</p>
                   <p className="text-[9px] text-indigo-100 mt-1">First user or names 'admin', ' Jean Duhamel' get ADMIN role.</p>
                </div>
              )}
              <div className="grid grid-cols-1 gap-5 max-h-[45vh] overflow-y-auto pr-2 custom-scrollbar p-1">
                <FormGroup label="New Identifier" icon={UserCircle} value={username} onChange={setUsername} placeholder="Create username" theme="dark" />
                <FormGroup label="Security Credential" icon={Key} type="password" value={password} onChange={setPassword} placeholder="Create password" theme="dark" />
                
                <div className="pt-4 border-t border-white/5">
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 ml-1">Recovery Challenge Question</label>
                  <div className="relative group">
                    <HelpCircle className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
                    <select 
                      value={securityQuestion}
                      onChange={(e) => setSecurityQuestion(e.target.value)}
                      className="w-full pl-12 pr-10 py-4 rounded-2xl border border-white/10 bg-white/5 text-sm text-slate-200 font-black appearance-none outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all cursor-pointer"
                    >
                      {SECURITY_QUESTIONS.map(q => <option key={q} value={q} className="bg-slate-900 text-white">{q}</option>)}
                    </select>
                    <ChevronDown className="w-4 h-4 text-slate-500 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>
                <FormGroup label="Challenge Response" icon={ShieldCheck} value={securityAnswer} onChange={setSecurityAnswer} placeholder="Your secret answer" theme="dark" />
              </div>

              <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-black uppercase text-[11px] tracking-[0.2em] py-5 rounded-[1.5rem] flex items-center justify-center transition-all shadow-xl shadow-indigo-500/20 active:scale-95">
                <UserPlus className="w-5 h-5 mr-3" /> Initialize Profile
              </button>
            </form>
          )}

          {/* ... Recovery views stay same ... */}
        </div>
        
        {view === 'LOGIN' || view === 'REGISTER' ? (
          <div className="mt-12 pt-10 border-t border-white/5 flex flex-col items-center space-y-6">
             <button 
               onClick={() => { resetForm(); setView(view === 'REGISTER' ? 'LOGIN' : 'REGISTER'); }}
               className="text-[10px] font-black uppercase tracking-[0.3em] text-white hover:text-indigo-400 transition-all bg-white/5 px-10 py-3 rounded-full border border-white/5 hover:border-indigo-500/30"
             >
               {view === 'REGISTER' ? 'Switch to Login' : 'Register Profile'}
             </button>
          </div>
        ) : null}
      </div>
    </div>
  );
};

const FormGroup = ({ label, icon: Icon, value, onChange, placeholder, type = 'text', rightElement, theme = 'light' }: any) => {
  const isDark = theme === 'dark';
  return (
    <div className="group transition-all">
      <label className={`block text-[10px] font-black uppercase tracking-widest mb-3 ml-1 transition-colors ${isDark ? 'text-slate-500 group-focus-within:text-indigo-400' : 'text-slate-400 group-focus-within:text-indigo-600'}`}>
        {label}
      </label>
      <div className="relative">
        <Icon className={`w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${isDark ? 'text-slate-500 group-focus-within:text-indigo-400' : 'text-slate-400 group-focus-within:text-indigo-600'}`} />
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`w-full pl-12 pr-12 py-4 rounded-2xl border outline-none transition-all text-sm font-black 
            ${isDark 
              ? 'bg-white/5 border-white/10 text-white placeholder-slate-600 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10' 
              : 'bg-slate-50/50 border-slate-200 text-slate-800 placeholder-slate-300 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10'
            }`}
          required
        />
        {rightElement && (
            <div className="absolute right-2 top-1/2 -translate-y-1/2">
                {rightElement}
            </div>
        )}
      </div>
    </div>
  );
};
