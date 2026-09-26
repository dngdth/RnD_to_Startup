import React from 'react';
import { Sparkles, AlertCircle } from 'lucide-react';

interface FloatingDrawerTriggerProps {
  onClick: () => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  onFocus?: () => void;
  onBlur?: () => void;
  isOpen?: boolean;
  isHovered?: boolean;
  pendingCount: number;
  isCustomer?: boolean;
  currentVersion?: string;
}

export const FloatingDrawerTrigger: React.FC<FloatingDrawerTriggerProps> = ({
  onClick,
  onMouseEnter,
  onMouseLeave,
  onFocus,
  onBlur,
  isOpen = false,
  isHovered = false,
  pendingCount,
  isCustomer = false,
  currentVersion = 'v04',
}) => {
  const triggerLabel = isCustomer ? 'Yêu cầu chỉnh sửa' : 'Góp ý của khách hàng';
  const triggerSubLabel = isCustomer
    ? `Bản ${currentVersion}`
    : 'Bình luận phản hồi';
  const triggerTitle = isCustomer ? 'Yêu cầu chỉnh sửa' : 'Góp ý của khách hàng';

  return (
    <aside
      aria-label={triggerTitle}
      className={`fixed top-48 z-[60] transition-all duration-200 ease-out ${
        isOpen
          ? isCustomer
            ? 'right-0 sm:right-[28rem] lg:right-[32rem]'
            : 'right-0 sm:right-[32rem] lg:right-[36rem]'
          : 'right-0'
      }`}
    >
      <button
        onClick={onClick}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        onFocus={onFocus}
        onBlur={onBlur}
        className="flex items-center gap-2 py-2.5 px-3.5 rounded-l-2xl bg-slate-900 hover:bg-slate-800 text-white shadow-xl border-y border-l border-slate-700/80 hover:border-orange-500/50 transition-all group active:scale-[0.98] cursor-pointer"
        title={triggerTitle}
      >
        <div
          className={`w-6 h-6 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform shrink-0 ${
            isCustomer
              ? 'bg-rose-500/20 text-rose-400'
              : 'bg-orange-500/20 text-orange-400'
          }`}
        >
          {isCustomer ? (
            <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
          ) : (
            <Sparkles className="w-3.5 h-3.5 text-orange-400" />
          )}
        </div>

        <div className="hidden sm:flex flex-col text-left pr-1 min-w-0">
          <span className="text-[11px] font-extrabold tracking-tight text-white group-hover:text-orange-300 transition-colors whitespace-nowrap">
            {triggerLabel}
          </span>
          <span className="text-[9px] text-slate-400 font-medium whitespace-nowrap">
            {triggerSubLabel}
          </span>
        </div>

        {/* Counter Badge */}
        {pendingCount > 0 ? (
          <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded-full bg-amber-500 text-slate-950 ring-2 ring-slate-900 shrink-0">
            {pendingCount}
          </span>
        ) : (
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-slate-800 text-slate-400 shrink-0">
            1
          </span>
        )}
      </button>
    </aside>
  );
};
