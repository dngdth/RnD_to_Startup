import React from 'react';
import { useApp } from '../../context/AppContext';
import { GitBranch, Sparkles, ArrowRight, CheckCircle2, Clock } from 'lucide-react';
import { StatusBadge } from '../common/StatusBadge';
import { getDefaultComparisonVersions } from '../../utils/versionComparison';

export const VersionsTab: React.FC = () => {
  const { selectedOrder, selectedVersion, setSelectedVersion, openDiffModal } = useApp();
  const defaultComp = getDefaultComparisonVersions(selectedOrder);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-5 rounded-2xl bg-white border border-slate-200/70">
        <div>
          <h3 className="text-base font-bold text-slate-900">
            Dòng thời gian & Lịch sử phiên bản
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Mỗi ảnh chụp thông số kỹ thuật được lưu trữ bất biến kèm tác giả và theo dõi sai khác.
          </p>
        </div>

        <button
          onClick={() =>
            openDiffModal(
              selectedOrder.id,
              defaultComp.baseVersion || undefined,
              defaultComp.targetVersion || undefined
            )
          }
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-orange-50 hover:bg-orange-100 text-orange-800 border border-orange-200 text-xs font-bold transition-colors shrink-0 cursor-pointer"
        >
          <Sparkles className="w-4 h-4 text-orange-600" />
          <span>
            {defaultComp.canCompare
              ? `So sánh ${defaultComp.baseVersion} → ${defaultComp.targetVersion}`
              : `Phiên bản ${defaultComp.targetVersion}`}
          </span>
        </button>
      </div>

      {/* Timeline items */}
      <div className="space-y-3">
        {(selectedOrder?.versions || []).map((ver, idx) => {
          const isSelected = selectedVersion === ver.versionNumber;
          const isCurrent = selectedOrder?.currentVersion === ver.versionNumber;

          return (
            <div
              key={ver.id}
              className={`p-5 rounded-2xl border transition-all ${
                isSelected
                  ? 'bg-gradient-to-r from-orange-50/40 via-white to-amber-50/30 border-orange-300 shadow-sm'
                  : 'bg-white border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-2.5">
                  <span className="w-8 h-8 rounded-xl bg-slate-900 text-white font-black text-xs flex items-center justify-center">
                    {ver.versionNumber}
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-slate-900">{ver.title}</h4>
                      {isCurrent && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-100 text-orange-800">
                          Latest Release
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Published {ver.createdAt} by {ver.createdBy}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <StatusBadge status={ver.status} size="sm" />
                  {!isSelected && (
                    <button
                      onClick={() => setSelectedVersion(ver.versionNumber)}
                      className="text-xs font-semibold px-3 py-1 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700"
                    >
                      View Snapshot
                    </button>
                  )}
                </div>
              </div>

              {/* Changes List */}
              <div className="space-y-1.5 pt-2 border-t border-slate-100">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Modifications in this release ({(ver.changeSummary || []).length}):
                </span>
                <ul className="space-y-1 text-xs text-slate-700">
                  {(ver.changeSummary || []).map((item, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-orange-500 font-bold">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* AI Verification Note */}
              {ver.aiNotes && (
                <div className="mt-3 p-2.5 rounded-xl bg-slate-50 border border-slate-200/60 text-xs text-slate-600 flex items-start gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-orange-500 shrink-0 mt-0.5" />
                  <span className="text-[11px] leading-relaxed">{ver.aiNotes}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
