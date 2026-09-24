import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { StatusBadge } from '../common/StatusBadge';
import { OrderStatus } from '../../types';
import {
  Package,
  Search,
  Filter,
  ChevronRight,
  Plus,
  GitBranch,
  Calendar,
  Sparkles,
  ShieldCheck,
  Clock,
  ArrowRight,
  Layers,
  ChevronDown,
  Check,
  Camera,
  ImagePlus,
} from 'lucide-react';

export const OrdersListScreen: React.FC = () => {
  const {
    orders,
    setSelectedOrderId,
    setSelectedVersion,
    setCurrentView,
    openDiffModal,
    showToast,
    currentUser,
    setActiveCustomerWorkspaceOrderId,
    updateOrderThumbnail,
  } = useApp();
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);

  const handleImageUpload = (orderId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        updateOrderThumbnail(orderId, reader.result);
        showToast('Đã cập nhật hình ảnh sản phẩm thành công!', 'success');
      }
    };
    reader.readAsDataURL(file);
  };

  const isCustomer = currentUser.role === 'customer';

  // Role-based order scoping: Customer only sees their own assigned orders!
  const baseOrders = (orders || []).filter((o) => {
    if (isCustomer) {
      return (
        o.customerName === currentUser.name ||
        o.customerCompany === currentUser.company
      );
    }
    return true;
  });

  const filteredOrders = baseOrders.filter((o) => {
    const matchesStatus = statusFilter === 'ALL' || o.status === statusFilter;
    const matchesSearch =
      o.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.customerCompany.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const statuses: { key: string; label: string }[] = [
    { key: 'ALL', label: 'Tất cả' },
    { key: 'DRAFT', label: 'Bản nháp' },
    { key: 'IN_REVIEW', label: 'Đang xem xét' },
    { key: 'CHANGE_REQUESTED', label: 'Yêu cầu sửa' },
    { key: 'APPROVED', label: 'Đã phê duyệt' },
    { key: 'LOCKED_FOR_PRODUCTION', label: 'Khóa sản xuất' },
    { key: 'IN_PRODUCTION', label: 'Đang sản xuất' },
  ];

  const activeStatusObj = statuses.find((s) => s.key === statusFilter) || statuses[0];

  const getStatusCount = (key: string) => {
    if (key === 'ALL') return baseOrders.length;
    return baseOrders.filter((o) => o.status === key).length;
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">
              {isCustomer ? 'Đơn hàng của tôi' : 'Đơn hàng sản xuất'}
            </h2>
            {isCustomer && (
              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" />
                <span>{currentUser.company}</span>
              </span>
            )}
          </div>
        </div>

        {/* Create Order Button: Vendor-only */}
        {!isCustomer && (
          <button
            onClick={() => showToast('Trình tạo đơn hàng mới sẽ mở. Đang dùng các đơn hàng mẫu để minh họa.', 'info')}
            className="px-4 py-2.5 rounded-2xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold flex items-center gap-2 shadow-md shadow-orange-600/20 transition-all active:scale-98 shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Tạo đơn hàng mới</span>
          </button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl border border-slate-200 shadow-2xs"
        style={{ backgroundColor: '#ffb769' }}
      >
        {/* Status Dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsStatusDropdownOpen(!isStatusDropdownOpen)}
            style={{
              backgroundColor: '#f8fafc',
              borderRadius: '5px',
              borderColor: '#ced6e0',
            }}
            className="w-full sm:w-auto px-3.5 py-2 text-xs font-bold flex items-center justify-between gap-3 border text-slate-800 transition-all cursor-pointer min-w-[210px] shadow-2xs"
          >
            <div className="flex items-center gap-2 min-w-0">
              <Filter
                className="w-3.5 h-3.5 shrink-0"
                style={{ color: '#90a1b9' }}
              />
              <span
                className="truncate"
                style={{ borderColor: '#878f9c', color: '#90a1b9' }}
              >
                {activeStatusObj.label}
              </span>
              <span
                className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-full shrink-0"
                style={{ backgroundColor: '#eae7e7', color: '#90a1b9' }}
              >
                {getStatusCount(statusFilter)}
              </span>
            </div>
            <ChevronDown
              className={`w-3.5 h-3.5 shrink-0 transition-transform duration-200 ${
                isStatusDropdownOpen ? 'rotate-180' : ''
              }`}
              style={{ color: '#040507' }}
            />
          </button>

          {/* Dropdown Menu */}
          {isStatusDropdownOpen && (
            <>
              <div
                className="fixed inset-0 z-20"
                onClick={() => setIsStatusDropdownOpen(false)}
              />
              <div className="absolute left-0 mt-1.5 w-60 rounded-xl bg-white border border-slate-200 shadow-xl py-1 z-30 animate-in fade-in zoom-in-95 duration-150">
                <div className="px-3.5 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 flex items-center justify-between">
                  <span>Trạng thái đơn hàng</span>
                  <span className="font-mono">{statuses.length} mục</span>
                </div>
                <div className="py-1">
                  {statuses.map((st) => {
                    const count = getStatusCount(st.key);
                    const isSelected = statusFilter === st.key;
                    return (
                      <button
                        key={st.key}
                        onClick={() => {
                          setStatusFilter(st.key);
                          setIsStatusDropdownOpen(false);
                        }}
                        className={`w-full px-3.5 py-2 text-xs flex items-center justify-between transition-colors cursor-pointer text-left ${
                          isSelected
                            ? 'bg-orange-50 text-orange-950 font-bold'
                            : 'text-slate-700 hover:bg-slate-50 font-medium'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          {isSelected ? (
                            <Check className="w-3.5 h-3.5 text-orange-600 shrink-0" />
                          ) : (
                            <div className="w-3.5 h-3.5 shrink-0" />
                          )}
                          <span className="truncate">{st.label}</span>
                        </div>
                        <span
                          className={`text-[10px] font-mono px-2 py-0.5 rounded-full shrink-0 ${
                            isSelected
                              ? 'bg-orange-200/80 text-orange-900 font-bold'
                              : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Search */}
        <div className="relative min-w-[240px]">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={isCustomer ? "Tìm kiếm mã đơn hoặc tên sản phẩm..." : "Tìm số đơn hàng hoặc khách hàng..."}
            className="w-full text-xs pl-8 pr-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-orange-400/20 text-slate-800"
          />
        </div>
      </div>

      {/* Orders Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredOrders.length === 0 ? (
          <div className="col-span-full p-12 bg-white rounded-3xl border border-slate-200 text-center text-xs text-slate-400">
            Không tìm thấy đơn hàng nào phù hợp với điều kiện tìm kiếm.
          </div>
        ) : (
          filteredOrders.map((order) => {
            const hasWorkspace =
              order.hasWorkspace !== false &&
              (order.hasWorkspace || (order.specBlocks && order.specBlocks.length > 0));

            return (
              <div
                key={order.id}
                onClick={() => {
                  if (isCustomer) {
                    if (hasWorkspace) {
                      setSelectedOrderId(order.id);
                      setSelectedVersion(order.currentVersion || 'v01');
                      setActiveCustomerWorkspaceOrderId(order.id);
                      setCurrentView('order_workspace');
                    } else {
                      showToast(
                        `Đơn hàng #${order.orderNumber} chưa được khởi tạo Workspace hồ sơ kỹ thuật Tech Pack.`,
                        'info'
                      );
                    }
                  } else {
                    setSelectedOrderId(order.id);
                    setSelectedVersion(order.currentVersion || 'v01');
                    setCurrentView('order_workspace');
                  }
                }}
                className={`p-6 rounded-3xl bg-white border shadow-2xs hover:shadow-lg transition-all duration-200 cursor-pointer flex flex-col justify-between space-y-4 group ${
                  hasWorkspace
                    ? 'border-slate-200/90 hover:border-orange-300'
                    : 'border-slate-200/60 opacity-90 hover:border-slate-300'
                }`}
              >
                {/* 1. Header: Ô thêm/hiển thị hình ảnh (tương tự với tên sản phẩm ở mục tổng quan) + Tên sản phẩm + Mã đơn + Badge trạng thái */}
                <div className="flex items-start gap-3.5 sm:gap-4">
                  {/* Ô thêm / hiển thị hình ảnh sản phẩm */}
                  <div className="relative group/thumb w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden bg-slate-100 border border-slate-200 shrink-0 shadow-2xs self-start">
                    {order.thumbnail ? (
                      <img
                        src={order.thumbnail}
                        alt={order.productName}
                        className="w-full h-full object-cover group-hover/thumb:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center bg-slate-50 text-slate-400 p-2 text-center border-2 border-dashed border-slate-200 rounded-2xl">
                        <ImagePlus className="w-6 h-6 mb-1 text-slate-400" />
                        <span className="text-[10px] font-bold text-slate-500">Thêm ảnh</span>
                      </div>
                    )}

                    {/* Nút overlay để tải lên / thay đổi hình ảnh */}
                    <label
                      onClick={(e) => e.stopPropagation()}
                      className="absolute inset-0 bg-slate-900/65 opacity-0 group-hover/thumb:opacity-100 transition-opacity flex flex-col items-center justify-center cursor-pointer text-white text-[11px] font-bold gap-1 p-1 text-center"
                      title="Nhấp để tải lên hoặc thay đổi hình ảnh sản phẩm"
                    >
                      <Camera className="w-4 h-4 text-white" />
                      <span>{order.thumbnail ? 'Đổi ảnh' : 'Thêm ảnh'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleImageUpload(order.id, e)}
                      />
                    </label>

                    {/* Huy hiệu camera góc dưới để người dùng dễ nhận biết tính năng */}
                    <div className="absolute bottom-1.5 right-1.5 p-1 rounded-md bg-black/45 backdrop-blur-xs text-white group-hover/thumb:hidden pointer-events-none">
                      <Camera className="w-2.5 h-2.5" />
                    </div>
                  </div>

                  {/* Phía bên phải: Tên sản phẩm đầy đủ + Mã đơn hàng + Ô trạng thái (Chờ phê duyệt...) ở dưới mã */}
                  <div className="flex-1 min-w-0 py-0.5 space-y-2">
                    {/* Tên sản phẩm hiển thị đầy đủ, không bị cắt ngắn hay chấm lửng */}
                    <h3 className="text-sm sm:text-base font-black text-slate-900 tracking-tight leading-snug group-hover:text-orange-600 transition-colors break-words">
                      {order.productName}
                    </h3>

                    {/* Mã đơn hàng */}
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-orange-700 bg-orange-50 px-2 py-0.5 rounded-md border border-orange-200/80 shadow-2xs text-xs">
                        #{order.orderNumber}
                      </span>
                    </div>

                    {/* Ô trạng thái (Chờ phê duyệt...) chuyển xuống dưới mã đơn hàng */}
                    <div className="pt-0.5">
                      <StatusBadge status={order.status} size="sm" />
                    </div>
                  </div>
                </div>

                {/* 2. Body: Lưới thông số (đã bỏ mục thông số Tech Pack) */}
                <div className="grid grid-cols-3 gap-2.5 p-3 rounded-2xl bg-slate-50/80 border border-slate-100 text-xs">
                  {/* Ô 1: Số lượng đặt hàng */}
                  <div className="space-y-0.5 min-w-0">
                    <span className="text-[10.5px] font-medium text-slate-400 block truncate">
                      Số lượng
                    </span>
                    <span className="font-bold text-slate-900 text-xs sm:text-[13px] block truncate">
                      {order.targetQuantity.toLocaleString()} SP
                    </span>
                  </div>

                  {/* Ô 2: Phiên bản hiện tại */}
                  <div className="space-y-0.5 min-w-0">
                    <span className="text-[10.5px] font-medium text-slate-400 block truncate">
                      Phiên bản
                    </span>
                    <div>
                      <span className="inline-block font-mono font-bold text-orange-700 bg-orange-100/90 px-1.5 py-0.5 rounded-md border border-orange-200 text-xs">
                        {order.currentVersion}
                      </span>
                    </div>
                  </div>

                  {/* Ô 3: Hạn giao dự kiến */}
                  <div className="space-y-0.5 min-w-0">
                    <span className="text-[10.5px] font-medium text-slate-400 block truncate">
                      Hạn giao
                    </span>
                    <span className="font-bold text-slate-700 text-xs sm:text-[13px] block truncate">
                      {order.deliveryDate}
                    </span>
                  </div>
                </div>

                {/* 3. Footer: Thời gian cập nhật + Nút bấm CTA cam nổi bật */}
                <div className="flex items-center justify-between pt-1 gap-3">
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                    <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                    <span className="truncate">Cập nhật {order.lastUpdated}</span>
                  </div>

                  {hasWorkspace ? (
                    <button className="px-3.5 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs shadow-orange-600/20 group-hover:shadow-md group-hover:shadow-orange-600/30 transition-all active:scale-95 cursor-pointer shrink-0">
                      <span>Vào workspace</span>
                      <ArrowRight className="w-3.5 h-3.5 stroke-[2.5] group-hover:translate-x-0.5 transition-transform" />
                    </button>
                  ) : (
                    <span className="text-xs font-semibold text-slate-400 py-1.5 px-3 rounded-xl bg-slate-100 border border-slate-200/60 shrink-0">
                      Chưa tạo Workspace
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
