import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Sparkles,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  Download,
  AlertCircle,
  FileCheck,
  Check,
  RotateCcw,
  GitBranch,
  FileText,
  MessageSquare,
  Layers,
  ArrowLeft,
  Info,
  Calendar,
  User,
  ExternalLink,
  Package,
} from 'lucide-react';
import {
  resolveComparisonData,
  getSortedVersions,
  getAvailablePairs,
} from '../../utils/versionComparison';

interface DiffViewerContentProps {
  onClose?: () => void;
  onSelectAnotherProduct?: () => void;
}

export const DiffViewerContent: React.FC<DiffViewerContentProps> = ({ onClose, onSelectAnotherProduct }) => {
  const {
    orders,
    selectedOrder,
    diffBaseVersion,
    diffTargetVersion,
    setDiffVersions,
    approveOrderVersion,
    openNewCRModal,
    showToast,
    setCurrentView,
    setSelectedOrderId,
    setSelectedVersion,
  } = useApp();

  // Local active pair selection
  const sortedVersions = useMemo(() => getSortedVersions(selectedOrder), [selectedOrder]);
  const availablePairs = useMemo(() => getAvailablePairs(selectedOrder), [selectedOrder]);

  // Active versions
  const [localBase, setLocalBase] = useState<string | null>(diffBaseVersion);
  const [localTarget, setLocalTarget] = useState<string | null>(diffTargetVersion);
  const [activeVisualView, setActiveVisualView] = useState<'side-by-side' | 'overlay'>('side-by-side');
  const [activeTab, setActiveTab] = useState<'specs' | 'files' | 'comments'>('specs');

  // Sync versions whenever selectedOrder changes
  useEffect(() => {
    const sorted = getSortedVersions(selectedOrder);
    const latest = sorted.length > 0 ? sorted[sorted.length - 1].versionNumber : selectedOrder.currentVersion || 'v01';
    const prev = sorted.length > 1 ? sorted[sorted.length - 2].versionNumber : null;
    setLocalBase(prev);
    setLocalTarget(latest);
  }, [selectedOrder.id]);

  // Derive comparison dataset
  const comparison = useMemo(() => {
    return resolveComparisonData(selectedOrder, localBase, localTarget);
  }, [selectedOrder, localBase, localTarget]);

  // Keep local state in sync if comparison defaults resolved
  const currentBase = comparison.baseVersionNumber;
  const currentTarget = comparison.targetVersionNumber;

  const handlePairChange = (base: string, target: string) => {
    setLocalBase(base);
    setLocalTarget(target);
    setDiffVersions(base, target);
  };

  const handleApprove = () => {
    approveOrderVersion(selectedOrder.id, currentTarget);
    showToast(`Đã phê duyệt thành công phiên bản ${currentTarget}!`, 'success');
    if (onClose) onClose();
  };

  const handleRequestChanges = () => {
    if (onClose) onClose();
    openNewCRModal();
  };

  const handleBackToWorkspace = () => {
    setSelectedOrderId(selectedOrder.id);
    setSelectedVersion(selectedOrder.currentVersion);
    setCurrentView('order_workspace');
    if (onClose) onClose();
  };

  return (
    <div className="space-y-6">
      {/* Top Product Navigation & Quick Switcher Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 sm:p-4 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-2.5 flex-wrap">
          {onSelectAnotherProduct && (
            <button
              onClick={onSelectAnotherProduct}
              className="px-3 py-1.5 rounded-xl bg-orange-50 hover:bg-orange-100 text-orange-900 text-xs font-bold transition-all border border-orange-200/80 flex items-center gap-1.5 cursor-pointer shadow-2xs hover:border-orange-300"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-orange-600" />
              <span>Chọn sản phẩm khác</span>
            </button>
          )}

          <div className="flex items-center gap-2 bg-slate-50 hover:bg-slate-100/80 px-3 py-1.5 rounded-xl border border-slate-200 transition-colors">
            <Package className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider shrink-0">Sản phẩm:</span>
            <select
              value={selectedOrder.id}
              onChange={(e) => {
                const target = orders.find((o) => o.id === e.target.value);
                if (target) {
                  setSelectedOrderId(target.id);
                  const sorted = getSortedVersions(target);
                  const latest = sorted.length > 0 ? sorted[sorted.length - 1].versionNumber : target.currentVersion || 'v01';
                  const prev = sorted.length > 1 ? sorted[sorted.length - 2].versionNumber : null;
                  setLocalBase(prev);
                  setLocalTarget(latest);
                  setDiffVersions(prev, latest);
                  setSelectedVersion(latest);
                }
              }}
              className="bg-transparent font-bold text-slate-800 text-xs focus:outline-none cursor-pointer truncate max-w-[200px] sm:max-w-[320px]"
            >
              {orders.map((o) => (
                <option key={o.id} value={o.id}>
                  #{o.orderNumber} · {o.productName}
                </option>
              ))}
            </select>
          </div>
        </div>

        <button
          onClick={handleBackToWorkspace}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-orange-600 transition-colors cursor-pointer self-end sm:self-auto"
        >
          <span>Vào Workspace sản phẩm</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Top Banner: Product Title & Dynamic Version Comparison Header */}
      <div className="p-5 rounded-3xl bg-gradient-to-r from-orange-50/90 via-amber-50/60 to-rose-50/70 border border-orange-200/90 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-1.5">
            <span className="px-2.5 py-0.5 rounded-full bg-orange-500 text-white text-[10px] font-extrabold uppercase tracking-wider shadow-2xs">
              {comparison.isSingleVersion ? 'Phiên bản đầu tiên' : 'So sánh phiên bản'}
            </span>
            <span className="text-xs font-mono font-bold text-slate-700">
              ĐƠN HÀNG #{selectedOrder.orderNumber}
            </span>
            <span className="text-xs font-medium text-slate-500">
              · {selectedOrder.customerCompany || selectedOrder.customerName}
            </span>
          </div>

          {/* Header Title per requirement: [Tên sản phẩm] · So sánh [vA] → [vB] */}
          <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2 flex-wrap">
            <span>{comparison.headerTitle}</span>
          </h3>

          <p className="text-xs sm:text-sm font-semibold text-orange-950 mt-1 flex items-center gap-2">
            <span>{comparison.headerSubtitle}</span>
          </p>
        </div>

        {/* Quick Review Header Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            onClick={handleRequestChanges}
            className="px-3.5 py-2 rounded-xl border border-rose-200 bg-white hover:bg-rose-50 text-rose-800 text-xs font-bold transition-colors shadow-2xs cursor-pointer active:scale-98"
          >
            Yêu cầu chỉnh sửa
          </button>
          {!comparison.isSingleVersion && comparison.targetVersion?.status !== 'LOCKED_FOR_PRODUCTION' && (
            <button
              onClick={handleApprove}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition-all active:scale-98 flex items-center gap-1.5 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Phê duyệt {currentTarget}</span>
            </button>
          )}
        </div>
      </div>

      {/* SINGLE VERSION (V01) STATE: When there is no previous version */}
      {comparison.isSingleVersion && (
        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-5">
          <div className="flex items-start gap-4 p-4 rounded-xl bg-blue-50/80 border border-blue-200/80 text-blue-950">
            <div className="w-9 h-9 rounded-xl bg-blue-500 text-white flex items-center justify-center shrink-0 shadow-sm">
              <Info className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-extrabold text-blue-950">
                Sản phẩm đang ở phiên bản khởi tạo ({currentTarget})
              </h4>
              <p className="text-xs text-blue-900 leading-relaxed font-normal">
                Đây là phiên bản kỹ thuật đầu tiên của sản phẩm <strong>{selectedOrder.productName}</strong>.
                Chưa có phiên bản trước đó để tạo bảng so sánh đối chiếu. Toàn bộ thông số ban đầu đã được thiết lập bên dưới.
                Khi nhà sản xuất phát hành bản hiệu chỉnh tiếp theo (v02), hệ thống sẽ tự động kích hoạt chế độ so sánh sai khác trực quan.
              </p>
            </div>
          </div>

          {/* Initial Specifications Summary for v01 */}
          <div className="space-y-3">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-2">
              <FileText className="w-4 h-4 text-slate-400" />
              <span>Thông số kỹ thuật khởi tạo ({currentTarget})</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Số lượng kế hoạch</span>
                <p className="text-sm font-black text-slate-900">
                  {selectedOrder.targetQuantity || selectedOrder.versions?.[0]?.snapshotData?.quantity || 0} sản phẩm
                </p>
                <p className="text-[11px] text-slate-500">Đơn hàng khởi tạo ban đầu</p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Chất liệu vải</span>
                <p className="text-sm font-bold text-slate-900 truncate">
                  {selectedOrder.versions?.[0]?.snapshotData?.material || 'Vải tiêu chuẩn theo thiết kế'}
                </p>
                <p className="text-[11px] text-slate-500">Định lượng tiêu chuẩn nhà máy</p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Tiêu chuẩn màu sắc</span>
                <p className="text-sm font-bold text-slate-900 truncate">
                  {selectedOrder.versions?.[0]?.snapshotData?.pantoneColor || 'Mã màu tiêu chuẩn'}
                </p>
                <p className="text-[11px] text-slate-500">Mã màu Pantone chỉ định</p>
              </div>
            </div>
          </div>

          {/* Navigation Action */}
          <div className="pt-2 flex items-center justify-between border-t border-slate-100">
            <button
              onClick={handleBackToWorkspace}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all shadow-sm cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Mở Không gian làm việc của sản phẩm này</span>
            </button>
            <button
              onClick={handleRequestChanges}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-800 text-xs font-bold transition-colors cursor-pointer"
            >
              <span>Gửi yêu cầu chỉnh sửa cho {currentTarget}</span>
            </button>
          </div>
        </div>
      )}

      {/* MULTI-VERSION STATE: Interactive Pair Switching & Comparison View */}
      {!comparison.isSingleVersion && (
        <>
          {/* Version Pair Selector Bar: Only displays pairs that exist for this specific product */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <GitBranch className="w-4 h-4 text-orange-600 shrink-0" />
              <span className="text-xs font-black text-slate-900 uppercase tracking-wider">
                Chọn cặp phiên bản so sánh:
              </span>
            </div>

            {/* Quick pair buttons */}
            <div className="flex flex-wrap items-center gap-1.5">
              {availablePairs.map((pair) => {
                const isActive = pair.base === currentBase && pair.target === currentTarget;
                return (
                  <button
                    key={pair.label}
                    onClick={() => handlePairChange(pair.base, pair.target)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                      isActive
                        ? 'bg-orange-600 text-white shadow-sm shadow-orange-600/30 ring-2 ring-orange-400/40'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                  >
                    <span>{pair.label}</span>
                  </button>
                );
              })}

              {/* Advanced pair dropdown if product has 3+ versions */}
              {sortedVersions.length >= 3 && (
                <div className="flex items-center gap-1 pl-2 border-l border-slate-200 text-xs text-slate-600">
                  <span className="text-[11px] text-slate-400 font-semibold">Tùy chọn:</span>
                  <select
                    value={currentBase}
                    onChange={(e) => handlePairChange(e.target.value, currentTarget)}
                    className="px-2 py-1 rounded-lg bg-slate-50 border border-slate-200 font-bold text-slate-800 text-xs focus:ring-1 focus:ring-orange-500 cursor-pointer"
                  >
                    {sortedVersions
                      .filter((v) => v.versionNumber !== currentTarget)
                      .map((v) => (
                        <option key={v.versionNumber} value={v.versionNumber}>
                          {v.versionNumber} ({v.title.slice(0, 18)}...)
                        </option>
                      ))}
                  </select>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                  <select
                    value={currentTarget}
                    onChange={(e) => handlePairChange(currentBase, e.target.value)}
                    className="px-2 py-1 rounded-lg bg-slate-50 border border-slate-200 font-bold text-slate-800 text-xs focus:ring-1 focus:ring-orange-500 cursor-pointer"
                  >
                    {sortedVersions
                      .filter((v) => v.versionNumber !== currentBase)
                      .map((v) => (
                        <option key={v.versionNumber} value={v.versionNumber}>
                          {v.versionNumber} ({v.title.slice(0, 18)}...)
                        </option>
                      ))}
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* AI Explanation Box */}
          <div className="p-4 sm:p-5 rounded-2xl bg-white border-2 border-orange-200/80 shadow-[0_4px_16px_rgba(249,115,22,0.06)] space-y-3">
            <div className="flex items-center gap-2 text-sm font-black text-slate-900">
              <div className="w-6 h-6 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center shrink-0">
                <Sparkles className="w-3.5 h-3.5 stroke-[2.2]" />
              </div>
              <span>Tóm tắt từ AI:</span>
              <span className="text-orange-950 font-bold">
                "{comparison.changesList.length} thay đổi giữa {currentBase} và {currentTarget}"
              </span>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              {comparison.aiSummary}
            </p>

            {/* Changes list cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              {comparison.changesList.map((item, index) => (
                <div
                  key={index}
                  className={`p-3 rounded-xl border text-xs space-y-1 ${
                    index % 2 === 0
                      ? 'bg-orange-50/70 border-orange-200/80'
                      : 'bg-emerald-50/70 border-emerald-200/80'
                  }`}
                >
                  <div
                    className={`font-extrabold flex items-center gap-1.5 ${
                      index % 2 === 0 ? 'text-orange-950' : 'text-emerald-950'
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        index % 2 === 0 ? 'bg-orange-500' : 'bg-emerald-500'
                      }`}
                    />
                    <span>Điểm thay đổi #{index + 1}</span>
                  </div>
                  <p className="text-slate-700 leading-normal pl-3 font-medium">{item}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Navigation Sub-Tabs: Specs / Files / Comments */}
          <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
            <button
              onClick={() => setActiveTab('specs')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'specs'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Thông số thay đổi ({comparison.keyDifferences.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('files')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'files'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Tài liệu & Tệp thiết kế ({comparison.baseDesignFiles.length + comparison.targetDesignFiles.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('comments')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'comments'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Yêu cầu & Ghi chú liên quan ({comparison.relatedChangeRequests.length})</span>
            </button>
          </div>

          {/* TAB 1: SPECIFICATIONS & COMPARISON */}
          {activeTab === 'specs' && (
            <div className="space-y-6">
              {/* Key Differences Highlight Card */}
              {comparison.keyDifferences.length > 0 && (
                <div className="p-4 rounded-2xl bg-gradient-to-r from-orange-100/90 via-amber-50 to-emerald-100/80 border-2 border-orange-300 shadow-sm space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-orange-200/80">
                    <span className="text-xs font-black uppercase tracking-wider text-orange-950 flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-orange-600" />
                      <span>Điểm nổi bật thay đổi ({currentBase} → {currentTarget})</span>
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-600 text-white shadow-2xs">
                      {comparison.keyDifferences.length} điểm điều chỉnh
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    {comparison.keyDifferences.map((diff) => (
                      <div key={diff.id} className="p-3 rounded-xl bg-white/95 border border-orange-200 shadow-2xs space-y-1">
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">
                          {diff.title}
                        </span>
                        <div className="mt-1 flex items-center gap-2 font-mono font-black text-sm flex-wrap">
                          <span className="text-rose-600 line-through truncate max-w-[150px]">{diff.oldValue}</span>
                          <ArrowRight className="w-4 h-4 text-slate-400 shrink-0" />
                          <span className="text-emerald-700 font-extrabold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 truncate max-w-[170px]">
                            {diff.newValue}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-600 mt-1 leading-normal font-medium">
                          {diff.description}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Side-by-Side Detailed Specs Comparison */}
              <div className="space-y-3">
                <div className="flex items-center justify-between px-1">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-2">
                    <span>So sánh song song chi tiết</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                      {currentBase} → {currentTarget}
                    </span>
                  </h4>
                  <span className="text-[11px] text-slate-400">
                    Đối chiếu thông số kỹ thuật sản xuất
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* OLD SPEC: Base Version */}
                  <div className="p-5 rounded-2xl bg-rose-50/30 border border-rose-200/80 space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-rose-100">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-1 rounded-lg bg-rose-100 text-rose-800 font-extrabold text-xs">
                          THÔNG SỐ CŨ (Phiên bản {currentBase})
                        </span>
                        <span className="text-xs text-slate-500 line-through">Trước đây</span>
                      </div>
                      <span className="text-[11px] text-rose-600 font-bold">Bản trước</span>
                    </div>

                    <div className="space-y-3 text-xs">
                      {comparison.specComparison.map((spec) => (
                        <div key={`old-${spec.key}`} className="p-3 rounded-xl bg-white/90 border border-rose-100 space-y-1">
                          <span className="text-[10px] font-bold text-slate-400 uppercase">
                            {spec.title}
                          </span>
                          <div className="font-mono font-bold text-rose-900 text-sm flex items-center justify-between">
                            <span className="truncate pr-2">{spec.oldValue}</span>
                            {spec.oldBadge && (
                              <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded shrink-0">
                                {spec.oldBadge}
                              </span>
                            )}
                          </div>
                          {spec.oldDescription && (
                            <p className="text-[11px] text-slate-500">{spec.oldDescription}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* NEW SPEC: Target Version */}
                  <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-50/40 via-white to-orange-50/30 border-2 border-emerald-400 shadow-sm space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-emerald-200">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white font-extrabold text-xs shadow-2xs">
                          THÔNG SỐ MỚI (Phiên bản {currentTarget})
                        </span>
                        <span className="text-xs font-bold text-emerald-800">Bản hiện tại</span>
                      </div>
                      <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded-full">
                        {comparison.targetVersion?.status === 'APPROVED' ? 'Đã duyệt' : 'Đang áp dụng'}
                      </span>
                    </div>

                    <div className="space-y-3 text-xs">
                      {comparison.specComparison.map((spec) => (
                        <div
                          key={`new-${spec.key}`}
                          className={`p-3 rounded-xl border space-y-1 shadow-2xs ${
                            spec.isChanged
                              ? 'bg-emerald-50/80 border-emerald-300'
                              : 'bg-white/95 border-slate-200'
                          }`}
                        >
                          <span className="text-[10px] font-bold text-emerald-800 uppercase">
                            {spec.title} {spec.isChanged && '(Đã cập nhật)'}
                          </span>
                          <div className="font-mono font-black text-emerald-950 text-sm flex items-center justify-between">
                            <span className="truncate pr-2">{spec.newValue}</span>
                            {spec.newBadge && (
                              <span
                                className={`text-[10px] font-extrabold px-2 py-0.5 rounded shrink-0 ${
                                  spec.isChanged
                                    ? 'text-emerald-900 bg-emerald-200'
                                    : 'text-slate-700 bg-slate-100'
                                }`}
                              >
                                {spec.newBadge}
                              </span>
                            )}
                          </div>
                          {spec.newDescription && (
                            <p className="text-[11px] text-emerald-800 font-medium">
                              {spec.newDescription}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Visual Side-by-Side Mockup Verification */}
              <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-slate-900 uppercase tracking-wider">
                      Kiểm chứng hình ảnh thiết kế ({currentBase} vs {currentTarget})
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setActiveVisualView('side-by-side')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer ${
                        activeVisualView === 'side-by-side'
                          ? 'bg-slate-900 text-white'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      Song song
                    </button>
                    <button
                      onClick={() => setActiveVisualView('overlay')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer ${
                        activeVisualView === 'overlay'
                          ? 'bg-slate-900 text-white'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      Lớp phủ chồng
                    </button>
                  </div>
                </div>

                {activeVisualView === 'side-by-side' ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                    <div className="space-y-1.5">
                      <div className="text-xs font-bold text-slate-600 flex items-center justify-between">
                        <span>{comparison.mockupData.oldTitle}</span>
                        <span className="text-rose-600 font-bold text-[11px]">
                          {comparison.mockupData.oldBadge}
                        </span>
                      </div>
                      <div className="relative rounded-xl overflow-hidden border-2 border-dashed border-rose-300 aspect-4/3 bg-slate-900">
                        <img
                          src={comparison.mockupData.oldImage}
                          alt="Base version mockup"
                          className="w-full h-full object-cover opacity-75"
                        />
                        <div className="absolute top-4 left-1/2 -translate-x-1/2 px-3 py-1.5 border border-rose-500 bg-rose-900/80 rounded-lg text-white text-[11px] font-bold shadow-lg backdrop-blur-xs">
                          {currentBase}: {comparison.mockupData.oldDescription}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <div className="text-xs font-bold text-emerald-800 flex items-center justify-between">
                        <span>{comparison.mockupData.newTitle}</span>
                        <span className="text-emerald-600 font-bold text-[11px]">
                          {comparison.mockupData.newBadge}
                        </span>
                      </div>
                      <div className="relative rounded-xl overflow-hidden border-2 border-emerald-400 aspect-4/3 bg-slate-900">
                        <img
                          src={comparison.mockupData.newImage}
                          alt="Target version mockup"
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute top-4 left-1/2 -translate-x-1/2 px-3 py-1.5 border border-emerald-400 bg-emerald-950/85 rounded-lg text-white text-[11px] font-bold shadow-lg backdrop-blur-xs">
                          {currentTarget}: {comparison.mockupData.newDescription}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="relative rounded-2xl overflow-hidden border border-slate-300 aspect-16/9 bg-slate-900 flex items-center justify-center">
                    <img
                      src={comparison.mockupData.newImage}
                      alt="Overlay comparison"
                      className="w-full h-full object-cover opacity-80"
                    />
                    <div className="absolute inset-0 flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-2xs text-white text-center">
                      <div className="p-4 rounded-xl bg-black/75 border border-white/20 text-xs max-w-lg space-y-2">
                        <div className="text-rose-400 font-bold">
                          Phiên bản cũ ({currentBase}): {comparison.mockupData.oldDescription}
                        </div>
                        <div className="text-emerald-400 font-bold">
                          Phiên bản mới ({currentTarget}): {comparison.mockupData.newDescription}
                        </div>
                        <p className="text-[11px] text-slate-300 font-normal">
                          Đã căn chỉnh đồng bộ theo yêu cầu kỹ thuật sản xuất của xưởng.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: DESIGN FILES & ATTACHMENTS */}
          {activeTab === 'files' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Files for Base Version */}
                <div className="p-5 rounded-2xl bg-white border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-slate-400" />
                      <span className="text-xs font-black uppercase text-slate-700">
                        Tệp thiết kế Phiên bản {currentBase}
                      </span>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                      {comparison.baseDesignFiles.length} tệp
                    </span>
                  </div>

                  {comparison.baseDesignFiles.length === 0 ? (
                    <p className="text-xs text-slate-400 italic py-4 text-center">
                      Không có tệp tải lên riêng cho {currentBase}
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {comparison.baseDesignFiles.map((file) => (
                        <div
                          key={file.id}
                          className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs flex items-center justify-between gap-2"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="font-bold text-slate-800 truncate">{file.name}</p>
                            <p className="text-[11px] text-slate-500">
                              {file.size} · {file.type.toUpperCase()} · {file.uploadedAt || 'Lưu trữ'}
                            </p>
                          </div>
                          <button
                            onClick={() => showToast(`Tải xuống ${file.name}`, 'info')}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-200 transition-colors shrink-0 cursor-pointer"
                            title="Tải xuống tệp"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Files for Target Version */}
                <div className="p-5 rounded-2xl bg-emerald-50/40 border-2 border-emerald-300 space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-emerald-200">
                    <div className="flex items-center gap-2">
                      <FileCheck className="w-4 h-4 text-emerald-600" />
                      <span className="text-xs font-black uppercase text-emerald-950">
                        Tệp thiết kế Phiên bản {currentTarget} (Mới)
                      </span>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-200 text-emerald-900">
                      {comparison.targetDesignFiles.length} tệp
                    </span>
                  </div>

                  {comparison.targetDesignFiles.length === 0 ? (
                    <p className="text-xs text-slate-400 italic py-4 text-center">
                      Không có tệp tải lên riêng cho {currentTarget}
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {comparison.targetDesignFiles.map((file) => (
                        <div
                          key={file.id}
                          className="p-3 rounded-xl bg-white border border-emerald-200 text-xs flex items-center justify-between gap-2 shadow-2xs"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <p className="font-bold text-slate-900 truncate">{file.name}</p>
                              {file.cmykReady && (
                                <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800">
                                  CMYK
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-500">
                              {file.size} · {file.type.toUpperCase()} · Độ phân giải {file.resolutionDpi || 300} DPI
                            </p>
                          </div>
                          <button
                            onClick={() => showToast(`Tải xuống ${file.name}`, 'info')}
                            className="p-1.5 rounded-lg text-emerald-700 hover:text-emerald-950 hover:bg-emerald-100 transition-colors shrink-0 cursor-pointer"
                            title="Tải xuống tệp"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: CHANGE REQUESTS & COMMENTS LINKED TO VERSIONS */}
          {activeTab === 'comments' && (
            <div className="space-y-4">
              <div className="p-5 rounded-2xl bg-white border border-slate-200 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <span className="text-xs font-black uppercase text-slate-900 flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-orange-600" />
                    <span>Yêu cầu chỉnh sửa & Ghi chú liên quan ({currentBase} → {currentTarget})</span>
                  </span>
                  <span className="text-xs font-semibold text-slate-500">
                    {comparison.relatedChangeRequests.length} yêu cầu
                  </span>
                </div>

                {comparison.relatedChangeRequests.length === 0 ? (
                  <div className="text-center py-6 space-y-2">
                    <p className="text-xs text-slate-500">
                      Không có Yêu cầu chỉnh sửa trực tiếp nào giữa {currentBase} và {currentTarget}.
                    </p>
                    <p className="text-[11px] text-slate-400">
                      Phiên bản này được cập nhật theo lộ trình kỹ thuật nội bộ xưởng sản xuất.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {comparison.relatedChangeRequests.map((cr) => (
                      <div
                        key={cr.id}
                        className="p-4 rounded-xl border border-slate-200 hover:border-orange-300 transition-colors bg-slate-50/50 space-y-2 text-xs"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded border border-orange-200">
                              {cr.crNumber}
                            </span>
                            <span className="font-extrabold text-slate-900">{cr.title}</span>
                          </div>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              cr.status === 'RESOLVED'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {cr.status === 'RESOLVED' ? 'Đã giải quyết ở ' + (cr.resolvedInVersion || currentTarget) : 'Đang xử lý'}
                          </span>
                        </div>

                        <p className="text-slate-600 leading-relaxed font-normal">
                          {cr.description}
                        </p>

                        {cr.resolutionNotes && (
                          <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-100 text-emerald-900 font-medium">
                            <strong>Ghi chú giải quyết:</strong> {cr.resolutionNotes}
                          </div>
                        )}

                        <div className="flex items-center gap-4 text-[11px] text-slate-400 pt-1">
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            {cr.creatorName} ({cr.creatorRole === 'customer' ? 'Khách hàng' : 'Nhà thiết kế'})
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {cr.createdAt}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Expandable Advanced Audit Details */}
          <details className="group border border-slate-200/80 rounded-2xl bg-slate-50/70 transition-colors overflow-hidden">
            <summary className="p-4 cursor-pointer text-xs font-bold text-slate-700 hover:text-slate-900 flex items-center justify-between list-none select-none">
              <span className="flex items-center gap-2">
                <ChevronDown className="w-4 h-4 transition-transform group-open:rotate-180 text-slate-400" />
                <span>Thông số kỹ thuật & Chi tiết kiểm toán ({selectedOrder.productName})</span>
              </span>
              <span className="text-[11px] font-normal text-slate-400 group-open:hidden">
                Bấm để xem nhật ký kiểm toán phiên bản
              </span>
            </summary>

            <div className="p-4 pt-0 space-y-3 border-t border-slate-200/60 mt-1 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div className="p-3 rounded-xl bg-white border border-slate-200 space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Mã đơn & Phân loại</span>
                  <p className="font-mono text-slate-800">
                    {selectedOrder.orderNumber} · {selectedOrder.category}
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-white border border-slate-200 space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Phiên bản đối chiếu</span>
                  <p className="font-mono text-slate-800">
                    Bản gốc: {currentBase} ({comparison.baseVersion?.title || 'Bản trước'}) → Bản đích: {currentTarget} ({comparison.targetVersion?.title || 'Bản mới'})
                  </p>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-white border border-slate-200 space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Hồ sơ phát hành phiên bản {currentTarget}</span>
                <p className="text-[11px] text-slate-600">
                  Khởi tạo bởi {comparison.targetVersion?.createdBy || selectedOrder.assignedTo || 'Nhà xưởng'} vào lúc {comparison.targetVersion?.createdAt || selectedOrder.lastUpdated}.
                </p>
              </div>
            </div>
          </details>

          {/* Sticky Bottom Action Bar */}
          <div className="sticky bottom-0 bg-white/95 backdrop-blur-md p-4 rounded-2xl border border-slate-200 shadow-lg flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                onClick={() =>
                  showToast(
                    `Đang xuất báo cáo so sánh PDF (${selectedOrder.productName} · ${currentBase} → ${currentTarget})...`,
                    'info'
                  )
                }
                className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 px-3 py-2 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Xuất PDF so sánh ({currentBase} → {currentTarget})</span>
              </button>

              <button
                onClick={handleBackToWorkspace}
                className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 px-3 py-2 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Vào Không gian làm việc</span>
              </button>
            </div>

            <div className="flex items-center gap-3">
              <button
                id="review-request-changes-btn"
                onClick={handleRequestChanges}
                className="px-4 py-2.5 rounded-xl border border-rose-200 bg-rose-50 text-rose-800 hover:bg-rose-100 text-xs font-bold transition-colors cursor-pointer active:scale-98"
              >
                Yêu cầu chỉnh sửa
              </button>
              {comparison.targetVersion?.status !== 'LOCKED_FOR_PRODUCTION' && (
                <button
                  id="review-approve-version-btn"
                  onClick={handleApprove}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition-all active:scale-98 flex items-center gap-1.5 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Phê duyệt phiên bản {currentTarget}</span>
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
