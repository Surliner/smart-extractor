
import React, { useState, useEffect } from 'react';
import { UserCircle, ArrowRight, ShieldCheck, Key, UserPlus, LogIn, Cpu, HelpCircle, ArrowLeft, RefreshCw, Eye, EyeOff, Info, LayoutGrid, Database, Globe, ChevronDown, Fingerprint, Lock, ShieldAlert } from 'lucide-react';
import { UserProfile } from '../types';
import { dbService } from '../services/databaseService';

interface LoginScreenProps {
  onLogin: (user: UserProfile) => void;
  users: UserProfile[];
  onRegister: (username: string, pass: string, securityQuestion?: string, securityAnswer?: string) => void;
  onResetPassword: (username: string, newPass: string, answer?: string) => void;
}

const SECURITY_QUESTIONS = [
  "Dans quelle ville êtes-vous né ?",
  "Quel est le nom de jeune fille de votre mère ?",
  "Quel était le nom de votre premier animal de compagnie ?",
  "Quel était le modèle de votre première voiture ?",
  "Quel était le nom de votre école primaire ?",
  "Quel est votre mot de code secret préféré ?"
];

type ViewState = 'LOGIN' | 'REGISTER' | 'RECOVER_IDENTIFY' | 'RECOVER_CHALLENGE' | 'RECOVER_RESET';

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin, users = [], onRegister, onResetPassword }) => {
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
        setError(err.message || "Identifiants incorrects ou erreur serveur.");
    } finally {
        setIsLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const cleanUser = username.trim();
    if (!cleanUser || !password.trim() || !securityAnswer.trim()) {
      setError('Champs obligatoires manquants pour l\'initialisation du profil.');
      return;
    }
    setIsLoading(true);
    try {
        const res = await dbService.register(cleanUser, password, securityQuestion, securityAnswer);
        if (res.pending) {
            setSuccess("Inscription réussie ! Votre compte est en attente d'approbation par un administrateur.");
            setTimeout(() => setView('LOGIN'), 4000);
        } else {
            setSuccess("Inscription réussie ! Vous pouvez maintenant vous connecter.");
            setTimeout(() => setView('LOGIN'), 2000);
        }
    } catch (err: any) {
        setError(err.message);
    } finally {
        setIsLoading(false);
    }
  };

  const handleRecoveryIdentify = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const userList = Array.isArray(users) ? users : [];
    const user = userList.find(u => u.username.toLowerCase().trim() === username.toLowerCase().trim());
    if (!user) {
      setError('Identité introuvable dans la partition locale.');
      return;
    }
    if (!user.securityQuestion) {
      setError('Profil hérité : Aucune question de sécurité configurée.');
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
      setError('Échec de la validation : Réponse incorrecte.');
    }
  };

  const handleRecoveryReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!newPassword.trim()) {
      setError('Le nouveau mot de passe ne peut pas être vide.');
      return;
    }
    try {
        setIsLoading(true);
        await onResetPassword(recoveryUser!.username, newPassword, securityAnswer);
        setSuccess('Identifiants mis à jour. Redirection...');
        setTimeout(() => { resetForm(); setView('LOGIN'); }, 2000);
    } catch (err: any) {
        setError(err.message);
    } finally {
        setIsLoading(false);
    }
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

      <div className="bg-slate-900/40 backdrop-blur-3xl rounded-[3rem] shadow-[0_50px_100px_-20px_rgba(0,0,0,0.8)] border border-white/5 p-12 w-full max-w-xl relative z-10 flex flex-col min-h-[600px]">
        
        <div className="flex flex-col items-center mb-10">
          <div className="bg-white p-6 rounded-[2.5rem] mb-6 shadow-2xl group transition-all cursor-pointer">
            <Cpu className="w-10 h-10 text-slate-950 group-hover:scale-110 transition-transform" />
          </div>
          <h1 className="text-4xl font-black text-white tracking-tighter">
            Invoice<span className="text-indigo-500">Command</span>
          </h1>
          <div className="flex items-center mt-3 space-x-2">
             <div className={`w-2 h-2 rounded-full ${isInitialSetup ? 'bg-amber-500' : 'bg-emerald-500'}`}></div>
             <p className="text-[10px] font-black uppercase text-slate-500 tracking-[0.3em]">
               {isInitialSetup ? 'Initialisation système requise' : 'Accès sécurisé actif'}
             </p>
          </div>
        </div>

        <div className="flex-1">
          {error && (
            <div className="bg-rose-500/10 text-rose-400 px-5 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest flex items-center border border-rose-500/20 mb-8 animate-in slide-in-from-top-2">
               <ShieldAlert className="w-4 h-4 mr-3 shrink-0" /> {error}
            </div>
          )}
          {success && (
            <div className="bg-emerald-500/10 text-emerald-400 px-5 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest flex items-center border border-emerald-500/20 mb-8 animate-in slide-in-from-top-2 leading-relaxed">
               <RefreshCw className="w-4 h-4 mr-3 shrink-0 animate-spin" /> {success}
            </div>
          )}

          {view === 'LOGIN' && (
            <form onSubmit={handleLoginSubmit} className="space-y-6 animate-in fade-in duration-500">
              <FormGroup label="Identifiant Système" icon={UserCircle} value={username} onChange={setUsername} placeholder="Nom d'utilisateur" theme="dark" />
              <FormGroup 
                label="Accès sécurisé" 
                icon={Key} 
                type={showPassword ? "text" : "password"} 
                value={password} 
                onChange={setPassword} 
                placeholder="Mot de passe"
                theme="dark"
                rightElement={
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="p-2 text-slate-500 hover:text-white transition-colors">
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                }
              />
              <button disabled={isLoading} type="submit" className="w-full bg-white hover:bg-slate-100 text-slate-950 font-black uppercase text-[11px] tracking-[0.2em] py-5 rounded-[1.5rem] flex items-center justify-center transition-all shadow-2xl active:scale-95 disabled:opacity-50">
                {isLoading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <LogIn className="w-5 h-5 mr-3" />} Lancer la connexion
              </button>
              <div className="flex justify-center">
                <button type="button" onClick={() => { resetForm(); setView('RECOVER_IDENTIFY'); }} className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 hover:text-indigo-400 transition-colors">
                  Récupération de compte
                </button>
              </div>
            </form>
          )}

          {view === 'REGISTER' && (
            <form onSubmit={handleRegisterSubmit} className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="grid grid-cols-1 gap-5 max-h-[45vh] overflow-y-auto pr-2 custom-scrollbar p-1">
                <FormGroup label="Nouvel Identifiant" icon={UserCircle} value={username} onChange={setUsername} placeholder="Choisissez un nom d'utilisateur" theme="dark" />
                <FormGroup label="Mot de passe" icon={Key} type="password" value={password} onChange={setPassword} placeholder="Créez votre mot de passe" theme="dark" />
                
                <div className="pt-4 border-t border-white/5">
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 ml-1">Question de sécurité</label>
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
                <FormGroup label="Réponse secrète" icon={ShieldCheck} value={securityAnswer} onChange={setSecurityAnswer} placeholder="Votre réponse" theme="dark" />
              </div>

              <button disabled={isLoading} type="submit" className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-black uppercase text-[11px] tracking-[0.2em] py-5 rounded-[1.5rem] flex items-center justify-center transition-all shadow-xl shadow-indigo-500/20 active:scale-95 disabled:opacity-50">
                {isLoading ? <RefreshCw className="w-5 h-5 mr-3 animate-spin" /> : <UserPlus className="w-5 h-5 mr-3" />} Initialiser le profil
              </button>
            </form>
          )}

          {view === 'RECOVER_IDENTIFY' && (
            <form onSubmit={handleRecoveryIdentify} className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
              <div className="flex items-center space-x-3 mb-2">
                 <div className="px-2 py-1 bg-white/5 rounded-md text-[9px] font-black text-slate-400 border border-white/5 uppercase tracking-widest">Étape 1/3</div>
                 <h3 className="text-[11px] font-black text-white uppercase tracking-widest">Localiser le compte</h3>
              </div>
              <FormGroup label="Identifiant enregistré" icon={Fingerprint} value={username} onChange={setUsername} placeholder="Nom d'utilisateur" theme="dark" />
              <button type="submit" className="w-full bg-white hover:bg-slate-100 text-slate-950 font-black uppercase text-[11px] tracking-[0.2em] py-5 rounded-[1.5rem] flex items-center justify-center transition-all shadow-2xl active:scale-95">
                Valider l'identité <ArrowRight className="w-4 h-4 ml-3" />
              </button>
              <button type="button" onClick={() => setView('LOGIN')} className="w-full text-[10px] font-black uppercase text-slate-500 hover:text-white transition-colors flex items-center justify-center">
                 <ArrowLeft className="w-3 h-3 mr-2" /> Retour à la connexion
              </button>
            </form>
          )}

          {view === 'RECOVER_CHALLENGE' && recoveryUser && (
            <form onSubmit={handleRecoveryChallenge} className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
              <div className="flex items-center space-x-3 mb-2">
                 <div className="px-2 py-1 bg-indigo-500/20 rounded-md text-[9px] font-black text-indigo-400 border border-indigo-500/20 uppercase tracking-widest">Étape 2/3</div>
                 <h3 className="text-[11px] font-black text-white uppercase tracking-widest">Vérification de sécurité</h3>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-2">
                 <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-2">Question de sécurité</label>
                 <p className="text-sm font-black text-indigo-400 italic">"{recoveryUser.securityQuestion}"</p>
              </div>
              <FormGroup label="Réponse secrète" icon={ShieldCheck} value={securityAnswer} onChange={setSecurityAnswer} placeholder="Votre réponse" theme="dark" />
              <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-black uppercase text-[11px] tracking-[0.2em] py-5 rounded-[1.5rem] flex items-center justify-center transition-all shadow-xl shadow-indigo-500/20 active:scale-95">
                Vérifier la réponse <ArrowRight className="w-4 h-4 ml-3" />
              </button>
              <button type="button" onClick={() => setView('RECOVER_IDENTIFY')} className="w-full text-[10px] font-black uppercase text-slate-500 hover:text-white transition-colors flex items-center justify-center">
                 <ArrowLeft className="w-3 h-3 mr-2" /> Erreur d'utilisateur ? Retour
              </button>
            </form>
          )}

          {view === 'RECOVER_RESET' && (
            <form onSubmit={handleRecoveryReset} className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
              <div className="flex items-center space-x-3 mb-2">
                 <div className="px-2 py-1 bg-emerald-500/20 rounded-md text-[9px] font-black text-emerald-400 border border-emerald-500/20 uppercase tracking-widest">Étape 3/3</div>
                 <h3 className="text-[11px] font-black text-white uppercase tracking-widest">Réinitialisation d'accès</h3>
              </div>
              <FormGroup label="Nouveau mot de passe" icon={Lock} type="password" value={newPassword} onChange={setNewPassword} placeholder="Saisissez le nouveau mot de passe" theme="dark" />
              <button disabled={isLoading} type="submit" className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase text-[11px] tracking-[0.2em] py-5 rounded-[1.5rem] flex items-center justify-center transition-all shadow-xl shadow-emerald-500/20 active:scale-95 disabled:opacity-50">
                {isLoading ? <RefreshCw className="w-4 h-4 mr-3 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-3" />}
                Mettre à jour le mot de passe
              </button>
            </form>
          )}
        </div>
        
        {(view === 'LOGIN' || view === 'REGISTER') && (
          <div className="mt-10 pt-10 border-t border-white/5 flex flex-col items-center space-y-6">
             <button 
               onClick={() => { resetForm(); setView(view === 'REGISTER' ? 'LOGIN' : 'REGISTER'); }}
               className="text-[10px] font-black uppercase tracking-[0.3em] text-white hover:text-indigo-400 transition-all bg-white/5 px-10 py-3 rounded-full border border-white/5 hover:border-indigo-500/30"
             >
               {view === 'REGISTER' ? 'Déjà un compte ? Connexion' : 'Créer un compte'}
             </button>
          </div>
        )}
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
