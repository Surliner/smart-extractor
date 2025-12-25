
import React, { useEffect, useRef } from 'react';
import { ProcessingLog } from '../types';
import { AlertCircle, CheckCircle, Info, FileWarning } from 'lucide-react';

interface ProcessingLogsProps {
  logs: ProcessingLog[];
}

export const ProcessingLogs: React.FC<ProcessingLogsProps> = ({ logs }) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  const getIcon = (type: string) => {
    switch (type) {
      case 'success': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'error': return <AlertCircle className="w-4 h-4 text-red-500" />;
      case 'warning': return <FileWarning className="w-4 h-4 text-amber-500" />;
      default: return <Info className="w-4 h-4 text-blue-500" />;
    }
  };

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 h-48 flex flex-col">
      <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Logs de Traitement</h3>
      <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
        {logs.length === 0 && (
          <p className="text-sm text-slate-400 italic">Prêt pour l'extraction...</p>
        )}
        {logs.map((log) => (
          <div key={log.id} className="flex items-start space-x-2 text-sm">
            <span className="mt-0.5 shrink-0">{getIcon(log.type)}</span>
            <span className={`flex-1 ${log.type === 'error' ? 'text-red-700' : 'text-slate-700'}`}>
              <span className="font-mono text-xs opacity-50 mr-2">
                {log.timestamp.toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
              {log.message}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
