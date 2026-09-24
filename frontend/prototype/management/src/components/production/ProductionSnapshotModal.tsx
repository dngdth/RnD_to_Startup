import React from 'react';
import { useApp } from '../../context/AppContext';
import { Modal } from '../common/Modal';
import {
  Lock,
  CheckCircle2,
  Calendar,
  UserCheck,
  ShieldCheck,
  FileCheck,
  Download,
  Printer,
  Copy,
  Hash,
  ExternalLink,
  Award,
  Layers,
  Sparkles,
} from 'lucide-react';

export const ProductionSnapshotModal: React.FC = () => {
  const {
    isProductionSnapshotOpen,
    closeProductionSnapshot,
    selectedOrder,
    showToast,
  } = useApp();

  const handleCopyHash = () => {
    navigator.clipboard?.writeText('SHA-429E-PROD-LOCKED-05-AUTHENTICATED');
    showToast('Đã sao chép mã băm xác thực sản xuất vào khay nhớ tạm!', 'success');
  };

  const handleExportPDF = () => {
    showToast('Đang tạo tệp PDF Hồ sơ kỹ thuật & Phiếu xuất xưởng sản xuất...', 'info');
  };

  const formattedTimestamp =
    selectedOrder.lockedAt ||
    selectedOrder.approvedAt ||
    new Date().toLocaleDateString('vi-VN', {
      month: 'numeric',
      day: 'numeric',
      year: 'numeric',
    }) +
      ', ' +
      new Date().toLocaleTimeString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
      });

  return (
    <Modal
      isOpen={isProductionSnapshotOpen}
      onClose={closeProductionSnapshot}
      maxWidth="2xl"
      title={
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-slate-900 text-amber-400 flex items-center justify-center shadow-xs">
            <Lock className="w-4 h-4 stroke-[2.2]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-black text-slate-900 tracking-tight">
                Ảnh chụp sản xuất
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-200">
                Bản thiết kế bất biến
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-normal">
              Đơn hàng #{selectedOrder.orderNumber} · Bản phát hành khóa sản xuất nhà máy
            </p>
          </div>
        </div>
      }
    >
      <div className="space-y-5">
        {/* Golden Hero Snapshot Card */}
        <div className="p-5 rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-white shadow-xl relative overflow-hidden">
          {/* Subtle background glow */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

          <div className="relative z-10 space-y-4">
            {/* Top row */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                <span className="text-xs font-mono font-bold tracking-widest uppercase text-emerald-400">
                  ĐÃ KHÓA ĐỂ SẢN XUẤT
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-xs font-mono text-slate-400">
                <Hash className="w-3.5 h-3.5 text-orange-400" />
                <span>#SHA-429E-V05</span>
              </div>
            </div>

            {/* Core Required Snapshot Details */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Version */}
              <div className="p-3 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xs">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Phiên bản
                </span>
                <span className="text-xl font-black text-amber-300 tracking-tight mt-0.5 block">
                  Phiên bản 05
                </span>
                <span className="text-[10px] text-slate-400">Bản phát hành cuối cùng</span>
              </div>

              {/* Approved by Emma */}
              <div className="p-3 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xs">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Ký duyệt bởi
                </span>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="text-sm font-black text-white truncate">
                    Đã duyệt bởi Emma
                  </span>
                </div>
                <span className="text-[10px] text-emerald-300/80">
                  Chủ thương hiệu · Ký số điện tử
                </span>
              </div>

              {/* Timestamp */}
              <div className="p-3 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xs">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Dấu thời gian
                </span>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <Calendar className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                  <span className="text-xs font-bold text-slate-200">
                    {formattedTimestamp}
                  </span>
                </div>
                <span className="text-[10px] text-slate-400">
                  Được niêm phong mã hóa
                </span>
              </div>
            </div>

            {/* Verified Specification Summary */}
            <div className="p-3.5 rounded-2xl bg-slate-800/60 border border-slate-700/70 text-xs space-y-2">
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-300 pb-1.5 border-b border-slate-700/50">
                <span>Sản phẩm: {selectedOrder.productName}</span>
                <span className="text-orange-400">Lô hàng: Tổng cộng 60 sản phẩm</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px]">
                <div>
                  <span className="text-slate-400 block text-[10px]">Kích thước logo lưng:</span>
                  <span className="font-bold text-white">20 × 15 cm</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Khoảng cách đường may lưng:</span>
                  <span className="font-bold text-white">14.0 cm (100% không bị mũ che)</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Chữ thêu bo tay:</span>
                  <span className="font-bold text-emerald-400">Đã thêm trong Phiên bản 05 (Bo tay)</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Định lượng vải:</span>
                  <span className="font-bold text-white">420 GSM nỉ chân cua Pháp</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Nhuộm màu Pantone:</span>
                  <span className="font-bold text-white">19-4052 TCX Xanh Navy Đậm</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Tệp thiết kế gốc:</span>
                  <span className="font-bold text-orange-300">design_v5.png (Vector 300 DPI)</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Manufacturing Readiness & Security Card */}
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Award className="w-4 h-4 text-emerald-600" />
              <span className="text-xs font-bold text-slate-800">
                Độ sẵn sàng xuất xưởng sản xuất
              </span>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800">
              100% Đạt tiêu chuẩn
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-600">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>Độ bền màu & mẫu thử nhuộm sinh học đã được kiểm định</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>Tách lớp đồ họa vector độ phân giải cao đã sẵn sàng</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>Dung sai độ co giãn của bo dệt đã được hiệu chuẩn</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>Đã ghi nhận đủ chữ ký của Chủ thương hiệu và Xưởng may</span>
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-slate-100">
          <button
            onClick={handleCopyHash}
            className="text-xs font-semibold text-slate-500 hover:text-slate-800 flex items-center gap-1.5 transition-colors"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>Sao chép mã niêm phong kiểm toán</span>
          </button>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              onClick={handleExportPDF}
              className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-colors shadow-2xs"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>In hồ sơ kỹ thuật</span>
            </button>
            <button
              onClick={closeProductionSnapshot}
              className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all shadow-md active:scale-98"
            >
              Đóng ảnh chụp
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
