import React, { useState } from 'react';
import { useApp, AppView } from '../../context/AppContext';
import {
  Search,
  Bell,
  ArrowLeftRight,
  ShieldCheck,
  ChevronRight,
} from 'lucide-react';

interface TopbarProps {
  title?: string;
  subtitle?: string;
}

export const Topbar: React.FC<TopbarProps> = ({ title, subtitle }) => {
  const {
    currentUser,
    switchRole,
    unreadNotificationsCount,
    setIsNotificationPanelOpen,
    isNotificationPanelOpen,
    isBellAnimating,
    currentView,
    setCurrentView,
    orders,
    selectedOrder,
    setSelectedOrderId,
    diffViewStep,
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const isDesigner = currentUser.role === 'vendor';

  // Build breadcrumb structure based on active view and role
  const getBreadcrumb = () => {
    if (currentView === 'designer_dashboard') {
      return {
        parent: 'Tổng quan',
        parentView: 'designer_dashboard' as AppView,
        current: title || 'Không gian Thiết kế & Xưởng sản xuất',
      };
    }
    if (currentView === 'customer_dashboard') {
      return {
        parent: 'Cổng thông tin',
        parentView: 'customer_dashboard' as AppView,
        current: title || 'Trang chủ',
      };
    }
    if (currentView === 'order_workspace') {
      return {
        parent: isDesigner ? 'Đơn hàng' : 'Đơn hàng của tôi',
        parentView: 'orders' as AppView,
        current: selectedOrder
          ? `Workspace #${selectedOrder.orderNumber}`
          : title || 'Workspace đơn hàng',
      };
    }
    if (currentView === 'orders') {
      return {
        parent: isDesigner ? 'Tổng quan' : 'Trang chủ',
        parentView: (isDesigner ? 'designer_dashboard' : 'customer_dashboard') as AppView,
        current: title || (isDesigner ? 'Đơn hàng sản xuất' : 'Đơn hàng của tôi'),
      };
    }
    if (currentView === 'change_requests') {
      return {
        parent: isDesigner ? 'Tổng quan' : 'Trang chủ',
        parentView: (isDesigner ? 'designer_dashboard' : 'customer_dashboard') as AppView,
        current: title || (isDesigner ? 'Yêu cầu thay đổi' : 'Yêu cầu thay đổi của tôi'),
      };
    }
    if (currentView === 'diff_view') {
      return {
        parent: isDesigner ? 'Tổng quan' : 'Trang chủ',
        parentView: (isDesigner ? 'designer_dashboard' : 'customer_dashboard') as AppView,
        current:
          diffViewStep === 'select_product'
            ? 'Chọn sản phẩm so sánh'
            : `So sánh: ${selectedOrder.productName}`,
      };
    }
    if (currentView === 'audit_history') {
      return {
        parent: isDesigner ? 'Tổng quan' : 'Trang chủ',
        parentView: (isDesigner ? 'designer_dashboard' : 'customer_dashboard') as AppView,
        current: title || (isDesigner ? 'Lịch sử hoạt động' : 'Lịch sử đơn hàng'),
      };
    }
    if (currentView === 'settings') {
      return {
        parent: 'Hệ thống',
        parentView: 'designer_dashboard' as AppView,
        current: title || 'Cài đặt & Zalo',
      };
    }
    return {
      parent: isDesigner ? 'Tổng quan' : 'Trang chủ',
      parentView: (isDesigner ? 'designer_dashboard' : 'customer_dashboard') as AppView,
      current: title || 'Không gian làm việc ProofPrint',
    };
  };

  const breadcrumb = getBreadcrumb();

  const viewTitles: Record<string, { title: string; subtitle: string }> = {
    designer_dashboard: {
      title: 'Tổng quan Nhà thiết kế & Nhà cung cấp',
      subtitle: 'Quản lý các đợt sản xuất, sửa đổi thông số kỹ thuật và ký duyệt mẫu',
    },
    customer_dashboard: {
      title: 'Trang chủ',
      subtitle: 'Theo dõi đơn hàng, yêu cầu thay đổi và các phiên bản đang chờ bạn phản hồi.',
    },
    order_workspace: {
      title: isDesigner ? 'Không gian làm việc Thông số đơn hàng' : 'Workspace đơn hàng',
      subtitle: isDesigner
        ? 'Hồ sơ kỹ thuật chuẩn và kiểm soát các phiên bản sửa đổi'
        : 'Hồ sơ kỹ thuật chuẩn (Tech Pack), so sánh thay đổi và ký duyệt điện tử',
    },
    orders: {
      title: isDesigner ? 'Đơn hàng sản xuất' : 'Đơn hàng của tôi',
      subtitle: isDesigner
        ? 'Duyệt danh sách hồ sơ kỹ thuật, lô sản xuất và các mốc tiến độ'
        : 'Danh sách các đơn hàng và hồ sơ kỹ thuật đã được chia sẻ với bạn',
    },
    change_requests: {
      title: isDesigner ? 'Trung tâm Yêu cầu thay đổi' : 'Yêu cầu thay đổi của tôi',
      subtitle: isDesigner
        ? 'Theo dõi phản hồi của khách hàng, chỉnh sửa thiết kế và xử lý sai khác'
        : 'Gửi yêu cầu điều chỉnh thông số, kích thước hoặc tệp in tới nhà thiết kế',
    },
    diff_view: {
      title: 'Phiên bản / So sánh phiên bản',
      subtitle: 'So sánh trực quan song song và đối chiếu chính xác từng thông số kỹ thuật',
    },
    audit_history: {
      title: isDesigner ? 'Nhật ký hoạt động & Lịch sử ký duyệt' : 'Lịch sử của đơn hàng',
      subtitle: isDesigner
        ? 'Lịch sử lưu vết bất biến về các lần cập nhật thông số và chữ ký điện tử'
        : 'Lưu vết toàn bộ quá trình trao đổi, yêu cầu chỉnh sửa và phê duyệt điện tử',
    },
    notifications: {
      title: 'Trung tâm thông báo',
      subtitle: 'Cảnh báo thời gian thực về yêu cầu thay đổi, phát hành phiên bản và phê duyệt',
    },
    settings: {
      title: 'Cài đặt & Tích hợp Zalo',
      subtitle: 'Cấu hình Zalo OA v3 webhook, thông báo đẩy và phân quyền nhóm',
    },
    workspaces: {
      title: 'Không gian làm việc Khách hàng & Thương hiệu',
      subtitle: 'Phân loại danh mục may mặc, tệp thiết kế vector và hợp đồng sản xuất',
    },
  };

  const currentInfo = viewTitles[currentView] || {
    title: title || 'Không gian làm việc ProofPrint',
    subtitle: subtitle || 'Một không gian làm việc. Một nguồn dữ liệu chuẩn. Mọi thay đổi đều được lưu vết.',
  };

  // Filtered search results scoped to user's permissions
  const accessibleOrders = isDesigner
    ? orders
    : orders.filter(
        (o) =>
          o.customerName === currentUser.name ||
          o.customerCompany === currentUser.company
      );

  const searchResults = searchQuery.trim()
    ? accessibleOrders.filter(
        (o) =>
          o.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
          o.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          o.customerCompany.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

  return (
    <header className="h-16 border-b border-slate-200/70 bg-white/80 backdrop-blur-xl sticky top-0 z-20 px-4 sm:px-6 flex items-center justify-between gap-4 select-none">
      {/* Left: Professional Breadcrumbs Navigation */}
      <div className="flex items-center gap-3 min-w-0">
        <nav aria-label="Đường dẫn điều hướng" className="flex items-center gap-2 text-xs sm:text-[13px] min-w-0">
          <button
            onClick={() => setCurrentView(breadcrumb.parentView)}
            className="text-slate-400 hover:text-slate-800 transition-colors font-medium shrink-0 hover:underline underline-offset-4 cursor-pointer"
            title={`Quay về ${breadcrumb.parent}`}
          >
            {breadcrumb.parent}
          </button>

          <ChevronRight className="w-3.5 h-3.5 text-slate-300 stroke-[2] shrink-0" />

          <span className="font-semibold text-slate-900 truncate">
            {breadcrumb.current}
          </span>

          {!isDesigner && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/60 hidden sm:inline-flex items-center gap-1 ml-1 shrink-0">
              <ShieldCheck className="w-2.5 h-2.5" />
              <span>Khách hàng</span>
            </span>
          )}
        </nav>
      </div>

      {/* Center / Right Controls: [Search] [Role] [Notification] [Avatar] */}
      <div className="flex items-center gap-2.5 sm:gap-3">
        {/* Global Search Bar */}
        <div className="relative hidden md:block">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 stroke-[1.75]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setIsSearchOpen(true);
              }}
              onFocus={() => setIsSearchOpen(true)}
              onBlur={() => setTimeout(() => setIsSearchOpen(false), 200)}
              placeholder={isDesigner ? "Tìm mã đơn hàng, thông số, tệp thiết kế..." : "Tìm trong các đơn hàng của bạn..."}
              className="w-64 sm:w-72 md:w-80 lg:w-96 pl-8 pr-8 py-1.5 text-xs bg-slate-50 hover:bg-slate-100/80 focus:bg-white border border-slate-200/80 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500/40 text-slate-800 placeholder-slate-400 transition-all shadow-2xs"
            />
            <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-mono text-slate-400 border border-slate-200 bg-white px-1.5 py-0.2 rounded-md pointer-events-none">
              ⌘K
            </span>
          </div>

          {/* Search Dropdown Results */}
          {isSearchOpen && searchQuery.trim() && (
            <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl border border-slate-200 shadow-xl p-2 z-50 animate-in fade-in slide-in-from-top-1 duration-150">
              <div className="px-2 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Đơn hàng phù hợp ({searchResults.length})
              </div>
              {searchResults.length === 0 ? (
                <div className="p-3 text-xs text-slate-500 text-center">
                  Không tìm thấy đơn hàng hoặc thông số phù hợp
                </div>
              ) : (
                searchResults.map((order) => (
                  <button
                    key={order.id}
                    onClick={() => {
                      setSelectedOrderId(order.id);
                      setCurrentView('order_workspace');
                      setIsSearchOpen(false);
                      setSearchQuery('');
                    }}
                    className="w-full text-left p-2.5 rounded-xl hover:bg-orange-50/70 transition-colors flex items-center justify-between group"
                  >
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-xs font-bold text-orange-700">
                          #{order.orderNumber}
                        </span>
                        <span className="text-xs font-semibold text-slate-800">
                          {order.productName}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400">{order.customerCompany}</p>
                    </div>
                    <span className="text-[10px] font-mono font-bold text-orange-800 bg-orange-100 px-1.5 py-0.5 rounded">
                      {order.currentVersion}
                    </span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        {/* Quick Role Switcher Pill */}
        <button
          onClick={() => switchRole(isDesigner ? 'customer' : 'vendor')}
          title="Chuyển đổi góc nhìn vai trò để kiểm thử phân quyền"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all active:scale-95 bg-white border-slate-200 text-slate-700 hover:border-orange-300 hover:bg-orange-50/50 shadow-2xs"
        >
          <ArrowLeftRight className="w-3.5 h-3.5 text-orange-600 stroke-[2]" />
          <span className="hidden sm:inline text-slate-500 font-medium">Vai trò:</span>
          <span className={`font-extrabold ${isDesigner ? 'text-slate-900' : 'text-emerald-700'}`}>
            {isDesigner ? 'Nhà thiết kế' : 'Khách hàng'}
          </span>
        </button>

        {/* Notification Bell with Floating Panel Toggle */}
        <div className="relative">
          <button
            onClick={() => setIsNotificationPanelOpen(!isNotificationPanelOpen)}
            title="Mở bảng thông báo"
            className={`relative p-2 rounded-xl border transition-all duration-200 active:scale-95 ${
              isNotificationPanelOpen
                ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                : 'border-slate-200/80 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 shadow-2xs'
            }`}
          >
            <Bell
              className={`w-4 h-4 stroke-[1.75] transition-transform duration-300 ${
                isBellAnimating ? 'scale-125 rotate-12 text-amber-500' : ''
              }`}
            />
            {unreadNotificationsCount > 0 && (
              <span
                className={`absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold flex items-center justify-center transition-all ${
                  isNotificationPanelOpen
                    ? 'bg-amber-400 text-slate-950 ring-2 ring-slate-900'
                    : 'bg-amber-500 text-slate-950 ring-2 ring-white shadow-xs'
                }`}
              >
                {unreadNotificationsCount}
              </span>
            )}
          </button>
        </div>

        {/* User Profile Avatar with Name Tooltip */}
        <div className="flex items-center gap-2 pl-1">
          <div
            className="w-8 h-8 rounded-full ring-2 ring-slate-200 overflow-hidden cursor-pointer shrink-0 shadow-2xs"
            title={`${currentUser.name} (${currentUser.company})`}
          >
            <img
              src={currentUser.avatar}
              alt={currentUser.name}
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      </div>
    </header>
  );
};
