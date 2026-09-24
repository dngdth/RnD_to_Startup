import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Sparkles,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Lock,
  Package,
  Layers,
  Check,
} from 'lucide-react';

interface LoginPageProps {
  onSuccess: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onSuccess }) => {
  const { switchRole, currentUser, showToast } = useApp();
  const [email, setEmail] = useState('alex@abcstudio.com');
  const [password, setPassword] = useState('••••••••••••');

  const handleSelectRole = (role: 'vendor' | 'customer') => {
    switchRole(role);
    showToast(`Đã đăng nhập với tư cách ${role === 'vendor' ? 'Alex (Nhà thiết kế)' : 'Emma (Khách hàng)'}`, 'success');
    onSuccess();
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden ambient-glow-mesh">
      {/* Subtle Glow Spheres */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-orange-300/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-96 h-96 bg-amber-300/15 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-lg z-10">
        {/* Card */}
        <div className="bg-white/95 backdrop-blur-xl rounded-2xl border border-slate-200/80 shadow-xl p-6 sm:p-9 space-y-6">
          {/* Logo & Headline */}
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-slate-900 text-white shadow-md mb-1 border border-slate-800">
              <span className="text-lg font-black text-orange-400">P</span>
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight uppercase">
              ProofPrint
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 max-w-sm mx-auto font-medium">
              Một không gian làm việc. Một nguồn dữ liệu chuẩn. Mọi thay đổi đều được lưu vết.
            </p>
          </div>

          {/* Quick Persona Access Cards */}
          <div className="space-y-3">
            <div className="text-center">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Chọn vai trò để trải nghiệm ngay:
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Persona 1: Alex (Vendor) */}
              <button
                type="button"
                onClick={() => handleSelectRole('vendor')}
                className="p-4 rounded-xl border border-slate-200 hover:border-orange-300 bg-slate-50/50 hover:bg-orange-50/30 text-left transition-all group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-100 text-orange-800">
                      Nhà thiết kế / Xưởng sản xuất
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-orange-600 group-hover:translate-x-0.5 transition-all" />
                  </div>
                  <h4 className="text-xs font-bold text-slate-900">Alex Rivera</h4>
                  <p className="text-[11px] text-slate-500">Trưởng bộ phận kỹ thuật · ABC Studio</p>
                </div>
                <div className="mt-3 text-[11px] text-slate-600 font-normal leading-relaxed">
                  Phát hành phiên bản, quản lý hồ sơ kỹ thuật & khóa chuyền sản xuất.
                </div>
              </button>

              {/* Persona 2: Emma (Customer) */}
              <button
                type="button"
                onClick={() => handleSelectRole('customer')}
                className="p-4 rounded-xl border border-slate-200 hover:border-emerald-300 bg-slate-50/50 hover:bg-emerald-50/30 text-left transition-all group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                      Khách hàng / Thương hiệu
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-600 group-hover:translate-x-0.5 transition-all" />
                  </div>
                  <h4 className="text-xs font-bold text-slate-900">Emma Watson</h4>
                  <p className="text-[11px] text-slate-500">Phụ trách thiết kế · Urban Thread</p>
                </div>
                <div className="mt-3 text-[11px] text-slate-600 font-normal leading-relaxed">
                  Gửi yêu cầu chỉnh sửa, đối chiếu phiên bản & ký duyệt sản xuất.
                </div>
              </button>
            </div>
          </div>

          {/* Divider */}
          <div className="relative flex items-center justify-center">
            <div className="border-t border-slate-200 w-full" />
            <span className="bg-white px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider absolute">
              Hoặc đăng nhập bằng tài khoản
            </span>
          </div>

          {/* Standard Form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              onSuccess();
            }}
            className="space-y-3.5"
          >
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                Email công việc
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500/40 text-slate-800"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                Mật khẩu
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500/40 text-slate-800"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-xs transition-all active:scale-98"
            >
              Đăng nhập vào ProofPrint
            </button>
          </form>

          {/* Feature Highlights */}
          <div className="pt-2 grid grid-cols-2 gap-2 text-[11px] text-slate-500 border-t border-slate-100">
            <div className="flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>Bảng thông số dạng khối chuẩn hóa</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>AI tóm tắt thay đổi CAD</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>Tích hợp thông báo Zalo OA</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>Khóa sản xuất bất biến</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
