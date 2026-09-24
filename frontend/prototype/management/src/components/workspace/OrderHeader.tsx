import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Share2,
  GitBranch,
  ChevronDown,
  Sparkles,
  Printer,
  Calendar,
  Tag,
  User,
  ArrowLeft,
} from 'lucide-react';
import { getDefaultComparisonVersions } from '../../utils/versionComparison';

export const OrderHeader: React.FC = () => {
  const {
    selectedOrder,
    selectedVersion,
    setSelectedVersion,
    openDiffModal,
    showToast,
    currentUser,
    setCurrentView,
    setActiveCustomerWorkspaceOrderId,
  } = useApp();

  const [isVersionDropdownOpen, setIsVersionDropdownOpen] = useState(false);
  const [isHidden, setIsHidden] = useState(false);

  const lastScrollYRef = useRef(0);
  const accumulatedDeltaRef = useRef(0);
  const isHiddenRef = useRef(false);
  const rafIdRef = useRef<number | null>(null);

  // High-performance, 60fps hide-on-scroll / show-on-scroll behavior
  useEffect(() => {
    const scrollContainer =
      document.getElementById('workspace-scroll-container') ||
      document.querySelector('main.overflow-y-auto') ||
      window;

    const handleScroll = () => {
      if (rafIdRef.current !== null) return;

      rafIdRef.current = requestAnimationFrame(() => {
        rafIdRef.current = null;
        const currentScrollY =
          scrollContainer instanceof Window
            ? scrollContainer.scrollY
            : scrollContainer.scrollTop;

        const delta = currentScrollY - lastScrollYRef.current;

        // 1. Near the top of the page (<= 50px): always show header
        if (currentScrollY <= 50) {
          accumulatedDeltaRef.current = 0;
          if (isHiddenRef.current) {
            isHiddenRef.current = false;
            setIsHidden(false);
          }
          lastScrollYRef.current = currentScrollY;
          return;
        }

        // 2. Accumulate delta in same direction, reset when flipping direction
        if (
          (delta > 0 && accumulatedDeltaRef.current < 0) ||
          (delta < 0 && accumulatedDeltaRef.current > 0)
        ) {
          accumulatedDeltaRef.current = 0;
        }
        accumulatedDeltaRef.current += delta;

        // 3. Scrolling down: must exceed threshold (15px) and be past 50px
        if (accumulatedDeltaRef.current > 15 && currentScrollY > 50) {
          if (!isHiddenRef.current) {
            isHiddenRef.current = true;
            setIsHidden(true);
          }
        }
        // 4. Scrolling up: must exceed threshold (-15px)
        else if (accumulatedDeltaRef.current < -15) {
          if (isHiddenRef.current) {
            isHiddenRef.current = false;
            setIsHidden(false);
          }
        }

        lastScrollYRef.current = currentScrollY;
      });
    };

    scrollContainer.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      scrollContainer.removeEventListener('scroll', handleScroll);
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, []);

  // Tự động đóng dropdown khi header ẩn
  useEffect(() => {
    if (isHidden) {
      setIsVersionDropdownOpen(false);
    }
  }, [isHidden]);

  const handleShare = () => {
    navigator.clipboard?.writeText(window.location.href);
    showToast('Đã sao chép liên kết workspace vào clipboard!', 'success');
  };

  return (
    <div
      className={`bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-4 sm:px-6 lg:px-8 py-3 shadow-2xs sticky top-0 z-30 transition-transform duration-250 ease-out transition-opacity duration-200 will-change-transform ${
        isHidden
          ? '-translate-y-full opacity-0 pointer-events-none'
          : 'translate-y-0 opacity-100'
      }`}
    >
      <div className="w-full space-y-2.5">
        {/* ========================================================================= */}
        {/* TẦNG 1 (LAYER 1): META & BỘ ĐIỀU KHIỂN PHIÊN BẢN (NGANG HÀNG NHAU) */}
        {/* ========================================================================= */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5 pb-2 border-b border-slate-100">
          {/* Bên trái: Nút quay lại + Mã đơn hàng #PP + Người phụ trách + Hạn + SL */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={() => {
                if (currentUser.role === 'customer') {
                  setActiveCustomerWorkspaceOrderId(null);
                  setCurrentView('orders');
                } else {
                  setCurrentView('orders');
                }
              }}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 hover:text-slate-900 transition-colors cursor-pointer shrink-0"
              title="Quay lại danh sách đơn hàng"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>{currentUser.role === 'customer' ? 'Đơn hàng của tôi' : 'Đơn hàng'}</span>
            </button>

            {/* Nhóm thẻ định danh gom gọn */}
            <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-50 border border-slate-200/70 text-xs flex-wrap">
              {/* Mã đơn hàng */}
              <span className="font-mono font-black text-orange-700 bg-orange-100/90 px-2 py-0.5 rounded-lg border border-orange-200/70 shadow-2xs">
                #{selectedOrder.orderNumber}
              </span>

              {/* Người phụ trách */}
              <div className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-white border border-slate-200/60 text-slate-700 font-bold shadow-2xs">
                <User className="w-3 h-3 text-slate-400" />
                <span>{selectedOrder.customerName}</span>
              </div>

              {/* Hạn giao dự kiến */}
              <div className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-white border border-slate-200/60 text-slate-500 shadow-2xs">
                <Calendar className="w-3 h-3 text-slate-400" />
                <span>Hạn: <strong className="text-slate-700">{selectedOrder.deliveryDate || '—'}</strong></span>
              </div>

              {/* Số lượng */}
              <div className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-white border border-slate-200/60 text-slate-500 shadow-2xs">
                <Tag className="w-3 h-3 text-slate-400" />
                <span>SL: <strong className="text-slate-800">{selectedOrder.targetQuantity || '60 SP'}</strong></span>
              </div>
            </div>
          </div>

          {/* Ngang hàng với mục SL: 60: Phiên bản + So sánh phiên bản + Nút chức năng */}
          <div className="flex items-center gap-2 flex-wrap shrink-0">
            {/* Version Selector Dropdown */}
            <div className="relative">
              <button
                onClick={() => setIsVersionDropdownOpen(!isVersionDropdownOpen)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-800 shadow-2xs transition-all cursor-pointer"
              >
                <GitBranch className="w-3.5 h-3.5 text-orange-500" />
                <span>Phiên bản {selectedVersion}</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-100 text-slate-600 font-medium">
                  {selectedOrder.versions.length} bản
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {isVersionDropdownOpen && (
                <div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl border border-slate-200 shadow-xl p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="px-3 py-1.5 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                    Chọn phiên bản xem xét
                  </div>
                  {(selectedOrder?.versions || []).map((ver) => (
                    <button
                      key={ver.id}
                      onClick={() => {
                        setSelectedVersion(ver.versionNumber);
                        setIsVersionDropdownOpen(false);
                      }}
                      className={`w-full text-left p-2.5 rounded-xl text-xs transition-colors flex items-start justify-between ${
                        selectedVersion === ver.versionNumber
                          ? 'bg-orange-50 text-orange-950 font-bold border border-orange-200/60'
                          : 'hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-1.5 font-bold">
                          <span>Phiên bản {ver.versionNumber}</span>
                          {ver.versionNumber === selectedOrder.currentVersion && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-orange-100 text-orange-800 font-semibold">
                              Hiện tại
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                          {ver.title}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-1">
                          {ver.createdAt} · {ver.createdBy}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Quick Diff Button */}
            {(() => {
              const defaultComp = getDefaultComparisonVersions(selectedOrder);
              return (
                <button
                  onClick={() =>
                    openDiffModal(
                      selectedOrder.id,
                      defaultComp.baseVersion || undefined,
                      defaultComp.targetVersion || undefined
                    )
                  }
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-orange-200/90 bg-orange-50/80 hover:bg-orange-100 text-orange-800 text-xs font-bold shadow-2xs transition-colors cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-orange-600" />
                  <span>
                    {defaultComp.canCompare
                      ? `So sánh ${defaultComp.baseVersion}→${defaultComp.targetVersion}`
                      : `Phiên bản ${defaultComp.targetVersion}`}
                  </span>
                </button>
              );
            })()}

            {/* Share Button */}
            <button
              onClick={handleShare}
              className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-colors cursor-pointer"
              title="Sao chép liên kết chia sẻ"
            >
              <Share2 className="w-3.5 h-3.5" />
            </button>

            {/* Print / Export Tech Pack */}
            <button
              onClick={() => showToast('Đang kết xuất hồ sơ in PDF CMYK...', 'info')}
              className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-colors hidden sm:block cursor-pointer"
              title="Xuất hồ sơ in"
            >
              <Printer className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* TẦNG 2 (LAYER 2): HERO PRODUCT TITLE (Tâm điểm trang, to đậm & thoáng đãng) */}
        {/* ========================================================================= */}
        <div className="pt-0.5 pb-1">
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight leading-tight">
            {selectedOrder.productName}
          </h1>
        </div>
      </div>
    </div>
  );
};
