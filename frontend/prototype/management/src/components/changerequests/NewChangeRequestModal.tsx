import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Modal } from '../common/Modal';
import { AlertCircle, Send, Sparkles, MapPin, Layers } from 'lucide-react';
import { ChangeRequestPriority } from '../../types';

export const NewChangeRequestModal: React.FC = () => {
  const {
    isNewCRModalOpen,
    closeNewCRModal,
    selectedOrder,
    selectedVersion,
    createChangeRequest,
    currentUser,
    demoStep,
    goToDemoStep,
  } = useApp();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [affectedBlockKey, setAffectedBlockKey] = useState('logo');
  const [specificLocation, setSpecificLocation] = useState('');
  const [priority, setPriority] = useState<ChangeRequestPriority>('HIGH');

  const locationPresets = [
    'Cổ tay áo trái',
    'Ngực áo trước',
    'Mặt sau lưng',
    'Mũ trùm đầu',
    'Gấu áo & Bo sườn',
    'Nhãn cổ áo',
  ];

  const handleFillDemo = () => {
    setTitle('Thêm chữ thêu chìm đồng màu tinh tế ở cổ tay áo bên trái');
    setSpecificLocation('Cổ tay áo trái (cách bo tay 5cm)');
    setDescription(
      'Vui lòng bổ sung thêu chìm chữ đồng màu ở cổ tay áo trái sử dụng mã màu Pantone 11-0601 TCX, và đảm bảo khoảng trống khi thả mũ áo vẫn nhìn rõ 100%.'
    );
    setAffectedBlockKey('logo');
    setPriority('HIGH');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) return;

    const block = selectedOrder.specBlocks.find((b) => b.key === affectedBlockKey);

    const fullDescription = specificLocation.trim()
      ? `[Vị trí: ${specificLocation.trim()}]\n\n${description}`
      : description;

    createChangeRequest({
      title,
      description: fullDescription,
      affectedBlockKey,
      affectedBlockTitle: block?.title || 'Thông số',
      priority,
    });

    setTitle('');
    setDescription('');
    setSpecificLocation('');
    closeNewCRModal();

    if (demoStep === 8 || demoStep === 7) {
      goToDemoStep(10);
    }
  };

  const isCustomer = currentUser.role === 'customer';

  return (
    <Modal
      isOpen={isNewCRModalOpen}
      onClose={closeNewCRModal}
      maxWidth="xl"
      title={
        <span className="flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-orange-500" />
          <span className="text-base font-black text-slate-900 tracking-tight">
            Yêu cầu chỉnh sửa thiết kế
          </span>
        </span>
      }
      subtitle={
        <div className="flex items-center gap-2 flex-wrap text-xs text-slate-500 mt-1">
          <span>Đơn hàng #{selectedOrder.orderNumber} ({selectedOrder.productName})</span>
          <span className="text-slate-300">•</span>
          <span className="inline-flex items-center gap-1 font-bold text-orange-700 bg-orange-50 border border-orange-200/80 px-2 py-0.5 rounded-md font-mono text-[11px]">
            Đang phản hồi: Phiên bản {selectedVersion}
          </span>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Prominent Version Banner */}
        <div className="p-3 rounded-2xl bg-amber-50/70 border border-amber-200/80 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-md bg-amber-200 text-amber-950 font-mono font-black text-xs">
              {selectedVersion}
            </span>
            <span className="text-xs text-amber-900 font-medium">
              Bạn đang gửi góp ý / yêu cầu chỉnh sửa cho bản thiết kế <strong>Phiên bản {selectedVersion}</strong>.
            </span>
          </div>

          <button
            type="button"
            onClick={handleFillDemo}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold shadow-2xs transition-all active:scale-95 shrink-0"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Điền mẫu nhanh</span>
          </button>
        </div>

        {/* 1. Title */}
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
            Nội dung cần chỉnh sửa (Tiêu đề) *
          </label>
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="VD: Thêm chữ thêu chìm đồng màu tinh tế ở cổ tay áo bên trái"
            className="w-full text-xs p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-orange-400/20 focus:border-orange-400 text-slate-800"
          />
        </div>

        {/* 2. Category / Spec block & Priority */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1 flex items-center gap-1">
              <Layers className="w-3.5 h-3.5 text-slate-400" />
              <span>Hạng mục thay đổi *</span>
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

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Mức độ ưu tiên
            </label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as ChangeRequestPriority)}
              className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-orange-400/20 focus:border-orange-400 text-slate-800 font-semibold"
            >
              <option value="HIGH">Cao (Thay đổi thiết kế)</option>
              <option value="URGENT">Khẩn cấp (Chặn tiến độ sản xuất)</option>
              <option value="MEDIUM">Trung bình (Điều chỉnh thông số)</option>
              <option value="LOW">Thấp (Góp ý tham khảo)</option>
            </select>
          </div>
        </div>

        {/* 3. Specific Location on Product (Optional) */}
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase mb-1 flex items-center justify-between">
            <span className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-slate-400" />
              <span>Vị trí cụ thể trên sản phẩm (Tùy chọn)</span>
            </span>
            <span className="text-[10px] text-slate-400 font-normal lowercase">Ghi rõ vị trí cần sửa</span>
          </label>
          <input
            type="text"
            value={specificLocation}
            onChange={(e) => setSpecificLocation(e.target.value)}
            placeholder="VD: Cổ tay áo trái, Ngực áo trước, Sau lưng, v.v."
            className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-orange-400/20 focus:border-orange-400 text-slate-800 mb-2"
          />

          {/* Quick Location Chips */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] text-slate-400 font-medium">Gợi ý nhanh:</span>
            {locationPresets.map((loc) => (
              <button
                key={loc}
                type="button"
                onClick={() => setSpecificLocation(loc)}
                className={`text-[11px] px-2 py-0.5 rounded-lg border transition-colors ${
                  specificLocation === loc
                    ? 'bg-orange-100 text-orange-900 border-orange-300 font-bold'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {loc}
              </button>
            ))}
          </div>
        </div>

        {/* 4. Detailed Description */}
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
            Chi tiết nội dung cần chỉnh sửa *
          </label>
          <textarea
            required
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Mô tả chi tiết mong muốn của bạn về màu sắc, kích thước, chi tiết thêu/in, căn chỉnh khoảng cách để Designer thực hiện chuẩn xác..."
            className="w-full text-xs p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-orange-400/20 focus:border-orange-400 text-slate-800 leading-relaxed"
          />
        </div>

        {/* Guidance / Destination note */}
        <div className="p-3 rounded-xl bg-orange-50/80 border border-orange-200/80 text-xs text-orange-950 flex items-start gap-2">
          <Sparkles className="w-4 h-4 text-orange-600 shrink-0 mt-0.5" />
          <p className="text-[11px] leading-relaxed">
            Sau khi gửi, yêu cầu này sẽ được ghi nhận và hiển thị ngay trong mục{' '}
            <strong className="underline decoration-orange-400 font-bold">
              {isCustomer ? 'Yêu cầu thay đổi của tôi' : 'Yêu cầu thay đổi'}
            </strong>
            . Trạng thái đơn hàng sẽ chuyển sang <strong>Yêu cầu chỉnh sửa</strong> để Designer cập nhật bản mới.
          </p>
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={closeNewCRModal}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
          >
            Hủy
          </button>
          <button
            type="submit"
            disabled={!title.trim() || !description.trim()}
            className="px-5 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-orange-600/20 transition-all active:scale-98 cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Gửi yêu cầu chỉnh sửa</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};
