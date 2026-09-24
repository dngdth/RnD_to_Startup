import React from 'react';
import { useApp } from '../../context/AppContext';
import {
  FileText,
  Download,
  Eye,
  CheckCircle2,
  AlertTriangle,
  UploadCloud,
  FileCode,
  Sparkles,
  Layers,
} from 'lucide-react';

export const DesignFilesTab: React.FC = () => {
  const { selectedOrder, showToast } = useApp();

  const handleDownload = (fileName: string) => {
    showToast(`Đang tải xuống ${fileName}...`, 'info');
  };

  const handleUpload = () => {
    showToast('Đã tải lên tệp vector sẵn sàng in ấn mới.', 'success');
  };

  return (
    <div className="space-y-6">
      {/* Tab Header & Upload Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-5 rounded-2xl bg-gradient-to-r from-orange-50/60 via-white to-rose-50/40 border border-orange-200/60">
        <div>
          <h3 className="text-base font-bold text-slate-900">
            Tệp đồ họa sản xuất & Vector
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Đồ họa tách màu, đường cong màu CMYK và hồ sơ tech pack thông số kỹ thuật cho Đơn hàng #{selectedOrder.orderNumber}.
          </p>
        </div>

        <button
          onClick={handleUpload}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-xs transition-colors shrink-0"
        >
          <UploadCloud className="w-4 h-4 text-orange-400" />
          <span>Tải lên tệp / Bản sửa đổi</span>
        </button>
      </div>

      {/* Files List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {(selectedOrder?.designFiles || []).map((file) => (
          <div
            key={file.id}
            className="p-4 rounded-2xl bg-white border border-slate-200/70 shadow-2xs hover:border-orange-200 transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start justify-between gap-3 mb-2.5">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center font-bold text-xs shrink-0 border border-orange-200/60">
                    {file.type === 'vector' ? 'AI' : file.type === 'techpack' ? 'PDF' : 'PNG'}
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xs font-bold text-slate-900 truncate" title={file.name}>
                      {file.name}
                    </h4>
                    <p className="text-[11px] text-slate-400">
                      {file.size} · Phiên bản {file.version}
                    </p>
                  </div>
                </div>

                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    file.cmykReady
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-amber-50 text-amber-700 border border-amber-200'
                  }`}
                >
                  {file.cmykReady ? 'Sẵn sàng CMYK' : 'Bản xem trước RGB'}
                </span>
              </div>

              {/* Specs & Status */}
              <div className="grid grid-cols-2 gap-2 my-2 text-[11px] bg-slate-50/80 p-2.5 rounded-xl border border-slate-200/50">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">
                    Độ phân giải
                  </span>
                  <span className="font-semibold text-slate-700">{file.resolutionDpi} DPI</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">
                    Người tải lên
                  </span>
                  <span className="font-semibold text-slate-700 truncate block">
                    {file.uploadedBy}
                  </span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
              <span className="text-[11px] text-slate-400">{file.uploadedAt}</span>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => handleDownload(file.name)}
                  className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-medium flex items-center gap-1 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span className="text-[11px]">Tải về</span>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
