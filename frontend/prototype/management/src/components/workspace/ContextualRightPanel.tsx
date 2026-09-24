import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { AISummaryCard } from './AISummaryCard';
import {
  MessageSquare,
  AlertCircle,
  GitBranch,
  Send,
  Plus,
  ChevronRight,
  Clock,
  User,
  CheckCircle2,
  FileCheck2,
  ExternalLink,
} from 'lucide-react';

export const ContextualRightPanel: React.FC = () => {
  const {
    selectedOrder,
    selectedVersion,
    setSelectedVersion,
    currentUser,
    addSpecComment,
    openNewCRModal,
    openDiffModal,
    showToast,
  } = useApp();

  const [newComment, setNewComment] = useState('');

  // Collect all comments across all blocks
  const allComments = (selectedOrder?.specBlocks || []).flatMap((b) =>
    (b.comments || []).map((c) => ({
      ...c,
      blockTitle: b.title,
      blockKey: b.key,
      blockId: b.id,
    }))
  );

  const handleSendComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    // Add to the first block or relevant block
    addSpecComment(selectedOrder.id, selectedOrder.specBlocks[0].id, newComment);
    setNewComment('');
    showToast('Đã đăng bình luận phản hồi cho nhóm dự án', 'success');
  };

  const currentVerObj =
    selectedOrder.versions.find((v) => v.versionNumber === selectedVersion) ||
    selectedOrder.versions[0];

  return (
    <aside className="w-full lg:w-80 xl:w-96 shrink-0 flex flex-col gap-4">
      {/* 1. TOP: AI CHANGE SUMMARY (Exact required format) */}
      <AISummaryCard />

      {/* 2. COMMENTS SECTION */}
      <div className="rounded-2xl bg-white border border-slate-200/80 shadow-[0_2px_8px_rgba(15,23,42,0.02)] p-4 sm:p-5">
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-slate-700" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">
              Bình luận ({allComments.length})
            </h4>
          </div>
          <span className="text-[10px] text-slate-600 font-medium">
            Trao đổi trực tiếp
          </span>
        </div>

        {/* Comment Thread List */}
        <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
          {allComments.length === 0 ? (
            <p className="text-xs text-slate-400 italic py-2 text-center">
              Chưa có trao đổi nào.
            </p>
          ) : (
            allComments.map((c) => (
              <div
                key={c.id}
                className="p-3 rounded-xl bg-slate-50 border border-slate-200/60 text-xs"
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <div className="flex items-center gap-1.5">
                    <img
                      src={c.authorAvatar}
                      alt={c.authorName}
                      className="w-5 h-5 rounded-full object-cover"
                    />
                    <span className="font-bold text-slate-800 text-[11px]">
                      {c.authorName}
                    </span>
                    <span className="text-[9px] px-1 py-0.2 rounded bg-white text-slate-500 font-medium border border-slate-200">
                      {c.authorRole === 'vendor' ? 'Xưởng' : 'Khách'}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {c.createdAt}
                  </span>
                </div>
                <p className="text-slate-600 text-[11px] leading-relaxed">
                  {c.text}
                </p>
              </div>
            ))
          )}
        </div>

        {/* Inline Comment Input */}
        <form onSubmit={handleSendComment} className="flex gap-2 mt-3 pt-3 border-t border-slate-100">
          <input
            type="text"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Để lại bình luận hoặc câu hỏi..."
            className="flex-1 text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-orange-400/20 focus:border-orange-400 focus:bg-white"
          />
          <button
            type="submit"
            disabled={!newComment.trim()}
            className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white text-xs font-bold transition-all shadow-2xs"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>

      {/* 3. CHANGE REQUESTS SECTION */}
      <div className="rounded-2xl bg-white border border-slate-200/80 shadow-[0_2px_8px_rgba(15,23,42,0.02)] p-4 sm:p-5">
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-orange-600" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">
              Yêu cầu thay đổi ({selectedOrder.changeRequests.length})
            </h4>
          </div>
          <button
            onClick={openNewCRModal}
            className="text-[11px] font-bold text-orange-600 hover:text-orange-700 flex items-center gap-1"
          >
            <Plus className="w-3 h-3 stroke-[2.5]" />
            <span>Tạo mới</span>
          </button>
        </div>

        <div className="space-y-2">
          {selectedOrder.changeRequests.map((cr) => (
            <div
              key={cr.id}
              className="p-3 rounded-xl bg-slate-50/70 border border-slate-200/70 hover:border-slate-300 transition-colors"
            >
              <div className="flex items-center justify-between gap-1 mb-1">
                <span className="font-mono text-[10px] font-extrabold text-orange-600">
                  {cr.id.toUpperCase()}
                </span>
                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-300/60">
                  Đã sửa ở v04
                </span>
              </div>
              <div className="text-xs font-bold text-slate-900 line-clamp-1">
                {cr.title}
              </div>
              <div className="text-[11px] text-slate-500 line-clamp-2 mt-0.5 leading-snug">
                {cr.description}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 4. VERSION INFORMATION SECTION */}
      <div className="rounded-2xl bg-white border border-slate-200/80 shadow-[0_2px_8px_rgba(15,23,42,0.02)] p-4 sm:p-5">
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <GitBranch className="w-4 h-4 text-indigo-600" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">
              Thông tin phiên bản
            </h4>
          </div>
          <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded-md bg-orange-100 text-orange-800">
            {selectedVersion}
          </span>
        </div>

        <div className="space-y-2.5 text-xs text-slate-600">
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Trạng thái:</span>
            <span className="font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 text-[11px]">
              {currentVerObj.status === 'IN_REVIEW'
                ? 'Đang chờ phê duyệt'
                : currentVerObj.status}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-slate-400">Người tạo:</span>
            <span className="font-semibold text-slate-800">
              {currentVerObj.createdBy}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-slate-400">Thời gian tạo:</span>
            <span className="font-medium text-slate-700">
              {currentVerObj.createdAt}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-slate-400">Bản đối chiếu gốc:</span>
            <span className="font-mono text-[11px] text-slate-700">
              Phiên bản 03 (#SHA-318B)
            </span>
          </div>

          {/* Version Switcher Bar */}
          <div className="pt-2 border-t border-slate-100">
            <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block mb-1.5">
              Lịch sử phiên bản:
            </span>
            <div className="grid grid-cols-4 gap-1">
              {selectedOrder.versions.map((ver) => (
                <button
                  key={ver.id}
                  onClick={() => setSelectedVersion(ver.versionNumber)}
                  className={`py-1.5 rounded-lg text-xs font-bold transition-all text-center ${
                    selectedVersion === ver.versionNumber
                      ? 'bg-orange-600 text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                  title={`${ver.versionNumber}: ${ver.title}`}
                >
                  {ver.versionNumber}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
};
