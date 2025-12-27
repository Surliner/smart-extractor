
import React, { useEffect, useRef, useState, useMemo } from 'react';
import { ProcessingLog } from '../types';
import { AlertCircle, CheckCircle, Info, FileWarning, ChevronDown, ChevronUp, Terminal, Activity, Zap, History, Gauge } from 'lucide-react';

interface ProcessingLogsProps {
  logs: ProcessingLog[];
}

export const ProcessingLogs: React.FC<ProcessingLogsProps> = ({ logs }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  // Extraction et sommation des tokens de la session actuelle
  const totalTokensSession = useMemo(() => {
    return logs.reduce((acc, log) => {
      const match = log.message.match(/(\d+)\s*tokens/i);
      return acc + (match ? parseInt(match[1]) : 0);
    }, 0);
  }, [logs]);

  const getStatusColor = (type: string) => {
    switch (type) {
      case 'success': return 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]';
      case 'error': return 'bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.5)]';
      case 'warning': return 'bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]';
      default: return 'bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]';
    }
  };

  const extractTokens = (msg: string) => {
    const match = msg.match(/\((\d+)\s*tokens\)/i);
    return match ? match[1] : null;
  };

  const cleanMessage = (msg: string) => {
    return msg.replace(/\(\d+\s*tokens\)/i, '').trim();
  };

  return (
    <div className={`bg-white border border-slate-200 rounded-[2.5rem] flex flex-col transition-all duration-500 shadow-[0_20px_50px_rgba(0,0,0,0.05)] ${isExpanded ? 'h-[750px]' : 'h-[500px]'}`}>
      <div className="px-6 py-5 border-b border-slate-100 flex flex-col space-y-4 shrink-0 bg-slate-50/50 rounded-t-[2.5rem]">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-slate-950 rounded-xl text-white shadow-lg"><History className="w-4 h-4" /></div>
            <div>
              <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-[0.2em]">Flux d'Audit RFE</h3>
              <p className="text-[7px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Real-time Governance Trace</p>
            </div>
          </div>
          <button onClick={() => setIsExpanded(!isExpanded)} className="p-2 bg-white text-slate-400 hover:text-slate-900 rounded-xl transition-all border border-slate-100 shadow-sm">
             {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
        </div>

        {/* Badge de Consommation Session */}
        <div className="bg-slate-950 rounded-2xl p-4 flex items-center justify-between border border-white/5 shadow-2xl overflow-hidden relative group">
           <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
           <div className="flex items-center space-x-3 relative z-10">
              <div className="p-2 bg-indigo-500/20 rounded-lg"><Gauge className="w-4 h-4 text-indigo-400" /></div>
              <div className="flex flex-col">
                <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Consommation Session</span>
                <span className="text-sm font-mono font-black text-white">{totalTokensSession.toLocaleString()} <span className="text-[8px] text-indigo-400">TOKENS</span></span>
              </div>
           </div>
           <div className="h-8 w-px bg-white/10 mx-2"></div>
           <div className="flex flex-col items-end relative z-10">
              <span className="text-[8px] font-black text-emerald-500 uppercase tracking-widest">Status</span>
              <span className="text-[10px] font-black text-white flex items-center">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full mr-2 animate-pulse"></span>
                LIVE
              </span>
           </div>
        </div>
      </div>
      
      <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-4 p-6 custom-scrollbar bg-white">
        {logs.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center opacity-30 text-center px-4">
             <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mb-4"><Activity className="w-6 h-6 text-slate-400" /></div>
             <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">En attente d'activité système...</p>
          </div>
        )}
        
        <div className="relative border-l-2 border-slate-100 ml-2 pl-6 space-y-6">
          {logs.map((log, idx) => {
            const tokens = extractTokens(log.message);
            const message = cleanMessage(log.message);
            
            return (
              <div key={log.id} className="relative group animate-in slide-in-from-left-2 fade-in duration-300">
                {/* Point sur la timeline */}
                <div className={`absolute -left-[31px] top-1 w-3 h-3 rounded-full border-2 border-white ring-4 ring-white transition-all group-hover:scale-125 ${getStatusColor(log.type)}`}></div>
                
                <div className="flex flex-col space-y-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[8px] font-black text-slate-300 uppercase tracking-tighter">
                      {log.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>
                    {tokens && (
                      <span className="flex items-center px-2 py-0.5 bg-indigo-50 border border-indigo-100 text-indigo-600 rounded-md text-[7px] font-black uppercase tracking-widest animate-in zoom-in">
                        <Zap className="w-2 h-2 mr-1 fill-indigo-500" /> {tokens} tokens
                      </span>
                    )}
                  </div>
                  
                  <div className={`p-3 rounded-2xl border text-[10px] font-bold leading-relaxed shadow-sm transition-all group-hover:border-indigo-200 bg-white ${log.type === 'error' ? 'border-rose-100 text-rose-700 bg-rose-50/20' : 'border-slate-50 text-slate-600'}`}>
                    {message}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      
      <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between shrink-0 rounded-b-[2.5rem]">
         <div className="flex items-center space-x-2">
            <span className="text-[8px] font-black uppercase text-slate-400 tracking-widest">{logs.length} Opérations</span>
            {logs.length > 0 && <span className="w-1 h-1 bg-slate-300 rounded-full"></span>}
            {logs.length > 0 && (
                <span className="text-[8px] font-black uppercase text-indigo-500 tracking-widest">
                    {logs.filter(l => l.type === 'success').length} Success
                </span>
            )}
         </div>
         <div className="flex items-center space-x-1">
            <div className="w-1 h-1 bg-emerald-500 rounded-full animate-ping"></div>
            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
         </div>
      </div>
    </div>
  );
};
