import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Order } from '../../types';
import {
  X,
  UploadCloud,
  FileCheck2,
  AlertCircle,
  FileText,
  Sparkles,
  CheckCircle2,
  Send,
} from 'lucide-react';

interface DesignerActionModalsProps {
  activeModal: 'upload' | 'edit_spec' | 'create_version' | 'send_review' | 'respond_cr' | null;
  targetOrder: Order | null;
  onClose: () => void;
}

export const DesignerActionModals: React.FC<DesignerActionModalsProps> = ({
  activeModal,
  targetOrder,
  onClose,
}) => {
  const {
    uploadDesignFile,
    updateSpecBlock,
    publishNewVersion,
    sendForCustomerReview,
    updateChangeRequestStatus,
    showToast,
    openDiffModal,
  } = useApp();

  // State for upload
  const [fileName, setFileName] = useState('hoodie_back_vector_final_v5.pdf');
  const [fileType, setFileType] = useState<'vector' | 'raster' | 'techpack' | 'mockup'>('vector');
  const [fileSize, setFileSize] = useState('8.8 MB');

  // State for spec edit
  const [selectedBlockId, setSelectedBlockId] = useState<string>(
    targetOrder?.specBlocks?.[0]?.id || ''
  );
  const [newSpecValue, setNewSpecValue] = useState<string>('');

  // State for new version
  const [versionTitle, setVersionTitle] = useState('Cập nhật tỷ lệ logo sau lưng & tệp in vector');
  const [changeNotes, setChangeNotes] = useState('1. Giảm kích thước logo xuống 20x15cm\n2. Chuyển sang định dạng vector CMYK 300DPI');

  // State for send review
  const [reviewNote, setReviewNote] = useState('Tất cả thông số và tệp in v04 đã sẵn sàng cho khách hàng ký duyệt sản xuất.');

  // State for respond CR
  const [crResponseNote, setCrResponseNote] = useState('Đã điều chỉnh kích thước theo yêu cầu và kiểm tra tương thích kỹ thuật in lụa.');

  if (!activeModal || !targetOrder) return null;

  const handleUploadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    uploadDesignFile(targetOrder.id, {
      name: fileName,
      size: fileSize,
      type: fileType,
      cmykReady: true,
      resolutionDpi: 300,
    });
    onClose();
  };

  const handleEditSpecSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBlockId || !newSpecValue) {
      showToast('Vui lòng chọn thông số và nhập giá trị mới', 'warning');
      return;
    }
    updateSpecBlock(targetOrder.id, selectedBlockId, newSpecValue);
    onClose();
  };

  const handleCreateVersionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const changes = changeNotes.split('\n').filter((c) => c.trim().length > 0);
    publishNewVersion(targetOrder.id, versionTitle, changes);
    onClose();
  };

  const handleSendReviewSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendForCustomerReview(targetOrder.id, reviewNote);
    onClose();
  };

  const handleRespondCRSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const openCr = targetOrder.changeRequests?.[0];
    if (openCr) {
      updateChangeRequestStatus(openCr.id, 'RESOLVED', crResponseNote);
    }
    showToast('Đã gửi phản hồi giải quyết Change Request cho khách hàng', 'success');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center border border-orange-200/60">
              {activeModal === 'upload' && <UploadCloud className="w-5 h-5" />}
              {activeModal === 'edit_spec' && <FileText className="w-5 h-5" />}
              {activeModal === 'create_version' && <Sparkles className="w-5 h-5" />}
              {activeModal === 'send_review' && <Send className="w-5 h-5" />}
              {activeModal === 'respond_cr' && <AlertCircle className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                {activeModal === 'upload' && 'Tải lên file thiết kế'}
                {activeModal === 'edit_spec' && 'Chỉnh sửa thông số kỹ thuật'}
                {activeModal === 'create_version' && 'Tạo phiên bản mới'}
                {activeModal === 'send_review' && 'Gửi khách hàng phê duyệt'}
                {activeModal === 'respond_cr' && 'Phản hồi yêu cầu chỉnh sửa'}
              </h3>
              <p className="text-xs text-slate-400">
                Đơn hàng #{targetOrder.orderNumber} · {targetOrder.productName}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* MODAL 1: UPLOAD DESIGN FILES */}
        {activeModal === 'upload' && (
          <form onSubmit={handleUploadSubmit} className="space-y-4">
            <div className="border-2 border-dashed border-orange-200 rounded-2xl p-5 bg-orange-50/20 text-center space-y-2">
              <UploadCloud className="w-8 h-8 text-orange-500 mx-auto" />
              <p className="text-xs font-bold text-slate-800">
                Kéo thả file hoặc nhấp để chọn tệp vector / mockup
              </p>
              <p className="text-[11px] text-slate-500">
                Hỗ trợ PDF, AI, PSD, PNG (Tự động kiểm tra CMYK & 300 DPI)
              </p>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Tên tệp thiết kế
              </label>
              <input
                type="text"
                value={fileName}
                onChange={(e) => setFileName(e.target.value)}
                className="w-full text-xs p-2.5 rounded-xl border border-slate-200 text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-orange-400/20 focus:border-orange-400"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Định dạng tệp
                </label>
                <select
                  value={fileType}
                  onChange={(e) => setFileType(e.target.value as any)}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 text-slate-800 bg-white"
                >
                  <option value="vector">File Vector gốc (.pdf / .ai)</option>
                  <option value="raster">File đồ họa Raster (.png 300dpi)</option>
                  <option value="techpack">Tài liệu hồ sơ kỹ thuật đầy đủ</option>
                  <option value="mockup">Bản phối cảnh thực tế 3D</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Dung lượng ước tính
                </label>
                <input
                  type="text"
                  value={fileSize}
                  onChange={(e) => setFileSize(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 text-slate-800"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-medium text-slate-600 hover:bg-slate-100"
              >
                Hủy
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold shadow-md shadow-orange-600/20 flex items-center gap-1.5"
              >
                <UploadCloud className="w-4 h-4" />
                <span>Tải lên và gắn vào {targetOrder.currentVersion}</span>
              </button>
            </div>
          </form>
        )}

        {/* MODAL 2: EDIT SPECIFICATION */}
        {activeModal === 'edit_spec' && (
          <form onSubmit={handleEditSpecSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Chọn hạng mục thông số cần sửa
              </label>
              <select
                value={selectedBlockId}
                onChange={(e) => {
                  setSelectedBlockId(e.target.value);
                  const blk = targetOrder.specBlocks.find((b) => b.id === e.target.value);
                  if (blk) setNewSpecValue(blk.value);
                }}
                className="w-full text-xs p-2.5 rounded-xl border border-slate-200 text-slate-800 bg-white"
              >
                {targetOrder.specBlocks.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.title} ({b.value})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Giá trị thông số kỹ thuật mới
              </label>
              <textarea
                value={newSpecValue}
                onChange={(e) => setNewSpecValue(e.target.value)}
                placeholder="Ví dụ: Kích thước 20 × 15 cm, lùi xuống 6.5cm từ mép cổ nón..."
                rows={3}
                className="w-full text-xs p-3 rounded-xl border border-slate-200 text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-orange-400/20 focus:border-orange-400"
                required
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-medium text-slate-600 hover:bg-slate-100"
              >
                Hủy
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold shadow-md shadow-orange-600/20 flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Lưu thông số kỹ thuật</span>
              </button>
            </div>
          </form>
        )}

        {/* MODAL 3: CREATE NEW VERSION */}
        {activeModal === 'create_version' && (
          <form onSubmit={handleCreateVersionSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Tiêu đề phiên bản tiếp theo
              </label>
              <input
                type="text"
                value={versionTitle}
                onChange={(e) => setVersionTitle(e.target.value)}
                className="w-full text-xs p-2.5 rounded-xl border border-slate-200 text-slate-800"
                required
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Ghi chú các thay đổi chính (Mỗi dòng 1 thay đổi)
              </label>
              <textarea
                value={changeNotes}
                onChange={(e) => setChangeNotes(e.target.value)}
                rows={4}
                className="w-full text-xs p-3 rounded-xl border border-slate-200 text-slate-800 font-mono"
                required
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-medium text-slate-600 hover:bg-slate-100"
              >
                Hủy
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-600/20 flex items-center gap-1.5"
              >
                <Sparkles className="w-4 h-4" />
                <span>Phát hành phiên bản mới</span>
              </button>
            </div>
          </form>
        )}

        {/* MODAL 4: SEND FOR CUSTOMER REVIEW */}
        {activeModal === 'send_review' && (
          <form onSubmit={handleSendReviewSubmit} className="space-y-4">
            <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200/70 text-xs text-emerald-900 space-y-1">
              <div className="font-bold">
                Xác nhận gửi duyệt tới {targetOrder.customerName} ({targetOrder.customerCompany})
              </div>
              <p className="text-[11px] text-emerald-800">
                Hệ thống sẽ chuyển trạng thái sang <strong>Đang xem xét</strong> và gửi thông báo điện tử ngay lập tức.
              </p>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Lời nhắn gửi kèm khách hàng:
              </label>
              <textarea
                value={reviewNote}
                onChange={(e) => setReviewNote(e.target.value)}
                rows={3}
                className="w-full text-xs p-3 rounded-xl border border-slate-200 text-slate-800"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-medium text-slate-600 hover:bg-slate-100"
              >
                Hủy
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20 flex items-center gap-1.5"
              >
                <Send className="w-4 h-4" />
                <span>Gửi bản duyệt ngay</span>
              </button>
            </div>
          </form>
        )}

        {/* MODAL 5: RESPOND TO CR */}
        {activeModal === 'respond_cr' && (
          <form onSubmit={handleRespondCRSubmit} className="space-y-4">
            <div className="p-3.5 rounded-2xl bg-rose-50/70 border border-rose-200/70 text-xs text-rose-900 space-y-1">
              <div className="font-bold">
                Phản hồi CR: {(targetOrder.changeRequests?.[0]?.title) || 'Yêu cầu điều chỉnh thông số'}
              </div>
              <p className="text-[11px] text-rose-800">
                {(targetOrder.changeRequests?.[0]?.description) || 'Khách hàng yêu cầu kiểm tra lại kỹ thuật in và kích thước.'}
              </p>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Giải pháp & phản hồi của xưởng thiết kế:
              </label>
              <textarea
                value={crResponseNote}
                onChange={(e) => setCrResponseNote(e.target.value)}
                rows={3}
                className="w-full text-xs p-3 rounded-xl border border-slate-200 text-slate-800"
                required
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-medium text-slate-600 hover:bg-slate-100"
              >
                Hủy
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md shadow-rose-600/20 flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Xác nhận hoàn thành & Phản hồi</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
