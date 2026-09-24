import React from 'react';
import { useApp } from '../../context/AppContext';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';

export const Toast: React.FC = () => {
  const { toast } = useApp();

  if (!toast) return null;

  const icons = {
    success: <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />,
    info: <Info className="w-5 h-5 text-sky-600 shrink-0" />,
    warning: <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />,
    error: <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />,
  };

  const bgColors = {
    success: 'bg-white/95 border-emerald-200/80 shadow-emerald-500/10 text-slate-800',
    info: 'bg-white/95 border-sky-200/80 shadow-sky-500/10 text-slate-800',
    warning: 'bg-white/95 border-amber-200/80 shadow-amber-500/10 text-slate-800',
    error: 'bg-white/95 border-rose-200/80 shadow-rose-500/10 text-slate-800',
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 transition-all duration-300 transform translate-y-0 opacity-100">
      <div
        className={`flex items-center gap-3 px-4 py-3 rounded-2xl border shadow-xl backdrop-blur-md min-w-[320px] max-w-md ${bgColors[toast.type]}`}
      >
        {icons[toast.type]}
        <div className="text-sm font-medium flex-1">{toast.message}</div>
      </div>
    </div>
  );
};
