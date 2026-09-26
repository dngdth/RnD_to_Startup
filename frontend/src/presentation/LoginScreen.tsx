import React, { useEffect, useState } from 'react';
import { Mail, Lock, Eye, EyeOff, CheckCircle2, ArrowRight, AlertCircle, Shirt } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { LoginFormState, FormError } from './loginTypes';
import studentsCutout from '../assets/images/students_isolated.png';
import ProductMarqueeSection from '../components/ProductMarqueeSection';
import Footer from '../components/Footer';

export default function LoginScreen({ onLogin, notice }: {
  onLogin: (email: string, password: string, remember: boolean) => Promise<void>;
  notice?: string;
}) {
  const [formData, setFormData] = useState<LoginFormState>({
    email: '',
    matKhau: '',
    rememberMe: true,
  });

  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<FormError>({});
  const [isSuccess, setIsSuccess] = useState(false);
  useEffect(() => {
    if (!errors.general) return;
    const timer = window.setTimeout(() => setErrors((current) => ({ ...current, general: undefined })), 5000);
    return () => window.clearTimeout(timer);
  }, [errors.general]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));

    if (errors[name as keyof FormError]) {
      setErrors((prev) => ({
        ...prev,
        [name]: undefined,
        general: undefined,
      }));
    }
  };

  const validate = (): boolean => {
    const newErrors: FormError = {};
    if (!formData.email.trim()) {
      newErrors.email = 'Vui lòng nhập Email';
    } else if (!formData.email.includes('@')) {
      newErrors.email = 'Địa chỉ Email không đúng định dạng';
    }

    if (!formData.matKhau) {
      newErrors.matKhau = 'Vui lòng nhập mật khẩu';
    } else if (formData.matKhau.length < 8) {
      newErrors.matKhau = 'Mật khẩu tối thiểu 8 ký tự';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsLoading(true);
    try {
      await onLogin(formData.email.trim(), formData.matKhau, formData.rememberMe);
      setIsSuccess(true);
    } catch (error) {
      setErrors({ general: error instanceof Error ? error.message : 'Đăng nhập thất bại' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleFillDemo = () => {
    setFormData({
      email: 'designer@proofprint.local',
      matKhau: '',
      rememberMe: true,
    });
    setErrors({});
  };

  return (
    <div className="w-full bg-[#FBFBFA] text-[#1E293B] selection:bg-[#1A9478] selection:text-white relative overflow-x-hidden">
      {/* SECTION 1: TOP 100VH LOGIN SCREEN */}
      <div className="min-h-screen flex flex-col justify-between relative" id="login-hero-section">
        {/* Background ambient lighting with Teal (#1A9478) and Coral Orange (#DE4A2A) */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-32 left-1/4 w-[500px] h-[500px] rounded-full bg-[#1A9478]/8 blur-[110px]" />
        <div className="absolute top-1/2 -right-32 w-[450px] h-[450px] rounded-full bg-[#DE4A2A]/7 blur-[120px]" />
        <div className="absolute bottom-10 left-10 w-[400px] h-[400px] rounded-full bg-[#1A9478]/6 blur-[100px]" />
        {/* Subtle dot pattern */}
        <div
          className="absolute inset-0 opacity-[0.035]"
          style={{
            backgroundImage: `radial-gradient(#1A9478 1.2px, transparent 1.2px)`,
            backgroundSize: '28px 28px',
          }}
        />
      </div>

      {/* Top Header Bar */}
      <header className="relative z-10 w-full px-4 sm:px-8 py-4 max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Logo icon Thiết Kế Đồng Phục */}
          <div className="w-10 h-10 rounded-xl bg-[#1A9478] flex items-center justify-center text-white shadow-[0_4px_12px_rgba(26,148,120,0.28)] border border-white/20 relative">
            <Shirt className="w-5 h-5 text-white" strokeWidth={2.2} />
            <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-[#DE4A2A] border-2 border-white" />
          </div>
          <div>
            <div className="font-extrabold text-base tracking-tight text-[#115E4D] leading-tight">
              PROOFPRINT
            </div>
            <div className="text-[11px] text-[#64748B] font-medium leading-none mt-0.5">
              Hệ thống Sản xuất & Thiết kế Toàn quốc
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={handleFillDemo}
          className="text-xs font-semibold text-[#1A9478] bg-[#1A9478]/10 hover:bg-[#1A9478]/18 px-3.5 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 border border-[#1A9478]/20 hover:border-[#1A9478]/35"
          id="btn-fill-demo"
        >
          <span>Email demo</span>
        </button>
      </header>

      {/* Main Section: 2 Columns (Image Left, Login Card Right) */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-4 sm:px-8 py-6 lg:py-10">
        <div className="w-full max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          
          {/* LEFT SIDE: Cutout characters with Text Banner */}
          <div className="lg:col-span-7 flex flex-col items-center lg:items-start justify-center relative select-none">
            {/* Khối văn bản nổi bật (Text Banner) */}
            <motion.div
              initial={{ opacity: 0, y: -14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className="w-full max-w-xl mb-4 lg:mb-5 text-center lg:text-left z-20"
              id="hero-text-banner"
            >
              <h1
                id="hero-banner-title"
                style={{ fontFamily: "'Montserrat', sans-serif" }}
                className="text-4xl sm:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-[#115E4D] via-[#1A9478] to-[#DE4A2A] bg-clip-text text-transparent leading-[1.18] pb-1"
              >
                Workspace Proofprint
              </h1>
              <p
                id="hero-banner-subtitle"
                className="mt-2 text-base sm:text-lg text-[#334155] font-medium leading-relaxed max-w-lg mx-auto lg:mx-0"
              >
                Chuẩn hóa mọi yêu cầu, minh bạch từng thay đổi. Chốt chính xác thông số và thiết kế cuối cùng trước khi đưa vào sản xuất.
              </p>
            </motion.div>

            <div className="relative w-full max-w-[460px] flex items-center justify-center lg:justify-start">
              {/* Soft ambient colored aura behind the figures blending Teal and Coral Orange */}
              <div className="absolute inset-0 max-w-[380px] max-h-[440px] m-auto lg:ml-6 rounded-full bg-gradient-to-tr from-[#1A9478]/22 via-[#1A9478]/12 to-[#DE4A2A]/18 blur-3xl -z-10 pointer-events-none transform -translate-y-2" />
              <div className="absolute bottom-4 w-72 h-16 bg-[#1A9478]/14 blur-2xl rounded-full -z-10 pointer-events-none" />

              {/* 2 Cutout Students (Waist-up, transparent background, soft colored contour drop shadows) */}
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: 'easeOut', delay: 0.1 }}
                className="relative w-full flex items-center justify-center lg:justify-start"
              >
                <img
                  id="students-cutout-img"
                  src={studentsCutout}
                  alt="Đồng phục học sinh Hải Anh - Áo polo Cheerful"
                  referrerPolicy="no-referrer"
                  className="h-[390px] sm:h-[430px] lg:h-[450px] w-auto max-w-full object-contain select-none transition-transform duration-500 ease-out hover:scale-[1.02]"
                  style={{
                    filter:
                      'drop-shadow(0 18px 30px rgba(26, 148, 120, 0.20)) drop-shadow(0 6px 16px rgba(222, 74, 42, 0.15)) drop-shadow(0 2px 6px rgba(15, 23, 42, 0.08))',
                  }}
                />
              </motion.div>
            </div>
          </div>

          {/* RIGHT SIDE: Login Card */}
          <div className="lg:col-span-5 flex justify-center w-full">
            <div className="w-full max-w-[420px]">
              <AnimatePresence mode="wait">
                {!isSuccess ? (
                  <motion.div
                    key="login-card"
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -16 }}
                    transition={{ duration: 0.28, ease: 'easeOut' }}
                    className="bg-white rounded-2xl border border-[#E2E8F0] p-7 sm:p-9 shadow-[0_16px_45px_-12px_rgba(26,148,120,0.12),0_6px_22px_-6px_rgba(222,74,42,0.06)] relative"
                    id="login-card"
                  >
                    {/* 1. Only prominent title in the center: "Đăng nhập" */}
                    <div className="text-center mb-7">
                      <h2
                        className="text-3xl font-extrabold text-[#115E4D] tracking-tight"
                        id="login-heading"
                      >
                        Đăng nhập
                      </h2>
                    </div>

                    {/* Form Errors */}
                    {(errors.general || notice) && (
                      <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                        <span>{errors.general || notice}</span>
                      </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                      {/* 2. Ô nhập Email ghi chữ "Email" */}
                      <div className="space-y-1">
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#94A3B8]">
                            <Mail className="w-4 h-4" />
                          </div>
                          <input
                            id="input-email"
                            name="email"
                            type="email"
                            aria-label="Email"
                            autoComplete="email"
                            value={formData.email}
                            onChange={handleInputChange}
                            placeholder="Email"
                            className={`w-full pl-10 pr-4 py-3 bg-[#F8FAFC] text-sm text-[#0F172A] placeholder-[#94A3B8] rounded-xl border transition-all duration-200 focus:outline-none focus:bg-white ${
                              errors.email
                                ? 'border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-100'
                                : 'border-[#E2E8F0] hover:border-[#CBD5E1] focus:border-[#1A9478] focus:ring-3 focus:ring-[#1A9478]/15'
                            }`}
                          />
                        </div>
                        {errors.email && (
                          <p className="text-xs text-red-600 mt-1 pl-1 flex items-center gap-1 font-medium">
                            <AlertCircle className="w-3.5 h-3.5 inline shrink-0" />
                            {errors.email}
                          </p>
                        )}
                      </div>

                      {/* 2. Ô nhập mật khẩu ghi chữ "Mật khẩu" */}
                      <div className="space-y-1">
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#94A3B8]">
                            <Lock className="w-4 h-4" />
                          </div>
                          <input
                            id="input-password"
                            name="matKhau"
                            type={showPassword ? 'text' : 'password'}
                            aria-label="Mật khẩu"
                            autoComplete="current-password"
                            value={formData.matKhau}
                            onChange={handleInputChange}
                            placeholder="Mật khẩu"
                            className={`w-full pl-10 pr-11 py-3 bg-[#F8FAFC] text-sm text-[#0F172A] placeholder-[#94A3B8] rounded-xl border transition-all duration-200 focus:outline-none focus:bg-white ${
                              errors.matKhau
                                ? 'border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-100'
                                : 'border-[#E2E8F0] hover:border-[#CBD5E1] focus:border-[#1A9478] focus:ring-3 focus:ring-[#1A9478]/15'
                            }`}
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[#94A3B8] hover:text-[#0F172A] transition-colors cursor-pointer"
                            tabIndex={-1}
                            aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiển thị mật khẩu'}
                            id="btn-toggle-password"
                          >
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                        {errors.matKhau && (
                          <p className="text-xs text-red-600 mt-1 pl-1 flex items-center gap-1 font-medium">
                            <AlertCircle className="w-3.5 h-3.5 inline shrink-0" />
                            {errors.matKhau}
                          </p>
                        )}
                      </div>

                      {/* Remember me option */}
                      <div className="flex items-center pt-1">
                        <label className="flex items-center gap-2.5 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            name="rememberMe"
                            id="checkbox-remember"
                            checked={formData.rememberMe}
                            onChange={handleInputChange}
                            className="w-4 h-4 rounded border-[#CBD5E1] text-[#1A9478] focus:ring-[#1A9478]/25 cursor-pointer accent-[#1A9478]"
                          />
                          <span className="text-xs font-medium text-[#64748B]">
                            Ghi nhớ trạng thái đăng nhập
                          </span>
                        </label>
                      </div>

                      {/* Submit Button: Coral Orange (#DE4A2A) with energetic hover & shadow */}
                      <div className="pt-2">
                        <button
                          type="submit"
                          disabled={isLoading}
                          id="btn-submit-login"
                          style={{ borderRadius: '25px', borderWidth: '0px' }}
                          className="w-full bg-[#DE4A2A] hover:bg-[#C93B1D] active:bg-[#B33216] text-white font-semibold py-3.5 px-6 rounded-[25px] border-0 transition-all duration-200 flex items-center justify-center gap-2 shadow-[0_6px_20px_rgba(222,74,42,0.32)] hover:shadow-[0_8px_26px_rgba(222,74,42,0.40)] disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer"
                        >
                          {isLoading ? (
                            <>
                              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                              <span style={{ fontSize: '17px' }} className="text-[17px]">Đang xác thực...</span>
                            </>
                          ) : (
                            <>
                              <span style={{ fontSize: '17px' }} className="text-[17px] tracking-wide">Đăng nhập</span>
                              <ArrowRight className="w-5 h-5" />
                            </>
                          )}
                        </button>
                      </div>
                    </form>
                  </motion.div>
                ) : (
                  /* Success confirmation state */
                  <motion.div
                    key="success-card"
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    className="bg-white rounded-2xl border border-[#E2E8F0] p-7 sm:p-9 shadow-[0_16px_45px_-12px_rgba(26,148,120,0.12),0_6px_22px_-6px_rgba(222,74,42,0.06)] text-center"
                    id="success-card"
                  >
                    <div className="w-16 h-16 bg-[#1A9478]/10 rounded-full flex items-center justify-center mx-auto mb-4 text-[#1A9478]">
                      <CheckCircle2 className="w-9 h-9" />
                    </div>
                    <h2 className="text-2xl font-bold text-[#0F172A] mb-2">
                      Đăng nhập thành công!
                    </h2>
                    <p className="text-sm text-[#64748B] mb-5">
                      Chào mừng bạn trở lại với Hệ thống Đồng Phục Hải Anh.
                    </p>

                    <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-4 mb-5 text-left">
                      <div className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider mb-1">
                        Tài khoản
                      </div>
                      <div className="text-sm font-semibold text-[#1A9478]">
                        {formData.email}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setIsSuccess(false)}
                      className="w-full bg-[#F1F5F9] hover:bg-[#E2E8F0] text-[#0F172A] font-semibold py-2.5 px-4 rounded-xl text-sm transition-colors cursor-pointer"
                      id="btn-return-login"
                    >
                      Đăng xuất / Quay lại
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

        </div>
      </main>

      {/* Subtle Scroll Down Prompt at bottom of 100vh Login Screen */}
      <div className="relative z-10 pb-4 text-center">
        <a
          href="#products-marquee-section"
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-medium text-[#64748B] hover:text-[#1A9478] bg-white/80 hover:bg-white border border-[#E2E8F0] shadow-xs transition-all cursor-pointer"
          id="scroll-down-hint"
        >
          <span className="w-2 h-2 rounded-full bg-[#DE4A2A] animate-pulse" />
          <span>Cuộn xuống để khám phá các mẫu áo đồng phục xu hướng</span>
        </a>
      </div>
    </div>

    {/* Section 2: 2 Dòng Sản Phẩm Marquee Vô Tận (Hiển thị khi cuộn trang) */}
    <ProductMarqueeSection />

    {/* Section 3: Footer chân trang */}
    <Footer />
  </div>
  );
}

