import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  AlertCircle,
  CheckCircle2,
  Lock,
  Clock,
  Unlock,
  ShieldCheck,
  X,
  FileCheck,
} from 'lucide-react';

export const StickyApprovalBar: React.FC = () => {
  const {
    selectedOrder,
    selectedVersion,
    currentUser,
    approveOrderVersion,
    lockForProduction,
    unlockProduction,
    openNewCRModal,
    setIsProductionSnapshotOpen,
    demoStep,
    goToDemoStep,
    showToast,
  } = useApp();

  const [showSignModal, setShowSignModal] = useState(false);
  const [approvalNote, setApprovalNote] = useState('');

  const isCustomer = currentUser.role === 'customer';

  const handleApprove = () => {
    approveOrderVersion(selectedOrder.id, selectedVersion, approvalNote);
    setShowSignModal(false);
    setApprovalNote('');
    showToast(`Phiên bản ${selectedVersion} đã được phê duyệt chính thức!`, 'success');
    if (demoStep === 18 || demoStep === 19) {
      goToDemoStep(20);
    }
  };

  const handleLock = () => {
    if (isCustomer) {
      showToast('Chỉ Nhà thiết kế / Xưởng sản xuất mới có quyền Khóa sản xuất.', 'warning');
      return;
    }
    lockForProduction(selectedOrder.id);
    if (demoStep === 21 || demoStep === 22) {
      goToDemoStep(23);
    }
  };

  return (
    <>
      {/* Sticky Bottom Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-xl border-t border-slate-200/90 shadow-[0_-8px_30px_rgba(15,23,42,0.08)] py-3 px-4 sm:px-6 lg:px-8">
        <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Left: Version & Waiting for approval status */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-black uppercase px-2.5 py-1 rounded-lg bg-orange-100 text-orange-950 border border-orange-200/80">
                PHIÊN BẢN {selectedVersion.replace('v', '')}
              </span>

              <div className="flex items-center gap-1.5">
                {selectedOrder.status === 'IN_REVIEW' && (
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping" />
                    <span className="text-xs font-black text-amber-950 bg-amber-100 px-2.5 py-0.5 rounded-full border border-amber-300">
                      Phiên bản {selectedVersion.replace('v', '0')} đang chờ {isCustomer ? 'bạn' : 'khách hàng'} phê duyệt.
                    </span>
                  </div>
                )}

                {selectedOrder.status === 'APPROVED' && (
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-600 text-white text-xs font-extrabold tracking-wider uppercase shadow-sm">
                      ĐÃ PHÊ DUYỆT
                    </span>
                    <span className="text-xs font-bold text-emerald-900 hidden md:inline">
                      bởi {selectedOrder.approvedBy || 'Emma Watson'}
                    </span>
                  </div>
                )}

                {selectedOrder.status === 'LOCKED_FOR_PRODUCTION' && (
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full bg-slate-900 text-orange-400 text-xs font-black tracking-wider uppercase flex items-center gap-1.5 shadow-sm">
                      <Lock className="w-3 h-3 text-orange-400" />
                      <span>ĐÃ KHÓA ĐỂ SẢN XUẤT</span>
                    </span>
                    <span className="text-xs font-mono font-bold text-slate-500 hidden md:inline">
                      Mã băm #SHA-429E · Bất biến
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Context Subtitle */}
            <span className="text-[11px] text-slate-500 hidden md:inline">
              {selectedOrder.status === 'IN_REVIEW' &&
                (isCustomer
                  ? '· Kiểm tra các thay đổi so với bản trước trước khi ký xác nhận'
                  : '· Đang chờ phản hồi hoặc chữ ký phê duyệt từ phía khách hàng')}
              {selectedOrder.status === 'APPROVED' &&
                (isCustomer
                  ? '· Bạn đã ký duyệt. Hồ sơ đang được nhà thiết kế chuẩn bị đưa vào xưởng'
                  : '· Khách hàng đã ký duyệt. Sẵn sàng khóa bản thiết kế để đưa vào chuyền sản xuất')}
              {selectedOrder.status === 'LOCKED_FOR_PRODUCTION' &&
                '· Bản thiết kế đã chuyển trạng thái cố định bất biến cho xưởng in'}
            </span>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            {selectedOrder.status === 'IN_REVIEW' && (
              <>
                <button
                  onClick={openNewCRModal}
                  className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-rose-200 bg-rose-50/70 hover:bg-rose-100/90 text-rose-800 text-xs font-bold transition-all active:scale-[0.98]"
                >
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>Yêu cầu chỉnh sửa</span>
                </button>

                <button
                  onClick={() => setShowSignModal(true)}
                  className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition-all active:scale-[0.98]"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Phê duyệt phiên bản</span>
                </button>
              </>
            )}

            {selectedOrder.status === 'APPROVED' && (
              !isCustomer ? (
                <button
                  onClick={handleLock}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white text-xs font-black shadow-lg shadow-orange-600/30 transition-all active:scale-95 ring-2 ring-orange-300 animate-pulse"
                >
                  <Lock className="w-4 h-4 text-white" />
                  <span>Khóa để sản xuất</span>
                </button>
              ) : (
                <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Bạn đã phê duyệt · Đang chờ xưởng chuẩn bị sản xuất</span>
                </div>
              )
            )}

            {selectedOrder.status === 'LOCKED_FOR_PRODUCTION' && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsProductionSnapshotOpen(true)}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-orange-50 border border-orange-200 hover:bg-orange-100 text-orange-950 text-xs font-bold transition-all shadow-2xs"
                >
                  <FileCheck className="w-4 h-4 text-orange-600" />
                  <span>Xem ảnh chụp sản xuất</span>
                </button>

                {/* Unlock production is strictly vendor-only */}
                {!isCustomer && (
                  <button
                    onClick={() => unlockProduction(selectedOrder.id)}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 text-xs font-medium transition-all"
                    title="Mở khóa sản xuất để điều chỉnh khẩn cấp"
                  >
                    <Unlock className="w-3.5 h-3.5 text-slate-400" />
                    <span className="hidden sm:inline">Quản trị mở khóa</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Confirmation Sign-off Modal */}
      {showSignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-100 flex items-center justify-center text-emerald-700">
                  <ShieldCheck className="w-5 h-5 stroke-[2]" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    Ký duyệt điện tử: Phiên bản {selectedVersion}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Xác nhận phê duyệt toàn bộ 9 thông số kỹ thuật Tech Pack của đơn #{selectedOrder.orderNumber}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowSignModal(false)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Checklist of what will be signed */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2.5 text-xs text-slate-700">
              <div className="font-bold text-slate-800 uppercase tracking-wider text-[10px]">
                Nội dung xác thực ký duyệt:
              </div>
              <div className="flex items-center gap-2">
                <span className="text-emerald-600 font-bold">✓</span>
                <span>Kích thước logo lưng mới: 20 × 15 cm theo yêu cầu CR-111</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-emerald-600 font-bold">✓</span>
                <span>Tệp in Vector PDF 300 DPI hệ màu CMYK FOGRA39</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-emerald-600 font-bold">✓</span>
                <span>Số lượng 60 áo thun cổ tròn vải Cotton Compact 240GSM</span>
              </div>
            </div>

            {/* Approval Note Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">
                Ghi chú phê duyệt đính kèm (tùy chọn):
              </label>
              <textarea
                value={approvalNote}
                onChange={(e) => setApprovalNote(e.target.value)}
                placeholder="Ví dụ: Đã duyệt mẫu logo mới, đồng ý đưa vào sản xuất hàng loạt..."
                className="w-full text-xs p-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 text-slate-800"
                rows={2}
              />
            </div>

            {/* Legal / Audit trail disclaimer */}
            <p className="text-[11px] text-slate-400 leading-relaxed italic">
              * Hành động này sẽ được ghi nhận vào nhật ký kiểm toán bất biến với tên <strong>{currentUser.name}</strong> và mã băm xác thực của phiên bản {selectedVersion}.
            </p>

            {/* Buttons */}
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setShowSignModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Hủy bỏ
              </button>
              <button
                onClick={handleApprove}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-emerald-600/20 transition-all active:scale-98"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Xác nhận & Ký duyệt chính thức</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
