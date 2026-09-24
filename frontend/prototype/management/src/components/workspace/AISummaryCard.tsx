import React from 'react';
import { useApp } from '../../context/AppContext';
import { Sparkles, ArrowRight, CheckCircle2, RefreshCw } from 'lucide-react';

export const AISummaryCard: React.FC = () => {
  const { openDiffModal, showToast } = useApp();

  const handleRegenerate = () => {
    showToast('AI đã phân tích lại toàn bộ hồ sơ kỹ thuật & tệp vector.', 'info');
  };

  return (
    <div className="rounded-2xl bg-white border border-slate-200/80 shadow-[0_2px_12px_rgba(15,23,42,0.03)] p-5 relative overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-orange-100 flex items-center justify-center text-orange-600">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
            Tóm tắt thay đổi AI
          </h3>
        </div>
        <button
          onClick={handleRegenerate}
          className="text-slate-400 hover:text-slate-600 p-1 rounded-md transition-colors"
          title="Phân tích lại"
        >
          <RefreshCw className="w-3 h-3" />
        </button>
      </div>

      {/* Main Quote / Headline */}
      <div className="mb-4">
        <div className="text-sm font-black text-slate-900 leading-snug">
          &ldquo;Phát hiện 2 thay đổi quan trọng trong Phiên bản 04.&rdquo;
        </div>
        <p className="text-[11px] text-slate-500 mt-0.5">
          Tự động phân tích và đối soát với yêu cầu CR-111.
        </p>
      </div>

      {/* Structured Changes List */}
      <div className="space-y-2.5 mb-4">
        {/* 01 Back logo size */}
        <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-200/70 hover:border-slate-300 transition-colors">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-mono font-bold text-orange-600">
              01
            </span>
            <span className="text-xs font-bold text-slate-800">
              Kích thước logo lưng
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs font-mono font-medium pl-6">
            <span className="line-through text-slate-400">25 × 18 cm</span>
            <span className="text-orange-500 font-bold">→</span>
            <span className="font-bold text-slate-900 bg-white px-1.5 py-0.5 rounded border border-slate-200 shadow-2xs">
              20 × 15 cm
            </span>
          </div>
        </div>

        {/* 02 Design file */}
        <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-200/70 hover:border-slate-300 transition-colors">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-mono font-bold text-orange-600">
              02
            </span>
            <span className="text-xs font-bold text-slate-800">
              Tệp thiết kế
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs font-mono font-medium pl-6">
            <span className="line-through text-slate-400">design_v3.png</span>
            <span className="text-orange-500 font-bold">→</span>
            <span className="font-bold text-slate-900 bg-white px-1.5 py-0.5 rounded border border-slate-200 shadow-2xs">
              design_v4.png
            </span>
          </div>
        </div>
      </div>

      {/* Footer Note */}
      <div className="flex items-center gap-2 text-[11px] font-medium text-slate-500 mb-4 px-1">
        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
        <span>&ldquo;Tất cả thông số khác được giữ nguyên.&rdquo;</span>
      </div>

      {/* Button: View full comparison */}
      <button
        onClick={() => openDiffModal()}
        className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-xs hover:shadow-md transition-all active:scale-[0.99]"
      >
        <span>Xem so sánh đầy đủ</span>
        <ArrowRight className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};
