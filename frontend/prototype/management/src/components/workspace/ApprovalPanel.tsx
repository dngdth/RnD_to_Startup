import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  ShieldCheck,
  CheckCircle2,
  Lock,
  AlertCircle,
  FileCheck,
  Sparkles,
  Calendar,
  User,
  KeyRound,
  Download,
  Unlock,
} from 'lucide-react';

export const ApprovalPanel: React.FC = () => {
  const {
    selectedOrder,
    selectedVersion,
    currentUser,
    approveOrderVersion,
    requestChanges,
    lockForProduction,
    unlockProduction,
    openNewCRModal,
    showToast,
  } = useApp();

  const [approvalNote, setApprovalNote] = useState('');
  const [showSignModal, setShowSignModal] = useState(false);

  const isCustomer = currentUser.role === 'customer';
  const isVendor = currentUser.role === 'vendor';

  const handleConfirmApproval = () => {
    approveOrderVersion(selectedOrder.id, selectedVersion, approvalNote);
    setShowSignModal(false);
    setApprovalNote('');
  };

  return (
    <div className="rounded-3xl bg-white border border-slate-200/80 shadow-md p-5 overflow-hidden">
      {/* State 1: IN REVIEW / WAITING FOR APPROVAL */}
      {selectedOrder.status === 'IN_REVIEW' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping" />
              <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                Trạng thái phê duyệt: Đang chờ
              </h4>
            </div>
            <span className="text-xs font-extrabold px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200">
              Phiên bản {selectedVersion}
            </span>
          </div>

          <p className="text-xs text-slate-600 leading-relaxed">
            Hồ sơ thông số kỹ thuật <strong>Phiên bản {selectedVersion}</strong> đã phát hành và sẵn sàng để khách hàng ký duyệt.
            Vui lòng kiểm tra các khối thông số và đối chiếu thay đổi trước khi phê duyệt.
          </p>

          <div className="p-3 rounded-2xl bg-amber-50/50 border border-amber-200/60 flex items-start gap-2.5">
            <Sparkles className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-[11px] text-amber-900 leading-normal">
              Chữ ký của khách hàng xác nhận mọi kích thước, mã màu (Pantone 19-4052) và vị trí đồ họa đã điều chỉnh.
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              onClick={openNewCRModal}
              className="w-full py-2.5 px-3 rounded-xl border border-rose-200 bg-rose-50/60 hover:bg-rose-100/80 text-rose-800 text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
            >
              <AlertCircle className="w-3.5 h-3.5" />
              <span>Yêu cầu chỉnh sửa</span>
            </button>

            <button
              onClick={() => setShowSignModal(true)}
              className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-md shadow-emerald-500/20 transition-all active:scale-98"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Phê duyệt phiên bản</span>
            </button>
          </div>
        </div>
      )}

      {/* State 2: APPROVED (Ready for Production Lock) */}
      {selectedOrder.status === 'APPROVED' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <h4 className="text-xs font-black text-emerald-950 uppercase tracking-wider">
                Phiên bản đã được duyệt
              </h4>
            </div>
            <span className="text-xs font-extrabold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800">
              Đã duyệt
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 space-y-1.5">
            <div className="flex items-center justify-between text-xs font-bold text-emerald-950">
              <span>Được duyệt bởi: {selectedOrder.approvedBy || 'Emma Watson'}</span>
              <span className="text-[10px] font-medium text-emerald-700">
                {selectedOrder.approvedAt || '10:42'}
              </span>
            </div>
            <p className="text-[11px] text-emerald-800">
              Khách hàng đã chứng nhận toàn bộ thông số kỹ thuật để đưa vào sản xuất.
            </p>
          </div>

          <div className="text-xs text-slate-600">
            Bước tiếp theo: Tạo ảnh chụp sản xuất bất biến và khóa hàng đợi gia công của xưởng may.
          </div>

          <button
            onClick={() => lockForProduction(selectedOrder.id)}
            className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-slate-900 hover:from-indigo-700 hover:to-slate-800 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-md shadow-indigo-600/20 transition-all active:scale-98"
          >
            <Lock className="w-3.5 h-3.5 text-indigo-200" />
            <span>Khóa để sản xuất</span>
          </button>
        </div>
      )}

      {/* State 3: LOCKED FOR PRODUCTION */}
      {selectedOrder.status === 'LOCKED_FOR_PRODUCTION' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1 rounded-lg bg-indigo-100 text-indigo-700">
                <Lock className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-black text-indigo-950 uppercase tracking-wider">
                  Đã khóa để sản xuất
                </h4>
                <p className="text-[10px] text-indigo-700">Đã tạo ảnh chụp sản xuất</p>
              </div>
            </div>
            <span className="text-[11px] font-extrabold px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-900 border border-indigo-200">
              Bất biến
            </span>
          </div>

          {/* Certificate Box */}
          <div className="p-3.5 rounded-2xl bg-gradient-to-br from-indigo-50/90 to-purple-50/60 border border-indigo-200 text-xs space-y-2">
            <div className="flex items-center justify-between text-indigo-950 font-bold">
              <span>Phiên bản ảnh chụp</span>
              <span>{selectedVersion}</span>
            </div>
            <div className="flex items-center justify-between text-slate-600 text-[11px]">
              <span>Người phê duyệt</span>
              <span className="font-semibold text-slate-900">
                {selectedOrder.approvedBy || 'Emma Watson'}
              </span>
            </div>
            <div className="flex items-center justify-between text-slate-600 text-[11px]">
              <span>Thời gian phê duyệt</span>
              <span className="font-mono text-slate-800">
                {selectedOrder.approvedAt || '10:42'}
              </span>
            </div>
            <div className="flex items-center justify-between text-slate-600 text-[11px]">
              <span>Mã băm lô hàng</span>
              <span className="font-mono text-[10px] text-slate-700">#SHA-429E-PP1024</span>
            </div>
          </div>

          <p className="text-[11px] text-slate-500 italic">
            Hồ sơ thông số này đã được đóng băng. Chức năng chỉnh sửa bị khóa trong khi quá trình cắt vải và tách màu in đang tiến hành.
          </p>

          <div className="flex gap-2">
            <button
              onClick={() => showToast('Đang tải xuống tệp PDF Bản thiết kế sản xuất đã ký...', 'info')}
              className="flex-1 py-2 px-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Tải chứng nhận</span>
            </button>

            <button
              onClick={() => unlockProduction(selectedOrder.id)}
              className="py-2 px-3 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-600 text-xs font-semibold flex items-center justify-center gap-1 transition-colors"
              title="Mở khóa thông số đơn hàng (Quản trị)"
            >
              <Unlock className="w-3.5 h-3.5" />
              <span>Mở khóa</span>
            </button>
          </div>
        </div>
      )}

      {/* State 4: CHANGE REQUESTED */}
      {selectedOrder.status === 'CHANGE_REQUESTED' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600" />
              <h4 className="text-xs font-black text-rose-950 uppercase tracking-wider">
                Đã yêu cầu chỉnh sửa
              </h4>
            </div>
            <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-rose-100 text-rose-800">
              Đang chỉnh sửa
            </span>
          </div>

          <p className="text-xs text-slate-600">
            Khách hàng đã gửi yêu cầu chỉnh sửa đối với Phiên bản <strong>{selectedVersion}</strong>.
            Nhà thiết kế đang cập nhật bản vẽ kỹ thuật và sẽ sớm phát hành Phiên bản 05.
          </p>

          <button
            onClick={() => approveOrderVersion(selectedOrder.id, selectedVersion)}
            className="w-full py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition-colors"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Bỏ qua & Phê duyệt bản hiện tại</span>
          </button>
        </div>
      )}

      {/* Signature Confirmation Modal */}
      {showSignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/30 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
                <FileCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Xác nhận ký duyệt điện tử
                </h3>
                <p className="text-xs text-slate-500">Đơn hàng #{selectedOrder.orderNumber} · Phiên bản {selectedVersion}</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Bằng việc phê duyệt, bạn xác nhận tất cả 10 khối thông số kỹ thuật (định lượng vải 420 GSM, Pantone 19-4052, kích thước logo lưng 20×15cm) đều khớp chính xác với yêu cầu của khách hàng.
            </p>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                Ghi chú ký duyệt / Số đơn đặt hàng PO (Không bắt buộc)
              </label>
              <textarea
                value={approvalNote}
                onChange={(e) => setApprovalNote(e.target.value)}
                placeholder="Ví dụ: Đã duyệt sản xuất hàng loạt. Vui lòng gửi ảnh sản phẩm mẫu đầu tiên."
                rows={2}
                className="w-full text-xs p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-400/20 focus:border-emerald-400"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowSignModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Hủy
              </button>
              <button
                onClick={handleConfirmApproval}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20"
              >
                Ký & Phê duyệt chính thức
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
