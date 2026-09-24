import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Sparkles,
  MessageSquare,
  X,
  ArrowRight,
  CheckCircle2,
  Clock,
  Send,
  Plus,
  GitPullRequest,
  ShieldCheck,
  AlertCircle,
  FileCheck2,
  ExternalLink,
  RotateCcw,
  Check,
  Tag,
  Filter,
} from 'lucide-react';
import { getDefaultComparisonVersions } from '../../utils/versionComparison';

interface AICommentDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'ai' | 'comments';
  onSelectBlock?: (blockKey: string) => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}

export const AICommentDrawer: React.FC<AICommentDrawerProps> = ({
  isOpen,
  onClose,
  initialTab = 'ai',
  onSelectBlock,
  onMouseEnter,
  onMouseLeave,
}) => {
  const {
    selectedOrder,
    selectedVersion,
    currentUser,
    addSpecComment,
    openDiffModal,
    showToast,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'ai' | 'comments'>(initialTab);
  const [commentFilter, setCommentFilter] = useState<'all' | 'pending' | 'resolved'>('all');
  const [newCommentText, setNewCommentText] = useState('');
  const [targetBlockKey, setTargetBlockKey] = useState(
    selectedOrder.specBlocks[0]?.key || 'product'
  );

  // Sync tab with initialTab when opened
  React.useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab, isOpen]);

  // Support Escape key to close
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Local state to track resolved/pending status for comments
  const [resolvedComments, setResolvedComments] = useState<Record<string, boolean>>({
    'comm-2': true, // Alex Rivera's earlier reply resolved
    'comm-4': true, // Approval resolved
  });

  if (!isOpen) return null;

  // Flatten comments across all spec blocks with rich metadata
  const allComments = (selectedOrder?.specBlocks || []).flatMap((b) =>
    (b.comments || []).map((c) => {
      const isResolved = resolvedComments[c.id] ?? false;
      return {
        ...c,
        blockTitle: b.title,
        blockKey: b.key,
        blockId: b.id,
        isResolved,
      };
    })
  );

  // Count pending comments
  const pendingCommentsCount = allComments.filter((c) => !c.isResolved).length;

  const filteredComments = allComments.filter((c) => {
    if (commentFilter === 'pending') return !c.isResolved;
    if (commentFilter === 'resolved') return c.isResolved;
    return true;
  });

  const handleToggleResolved = (commentId: string) => {
    setResolvedComments((prev) => {
      const current = prev[commentId] ?? false;
      const next = !current;
      showToast(
        next ? 'Đã đánh dấu trao đổi là Đã xử lý' : 'Đã mở lại trạng thái Chưa xử lý',
        'success'
      );
      return { ...prev, [commentId]: next };
    });
  };

  const handleSendComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim()) return;

    const targetBlock =
      selectedOrder.specBlocks.find((b) => b.key === targetBlockKey) ||
      selectedOrder.specBlocks[0];

    addSpecComment(selectedOrder.id, targetBlock.id, newCommentText);
    setNewCommentText('');
    showToast(`Đã thêm bình luận vào mục "${targetBlock.title}"`, 'success');
  };

  const handleJumpToBlock = (blockKey: string) => {
    if (onSelectBlock) {
      onSelectBlock(blockKey);
    } else {
      const element = document.getElementById(`spec-block-${blockKey}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden pointer-events-none">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-200 pointer-events-auto"
      />

      {/* Slide-over Right Panel */}
      <div
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        className="fixed inset-y-0 right-0 max-w-full flex pointer-events-auto"
      >
        <div className="w-screen max-w-md sm:max-w-lg lg:max-w-xl bg-white shadow-2xl flex flex-col border-l border-slate-200 animate-in slide-in-from-right duration-200 ease-out">
          {/* Drawer Top Header */}
          <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between gap-4 bg-slate-50/70">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-orange-100/80 border border-orange-200 text-orange-700 flex items-center justify-center shrink-0">
                <Sparkles className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm sm:text-base font-black text-slate-900 truncate">
                    {activeTab === 'comments' ? 'Góp ý của khách hàng' : 'AI & Tóm tắt thay đổi'}
                  </h3>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-slate-200/70 text-slate-700">
                    {selectedVersion}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 truncate">
                  Đơn hàng #{selectedOrder.orderNumber} · {selectedOrder.customerCompany}
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-white border border-transparent hover:border-slate-200 transition-colors shrink-0 cursor-pointer"
              title="Đóng (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Drawer Tab Switcher */}
          <div className="flex items-center border-b border-slate-200 bg-white px-4 sm:px-6">
            <button
              onClick={() => setActiveTab('ai')}
              className={`py-3 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
                activeTab === 'ai'
                  ? 'border-orange-500 text-orange-950 font-extrabold'
                  : 'border-transparent text-slate-500 hover:text-slate-900'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-orange-500" />
              <span>Tóm tắt thay đổi AI</span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-md bg-orange-100 text-orange-800 font-bold">
                v04
              </span>
            </button>

            <button
              onClick={() => setActiveTab('comments')}
              className={`py-3 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
                activeTab === 'comments'
                  ? 'border-orange-500 text-orange-950 font-extrabold'
                  : 'border-transparent text-slate-500 hover:text-slate-900'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5 text-sky-600" />
              <span>Góp ý của khách hàng</span>
              <span
                className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${
                  pendingCommentsCount > 0
                    ? 'bg-amber-100 text-amber-900 border border-amber-300'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                {allComments.length}
              </span>
            </button>
          </div>

          {/* Drawer Body (Scrollable) */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
            {/* ========================================================================= */}
            {/* TAB 1: TÓM TẮT AI (DIFF SUMMARY, BEFORE → AFTER, VERSION)               */}
            {/* ========================================================================= */}
            {activeTab === 'ai' && (() => {
              const defaultComp = getDefaultComparisonVersions(selectedOrder);
              const bVer = defaultComp.baseVersion || 'v01';
              const tVer = defaultComp.targetVersion || selectedOrder.currentVersion || 'v01';
              return (
              <div className="space-y-4">
                {/* AI Headline Banner */}
                <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-50/90 via-orange-50/50 to-white border border-amber-200/80 shadow-2xs">
                  <div className="flex items-center gap-2 text-xs font-bold text-amber-950 uppercase tracking-wider mb-1">
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                    <span>
                      {defaultComp.canCompare
                        ? `Thông số kỹ thuật đối chiếu giữa ${bVer} và ${tVer}`
                        : `Thông số kỹ thuật khởi tạo (${tVer})`}
                    </span>
                  </div>
                  <p className="text-xs text-slate-700 leading-relaxed font-medium">
                    {defaultComp.canCompare ? (
                      <>
                        AI tự động đối chiếu các điểm thay đổi giữa <strong>Phiên bản {bVer}</strong> và{' '}
                        <strong>Phiên bản {tVer}</strong> của sản phẩm <strong>{selectedOrder.productName}</strong>.
                      </>
                    ) : (
                      <>
                        Sản phẩm <strong>{selectedOrder.productName}</strong> đang ở phiên bản khởi tạo <strong>{tVer}</strong>.
                        Toàn bộ thông số thiết kế ban đầu đã được thiết lập.
                      </>
                    )}
                  </p>
                </div>

                {/* Structured Before → After Comparison Cards */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-800 uppercase tracking-wider px-1">
                    <span>Chi tiết thông số kỹ thuật</span>
                    <span className="text-[11px] font-normal text-slate-500 lowercase">
                      {defaultComp.canCompare ? `${bVer} → ${tVer}` : tVer}
                    </span>
                  </div>

                  {/* Item 1: Back Logo Size */}
                  <div className="p-3.5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs hover:border-slate-300 transition-colors">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-lg bg-orange-100 text-orange-700 font-mono text-[11px] font-extrabold flex items-center justify-center">
                          01
                        </span>
                        <span className="text-xs font-extrabold text-slate-900">
                          Kích thước Logo lưng
                        </span>
                      </div>
                      <button
                        onClick={() => handleJumpToBlock('logo')}
                        className="text-[11px] text-orange-600 hover:text-orange-800 font-semibold flex items-center gap-1"
                      >
                        <span>Mục 6</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </button>
                    </div>

                    <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200/60 font-mono text-xs">
                      <div className="text-slate-400 line-through">25 × 18 cm</div>
                      <div className="text-orange-500 font-bold">→</div>
                      <div className="font-extrabold text-slate-900 bg-white px-2 py-1 rounded-lg border border-slate-200 shadow-2xs">
                        20 × 15 cm
                      </div>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-2 leading-relaxed">
                      Giảm 20% chiều cao để logo không bị che khuất khi gập nón hoodie ra sau lưng.
                    </p>
                  </div>

                  {/* Item 2: Vector Design File */}
                  <div className="p-3.5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs hover:border-slate-300 transition-colors">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-lg bg-orange-100 text-orange-700 font-mono text-[11px] font-extrabold flex items-center justify-center">
                          02
                        </span>
                        <span className="text-xs font-extrabold text-slate-900">
                          Tệp thiết kế in ấn (Design File)
                        </span>
                      </div>
                      <button
                        onClick={() => handleJumpToBlock('design_files')}
                        className="text-[11px] text-orange-600 hover:text-orange-800 font-semibold flex items-center gap-1"
                      >
                        <span>Mục 8</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </button>
                    </div>

                    <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200/60 font-mono text-xs">
                      <div className="text-slate-400 line-through truncate">design_v3.png (72 DPI)</div>
                      <div className="text-orange-500 font-bold shrink-0">→</div>
                      <div className="font-extrabold text-slate-900 bg-white px-2 py-1 rounded-lg border border-slate-200 shadow-2xs truncate">
                        design_v4.pdf (Vector CMYK)
                      </div>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-2 leading-relaxed">
                      Thay tệp raster bằng tệp PDF vector CMYK 300 DPI chuẩn xuất phim in lụa tự động.
                    </p>
                  </div>

                  {/* Item 3: Print Position Distance */}
                  <div className="p-3.5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs hover:border-slate-300 transition-colors">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-lg bg-orange-100 text-orange-700 font-mono text-[11px] font-extrabold flex items-center justify-center">
                          03
                        </span>
                        <span className="text-xs font-extrabold text-slate-900">
                          Khoảng cách mép in
                        </span>
                      </div>
                      <button
                        onClick={() => handleJumpToBlock('printing')}
                        className="text-[11px] text-orange-600 hover:text-orange-800 font-semibold flex items-center gap-1"
                      >
                        <span>Mục 7</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </button>
                    </div>

                    <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200/60 font-mono text-xs">
                      <div className="text-slate-400 line-through">12 cm từ chân cổ</div>
                      <div className="text-orange-500 font-bold">→</div>
                      <div className="font-extrabold text-slate-900 bg-white px-2 py-1 rounded-lg border border-slate-200 shadow-2xs">
                        14 cm từ chân cổ
                      </div>
                    </div>
                  </div>
                </div>

                {/* Print Verification Standards Check */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5">
                  <div className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Kiểm tra tiêu chuẩn kỹ thuật
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2 rounded-xl bg-white border border-slate-200 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <div>
                        <div className="font-bold text-slate-900">Sai số cho phép</div>
                        <div className="text-[11px] text-slate-500">±1.5 mm (Đạt)</div>
                      </div>
                    </div>
                    <div className="p-2 rounded-xl bg-white border border-slate-200 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <div>
                        <div className="font-bold text-slate-900">Không gian màu</div>
                        <div className="text-[11px] text-slate-500">CMYK FOGRA39</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Change Requests related */}
                <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-2.5">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-800 uppercase tracking-wider">
                    <span>Yêu cầu thay đổi liên quan</span>
                    <span className="text-[11px] font-mono text-orange-600">CR-111</span>
                  </div>
                  {selectedOrder.changeRequests.map((cr) => (
                    <div
                      key={cr.id}
                      className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-start justify-between gap-2"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-black text-orange-700">
                            {cr.id.toUpperCase()}
                          </span>
                          <span className="text-xs font-bold text-slate-800">
                            {cr.title}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                          {cr.description}
                        </p>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 shrink-0">
                        Đã sửa ở v04
                      </span>
                    </div>
                  ))}
                </div>

                {/* CTA Button: Open Visual Diff Modal */}
                <button
                  onClick={() => {
                    onClose();
                    openDiffModal(
                      selectedOrder.id,
                      defaultComp.baseVersion || undefined,
                      defaultComp.targetVersion || undefined
                    );
                  }}
                  className="w-full py-3 px-4 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 active:scale-[0.99] cursor-pointer"
                >
                  <Sparkles className="w-4 h-4 text-orange-400" />
                  <span>
                    {defaultComp.canCompare
                      ? `Mở bảng so sánh trực quan (${bVer} → ${tVer})`
                      : `Xem chi tiết thông số (${tVer})`}
                  </span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
              );
            })()}

            {/* ========================================================================= */}
            {/* TAB 2: BÌNH LUẬN & PHẢN HỒI (COMMENTS, STATUS, REPLY)                     */}
            {/* ========================================================================= */}
            {activeTab === 'comments' && (
              <div className="space-y-4">
                {/* Filter Toolbar: [ Tất cả ] [ Chưa xử lý ] [ Đã xử lý ] */}
                <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
                    <button
                      onClick={() => setCommentFilter('all')}
                      className={`px-2.5 py-1 rounded-lg transition-all ${
                        commentFilter === 'all'
                          ? 'bg-white text-slate-900 font-bold shadow-2xs'
                          : 'text-slate-500 hover:text-slate-900'
                      }`}
                    >
                      Tất cả ({allComments.length})
                    </button>
                    <button
                      onClick={() => setCommentFilter('pending')}
                      className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 ${
                        commentFilter === 'pending'
                          ? 'bg-amber-500 text-white font-bold shadow-2xs'
                          : 'text-amber-800 hover:text-amber-950'
                      }`}
                    >
                      <span>Chưa xử lý</span>
                      {pendingCommentsCount > 0 && (
                        <span
                          className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${
                            commentFilter === 'pending'
                              ? 'bg-white/30 text-white'
                              : 'bg-amber-100 text-amber-900'
                          }`}
                        >
                          {pendingCommentsCount}
                        </span>
                      )}
                    </button>
                    <button
                      onClick={() => setCommentFilter('resolved')}
                      className={`px-2.5 py-1 rounded-lg transition-all ${
                        commentFilter === 'resolved'
                          ? 'bg-white text-slate-900 font-bold shadow-2xs'
                          : 'text-slate-500 hover:text-slate-900'
                      }`}
                    >
                      Đã xử lý
                    </button>
                  </div>

                  <span className="text-[11px] text-slate-400 font-medium">
                    {filteredComments.length} mục
                  </span>
                </div>

                {/* Comment Thread List */}
                <div className="space-y-3">
                  {filteredComments.length === 0 ? (
                    <div className="py-12 text-center text-slate-400">
                      <p className="text-xs">Không có bình luận nào trong bộ lọc này.</p>
                    </div>
                  ) : (
                    filteredComments.map((c) => {
                      const isPending = !c.isResolved;

                      return (
                        <div
                          key={c.id}
                          className={`p-4 rounded-2xl border transition-all ${
                            isPending
                              ? 'bg-white border-amber-300 shadow-2xs ring-1 ring-amber-100/80'
                              : 'bg-slate-50/70 border-slate-200/70 opacity-85 hover:opacity-100'
                          }`}
                        >
                          {/* Header: Author + Role + Timestamp + Status */}
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <img
                                src={c.authorAvatar}
                                alt={c.authorName}
                                className="w-6 h-6 rounded-full object-cover border border-slate-200 shrink-0"
                              />
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <span
                                    className={`text-xs font-extrabold truncate ${
                                      isPending ? 'text-slate-950' : 'text-slate-700'
                                    }`}
                                  >
                                    {c.authorName}
                                  </span>
                                  <span
                                    className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                                      c.authorRole === 'vendor'
                                        ? 'bg-indigo-50 text-indigo-700 border border-indigo-200/60'
                                        : 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                                    }`}
                                  >
                                    {c.authorRole === 'vendor' ? 'Nhà thiết kế' : 'Khách hàng'}
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <span className="text-[10px] font-mono text-slate-400">
                                {c.createdAt}
                              </span>

                              {isPending ? (
                                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                                  Chưa xử lý
                                </span>
                              ) : (
                                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                                  <Check className="w-3 h-3 text-emerald-600 stroke-[2.5]" />
                                  Đã xử lý
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Related Block Tag */}
                          <div className="mb-2">
                            <button
                              onClick={() => handleJumpToBlock(c.blockKey)}
                              className="inline-flex items-center gap-1 text-[10px] font-bold text-orange-700 bg-orange-50 border border-orange-200/70 hover:bg-orange-100 px-2 py-0.5 rounded-md transition-colors"
                            >
                              <span>{c.blockTitle}</span>
                              <ExternalLink className="w-2.5 h-2.5" />
                            </button>
                          </div>

                          {/* Comment Content */}
                          <p
                            className={`text-xs leading-relaxed ${
                              isPending
                                ? 'text-slate-900 font-medium'
                                : 'text-slate-600'
                            }`}
                          >
                            {c.text}
                          </p>

                          {/* Bottom Actions: Toggle Status / Scroll to Spec */}
                          <div className="flex items-center justify-between gap-2 mt-3 pt-2.5 border-t border-slate-100 text-[11px]">
                            <button
                              onClick={() => handleJumpToBlock(c.blockKey)}
                              className="text-slate-500 hover:text-slate-900 font-semibold flex items-center gap-1"
                            >
                              <span>Cuộn đến vị trí này</span>
                              <ArrowRight className="w-3 h-3" />
                            </button>

                            <button
                              onClick={() => handleToggleResolved(c.id)}
                              className={`px-2.5 py-1 rounded-lg font-bold transition-all flex items-center gap-1 ${
                                isPending
                                  ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-2xs'
                                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                              }`}
                            >
                              {isPending ? (
                                <>
                                  <Check className="w-3 h-3 stroke-[2.5]" />
                                  <span>Đánh dấu đã xử lý</span>
                                </>
                              ) : (
                                <>
                                  <RotateCcw className="w-3 h-3" />
                                  <span>Mở lại</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Drawer Bottom Action: Quick Comment Input (Always available at bottom of comments tab) */}
          {activeTab === 'comments' && (
            <div className="p-4 border-t border-slate-200 bg-slate-50/80">
              <form onSubmit={handleSendComment} className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-700">Thêm phản hồi mới:</span>
                  <select
                    value={targetBlockKey}
                    onChange={(e) => setTargetBlockKey(e.target.value)}
                    className="text-[11px] font-semibold bg-white border border-slate-200 rounded-lg px-2 py-1 text-slate-700 focus:outline-hidden focus:border-orange-500"
                  >
                    {selectedOrder.specBlocks.map((b) => (
                      <option key={b.key} value={b.key}>
                        Gán vào: {b.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newCommentText}
                    onChange={(e) => setNewCommentText(e.target.value)}
                    placeholder="Viết phản hồi hoặc yêu cầu kỹ thuật..."
                    className="flex-1 text-xs bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
                  />
                  <button
                    type="submit"
                    disabled={!newCommentText.trim()}
                    className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 shrink-0"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Gửi</span>
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
