import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  AlertCircle,
  Send,
  Sparkles,
  X,
  MapPin,
  Layers,
  CheckCircle2,
  Clock,
  ArrowRight,
} from 'lucide-react';
import { ChangeRequestPriority } from '../../types';

interface CustomerChangeRequestDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}

export const CustomerChangeRequestDrawer: React.FC<CustomerChangeRequestDrawerProps> = ({
  isOpen,
  onClose,
  onMouseEnter,
  onMouseLeave,
}) => {
  const {
    selectedOrder,
    selectedVersion,
    createChangeRequest,
    setCurrentView,
    showToast,
    demoStep,
    goToDemoStep,
  } = useApp();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [affectedBlockKey, setAffectedBlockKey] = useState('logo');
  const [specificLocation, setSpecificLocation] = useState('');
  const [priority, setPriority] = useState<ChangeRequestPriority>('HIGH');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const locationPresets = [
    'Cổ tay áo trái',
    'Ngực áo trước',
    'Mặt sau lưng',
    'Mũ trùm đầu',
    'Gấu áo & Bo sườn',
  ];

  if (!isOpen) return null;

  const handleFillDemo = () => {
    setTitle('Bổ sung thêu chìm chữ đồng màu ở cổ tay áo trái');
    setSpecificLocation('Cổ tay áo trái');
    setDescription(
      'Vui lòng bổ sung thêu chữ đồng màu Pantone 11-0601 TCX ở cổ tay áo bên trái (cách mép bo gấu tay áo 5cm), đảm bảo khi thả mũ áo sau lưng vẫn không bị che.'
    );
    setAffectedBlockKey('logo');
    setPriority('HIGH');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) {
      showToast('Vui lòng nhập nội dung cần chỉnh sửa.', 'warning');
      return;
    }

    setIsSubmitting(true);

    const block = selectedOrder.specBlocks.find((b) => b.key === affectedBlockKey);
    const finalTitle =
      title.trim() ||
      (specificLocation.trim()
        ? `Chỉnh sửa tại ${specificLocation.trim()}`
        : `Yêu cầu chỉnh sửa ${block?.title || 'thông số'}`);

    const fullDescription = specificLocation.trim()
      ? `[Vị trí: ${specificLocation.trim()}]\n\n${description.trim()}`
      : description.trim();

    createChangeRequest({
      title: finalTitle,
      description: fullDescription,
      affectedBlockKey,
      affectedBlockTitle: block?.title || 'Thông số kỹ thuật',
      priority,
    });

    setTitle('');
    setDescription('');
    setSpecificLocation('');
    setIsSubmitting(false);
    onClose();

    if (demoStep === 8 || demoStep === 7) {
      goToDemoStep(10);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden pointer-events-none">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-slate-900/30 backdrop-blur-xs transition-opacity animate-in fade-in duration-200 pointer-events-auto"
      />

      {/* Slide-over Right Panel */}
      <div
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        className="fixed inset-y-0 right-0 max-w-full flex pointer-events-auto"
      >
        <div className="w-screen max-w-md sm:max-w-md lg:max-w-lg bg-white shadow-2xl flex flex-col border-l border-slate-200 animate-in slide-in-from-right duration-200 ease-out">
          {/* Header */}
          <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between gap-4 bg-slate-50/70">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-rose-100/80 border border-rose-200 text-rose-600 flex items-center justify-center shrink-0">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm sm:text-base font-black text-slate-900 truncate">
                    Yêu cầu chỉnh sửa
                  </h3>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-200/80">
                    Bản {selectedVersion}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 truncate">
                  Cho chúng tôi biết những điểm bạn muốn thay đổi
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-white border border-transparent hover:border-slate-200 transition-colors shrink-0 cursor-pointer"
              title="Đóng panel"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Form Content */}
          <form
            onSubmit={handleSubmit}
            className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 text-xs"
          >
            {/* Context Notice & Demo Quickfill */}
            <div className="p-3 rounded-2xl bg-amber-50/70 border border-amber-200/80 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
                <div className="min-w-0 text-[11px] text-amber-950 font-medium">
                  Đơn hàng <strong>#{selectedOrder.orderNumber}</strong> ({selectedOrder.productName})
                </div>
              </div>
              <button
                type="button"
                onClick={handleFillDemo}
                className="px-2.5 py-1 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-[11px] font-bold shadow-2xs transition-all active:scale-95 shrink-0"
              >
                Điền mẫu nhanh
              </button>
            </div>

            {/* Title (Optional / Auto) */}
            <div>
              <label className="block font-bold text-slate-700 uppercase mb-1">
                Tiêu đề yêu cầu (Tùy chọn)
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="VD: Bổ sung thêu chìm chữ ở cổ tay áo bên trái..."
                className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-orange-400/20 focus:border-orange-400 text-slate-800"
              />
            </div>

            {/* Specific Location Chips */}
            <div>
              <label className="block font-bold text-slate-700 uppercase mb-1 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                <span>Vị trí hoặc hạng mục cần thay đổi</span>
              </label>
              <input
                type="text"
                value={specificLocation}
                onChange={(e) => setSpecificLocation(e.target.value)}
                placeholder="VD: Cổ tay áo trái, Ngực áo trước, Sau lưng..."
                className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-orange-400/20 focus:border-orange-400 text-slate-800 mb-2"
              />
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[11px] text-slate-400">Gợi ý:</span>
                {locationPresets.map((loc) => (
                  <button
                    key={loc}
                    type="button"
                    onClick={() => setSpecificLocation(loc)}
                    className={`text-[11px] px-2 py-0.5 rounded-lg border transition-colors ${
                      specificLocation === loc
                        ? 'bg-orange-100 text-orange-950 border-orange-300 font-bold'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {loc}
                  </button>
                ))}
              </div>
            </div>

            {/* Category selection */}
            <div>
              <label className="block font-bold text-slate-700 uppercase mb-1 flex items-center gap-1">
                <Layers className="w-3.5 h-3.5 text-slate-400" />
                <span>Hạng mục kỹ thuật</span>
              </label>
              <select
                value={affectedBlockKey}
                onChange={(e) => setAffectedBlockKey(e.target.value)}
                className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-orange-400/20 focus:border-orange-400 text-slate-800 font-medium"
              >
                {(selectedOrder?.specBlocks || []).map((b) => (
                  <option key={b.key} value={b.key}>
                    {b.title}
                  </option>
                ))}
              </select>
            </div>

            {/* Main Textarea */}
            <div>
              <label className="block font-bold text-slate-700 uppercase mb-1">
                Nội dung cần chỉnh sửa *
              </label>
              <textarea
                required
                rows={5}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Nhập nội dung cần chỉnh sửa..."
                className="w-full text-xs p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-orange-400/20 focus:border-orange-400 text-slate-800 leading-relaxed"
              />
            </div>

            {/* Destination Info Box */}
            <div className="p-3 rounded-xl bg-orange-50/80 border border-orange-200/80 text-[11px] text-orange-950 leading-relaxed flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-orange-600 shrink-0 mt-0.5" />
              <p>
                Sau khi gửi, yêu cầu này sẽ được tự động ghi nhận vào mục{' '}
                <strong className="underline decoration-orange-400 font-bold">
                  Yêu cầu thay đổi của tôi
                </strong>{' '}
                và chuyển đến Designer để xử lý ở phiên bản kế tiếp.
              </p>
            </div>

            {/* Submit Bar */}
            <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={!description.trim() || isSubmitting}
                className="px-5 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-orange-600/20 transition-all active:scale-98 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Gửi yêu cầu</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
