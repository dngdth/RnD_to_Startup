import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { StatusBadge } from '../common/StatusBadge';
import { ChangeRequestStatus } from '../../types';
import {
  GitPullRequest,
  Plus,
  Filter,
  CheckCircle2,
  AlertCircle,
  Clock,
  Search,
  ExternalLink,
  ShieldCheck,
  ChevronDown,
  Check,
} from 'lucide-react';

export const ChangeRequestListScreen: React.FC = () => {
  const {
    selectedOrder,
    openNewCRModal,
    updateChangeRequestStatus,
    setSelectedOrderId,
    setCurrentView,
    orders,
    currentUser,
  } = useApp();

  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isCustomer = currentUser.role === 'customer';

  // Role-based scoping: Customer only sees CRs for their own orders / created by them
  const allCRs = (orders || [])
    .filter((o) => {
      if (isCustomer) {
        return (
          o.customerName === currentUser.name ||
          o.customerCompany === currentUser.company
        );
      }
      return true;
    })
    .flatMap((o) =>
      (o.changeRequests || []).map((cr) => ({
        ...cr,
        orderNumber: o.orderNumber,
        orderId: o.id,
        productName: o.productName,
      }))
    );

  // Helper to prioritize active requests (OPEN / IN_PROGRESS) above resolved requests
  const getStatusPriority = (status: string) => {
    switch (status) {
      case 'OPEN':
        return 0; // Chưa xử lí -> ưu tiên hiển thị trên cùng
      case 'IN_PROGRESS':
        return 1; // Đang xử lý -> tiếp theo
      case 'REJECTED':
        return 2; // Đã từ chối
      case 'RESOLVED':
        return 3; // Đã giải quyết -> chuyển xuống dưới
      default:
        return 4;
    }
  };

  const filteredCRs = allCRs
    .filter((cr) => {
      const matchesStatus = filterStatus === 'ALL' || cr.status === filterStatus;
      const matchesSearch =
        (cr.productName && cr.productName.toLowerCase().includes(searchQuery.toLowerCase())) ||
        cr.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        cr.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        cr.crNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        cr.creatorName.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesStatus && matchesSearch;
    })
    .sort((a, b) => {
      // Tự động đẩy các block Chưa xử lí / Đang xử lý lên trước các block Đã xử lý
      const priorityDiff = getStatusPriority(a.status) - getStatusPriority(b.status);
      if (priorityDiff !== 0) return priorityDiff;
      return 0;
    });

  const statuses: { key: string; label: string }[] = [
    { key: 'ALL', label: 'Tất cả' },
    { key: 'OPEN', label: 'Chưa xử lí' },
    { key: 'IN_PROGRESS', label: 'Đang xử lý' },
    { key: 'RESOLVED', label: 'Đã giải quyết' },
    { key: 'REJECTED', label: 'Đã từ chối' },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">
              {isCustomer ? 'Yêu cầu thay đổi của tôi' : 'Quản lý yêu cầu chỉnh sửa'}
            </h2>
            {isCustomer && (
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" />
                <span>{currentUser.name}</span>
              </span>
            )}
          </div>
        </div>

        {/* Both Customer and Vendor can create a Change Request */}
        <button
          onClick={openNewCRModal}
          className="px-4 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold flex items-center gap-2 shadow-md shadow-orange-600/20 transition-all active:scale-98 shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Tạo yêu cầu chỉnh sửa mới</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-start gap-2.5 sm:gap-3 p-3.5 sm:p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs">
        {/* Status Dropdown */}
        <div className="relative shrink-0" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-900 text-white hover:bg-slate-800 transition-all shadow-xs cursor-pointer min-w-[130px] justify-between"
          >
            <div className="flex items-center gap-2">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <span>{statuses.find((s) => s.key === filterStatus)?.label || 'Tất cả'}</span>
            </div>
            <ChevronDown
              className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${
                isDropdownOpen ? 'rotate-180' : ''
              }`}
            />
          </button>

          {isDropdownOpen && (
            <div className="absolute left-0 mt-1.5 w-44 bg-white rounded-2xl shadow-xl border border-slate-200 py-1.5 z-30 animate-in fade-in zoom-in-95 duration-100">
              {statuses.map((st) => (
                <button
                  key={st.key}
                  type="button"
                  onClick={() => {
                    setFilterStatus(st.key);
                    setIsDropdownOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3.5 py-2 text-xs font-semibold text-left transition-colors cursor-pointer ${
                    filterStatus === st.key
                      ? 'bg-orange-50 text-orange-900 font-bold'
                      : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <span>{st.label}</span>
                  {filterStatus === st.key && (
                    <Check className="w-3.5 h-3.5 text-orange-600" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Search - placed closely next to Status filter */}
        <div className="relative flex-1 sm:max-w-md w-full">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm tiêu đề CR, mã số hoặc người tạo..."
            className="w-full text-xs pl-8 pr-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-orange-400/20 text-slate-800 transition-all"
          />
        </div>
      </div>

      {/* Change Requests Table / Card List */}
      <div className="space-y-3">
        {filteredCRs.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 text-slate-400 text-xs">
            Không tìm thấy yêu cầu chỉnh sửa nào khớp với bộ lọc hiện tại.
          </div>
        ) : (
          filteredCRs.map((cr) => {
            const isResolved = cr.status === 'RESOLVED';
            const isRejected = cr.status === 'REJECTED';
            const isMuted = isResolved || isRejected;

            return (
              <div
                key={cr.id}
                className={`p-5 rounded-3xl transition-all duration-200 ease-in-out space-y-3 ${
                  isResolved
                    ? 'bg-[#F7F8FA] border border-slate-200/80 shadow-none hover:border-slate-300/80'
                    : isRejected
                    ? 'bg-[#F7F8FA] border border-slate-200/80 shadow-none hover:border-slate-300/80'
                    : 'bg-[#acf1c2] border border-[#8ce5ab] shadow-2xs hover:border-[#6ed993]'
                }`}
              >
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  {/* Product Name on the left with larger typography */}
                  <div className="min-w-0 flex-1">
                    <h3
                      className={`text-base sm:text-lg tracking-tight transition-colors duration-200 ${
                        isMuted
                          ? 'font-bold text-slate-700'
                          : 'font-black text-slate-950'
                      }`}
                    >
                      {cr.productName || cr.title}
                    </h3>
                  </div>

                  {/* Status Badge next to Order Button on the right */}
                  <div className="flex items-center gap-2.5 shrink-0">
                    <StatusBadge
                      status={cr.status}
                      size="sm"
                      className={
                        isResolved
                          ? '!bg-emerald-50/60 !text-emerald-800/90 !border-emerald-200/50 !shadow-none font-medium'
                          : isRejected
                          ? '!bg-slate-100 !text-slate-500 !border-slate-200 !shadow-none font-medium'
                          : '!bg-white/95 !text-orange-950 !border-orange-300/70 shadow-2xs font-bold'
                      }
                    />
                    <button
                      onClick={() => {
                        setSelectedOrderId(cr.orderId);
                        setCurrentView('order_workspace');
                      }}
                      className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-xl transition-all duration-200 cursor-pointer ${
                        isMuted
                          ? 'font-medium text-slate-500 hover:text-slate-800 bg-white/70 hover:bg-white border border-slate-200/60 shadow-2xs'
                          : 'font-bold text-slate-900 hover:text-black bg-white/90 hover:bg-white border border-emerald-600/20 shadow-2xs'
                      }`}
                    >
                      <span>Đơn hàng #{cr.orderNumber}</span>
                      <ExternalLink className="w-3 h-3 opacity-75" />
                    </button>
                  </div>
                </div>

                {/* Customer Note / Description with larger font */}
                <p
                  className={`text-sm sm:text-[15px] leading-relaxed transition-colors duration-200 ${
                    isMuted ? 'text-slate-500' : 'text-slate-850 text-slate-800 font-medium'
                  }`}
                >
                  {cr.description}
                </p>

                {/* Resolution Notes moved above metadata */}
                {cr.resolutionNotes && (
                  <div
                    className={`p-3 rounded-2xl text-xs flex items-start gap-2.5 transition-all duration-200 ${
                      isMuted
                        ? 'bg-emerald-50/30 border border-slate-200/80 text-slate-600'
                        : 'bg-white/80 border border-emerald-600/25 text-emerald-950 shadow-2xs'
                    }`}
                  >
                    <CheckCircle2
                      className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${
                        isMuted ? 'text-emerald-600/60' : 'text-emerald-700'
                      }`}
                    />
                    <div className="leading-relaxed">
                      <span
                        className={`font-semibold ${
                          isMuted ? 'text-slate-700' : 'text-emerald-950 font-bold'
                        }`}
                      >
                        Ghi chú giải quyết:
                      </span>{' '}
                      {cr.resolutionNotes}{' '}
                      <span
                        className={
                          isMuted ? 'text-slate-400' : 'text-emerald-850 font-medium'
                        }
                      >
                        (Áp dụng trong {cr.resolvedInVersion})
                      </span>
                    </div>
                  </div>
                )}

                {/* Status Update / Resolution Actions & Metadata */}
                <div
                  className={`flex flex-wrap items-center justify-between gap-3 pt-3 border-t text-xs transition-colors duration-200 ${
                    isMuted
                      ? 'border-slate-200/60 text-slate-400'
                      : 'border-emerald-800/15 text-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2 flex-wrap">
                    <img
                      src={cr.creatorAvatar}
                      alt={cr.creatorName}
                      className={`w-5 h-5 rounded-full object-cover transition-opacity duration-200 ${
                        isMuted ? 'opacity-70 grayscale-[20%]' : 'opacity-100 ring-1 ring-emerald-600/20'
                      }`}
                    />
                    <span>
                      Tạo bởi{' '}
                      <strong
                        className={`transition-colors duration-200 ${
                          isMuted ? 'text-slate-600 font-medium' : 'text-slate-900 font-bold'
                        }`}
                      >
                        {cr.creatorName}
                      </strong>
                    </span>
                    <span>•</span>
                    <span className={isMuted ? 'text-slate-400' : 'text-slate-600'}>
                      {cr.createdAt}
                    </span>
                    <span>•</span>
                    <span
                      className={`px-2 py-0.5 rounded-md text-[11px] transition-colors duration-200 ${
                        isMuted
                          ? 'bg-slate-200/50 text-slate-500 font-normal'
                          : 'bg-white/80 text-slate-800 font-medium border border-emerald-600/15 shadow-2xs'
                      }`}
                    >
                      Hạng mục: {cr.affectedBlockTitle}
                    </span>
                  </div>

                  {/* Status Switcher: Vendor only! Customers only view the status */}
                  {!isCustomer ? (
                    <div className="flex items-center gap-1.5">
                      <span className={`text-[11px] font-bold uppercase ${isMuted ? 'text-slate-400' : 'text-emerald-900/80'}`}>
                        Chuyển trạng thái:
                      </span>
                      <select
                        value={cr.status}
                        onChange={(e) =>
                          updateChangeRequestStatus(cr.id, e.target.value as ChangeRequestStatus)
                        }
                        className={`text-xs px-2.5 py-1 rounded-lg border transition-all duration-200 cursor-pointer ${
                          isMuted
                            ? 'font-medium text-slate-600 border-slate-200/80 bg-white/80 hover:bg-white shadow-2xs'
                            : 'font-bold text-slate-900 border-emerald-600/25 bg-white hover:bg-emerald-50/50 shadow-2xs'
                        }`}
                      >
                        <option value="OPEN">Chưa xử lí</option>
                        <option value="IN_PROGRESS">Đang xử lý</option>
                        <option value="RESOLVED">Đã giải quyết</option>
                        <option value="REJECTED">Đã từ chối</option>
                      </select>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500">
                      <span className={isMuted ? 'text-slate-500' : 'text-slate-700 font-bold'}>Trạng thái:</span>
                      <span
                        className={`font-bold transition-colors duration-200 ${
                          isMuted ? 'text-slate-600' : 'text-slate-900'
                        }`}
                      >
                        {cr.status === 'OPEN'
                          ? 'Chưa xử lí'
                          : cr.status === 'IN_PROGRESS'
                          ? 'Nhà thiết kế đang xử lý'
                          : cr.status === 'RESOLVED'
                          ? 'Đã cập nhật vào phiên bản mới'
                          : 'Đã từ chối'}
                      </span>
                    </div>
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
