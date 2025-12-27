
import React, { useEffect, useRef, useState } from 'react';
import { ProcessingLog } from '../types';
import { AlertCircle, CheckCircle, Info, FileWarning, ChevronDown, ChevronUp, Terminal, Activity, Zap, History } from 'lucide-react';

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

  const getStatusColor = (type: string) => {
    switch (type) {
      case 'success': return 'bg-emerald-500';
      case 'error': return 'bg-rose-500';
      case 'warning': return 'bg-amber-500';
      default: return 'bg-indigo-500';
    }
  };

  const getStatusLightColor = (type: string) => {
    switch (type) {
      case 'success': return 'bg-emerald-50 border-emerald-100 text-emerald-600';
      case 'error': return 'bg-rose-50 border-rose-100 text-rose-600';
      case 'warning': return 'bg-amber-50 border-amber-100 text-amber-600';
      default: return 'bg-indigo-50 border-indigo-100 text-indigo-600';
    }
  };

  // Helper pour extraire les tokens du message
  const extractTokens = (msg: string) => {
    const match = msg.match(/\((\d+) tokens\)/);
    return match ? match[1] : null;
  };

  const cleanMessage = (msg: string) => {
    return msg.replace(/\(\d+ tokens\)/, '').trim();
  };

  return (
    <div className={`bg-white border border-slate-200 rounded-[2.5rem] flex flex-col transition-all duration-500 shadow-sm ${isExpanded ? 'h-[750px]' : 'h-96'}`}>
      <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center shrink-0">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-slate-950 rounded-xl text-white shadow-lg"><History className="w-4 h-4" /></div>
          <div>
            <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-[0.2em]">Flux d'Audit RFE</h3>
            <p className="text-[7px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Real-time Governance Trace</p>
          </div>
        </div>
        <button onClick={() => setIsExpanded(!isExpanded)} className="p-2 bg-slate-50 text-slate-400 hover:text-slate-900 rounded-xl transition-all border border-slate-100">
           {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
        </button>
      </div>
      
      <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-4 p-6 custom-scrollbar bg-slate-50/30">
        {logs.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center opacity-30 text-center px-4">
             <div className="w-12 h-12 bg-slate-200 rounded-full flex items-center justify-center mb-4"><Activity className="w-6 h-6 text-slate-400" /></div>
             <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">En attente d'activité système...</p>
          </div>
        )}
        
        <div className="relative border-l-2 border-slate-200 ml-2 pl-6 space-y-6">
          {logs.map((log, idx) => {
            const tokens = extractTokens(log.message);
            const message = cleanMessage(log.message);
            
            return (
              <div key={log.id} className="relative group animate-in slide-in-from-left-2 fade-in">
                {/* Point sur la timeline */}
                <div className={`absolute -left-[31px] top-1 w-3 h-3 rounded-full border-2 border-white ring-4 ring-white shadow-sm transition-transform group-hover:scale-125 ${getStatusColor(log.type)}`}></div>
                
                <div className="flex flex-col space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">
                      {log.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>
                    {tokens && (
                      <span className="flex items-center px-2 py-0.5 bg-indigo-50 border border-indigo-100 text-indigo-600 rounded-md text-[7px] font-black uppercase tracking-widest animate-in zoom-in">
                        <Zap className="w-2 h-2 mr-1" /> {tokens} tokens
                      </span>
                    )}
                  </div>
                  
                  <div className={`p-3 rounded-2xl border text-[10px] font-bold leading-relaxed shadow-sm transition-all group-hover:shadow-md bg-white ${log.type === 'error' ? 'border-rose-100 text-rose-700' : 'border-slate-100 text-slate-700'}`}>
                    {message}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      
      <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between shrink-0">
         <div className="flex items-center space-x-2">
            <span className="text-[8px] font-black uppercase text-slate-400 tracking-widest">{logs.length} Opérations</span>
            {logs.length > 0 && <span className="w-1 h-1 bg-slate-300 rounded-full"></span>}
            {logs.length > 0 && (
                <span className="text-[8px] font-black uppercase text-indigo-500 tracking-widest">
                    {logs.filter(l => l.type === 'success').length} Success
                </span>
            )}
         </div>
         <div className="h-1.5 w-1.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.4)]"></div>
      </div>
    </div>
  );
};
