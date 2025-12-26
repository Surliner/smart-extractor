
import React, { useEffect, useRef, useState } from 'react';
import { ProcessingLog } from '../types';
import { AlertCircle, CheckCircle, Info, FileWarning, ChevronDown, ChevronUp, Terminal } from 'lucide-react';

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

  const getIcon = (type: string) => {
    switch (type) {
      case 'success': return <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />;
      case 'error': return <AlertCircle className="w-3.5 h-3.5 text-rose-500" />;
      case 'warning': return <FileWarning className="w-3.5 h-3.5 text-amber-500" />;
      default: return <Info className="w-3.5 h-3.5 text-indigo-500" />;
    }
  };

  return (
    <div className={`bg-slate-900 border border-slate-800 rounded-[2.5rem] p-6 flex flex-col transition-all duration-500 shadow-2xl ${isExpanded ? 'h-[750px]' : 'h-80'}`}>
      <div className="flex justify-between items-center mb-5 shrink-0 px-2">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-slate-800 rounded-xl text-indigo-400"><Terminal className="w-4 h-4" /></div>
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Flux d'Audit RFE</h3>
        </div>
        <button onClick={() => setIsExpanded(!isExpanded)} className="p-2 bg-slate-800 text-slate-500 hover:text-white rounded-xl transition-all">
           {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
        </button>
      </div>
      
      <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar bg-black/40 rounded-3xl p-5 border border-white/5 font-mono">
        {logs.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center opacity-20">
             <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">En attente de traitement...</p>
          </div>
        )}
        {logs.map((log) => (
          <div key={log.id} className="flex items-start space-x-3 group border-b border-white/5 pb-2">
            <span className="mt-1 shrink-0">{getIcon(log.type)}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2 mb-0.5">
                <span className="text-[7px] font-black text-slate-600 uppercase tracking-tighter">
                  {log.timestamp.toLocaleTimeString()}
                </span>
                <div className={`h-[1px] flex-1 ${log.type === 'error' ? 'bg-rose-900/50' : 'bg-slate-800'}`}></div>
              </div>
              <p className={`text-[10px] leading-relaxed font-bold ${log.type === 'error' ? 'text-rose-400' : 'text-slate-300'}`}>
                {log.message}
              </p>
            </div>
          </div>
        ))}
      </div>
      
      <div className="mt-4 pt-4 border-t border-slate-800 flex items-center justify-between shrink-0 px-2">
         <span className="text-[8px] font-black uppercase text-slate-500 tracking-widest">{logs.length} Opérations Tracées</span>
         <div className="h-1.5 w-1.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)]"></div>
      </div>
    </div>
  );
};
