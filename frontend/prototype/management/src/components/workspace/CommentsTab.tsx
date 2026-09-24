import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { MessageSquare, Send, User, Sparkles } from 'lucide-react';

export const CommentsTab: React.FC = () => {
  const { selectedOrder, currentUser, addSpecComment, showToast } = useApp();
  const [generalComment, setGeneralComment] = useState('');

  // Collect all comments across all blocks
  const allComments = (selectedOrder?.specBlocks || []).flatMap((b) =>
    (b.comments || []).map((c) => ({ ...c, blockTitle: b.title, blockKey: b.key, blockId: b.id }))
  );

  const handlePostGeneral = (e: React.FormEvent) => {
    e.preventDefault();
    if (!generalComment.trim()) return;
    // Post to the first block as general feedback
    addSpecComment(selectedOrder.id, selectedOrder.specBlocks[0].id, generalComment);
    setGeneralComment('');
    showToast('Đã đăng bình luận thảo luận.', 'success');
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200/70 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-900">
            Luồng thảo luận & Phản hồi ({allComments.length})
          </h3>
          <p className="text-xs text-slate-500">
            Ghi chú thời gian thực giữa {selectedOrder.customerName} (Khách hàng) và {selectedOrder.vendorName} (Nhà cung cấp).
          </p>
        </div>
      </div>

      {/* New comment input */}
      <form onSubmit={handlePostGeneral} className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-3">
        <div className="flex items-center gap-2">
          <img
            src={currentUser.avatar}
            alt={currentUser.name}
            className="w-6 h-6 rounded-full object-cover"
          />
          <span className="text-xs font-bold text-slate-800">
            Thêm bình luận với tư cách {currentUser.name} ({currentUser.role === 'customer' ? 'Khách hàng' : 'Nhà cung cấp'})
          </span>
        </div>
        <textarea
          value={generalComment}
          onChange={(e) => setGeneralComment(e.target.value)}
          placeholder="Chia sẻ phản hồi, câu hỏi về kích thước hoặc mốc thời gian sản xuất..."
          rows={3}
          className="w-full text-xs p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-orange-400/20 focus:border-orange-400 text-slate-800 placeholder-slate-400"
        />
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={!generalComment.trim()}
            className="px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Đăng bình luận</span>
          </button>
        </div>
      </form>

      {/* Stream */}
      <div className="space-y-3">
        {allComments.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs bg-white rounded-2xl border border-slate-200">
            Chưa có bình luận nào. Hãy bắt đầu cuộc trò chuyện ở trên.
          </div>
        ) : (
          allComments.map((c) => (
            <div
              key={c.id}
              className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs space-y-2"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <img
                    src={c.authorAvatar}
                    alt={c.authorName}
                    className="w-7 h-7 rounded-full object-cover border border-slate-200"
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900">{c.authorName}</span>
                      <span
                        className={`text-[10px] font-semibold px-1.5 py-0.2 rounded-md ${
                          c.authorRole === 'customer'
                            ? 'bg-emerald-50 text-emerald-800'
                            : 'bg-orange-50 text-orange-800'
                        }`}
                      >
                        {c.authorRole === 'customer' ? 'Khách hàng' : 'Trưởng nhóm sản xuất'}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400">{c.createdAt}</span>
                  </div>
                </div>

                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                  Về mục: {c.blockTitle}
                </span>
              </div>

              <p className="text-xs text-slate-700 leading-relaxed pl-9">
                {c.text}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
