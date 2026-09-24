import React, { useState, useRef } from 'react';
import { SpecBlock } from '../../types';
import { useApp } from '../../context/AppContext';
import {
  Edit3,
  MessageSquare,
  Sparkles,
  Send,
  Lock,
  Check,
  Tag,
  FileText,
  Palette,
  Maximize2,
  Package,
  Layers,
  Printer,
  FileCode,
  CheckCircle2,
  ArrowDown,
  X,
  FileDown,
  GitPullRequest,
  Eye,
  Download,
  Upload,
} from 'lucide-react';

interface SpecificationBlockProps {
  block: SpecBlock;
  orderId: string;
  blockNumber?: number;
}

export const SpecificationBlock: React.FC<SpecificationBlockProps> = ({
  block,
  orderId,
  blockNumber,
}) => {
  const {
    currentUser,
    addSpecComment,
    updateSpecBlock,
    selectedOrder,
    openNewCRModal,
    showToast,
  } = useApp();

  const [isCommentsOpen, setIsCommentsOpen] = useState(false);
  const [newCommentText, setNewCommentText] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(block.value);

  // PDF File attachment state (for 'File thiết kế' field in Product block)
  const [attachedPdf, setAttachedPdf] = useState<{
    name: string;
    size: string;
    badge?: string;
    url?: string;
  } | null>(
    block.key === 'product' || (block.details && 'File thiết kế' in block.details)
      ? {
          name: 'TechPack_Hoodie_NorthPeak_v04.pdf',
          size: '4.8 MB',
        }
      : null
  );

  // PDF file dropzone & attachments for 'Tệp thiết kế' block (block.key === 'design_files')
  const [designPdfList, setDesignPdfList] = useState<
    Array<{
      id: string;
      name: string;
      size: string;
      badge?: string;
      url?: string;
    }>
  >([]);
  const [isDraggingPdf, setIsDraggingPdf] = useState(false);
  const designFileInputRef = useRef<HTMLInputElement>(null);

  const [activePreviewPdf, setActivePreviewPdf] = useState<{
    name: string;
    size: string;
    badge?: string;
    url?: string;
  } | null>(null);

  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
      showToast('Chỉ chấp nhận định dạng file PDF (.pdf)!', 'error');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    const sizeInMb = (file.size / (1024 * 1024)).toFixed(1);
    const sizeStr =
      file.size > 1024 * 1024 ? `${sizeInMb} MB` : `${Math.max(1, Math.round(file.size / 1024))} KB`;
    const objectUrl = URL.createObjectURL(file);

    setAttachedPdf({
      name: file.name,
      size: sizeStr,
      url: objectUrl,
    });

    showToast(`Đã tải lên tệp PDF: ${file.name} (${sizeStr})`, 'success');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDesignFilesUpload = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const newItems: Array<{
      id: string;
      name: string;
      size: string;
      badge?: string;
      url?: string;
    }> = [];
    let invalidCount = 0;

    Array.from(files).forEach((file) => {
      if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
        invalidCount++;
        return;
      }
      const sizeInMb = (file.size / (1024 * 1024)).toFixed(1);
      const sizeStr =
        file.size > 1024 * 1024 ? `${sizeInMb} MB` : `${Math.max(1, Math.round(file.size / 1024))} KB`;
      const objectUrl = URL.createObjectURL(file);
      newItems.push({
        id: `pdf-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        name: file.name,
        size: sizeStr,
        badge: 'File tải lên mới',
        url: objectUrl,
      });
    });

    if (invalidCount > 0) {
      showToast('Chỉ chấp nhận các tệp định dạng PDF (.pdf)!', 'error');
    }

    if (newItems.length > 0) {
      setDesignPdfList((prev) => [...prev, ...newItems]);
      showToast(`Đã thêm ${newItems.length} tệp PDF thành công!`, 'success');
    }

    if (designFileInputRef.current) designFileInputRef.current.value = '';
  };

  const handleDownloadSpecificPdf = (pdf: { name: string; size: string; url?: string }) => {
    showToast(`Đang tải xuống tệp ${pdf.name}...`, 'success');
    if (pdf.url) {
      const a = document.createElement('a');
      a.href = pdf.url;
      a.download = pdf.name;
      a.click();
    } else {
      const blob = new Blob(
        [`NorthPeak Tech Pack PDF Document: ${pdf.name}\nPhiên bản: v04\nTrạng thái: Approved`],
        { type: 'application/pdf' }
      );
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = pdf.name;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const handleDownloadPdf = () => {
    if (activePreviewPdf) {
      handleDownloadSpecificPdf(activePreviewPdf);
    } else if (attachedPdf) {
      handleDownloadSpecificPdf(attachedPdf);
    }
  };

  const handleRemovePdf = (e: React.MouseEvent) => {
    e.stopPropagation();
    setAttachedPdf(null);
    showToast('Đã xóa tệp thiết kế', 'info');
  };

  const isCustomer = currentUser.role === 'customer';
  const isLocked = block.isLocked || selectedOrder.status === 'LOCKED_FOR_PRODUCTION';
  const isModifiedInCurrentVer = block.modifiedInVersion === selectedOrder.currentVersion;
  const isMaterialBlock = block.key === 'material';
  const isDesignFilesBlock = block.key === 'design_files';
  const isProductionNotesBlock = block.key === 'production_notes';
  const isLogoBlock = block.key === 'logo';

  // Icons and visual styles by key or category
  const getBlockIconMeta = () => {
    switch (block.key) {
      case 'product':
        return {
          icon: <Package className="w-4 h-4 text-orange-600 stroke-[1.75]" />,
          bg: 'bg-orange-50 border-orange-200/60',
        };
      case 'material':
        return {
          icon: <Layers className="w-4 h-4 text-emerald-600 stroke-[1.75]" />,
          bg: 'bg-emerald-50 border-emerald-200/60',
        };
      case 'color':
        return {
          icon: <Palette className="w-4 h-4 text-indigo-600 stroke-[1.75]" />,
          bg: 'bg-indigo-50 border-indigo-200/60',
        };
      case 'quantity':
        return {
          icon: <Tag className="w-4 h-4 text-amber-600 stroke-[1.75]" />,
          bg: 'bg-amber-50 border-amber-200/60',
        };
      case 'dimensions':
        return {
          icon: <Maximize2 className="w-4 h-4 text-sky-600 stroke-[1.75]" />,
          bg: 'bg-sky-50 border-sky-200/60',
        };
      case 'logo':
        return {
          icon: <Sparkles className="w-4 h-4 text-rose-600 stroke-[1.75]" />,
          bg: 'bg-rose-50 border-rose-200/60',
        };
      case 'printing':
        return {
          icon: <Printer className="w-4 h-4 text-teal-600 stroke-[1.75]" />,
          bg: 'bg-teal-50 border-teal-200/60',
        };
      case 'design_files':
        return {
          icon: <FileCode className="w-4 h-4 text-violet-600 stroke-[1.75]" />,
          bg: 'bg-violet-50 border-violet-200/60',
        };
      case 'production_notes':
        return {
          icon: <FileText className="w-4 h-4 text-slate-700 stroke-[1.75]" />,
          bg: 'bg-slate-100 border-slate-200/80',
        };
      default:
        return {
          icon: <FileText className="w-4 h-4 text-slate-600 stroke-[1.75]" />,
          bg: 'bg-slate-50 border-slate-200/60',
        };
    }
  };

  const iconMeta = getBlockIconMeta();

  const handleSaveEdit = () => {
    if (isCustomer) {
      showToast('Khách hàng không thể chỉnh sửa trực tiếp thông số kỹ thuật. Vui lòng gửi Yêu cầu thay đổi.', 'warning');
      setIsEditing(false);
      return;
    }
    if (!editValue.trim()) return;
    updateSpecBlock(orderId, block.id, editValue);
    setIsEditing(false);
    showToast(`Đã cập nhật mục ${block.title}`, 'success');
  };

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim()) return;
    addSpecComment(orderId, block.id, newCommentText);
    setNewCommentText('');
    showToast('Đã gửi bình luận cho thông số này', 'success');
  };

  const handleCustomerRequestChange = () => {
    openNewCRModal();
  };

  // Reusable Comments section
  const renderCommentsSection = () => {
    if (!isCommentsOpen) return null;
    return (
      <div className="bg-slate-50/80 border-t border-slate-200/70 p-4 sm:p-5 space-y-3 rounded-b-2xl">
        <div className="flex items-center justify-between text-xs font-bold text-slate-700">
          <span className="flex items-center gap-1.5">
            <MessageSquare className="w-3.5 h-3.5 text-slate-400" />
            <span>Trao đổi về mục này ({block.comments ? block.comments.length : 0})</span>
          </span>
          <button
            type="button"
            onClick={() => setIsCommentsOpen(false)}
            className="text-slate-400 hover:text-slate-600 text-[11px] cursor-pointer"
          >
            Thu gọn
          </button>
        </div>

        {/* Comments List */}
        <div className="space-y-2">
          {!block.comments || block.comments.length === 0 ? (
            <p className="text-xs text-slate-400 italic py-1">
              Chưa có ghi chú nào. Hãy để lại nhận xét hoặc câu hỏi cho xưởng.
            </p>
          ) : (
            block.comments.map((comment) => (
              <div
                key={comment.id}
                className="p-3 rounded-xl bg-white border border-slate-200/70 shadow-2xs flex items-start gap-2.5"
              >
                <img
                  src={comment.authorAvatar}
                  alt={comment.authorName}
                  className="w-6 h-6 rounded-full object-cover shrink-0 mt-0.5"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-slate-800">
                        {comment.authorName}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-slate-100 text-slate-500 font-medium">
                        {comment.authorRole === 'vendor' ? 'Xưởng' : 'Khách hàng'}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400">{comment.createdAt}</span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1 leading-normal">
                    {comment.text}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>

        {/* New Comment Input */}
        <form onSubmit={handleAddComment} className="flex gap-2 pt-1">
          <input
            type="text"
            value={newCommentText}
            onChange={(e) => setNewCommentText(e.target.value)}
            placeholder={`Bình luận về mục ${block.title}...`}
            className="flex-1 text-xs bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-orange-400/20 focus:border-orange-400"
          />
          <button
            type="submit"
            disabled={!newCommentText.trim()}
            className="px-3.5 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
          >
            <Send className="w-3 h-3 stroke-[2]" />
            <span>Gửi</span>
          </button>
        </form>
      </div>
    );
  };

  const renderPreviewModal = () => {
    const currentPdf = activePreviewPdf || attachedPdf;
    if (!isPreviewModalOpen || !currentPdf) return null;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150">
        <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full overflow-hidden flex flex-col max-h-[90vh]">
          {/* Modal Header */}
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center shrink-0">
                <FileText className="w-5 h-5 text-rose-600 stroke-[2]" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-bold text-slate-900 truncate">
                  {currentPdf.name}
                </h3>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <span>Tài liệu PDF</span>
                  <span>·</span>
                  <span>{currentPdf.size}</span>
                  <span>·</span>
                  <span className="text-emerald-600 font-semibold">{currentPdf.badge || 'Đã chuẩn hóa CMYK & 300 DPI'}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleDownloadPdf}
                className="px-3 py-1.5 rounded-xl bg-[#3b4b6d] hover:bg-[#2c3954] text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Tải về</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsPreviewModalOpen(false);
                  setActivePreviewPdf(null);
                }}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Modal Preview Body */}
          <div className="p-6 overflow-y-auto bg-slate-100/70 flex flex-col items-center justify-center min-h-[360px]">
            <div className="w-full max-w-lg bg-white rounded-xl shadow-md border border-slate-200/80 p-6 flex flex-col">
              {/* Tech Pack PDF Sheet Header */}
              <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-4">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-orange-600 bg-orange-50 px-2 py-0.5 rounded border border-orange-200">
                    BẢN VẼ TECH PACK CHÍNH THỨC
                  </span>
                  <h4 className="text-sm font-bold text-slate-900 mt-1">
                    {currentPdf.name}
                  </h4>
                </div>
                <div className="text-right text-[11px] text-slate-500">
                  <p className="font-semibold text-slate-700">Phiên bản: {selectedOrder.currentVersion}</p>
                  <p>Mã đơn: {selectedOrder.orderNumber}</p>
                </div>
              </div>

              {/* PDF Diagram Preview */}
              <div className="bg-slate-50 rounded-lg border border-dashed border-slate-300 p-6 flex flex-col items-center justify-center text-center my-2">
                <div className="w-16 h-16 rounded-2xl bg-white shadow-xs border border-slate-200 flex items-center justify-center mb-3">
                  <FileText className="w-8 h-8 text-rose-500" />
                </div>
                <p className="text-xs font-bold text-slate-800">
                  Thông số bản rập & Tệp in vector gốc
                </p>
                <p className="text-[11px] text-slate-500 mt-1 max-w-xs">
                  Tệp PDF vector gồm sơ đồ rập áo, kết cấu nón 2 lớp lót vải chính và kích thước logo CR-111 (20×15cm).
                </p>
              </div>

              {/* PDF Metadata Footer */}
              <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-3 gap-2 text-center">
                <div className="bg-slate-50 rounded-lg p-2">
                  <span className="block text-[10px] uppercase font-bold text-slate-400">Số trang</span>
                  <span className="text-xs font-bold text-slate-800">1 / 4 trang</span>
                </div>
                <div className="bg-slate-50 rounded-lg p-2">
                  <span className="block text-[10px] uppercase font-bold text-slate-400">Định dạng</span>
                  <span className="text-xs font-bold text-slate-800">Vector PDF</span>
                </div>
                <div className="bg-slate-50 rounded-lg p-2">
                  <span className="block text-[10px] uppercase font-bold text-slate-400">Trạng thái</span>
                  <span className="text-xs font-bold text-emerald-600">Sẵn sàng sản xuất</span>
                </div>
              </div>
            </div>
          </div>

          {/* Modal Footer */}
          <div className="px-5 py-3 border-t border-slate-100 bg-white flex justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setIsPreviewModalOpen(false);
                setActivePreviewPdf(null);
              }}
              className="px-4 py-2 rounded-xl text-xs font-medium text-slate-600 hover:bg-slate-100 cursor-pointer"
            >
              Đóng
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div
      id={`spec-block-${block.key}`}
      className={`group rounded-2xl transition-all duration-200 ease-out border relative ${
        isModifiedInCurrentVer
          ? 'bg-gradient-to-br from-amber-50/20 via-white to-orange-50/15 border-amber-200/90 shadow-[0_4px_16px_rgba(245,158,11,0.04)] ring-1 ring-amber-300/30 hover:bg-none hover:bg-[#E8EEF8] hover:border-[#b8cce6] hover:ring-transparent hover:shadow-[0_4px_20px_rgba(59,75,109,0.08)]'
          : 'bg-white border-slate-200/70 shadow-[0_2px_8px_rgba(15,23,42,0.02)] hover:bg-[#E8EEF8] hover:border-[#b8cce6] hover:shadow-[0_4px_20px_rgba(59,75,109,0.08)]'
      }`}
    >
      {/* Section Container: đồng bộ khoảng cách và padding như block Sản phẩm */}
      <div className={isMaterialBlock ? 'p-3.5 sm:px-5 sm:py-3.5' : 'p-4 sm:px-5 sm:py-4'}>
        {/* Hàng đầu: Tiêu đề kèm icon bên trái; Nút 'Sửa' + icon bình luận bên phải */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Category Icon */}
            <div
              className={`w-7 h-7 rounded-lg ${iconMeta.bg} border flex items-center justify-center shrink-0`}
            >
              {iconMeta.icon}
            </div>

            {/* Tiêu đề mục */}
            <div className="flex items-center gap-2">
              <h4 className="text-xs sm:text-sm font-bold text-slate-700 uppercase tracking-wider">
                {block.title}
              </h4>

              {isModifiedInCurrentVer && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300/80">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                  <span>Đã thay đổi · {selectedOrder.currentVersion}</span>
                </span>
              )}

              {isLocked && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
                  <Lock className="w-2.5 h-2.5 text-slate-400" />
                  <span>Đã khóa</span>
                </span>
              )}
            </div>
          </div>

          {/* Right: Nút 'Sửa' và icon bình luận + số lượng bình luận lên cùng một hàng bên phải */}
          <div className="flex items-center gap-1.5 shrink-0">
            {!isLocked && (
              !isCustomer ? (
                <button
                  type="button"
                  onClick={() => setIsEditing(!isEditing)}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                    isEditing
                      ? 'bg-orange-50 text-orange-700 border border-orange-200'
                      : 'text-slate-500 hover:text-slate-800 hover:bg-white/80 border border-transparent'
                  }`}
                  title={`Chỉnh sửa ${block.title}`}
                >
                  <Edit3 className="w-3.5 h-3.5 stroke-[1.75]" />
                  <span className="text-[11px] font-semibold">
                    {isEditing ? 'Đóng' : 'Sửa'}
                  </span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleCustomerRequestChange}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-rose-700 bg-rose-50/70 border border-rose-200/80 hover:bg-rose-100/80 transition-all shadow-2xs cursor-pointer"
                  title="Gửi yêu cầu chỉnh sửa mục này tới nhà thiết kế"
                >
                  <GitPullRequest className="w-3 h-3 text-rose-600" />
                  <span className="text-[11px]">Yêu cầu sửa</span>
                </button>
              )
            )}

            {/* Icon bình luận + số lượng bình luận */}
            <button
              type="button"
              onClick={() => setIsCommentsOpen(!isCommentsOpen)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                isCommentsOpen || (block.comments && block.comments.length > 0)
                  ? 'bg-slate-100 text-slate-800 border border-slate-200/80 group-hover:bg-white/80 group-hover:border-[#c2d3ea]'
                  : 'text-slate-400 hover:text-slate-700 hover:bg-white/80 border border-transparent'
              }`}
              title="Bình luận trao đổi"
            >
              <MessageSquare className="w-3.5 h-3.5 stroke-[1.75]" />
              <span className="text-[11px] font-semibold">
                {block.comments ? block.comments.length : 0}
              </span>
            </button>
          </div>
        </div>

        {/* Nội dung chính đặt ngay dưới tiêu đề, dùng font rõ ràng đồng bộ (ẩn nếu không có giá trị hoặc ở ô vị trí in ấn, logo, số lượng, tệp thiết kế, ghi chú sản xuất) */}
        {((!isCustomer && isEditing) || (Boolean(block.value?.trim()) && block.key !== 'printing' && block.key !== 'logo' && block.key !== 'quantity' && block.key !== 'design_files' && block.key !== 'production_notes')) && (
          <div className={isMaterialBlock ? 'mt-1.5' : 'mt-2'}>
            {!isCustomer && isEditing ? (
              <div className="space-y-2">
                <textarea
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  className="w-full text-sm sm:text-base font-semibold text-slate-900 p-2.5 rounded-xl border border-orange-300 bg-white focus:outline-hidden focus:ring-2 focus:ring-orange-400/20 shadow-inner"
                  rows={2}
                />
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="px-3 py-1 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-100 cursor-pointer"
                  >
                    Hủy
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveEdit}
                    className="px-3.5 py-1 rounded-lg text-xs font-bold bg-orange-600 text-white hover:bg-orange-700 shadow-2xs cursor-pointer"
                  >
                    Lưu cập nhật
                  </button>
                </div>
              </div>
            ) : (
              <h3 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight leading-snug">
                {block.value}
              </h3>
            )}
          </div>
        )}

        {/* Swatch màu tinh tế cho mục Màu sắc */}
        {block.key === 'color' && (
          <div className="mt-2.5 flex items-center gap-2.5 p-2 px-2.5 rounded-xl bg-slate-50 border border-slate-200/60 w-fit max-w-full">
            <div
              className="w-5 h-5 rounded-md shadow-2xs border border-slate-300 shrink-0"
              style={{ backgroundColor: '#1F2937' }}
            />
            <div className="flex items-center gap-2 flex-wrap text-xs">
              <span className="font-bold text-slate-900">Pantone 19-4052 TCX</span>
              <span className="font-mono text-[11px] text-slate-600 bg-white border border-slate-200 px-1.5 py-0.2 rounded font-semibold">
                #1F2937
              </span>
              <span className="text-[11px] text-slate-500 hidden sm:inline">
                · Nhuộm Eco-Reactive
              </span>
            </div>
          </div>
        )}

        {/* Change Delta visual card nếu có thay đổi trong phiên bản */}
        {block.changeDelta && isModifiedInCurrentVer && (
          <div className="mt-2.5 p-2.5 sm:p-3 rounded-xl bg-gradient-to-r from-amber-50/70 to-orange-50/40 border border-amber-200/70 text-xs">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider text-amber-800">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                <span>Mục thay đổi: {block.changeDelta.label}</span>
              </div>
              <span className="text-[10px] font-semibold text-amber-700 bg-amber-100/80 px-2 py-0.5 rounded-full border border-amber-300/40">
                So với v03
              </span>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2 text-xs">
              <span className="line-through text-slate-400 font-medium bg-white/70 px-2 py-0.5 rounded-lg border border-slate-200/50">
                {block.changeDelta.from}
              </span>
              <span className="text-amber-600 font-bold text-sm hidden sm:inline">↓</span>
              <span className="text-amber-600 font-bold text-xs sm:hidden">↓</span>
              <span className="font-bold text-amber-950 bg-amber-100/90 px-2 py-0.5 rounded-lg border border-amber-300/70 shadow-2xs">
                {block.changeDelta.to}
              </span>
            </div>
          </div>
        )}

        {/* Divider mảnh giữa phần nội dung chính và phần thông tin kỹ thuật */}
        {((isDesignFilesBlock) || (block.details && Object.keys(block.details).length > 0)) && (
          <>
            <div
              className={`border-t border-slate-100 group-hover:border-[#d2dfef] transition-colors duration-200 ${
                isMaterialBlock ? 'my-2 sm:my-2.5' : 'my-3'
              }`}
            />

            {/* Khi là block Chất liệu vải: Layout compact 3 cột thông số chính + dòng phụ bo cổ & gấu */}
            {isMaterialBlock ? (
              <div className="flex flex-col">
                {/* 3 thông số chính trên cùng một hàng */}
                <div className="grid grid-cols-3 gap-x-2.5 sm:gap-x-6 items-start">
                  {/* ĐỊNH LƯỢNG */}
                  <div className="flex flex-col min-w-0">
                    <span className="text-[10px] sm:text-[11px] font-bold text-slate-400 group-hover:text-[#5c7299] uppercase tracking-wider transition-colors">
                      Định lượng
                    </span>
                    <span className="text-xs sm:text-[13px] font-extrabold text-slate-900 mt-1 sm:mt-1.5 tracking-tight leading-snug">
                      {block.details['Định lượng'] || block.details['Định lượng vải'] || '420 GSM ±10'}
                    </span>
                  </div>

                  {/* LOẠI SỢI */}
                  <div className="flex flex-col min-w-0">
                    <span className="text-[10px] sm:text-[11px] font-bold text-slate-400 group-hover:text-[#5c7299] uppercase tracking-wider transition-colors">
                      Loại sợi
                    </span>
                    <span className="text-xs sm:text-[13px] font-extrabold text-slate-900 mt-1 sm:mt-1.5 tracking-tight leading-snug">
                      {block.details['Loại sợi'] || '32/2 · Combed Ring-Spun'}
                    </span>
                  </div>

                  {/* MẶT VẢI */}
                  <div className="flex flex-col min-w-0">
                    <span className="text-[10px] sm:text-[11px] font-bold text-slate-400 group-hover:text-[#5c7299] uppercase tracking-wider transition-colors">
                      Mặt vải
                    </span>
                    <span className="text-xs sm:text-[13px] font-extrabold text-slate-900 mt-1 sm:mt-1.5 tracking-tight leading-snug">
                      {block.details['Mặt vải'] || block.details['Mặt trong vải'] || 'French Terry · Vảy cá'}
                    </span>
                  </div>
                </div>
              </div>
            ) : isDesignFilesBlock ? (
              /* Dedicated PDF dropzone and file list for Tệp thiết kế */
              <div className="flex flex-col gap-3">
                {/* File list */}
                {designPdfList.length > 0 && (
                  <div className="flex flex-col gap-2">
                    {designPdfList.map((pdf) => (
                      <div
                        key={pdf.id}
                        className="flex items-center justify-between gap-3 p-2.5 px-3 rounded-xl border border-slate-200/90 bg-white hover:bg-slate-50/90 hover:border-[#b8cce6] transition-all duration-200 shadow-2xs"
                      >
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <div className="w-8 h-8 rounded-lg bg-rose-50 border border-rose-200/70 flex flex-col items-center justify-center shrink-0">
                            <FileText className="w-4 h-4 text-rose-600 stroke-[2]" />
                            <span className="text-[7.5px] font-black text-rose-600 -mt-0.5 leading-none">PDF</span>
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs sm:text-[13px] font-bold text-slate-800 truncate" title={pdf.name}>
                              {pdf.name}
                            </p>
                            <div className="flex items-center gap-1.5 flex-wrap text-[11px] text-slate-500 mt-0.5">
                              <span className="font-semibold text-slate-700">{pdf.size}</span>
                              {pdf.badge && (
                                <>
                                  <span className="text-slate-300">·</span>
                                  <span className="text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded font-medium border border-emerald-200/60 text-[10px]">
                                    {pdf.badge}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              setActivePreviewPdf(pdf);
                              setIsPreviewModalOpen(true);
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-[#3b4b6d] bg-slate-50 hover:bg-[#E8EEF8] border border-slate-200 hover:border-[#b8cce6] transition-all cursor-pointer"
                            title="Xem trước tệp PDF"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Xem</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDownloadSpecificPdf(pdf)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
                            title="Tải tệp PDF xuống"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setDesignPdfList((prev) => prev.filter((item) => item.id !== pdf.id));
                              showToast(`Đã gỡ tệp ${pdf.name}`, 'info');
                            }}
                            className="p-1.5 rounded-lg text-slate-300 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                            title="Gỡ tệp"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Dropzone */}
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDraggingPdf(true);
                  }}
                  onDragLeave={() => setIsDraggingPdf(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDraggingPdf(false);
                    handleDesignFilesUpload(e.dataTransfer.files);
                  }}
                  onClick={() => designFileInputRef.current?.click()}
                  className={`flex flex-col items-center justify-center p-4 sm:p-5 rounded-xl border-2 border-dashed transition-all duration-200 cursor-pointer text-center ${
                    isDraggingPdf
                      ? 'border-[#3b4b6d] bg-[#E8EEF8]'
                      : 'border-slate-300 bg-slate-50/70 hover:bg-[#E8EEF8]/40 hover:border-[#b8cce6]'
                  }`}
                >
                  <div className="w-10 h-10 rounded-full bg-white shadow-2xs border border-slate-200 flex items-center justify-center mb-2">
                    <Upload className="w-5 h-5 text-[#3b4b6d]" />
                  </div>
                  <p className="text-xs sm:text-[13px] font-bold text-slate-800">
                    Kéo & thả file PDF vào đây hoặc <span className="text-[#3b4b6d] underline font-semibold">chọn từ máy tính</span>
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Chỉ chấp nhận tệp định dạng .pdf (Chuẩn Tech Pack, bản vẽ vector CMYK)
                  </p>
                  <input
                    type="file"
                    ref={designFileInputRef}
                    onChange={(e) => handleDesignFilesUpload(e.target.files)}
                    accept="application/pdf,.pdf"
                    multiple
                    className="hidden"
                  />
                </div>
              </div>
            ) : isProductionNotesBlock ? (
              /* Bố cục 2/2: Kỹ thuật may và Dây rút nón bên trái, Nhãn mác và Quy cách bao gói bên phải */
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3.5 items-start">
                {/* Cột trái: Kỹ thuật may & Dây rút nón */}
                <div className="flex flex-col gap-3">
                  <div className="flex flex-col min-w-0">
                    <span className="text-[10px] sm:text-[11px] font-bold text-slate-400 group-hover:text-[#5c7299] uppercase tracking-wider transition-colors">
                      Kỹ thuật may
                    </span>
                    <span className="text-xs sm:text-[13px] font-bold text-slate-900 mt-1 leading-snug">
                      {block.details?.['Kỹ thuật may'] || 'Trần đè 2 kim gia cố chịu lực vòng nách, cầu vai và gấu áo'}
                    </span>
                  </div>

                  <div className="flex flex-col min-w-0">
                    <span className="text-[10px] sm:text-[11px] font-bold text-slate-400 group-hover:text-[#5c7299] uppercase tracking-wider transition-colors">
                      Dây rút nón
                    </span>
                    <span className="text-xs sm:text-[13px] font-bold text-slate-900 mt-1 leading-snug">
                      {block.details?.['Dây rút nón'] || '100% Cotton dệt dẹp bản 15mm có đầu bọc kim loại khắc logo'}
                    </span>
                  </div>
                </div>

                {/* Cột phải: Nhãn mác & Quy cách bao gói */}
                <div className="flex flex-col gap-3">
                  <div className="flex flex-col min-w-0">
                    <span className="text-[10px] sm:text-[11px] font-bold text-slate-400 group-hover:text-[#5c7299] uppercase tracking-wider transition-colors">
                      Nhãn mác
                    </span>
                    <span className="text-xs sm:text-[13px] font-bold text-slate-900 mt-1 leading-snug">
                      {block.details?.['Nhãn mác'] || 'Nhãn dệt satin chính cổ áo + nhãn giặt hướng dẫn sườn trái'}
                    </span>
                  </div>

                  <div className="flex flex-col min-w-0">
                    <span className="text-[10px] sm:text-[11px] font-bold text-slate-400 group-hover:text-[#5c7299] uppercase tracking-wider transition-colors">
                      Quy cách bao gói
                    </span>
                    <span className="text-xs sm:text-[13px] font-bold text-slate-900 mt-1 leading-snug">
                      {block.details?.['Quy cách bao gói'] || 'Túi zip mờ sinh học tự phân hủy có dán nhãn mã vạch'}
                    </span>
                  </div>
                </div>
              </div>
            ) : isLogoBlock ? (
              /* Bố cục 2/2 cho Logo & Hình in: Logo ngực trước và Logo lưng sau bên trái, Công thức mực và Màu sắc in bên phải */
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3.5 items-start">
                {/* Cột trái: Logo ngực trước & Logo lưng sau */}
                <div className="flex flex-col gap-3">
                  <div className="flex flex-col min-w-0">
                    <span className="text-[10px] sm:text-[11px] font-bold text-slate-400 group-hover:text-[#5c7299] uppercase tracking-wider transition-colors">
                      Logo ngực trước
                    </span>
                    <span className="text-xs sm:text-[13px] font-bold text-slate-900 mt-1 leading-snug">
                      {block.details?.['Logo ngực trước'] || 'Mini Wordmark (10 × 2.5 cm) in silicone cao thành 3D puff'}
                    </span>
                  </div>

                  <div className="flex flex-col min-w-0">
                    <span className="text-[10px] sm:text-[11px] font-bold text-slate-400 group-hover:text-[#5c7299] uppercase tracking-wider transition-colors">
                      Logo lưng sau
                    </span>
                    <span className="text-xs sm:text-[13px] font-bold text-slate-900 mt-1 leading-snug">
                      {block.details?.['Logo lưng sau'] || 'Emblem chính: 20 × 15 cm (Thu gọn từ 25 × 18 cm để không bị nón áo che)'}
                    </span>
                  </div>
                </div>

                {/* Cột phải: Công thức mực & Màu sắc in */}
                <div className="flex flex-col gap-3">
                  <div className="flex flex-col min-w-0">
                    <span className="text-[10px] sm:text-[11px] font-bold text-slate-400 group-hover:text-[#5c7299] uppercase tracking-wider transition-colors">
                      Công thức mực
                    </span>
                    <span className="text-xs sm:text-[13px] font-bold text-slate-900 mt-1 leading-snug">
                      {block.details?.['Công thức mực'] || 'Plastisol bổ sung phụ gia soft-hand mịn tay, sấy khô mờ'}
                    </span>
                  </div>

                  <div className="flex flex-col min-w-0">
                    <span className="text-[10px] sm:text-[11px] font-bold text-slate-400 group-hover:text-[#5c7299] uppercase tracking-wider transition-colors">
                      Màu sắc in
                    </span>
                    <span className="text-xs sm:text-[13px] font-bold text-slate-900 mt-1 leading-snug">
                      {block.details?.['Màu sắc in'] || 'Warm Off-White (Pantone 11-0601 TCX)'}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              /* Thông tin kỹ thuật dạng grid 3 cột trên desktop, 2 cột trên tablet, 1 cột trên mobile cho các block khác */
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-2.5 items-start">
                {Object.entries(block.details)
                  .filter(([key]) => key !== 'Mã màu chuẩn')
                  .map(([key, val]) => {
                  if (key === 'File thiết kế') {
                    return (
                      <div key={key} className="flex flex-col min-w-0">
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                          {key}
                        </span>
                        {attachedPdf ? (
                          <div className="flex items-center justify-between gap-1.5 p-1.5 px-2.5 rounded-lg border border-slate-200/90 bg-white hover:bg-[#E8EEF8] hover:border-[#b8cce6] transition-all duration-200 shadow-2xs w-full">
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              {/* PDF Icon */}
                              <div className="w-6 h-6 rounded-md bg-rose-50 border border-rose-200/70 flex items-center justify-center shrink-0">
                                <FileText className="w-3.5 h-3.5 text-rose-600 stroke-[2]" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p
                                  className="text-xs font-semibold text-slate-800 truncate leading-tight hover:text-[#3b4b6d]"
                                  title={attachedPdf.name}
                                >
                                  {attachedPdf.name}
                                </p>
                                <span className="text-[10px] text-slate-400 font-medium leading-none">
                                  {attachedPdf.size}
                                </span>
                              </div>
                            </div>

                            {/* Action: Xem & Gỡ file */}
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={() => setIsPreviewModalOpen(true)}
                                className="px-2 py-0.5 rounded-md text-[11px] font-semibold text-[#3b4b6d] hover:text-[#25324d] hover:bg-white transition-colors cursor-pointer"
                                title="Xem file thiết kế PDF"
                              >
                                Xem
                              </button>
                              <button
                                type="button"
                                onClick={handleRemovePdf}
                                className="p-1 rounded text-slate-300 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                                title="Gỡ file đính kèm"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={(e) => {
                              e.preventDefault();
                              const file = e.dataTransfer.files?.[0];
                              if (file) {
                                if (
                                  !file.name.toLowerCase().endsWith('.pdf') &&
                                  file.type !== 'application/pdf'
                                ) {
                                  showToast('Chỉ chấp nhận định dạng PDF (.pdf)!', 'error');
                                  return;
                                }
                                const sizeInMb = (file.size / (1024 * 1024)).toFixed(1);
                                const sizeStr =
                                  file.size > 1024 * 1024
                                    ? `${sizeInMb} MB`
                                    : `${Math.max(1, Math.round(file.size / 1024))} KB`;
                                setAttachedPdf({
                                  name: file.name,
                                  size: sizeStr,
                                  url: URL.createObjectURL(file),
                                });
                                showToast(`Đã tải lên tệp PDF: ${file.name}`, 'success');
                              }
                            }}
                            className="flex items-center justify-between gap-2 p-1.5 px-2.5 rounded-lg border border-dashed border-slate-300/90 bg-slate-50/70 hover:bg-[#E8EEF8] hover:border-[#b8cce6] transition-all duration-200"
                          >
                            <span className="text-xs text-slate-400 italic">
                              Chưa có file thiết kế
                            </span>
                            <button
                              type="button"
                              onClick={() => fileInputRef.current?.click()}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white border border-slate-200 hover:border-[#3b4b6d] text-[11px] font-semibold text-slate-700 hover:text-[#3b4b6d] hover:bg-white transition-all shadow-2xs cursor-pointer"
                            >
                              <span>+ Tải file PDF</span>
                            </button>
                          </div>
                        )}

                        <input
                          type="file"
                          ref={fileInputRef}
                          onChange={handleFileUpload}
                          accept="application/pdf,.pdf"
                          className="hidden"
                        />
                      </div>
                    );
                  }

                  return (
                    <div key={key} className="flex flex-col min-w-0">
                      <span className="text-[10px] sm:text-[11px] font-bold text-slate-400 group-hover:text-[#5c7299] uppercase tracking-wider transition-colors">
                        {key}
                      </span>
                      <span className="text-xs sm:text-[13px] font-extrabold text-slate-900 mt-1 sm:mt-1.5 tracking-tight leading-snug">
                        {val}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      {/* Accordion / Comments Section */}
      {renderCommentsSection()}

      {/* PDF Document Preview Modal */}
      {renderPreviewModal()}
    </div>
  );
};
