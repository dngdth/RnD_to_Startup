import React from 'react';
import { useApp } from '../../context/AppContext';
import { Modal } from '../common/Modal';
import {
  AlertCircle,
  Sparkles,
  Send,
  CheckCircle2,
  GitPullRequest,
  Layers,
  ArrowRight,
  UserCheck,
  Check,
  FileCode,
} from 'lucide-react';

interface ChangeRequestDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ChangeRequestDetailModal: React.FC<ChangeRequestDetailModalProps> = ({
  isOpen,
  onClose,
}) => {
  const {
    activeChangeRequestDetail,
    selectedOrder,
    updateSpecForEmmaCR,
    createVersion05,
    sendVersion05ForReview,
    switchRole,
    showToast,
  } = useApp();

  if (!isOpen && !activeChangeRequestDetail) return null;

  const cr = activeChangeRequestDetail || {
    id: 'cr-emma-demo',
    crNumber: 'CR-111',
    title: 'Yêu cầu chỉnh sửa mới từ Emma: Bổ sung thêu chìm chữ ở cổ tay áo',
    description:
      'Vui lòng bổ sung thêu chìm chữ đồng màu ở cổ tay áo trái sử dụng mã màu Pantone 11-0601 TCX, và đảm bảo khoảng trống khi thả mũ áo vẫn nhìn rõ 100%.',
    creatorName: 'Emma Watson',
    creatorRole: 'customer' as const,
    creatorAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    createdAt: 'Vừa xong',
    status: 'OPEN' as const,
    priority: 'HIGH' as const,
    affectedBlockTitle: 'Thông số Logo & Hình in',
    affectedBlockKey: 'logo',
    relatedVersion: 'v04',
  };

  const isSpecUpdated =
    selectedOrder.specBlocks.find((b) => b.key === 'logo')?.value.includes('Cuff') ||
    selectedOrder.currentVersion === 'v05';

  const isV05Created = selectedOrder.versions.some((v) => v.versionNumber === 'v05');
  const isSentForReview = selectedOrder.status === 'IN_REVIEW' && selectedOrder.currentVersion === 'v05';

  const handleUpdateSpec = () => {
    updateSpecForEmmaCR();
    showToast('Đã cập nhật thông số kỹ thuật: Bổ sung thêu cổ tay áo & tệp đính kèm!', 'success');
  };

  const handleCreateV05 = () => {
    createVersion05();
    showToast('Đã tạo Phiên bản 05 với thông số thêu cổ tay áo!', 'success');
  };

  const handleSendForReview = () => {
    sendVersion05ForReview();
    onClose();
    showToast('Đã gửi Phiên bản 05 để Emma Watson phê duyệt!', 'success');
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="xl"
      title={
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center">
            <GitPullRequest className="w-4 h-4 stroke-[2.2]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-black text-slate-900 tracking-tight">
                Yêu cầu chỉnh sửa mới từ Emma
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                CR-111 · Ưu tiên cao
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-normal">
              Đơn hàng #{selectedOrder.orderNumber} ({selectedOrder.productName})
            </p>
          </div>
        </div>
      }
    >
      <div className="space-y-5">
        {/* Creator and Target details */}
        <div className="p-4 rounded-2xl bg-orange-50/60 border border-orange-200/80 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <img
              src={cr.creatorAvatar}
              alt={cr.creatorName}
              className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-2xs"
            />
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-slate-900">
                  {cr.creatorName}
                </span>
                <span className="text-[10px] font-medium px-1.5 py-0.2 rounded-md bg-emerald-100 text-emerald-800">
                  Khách hàng / Chủ thương hiệu
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                Vừa gửi trên Phiên bản 04
              </p>
            </div>
          </div>
          <span className="text-xs font-mono font-bold text-orange-950 px-2.5 py-1 rounded-xl bg-white border border-orange-200 shadow-2xs">
            CR-111
          </span>
        </div>

        {/* Change Request Body */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-2">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
            Yêu cầu điều chỉnh
          </span>
          <h4 className="text-sm font-bold text-slate-900">
            {cr.title}
          </h4>
          <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-200/60">
            {cr.description}
          </p>
          <div className="flex items-center gap-2 text-[11px] text-slate-500 pt-1">
            <span>Khối bị ảnh hưởng:</span>
            <span className="font-bold text-slate-800">{cr.affectedBlockTitle}</span>
          </div>
        </div>

        {/* 3-Step Interactive Resolution Flow for Presentation */}
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/90 space-y-3">
          <div className="flex items-center justify-between pb-1 border-b border-slate-200">
            <span className="text-xs font-black uppercase tracking-wider text-slate-700">
              Quy trình xử lý của nhà thiết kế
            </span>
            <span className="text-[11px] text-slate-500">
              Các bước 14 → 15 → 16
            </span>
          </div>

          <div className="space-y-2.5">
            {/* Step 14: Update Specification */}
            <div
              className={`p-3 rounded-xl border flex items-center justify-between gap-3 transition-all ${
                isSpecUpdated
                  ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                  : 'bg-white border-slate-200 text-slate-800'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <span
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${
                    isSpecUpdated
                      ? 'bg-emerald-500 text-white'
                      : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {isSpecUpdated ? <Check className="w-3.5 h-3.5" /> : '14'}
                </span>
                <div>
                  <div className="text-xs font-bold">14. Nhà thiết kế cập nhật thông số</div>
                  <p className="text-[11px] text-slate-500">
                    {isSpecUpdated
                      ? 'Thông số đã cập nhật nội dung thêu cổ tay áo trái.'
                      : 'Áp dụng thêu cổ tay áo và cập nhật tệp vector đồ họa.'}
                  </p>
                </div>
              </div>

              {!isSpecUpdated && (
                <button
                  onClick={handleUpdateSpec}
                  className="px-3 py-1.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold shrink-0 transition-colors shadow-2xs"
                >
                  Cập nhật thông số
                </button>
              )}
            </div>

            {/* Step 15: Create Version 05 */}
            <div
              className={`p-3 rounded-xl border flex items-center justify-between gap-3 transition-all ${
                isV05Created
                  ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                  : isSpecUpdated
                  ? 'bg-white border-orange-300 ring-2 ring-orange-400/20'
                  : 'bg-slate-100/60 border-slate-200 text-slate-400 opacity-80'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <span
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${
                    isV05Created
                      ? 'bg-emerald-500 text-white'
                      : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {isV05Created ? <Check className="w-3.5 h-3.5" /> : '15'}
                </span>
                <div>
                  <div className="text-xs font-bold">15. Tạo Phiên bản 05</div>
                  <p className="text-[11px] text-slate-500">
                    {isV05Created
                      ? 'Đã tạo Phiên bản 05 và chọn trong không gian làm việc.'
                      : 'Đóng gói thông số tech pack đã cập nhật vào Phiên bản 05.'}
                  </p>
                </div>
              </div>

              {!isV05Created && isSpecUpdated && (
                <button
                  onClick={handleCreateV05}
                  className="px-3 py-1.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold shrink-0 transition-colors shadow-2xs"
                >
                  Tạo Phiên bản 05
                </button>
              )}
            </div>

            {/* Step 16: Send Version 05 for Review */}
            <div
              className={`p-3 rounded-xl border flex items-center justify-between gap-3 transition-all ${
                isSentForReview
                  ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                  : isV05Created
                  ? 'bg-white border-emerald-300 ring-2 ring-emerald-400/20'
                  : 'bg-slate-100/60 border-slate-200 text-slate-400 opacity-80'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <span
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${
                    isSentForReview
                      ? 'bg-emerald-500 text-white'
                      : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {isSentForReview ? <Check className="w-3.5 h-3.5" /> : '16'}
                </span>
                <div>
                  <div className="text-xs font-bold">16. Gửi Phiên bản 05 để xét duyệt</div>
                  <p className="text-[11px] text-slate-500">
                    {isSentForReview
                      ? 'Phiên bản 05 đã được gửi để Emma Watson phê duyệt.'
                      : 'Gửi thông báo tức thì tới tài khoản Khách hàng.'}
                  </p>
                </div>
              </div>

              {isV05Created && !isSentForReview && (
                <button
                  onClick={handleSendForReview}
                  className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shrink-0 transition-colors shadow-2xs flex items-center gap-1"
                >
                  <Send className="w-3 h-3" />
                  <span>Gửi xét duyệt</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-100">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
          >
            Đóng lại
          </button>

          {isSentForReview && (
            <button
              onClick={() => {
                switchRole('customer');
                onClose();
              }}
              className="px-4 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-orange-600/20"
            >
              <span>17. Chuyển lại vai trò Khách hàng (Emma)</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
};
