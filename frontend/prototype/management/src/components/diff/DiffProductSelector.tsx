import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { Order } from '../../types';
import {
  Search,
  Sparkles,
  GitBranch,
  ArrowRight,
  Layers,
  Filter,
  CheckCircle2,
  Clock,
  Lock,
  Eye,
  RotateCcw,
  Tag,
  ChevronDown,
  Check,
} from 'lucide-react';
import { getSortedVersions } from '../../utils/versionComparison';

interface DiffProductSelectorProps {
  onSelectProduct?: (order: Order) => void;
}

export const DiffProductSelector: React.FC<DiffProductSelectorProps> = ({ onSelectProduct }) => {
  const {
    orders,
    selectedOrderId,
    setSelectedOrderId,
    setDiffVersions,
    setDiffViewStep,
    setSelectedVersion,
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'multi_version' | 'in_review' | 'locked'>('all');

  // Multi-version orders count
  const multiVersionOrders = useMemo(() => {
    return orders.filter((o) => {
      const versions = getSortedVersions(o);
      return versions.length > 1;
    });
  }, [orders]);

  const inReviewOrders = useMemo(() => {
    return orders.filter((o) => o.status === 'IN_REVIEW' || o.status === 'CHANGE_REQUESTED');
  }, [orders]);

  const lockedOrders = useMemo(() => {
    return orders.filter((o) => o.status === 'LOCKED_FOR_PRODUCTION' || o.status === 'APPROVED');
  }, [orders]);

  // Dropdown state and options
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsFilterDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const filterOptions = useMemo(() => [
    {
      id: 'all' as const,
      label: 'Tất cả sản phẩm',
      count: orders.length,
      icon: Layers,
      color: 'text-slate-600',
    },
    {
      id: 'multi_version' as const,
      label: 'Có nhiều phiên bản',
      count: multiVersionOrders.length,
      icon: Sparkles,
      color: 'text-orange-600',
    },
    {
      id: 'in_review' as const,
      label: 'Chờ duyệt / Xem xét',
      count: inReviewOrders.length,
      icon: Clock,
      color: 'text-amber-600',
    },
    {
      id: 'locked' as const,
      label: 'Đã duyệt & Khóa',
      count: lockedOrders.length,
      icon: CheckCircle2,
      color: 'text-emerald-600',
    },
  ], [orders.length, multiVersionOrders.length, inReviewOrders.length, lockedOrders.length]);

  const activeOption = useMemo(
    () => filterOptions.find((opt) => opt.id === activeFilter) || filterOptions[0],
    [filterOptions, activeFilter]
  );

  // Filtered orders list
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      // Tab filter
      if (activeFilter === 'multi_version') {
        const versions = getSortedVersions(order);
        if (versions.length <= 1) return false;
      } else if (activeFilter === 'in_review') {
        if (order.status !== 'IN_REVIEW' && order.status !== 'CHANGE_REQUESTED') return false;
      } else if (activeFilter === 'locked') {
        if (order.status !== 'LOCKED_FOR_PRODUCTION' && order.status !== 'APPROVED') return false;
      }

      // Search filter
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      const matchName = order.productName.toLowerCase().includes(q);
      const matchNumber = order.orderNumber.toLowerCase().includes(q);
      const matchCustomer = (order.customerCompany || order.customerName || '').toLowerCase().includes(q);
      const matchCategory = (order.category || '').toLowerCase().includes(q);
      return matchName || matchNumber || matchCustomer || matchCategory;
    });
  }, [orders, activeFilter, searchQuery]);

  const handleChooseProduct = (order: Order) => {
    setSelectedOrderId(order.id);
    const sorted = getSortedVersions(order);
    const latest = sorted.length > 0 ? sorted[sorted.length - 1].versionNumber : order.currentVersion || 'v01';
    const previous = sorted.length > 1 ? sorted[sorted.length - 2].versionNumber : null;

    setDiffVersions(previous, latest);
    setSelectedVersion(latest);

    if (onSelectProduct) {
      onSelectProduct(order);
    } else {
      setDiffViewStep('compare');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 rounded-3xl p-6 sm:p-8 text-white shadow-lg relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 opacity-10 pointer-events-none flex items-center justify-center">
          <GitBranch className="w-64 h-64 text-white -rotate-12" />
        </div>

        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-white text-xs font-bold uppercase tracking-wider mb-3">
            <Sparkles className="w-3.5 h-3.5 text-amber-200" />
            <span>So sánh & Đối chiếu phiên bản kỹ thuật</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white mb-2">
            Chọn sản phẩm để so sánh phiên bản
          </h1>

          {/* Quick Metrics */}
          <div className="flex flex-wrap items-center gap-3 mt-5 pt-5 border-t border-white/20 text-xs font-semibold">
            <div className="flex items-center gap-1.5 bg-white/15 px-3 py-1.5 rounded-xl backdrop-blur-sm">
              <Layers className="w-4 h-4 text-orange-100" />
              <span>{orders.length} sản phẩm trong hệ thống</span>
            </div>
            <div className="flex items-center gap-1.5 bg-white/15 px-3 py-1.5 rounded-xl backdrop-blur-sm">
              <Sparkles className="w-4 h-4 text-amber-200" />
              <span>{multiVersionOrders.length} sản phẩm có nhiều phiên bản</span>
            </div>
          </div>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-3 sm:p-4 shadow-sm">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm theo tên sản phẩm, mã đơn (#PP-1024, #ORD-...), danh mục..."
              className="w-full pl-10 pr-9 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 transition-all font-medium"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded-full cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>

          {/* Filter Dropdown */}
          <div className="relative shrink-0" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setIsFilterDropdownOpen((prev) => !prev)}
              className="w-full sm:w-auto flex items-center justify-between gap-2.5 px-3.5 py-2.5 bg-slate-50 hover:bg-slate-100/90 border border-slate-200 hover:border-slate-300 rounded-xl text-xs font-bold text-slate-700 transition-all cursor-pointer shadow-2xs"
            >
              <div className="flex items-center gap-2">
                <Filter className="w-3.5 h-3.5 text-slate-500" />
                <span className="text-slate-400 font-medium">Lọc:</span>
                <span className="text-slate-800">{activeOption.label}</span>
                <span className="px-1.5 py-0.5 rounded-md bg-slate-200 text-slate-700 text-[10px] font-black">
                  {activeOption.count}
                </span>
              </div>
              <ChevronDown
                className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
                  isFilterDropdownOpen ? 'rotate-180 text-orange-600' : ''
                }`}
              />
            </button>

            {/* Dropdown Menu */}
            {isFilterDropdownOpen && (
              <div className="absolute right-0 top-full mt-1.5 w-64 bg-white rounded-2xl border border-slate-200 shadow-xl p-1.5 z-30 space-y-1">
                <div className="px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                  Tiêu chí phân loại
                </div>
                {filterOptions.map((opt) => {
                  const Icon = opt.icon;
                  const isSelected = activeFilter === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => {
                        setActiveFilter(opt.id);
                        setIsFilterDropdownOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-orange-50 text-orange-950 font-bold border border-orange-200/80'
                          : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon className={`w-4 h-4 ${isSelected ? 'text-orange-600' : opt.color}`} />
                        <span>{opt.label}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[11px] px-1.5 py-0.5 rounded-md font-bold ${
                            isSelected
                              ? 'bg-orange-200/70 text-orange-800'
                              : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          {opt.count}
                        </span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-orange-600 shrink-0" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Product Cards Grid */}
      {filteredOrders.length === 0 ? (
        <div className="bg-white rounded-3xl border border-dashed border-slate-200 p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
            <Search className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-800">Không tìm thấy sản phẩm phù hợp</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Không có sản phẩm nào khớp với từ khóa "{searchQuery}" hoặc tiêu chí lọc hiện tại.
          </p>
          <button
            onClick={() => {
              setSearchQuery('');
              setActiveFilter('all');
            }}
            className="px-4 py-2 rounded-xl bg-orange-50 text-orange-700 font-bold text-xs hover:bg-orange-100 transition-colors inline-flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Đặt lại bộ lọc</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredOrders.map((order) => {
            const sortedVersions = getSortedVersions(order);
            const totalVersions = sortedVersions.length;
            const isSelected = order.id === selectedOrderId;
            const hasMultiple = totalVersions > 1;
            const latestVer = sortedVersions.length > 0 ? sortedVersions[sortedVersions.length - 1].versionNumber : order.currentVersion || 'v01';
            const prevVer = hasMultiple ? sortedVersions[sortedVersions.length - 2].versionNumber : null;

            return (
              <div
                key={order.id}
                onClick={() => handleChooseProduct(order)}
                className={`group bg-white rounded-3xl border transition-all duration-200 flex flex-col justify-between overflow-hidden cursor-pointer hover:shadow-xl hover:-translate-y-0.5 relative ${
                  isSelected
                    ? 'border-orange-500 ring-2 ring-orange-500/20 shadow-md'
                    : 'border-slate-200/80 hover:border-orange-300 shadow-sm'
                }`}
              >
                {/* Active product corner indicator */}
                {isSelected && (
                  <div className="absolute top-3 right-3 z-10 bg-orange-600 text-white text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full shadow-sm flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Đang chọn</span>
                  </div>
                )}

                <div>
                  {/* Top Image & Category */}
                  <div className="relative h-44 w-full bg-slate-100 overflow-hidden">
                    {order.thumbnail ? (
                      <img
                        src={order.thumbnail}
                        alt={order.productName}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 text-slate-400">
                        <Layers className="w-10 h-10 stroke-1" />
                      </div>
                    )}

                    {/* Gradient Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent pointer-events-none" />

                    {/* Category & Order Number */}
                    <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-white text-xs">
                      <span className="bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-lg font-bold flex items-center gap-1.5 text-[11px]">
                        <Tag className="w-3 h-3 text-orange-400" />
                        <span>#{order.orderNumber}</span>
                      </span>

                      <span className="bg-white/20 backdrop-blur-md px-2.5 py-1 rounded-lg font-semibold text-[11px]">
                        {order.category || 'Thời trang may mặc'}
                      </span>
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="p-5 space-y-3.5">
                    {/* Title */}
                    <div>
                      <h3 className="font-extrabold text-sm sm:text-base text-slate-900 group-hover:text-orange-600 transition-colors line-clamp-2 leading-snug">
                        {order.productName}
                      </h3>
                    </div>

                    {/* Version History Pills Trail */}
                    <div className="bg-slate-50 rounded-2xl p-3 border border-slate-100 space-y-2">
                      <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500">
                        <span className="flex items-center gap-1 text-slate-700 font-bold">
                          <GitBranch className="w-3.5 h-3.5 text-orange-600" />
                          Lịch sử phiên bản ({totalVersions})
                        </span>
                        <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400">
                          Bản mới nhất: {latestVer}
                        </span>
                      </div>

                      {/* Versions row */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {sortedVersions.map((v, index) => {
                          const isLatest = index === sortedVersions.length - 1;
                          const isPrevious = index === sortedVersions.length - 2;
                          const verStr = v.versionNumber;
                          return (
                            <React.Fragment key={verStr}>
                              <span
                                className={`px-2 py-0.5 rounded-md text-[11px] font-bold ${
                                  isLatest
                                    ? 'bg-orange-600 text-white shadow-xs'
                                    : isPrevious && hasMultiple
                                    ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                    : 'bg-white text-slate-600 border border-slate-200'
                                }`}
                              >
                                {verStr}
                                {isLatest && ' ★'}
                              </span>
                              {index < sortedVersions.length - 1 && (
                                <span className="text-slate-300 text-xs">→</span>
                              )}
                            </React.Fragment>
                          );
                        })}
                      </div>
                    </div>

                    {/* Comparison Hint / Summary */}
                    {hasMultiple ? (
                      <div className="flex items-center gap-2 text-xs font-semibold px-3 py-2 rounded-xl bg-orange-50/80 border border-orange-200/70 text-orange-900">
                        <Sparkles className="w-4 h-4 text-orange-600 shrink-0" />
                        <div className="truncate">
                          Đối chiếu đề xuất:{' '}
                          <span className="font-bold text-orange-700">
                            {prevVer} → {latestVer}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-xs font-medium px-3 py-2 rounded-xl bg-slate-100/90 border border-slate-200 text-slate-600">
                        <CheckCircle2 className="w-4 h-4 text-slate-400 shrink-0" />
                        <span className="truncate">Hồ sơ kỹ thuật khởi tạo ({latestVer})</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer Action Button */}
                <div className="p-4 pt-0">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleChooseProduct(order);
                    }}
                    className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                      hasMultiple
                        ? 'bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white shadow-sm shadow-orange-500/20 group-hover:shadow-md'
                        : 'bg-slate-900 hover:bg-slate-800 text-white'
                    }`}
                  >
                    <span>{hasMultiple ? 'Xem so sánh phiên bản' : 'Xem thông số phiên bản'}</span>
                    <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
