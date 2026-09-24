import React from 'react';
import { PhoneCall, MapPin, Building2 } from 'lucide-react';

export default function Footer() {
  return (
    <footer
      id="main-app-footer"
      style={{ minHeight: '200px' }}
      className="relative z-10 w-full bg-[#11785f] text-white py-6 sm:py-7 px-4 sm:px-6 lg:px-8 flex flex-col justify-center items-center transition-colors"
    >
      <div className="max-w-4xl mx-auto w-full flex flex-col items-center text-center">
        {/* Dòng tuyên bố sứ mệnh */}
        <div className="w-full">
          <p
            id="footer-mission-statement"
            style={{ fontSize: '15px' }}
            className="font-normal leading-relaxed text-white/95 max-w-3xl mx-auto drop-shadow-xs"
          >
            "Chúng tôi phát triển ProofPrint làm không gian chung giúp khách hàng và nhà cung cấp thống nhất yêu cầu, minh bạch thay đổi và khóa chuẩn phiên bản trước khi sản xuất."
          </p>
        </div>

        {/* Dải phân cách trang nhã */}
        <div className="w-16 h-px bg-white/25 my-4 sm:my-5 rounded-full" />

        {/* 3 hàng chữ thông tin tinh gọn */}
        <div className="flex flex-col items-center gap-2 text-center text-white">
          {/* Hàng 1: Tên dự án */}
          <div className="flex items-center justify-center gap-2">
            <Building2 className="w-3.5 h-3.5 text-white/80 flex-shrink-0" />
            <span className="font-bold text-sm sm:text-base tracking-wide uppercase">
              DỰ ÁN PROOFPRINT
            </span>
          </div>

          {/* Hàng 2: Hotline/Zalo kèm icon điện thoại PhoneCall và liên kết gọi nhanh */}
          <div className="flex items-center justify-center gap-2 text-xs sm:text-sm">
            <PhoneCall className="w-3.5 h-3.5 text-white/85 flex-shrink-0" />
            <span>Hotline/Zalo:</span>
            <a
              href="tel:0981234567"
              className="font-bold underline decoration-white/60 hover:decoration-white hover:text-white/90 transition-colors"
            >
              098.123.4567
            </a>
          </div>

          {/* Hàng 3: Địa chỉ Đà Nẵng kèm icon vị trí MapPin */}
          <div className="flex items-center justify-center gap-2 text-xs sm:text-sm text-white/95">
            <MapPin className="w-3.5 h-3.5 text-white/85 flex-shrink-0" />
            <span>Địa chỉ: Đà Nẵng.</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
