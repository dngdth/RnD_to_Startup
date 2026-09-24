import React from 'react';
import { useApp } from '../../context/AppContext';
import {
  Layers,
  Plus,
  ArrowRight,
  Package,
  Users,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react';

export const WorkspacesScreen: React.FC = () => {
  const { workspaces, activeWorkspace, setActiveWorkspace, setCurrentView, showToast } = useApp();

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">
            Không gian làm việc khách hàng & thương hiệu
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Phân chia khách hàng, thư viện hình ảnh vector và hợp đồng sản xuất.
          </p>
        </div>

        <button
          onClick={() => showToast('Hộp thoại tạo không gian làm việc mới.', 'info')}
          className="px-4 py-2.5 rounded-2xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold flex items-center gap-2 shadow-md shadow-orange-600/20 transition-all shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Tạo không gian làm việc mới</span>
        </button>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {(workspaces || []).map((ws) => {
          const isActive = activeWorkspace?.id === ws.id;

          return (
            <div
              key={ws.id}
              className={`p-6 rounded-3xl border transition-all flex flex-col justify-between space-y-4 ${
                isActive
                  ? 'bg-gradient-to-br from-orange-50/40 via-white to-amber-50/30 border-orange-300 shadow-md ring-2 ring-orange-400/20'
                  : 'bg-white border-slate-200/80 hover:border-slate-300 shadow-2xs'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-2xl bg-slate-900 text-white font-black text-xs flex items-center justify-center shadow-xs">
                    {ws.name.slice(0, 2).toUpperCase()}
                  </div>
                  {isActive && (
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-orange-100 text-orange-800 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      Đang hoạt động
                    </span>
                  )}
                </div>

                <h3 className="text-base font-bold text-slate-900">{ws.name}</h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">{ws.description}</p>

                <div className="mt-4 pt-3 border-t border-slate-100 space-y-2 text-xs">
                  <div className="flex items-center justify-between text-slate-600">
                    <span>Khách hàng doanh nghiệp:</span>
                    <strong className="text-slate-900">{ws.customerCompany}</strong>
                  </div>
                  <div className="flex items-center justify-between text-slate-600">
                    <span>Đơn hàng sản xuất:</span>
                    <strong className="text-slate-900">{ws.ordersCount} đơn</strong>
                  </div>
                  <div className="flex items-center justify-between text-slate-600">
                    <span>Xưởng sản xuất:</span>
                    <span className="text-slate-700">{ws.vendorCompany}</span>
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <button
                  onClick={() => {
                    setActiveWorkspace(ws);
                    setCurrentView('designer_dashboard');
                    showToast(`Đã chuyển sang không gian làm việc ${ws.name}`, 'info');
                  }}
                  className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                    isActive
                      ? 'bg-orange-600 text-white shadow-xs'
                      : 'border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700'
                  }`}
                >
                  <span>{isActive ? 'Đang truy cập' : 'Chuyển sang không gian này'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
