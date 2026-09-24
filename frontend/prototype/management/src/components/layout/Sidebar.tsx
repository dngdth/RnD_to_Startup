import React from 'react';
import { useApp, AppView } from '../../context/AppContext';
import {
  LayoutDashboard,
  ShoppingBag,
  GitPullRequest,
  GitBranch,
  History,
  Settings,
  LogOut,
  Sparkles,
  ArrowLeftRight,
  ShieldCheck,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const {
    currentUser,
    switchRole,
    currentView,
    setCurrentView,
    orders,
    setSelectedOrderId,
    activeCustomerWorkspaceOrderId,
    setActiveCustomerWorkspaceOrderId,
    isSidebarCollapsed,
    setIsSidebarCollapsed,
    setDiffViewStep,
  } = useApp();

  const isDesigner = currentUser.role === 'vendor';

  // Badge counts
  const ordersCount = orders?.length || 0;
  const changeRequestsCount =
    orders?.flatMap((o) => o.changeRequests || []).length || 0;

  // Active customer order with workspace
  const activeCustomerOrder = activeCustomerWorkspaceOrderId
    ? orders.find((o) => o.id === activeCustomerWorkspaceOrderId)
    : null;

  const hasActiveCustomerWorkspace = Boolean(
    activeCustomerOrder &&
      activeCustomerOrder.hasWorkspace !== false &&
      (activeCustomerOrder.hasWorkspace ||
        (activeCustomerOrder.specBlocks && activeCustomerOrder.specBlocks.length > 0))
  );

  // Designer Navigation Items (QUẢN LÝ SẢN XUẤT)
  const designerNavItems = [
    {
      id: 'designer_dashboard',
      label: 'Tổng quan',
      tooltip: 'Tổng quan',
      icon: <LayoutDashboard className="w-4 h-4 stroke-[1.75]" />,
      collapsedIcon: <LayoutDashboard className="w-5 h-5 stroke-[1.8]" />,
      targetView: 'designer_dashboard' as AppView,
    },
    {
      id: 'orders',
      label: 'Đơn hàng',
      tooltip: 'Đơn hàng',
      icon: <ShoppingBag className="w-4 h-4 stroke-[1.75]" />,
      collapsedIcon: <ShoppingBag className="w-5 h-5 stroke-[1.8]" />,
      targetView: 'orders' as AppView,
      badge: ordersCount > 0 ? ordersCount.toString() : undefined,
    },
    {
      id: 'change_requests',
      label: 'Yêu cầu thay đổi',
      tooltip: 'Yêu cầu thay đổi',
      icon: <GitPullRequest className="w-4 h-4 stroke-[1.75]" />,
      collapsedIcon: <GitPullRequest className="w-5 h-5 stroke-[1.8]" />,
      targetView: 'change_requests' as AppView,
      badge: changeRequestsCount > 0 ? changeRequestsCount.toString() : undefined,
    },
    {
      id: 'diff_view',
      label: 'So sánh phiên bản',
      tooltip: 'So sánh phiên bản',
      icon: <GitBranch className="w-4 h-4 stroke-[1.75]" />,
      collapsedIcon: <GitBranch className="w-5 h-5 stroke-[1.8]" />,
      targetView: 'diff_view' as AppView,
    },
    {
      id: 'audit_history',
      label: 'Lịch sử hoạt động',
      tooltip: 'Lịch sử hoạt động',
      icon: <History className="w-4 h-4 stroke-[1.75]" />,
      collapsedIcon: <History className="w-5 h-5 stroke-[1.8]" />,
      targetView: 'audit_history' as AppView,
    },
  ];

  // Contextual Customer Navigation
  const customerNavItems = [
    {
      id: 'customer_dashboard',
      label: 'Trang chủ',
      tooltip: 'Trang chủ',
      icon: <LayoutDashboard className="w-4 h-4 stroke-[1.75]" />,
      collapsedIcon: <LayoutDashboard className="w-5 h-5 stroke-[1.8]" />,
      targetView: 'customer_dashboard' as AppView,
    },
    {
      id: 'orders',
      label: 'Đơn hàng của tôi',
      tooltip: 'Đơn hàng của tôi',
      icon: <ShoppingBag className="w-4 h-4 stroke-[1.75]" />,
      collapsedIcon: <ShoppingBag className="w-5 h-5 stroke-[1.8]" />,
      targetView: 'orders' as AppView,
    },
    ...(hasActiveCustomerWorkspace && activeCustomerOrder
      ? [
          {
            id: 'order_workspace',
            label: 'Workspace đơn hàng',
            tooltip: `Workspace đơn hàng (#${activeCustomerOrder.orderNumber})`,
            icon: <Sparkles className="w-4 h-4 stroke-[1.75] text-orange-600" />,
            collapsedIcon: <Sparkles className="w-5 h-5 stroke-[1.8] text-orange-600" />,
            targetView: 'order_workspace' as AppView,
            badge: `#${activeCustomerOrder.orderNumber}`,
          },
        ]
      : []),
    {
      id: 'change_requests',
      label: 'Yêu cầu thay đổi của tôi',
      tooltip: 'Yêu cầu thay đổi của tôi',
      icon: <GitPullRequest className="w-4 h-4 stroke-[1.75]" />,
      collapsedIcon: <GitPullRequest className="w-5 h-5 stroke-[1.8]" />,
      targetView: 'change_requests' as AppView,
      badge: '1',
    },
    {
      id: 'diff_view',
      label: 'Phiên bản / So sánh',
      tooltip: 'Phiên bản / So sánh',
      icon: <GitBranch className="w-4 h-4 stroke-[1.75]" />,
      collapsedIcon: <GitBranch className="w-5 h-5 stroke-[1.8]" />,
      targetView: 'diff_view' as AppView,
    },
    {
      id: 'audit_history',
      label: 'Lịch sử đơn hàng',
      tooltip: 'Lịch sử đơn hàng',
      icon: <History className="w-4 h-4 stroke-[1.75]" />,
      collapsedIcon: <History className="w-5 h-5 stroke-[1.8]" />,
      targetView: 'audit_history' as AppView,
    },
  ];

  const activeNavItems = isDesigner ? designerNavItems : customerNavItems;

  const handleNavClick = (item: {
    id: string;
    label: string;
    icon: React.ReactNode;
    targetView: AppView;
    badge?: string;
  }) => {
    if (item.id === 'diff_view') {
      setDiffViewStep('select_product');
      setCurrentView('diff_view');
      return;
    }
    if (!isDesigner) {
      if (item.id === 'customer_dashboard') {
        setActiveCustomerWorkspaceOrderId(null);
        setCurrentView('customer_dashboard');
        return;
      }
      if (item.id === 'orders') {
        setActiveCustomerWorkspaceOrderId(null);
        setCurrentView('orders');
        return;
      }
      if (item.id === 'order_workspace' && activeCustomerWorkspaceOrderId) {
        setSelectedOrderId(activeCustomerWorkspaceOrderId);
        setCurrentView('order_workspace');
        return;
      }
    }
    setCurrentView(item.targetView);
  };

  return (
    <aside
      className={`${
        isSidebarCollapsed ? 'w-20' : 'w-64'
      } shrink-0 bg-white/95 backdrop-blur-2xl border-r border-slate-200/80 flex flex-col justify-between z-30 h-screen sticky top-0 select-none transition-[width] duration-300 ease-in-out overflow-visible`}
    >
      {/* ============================================================ */}
      {/* 1. COLLAPSED VIEW (w-20: Icon Rail 80px)                    */}
      {/* ============================================================ */}
      {isSidebarCollapsed ? (
        <div className="flex flex-col justify-between h-full w-full">
          {/* Top: Logo & Expand Button */}
          <div>
            <div className="p-3 border-b border-slate-100 flex flex-col items-center gap-2">
              {/* Logo Mark Button */}
              <button
                onClick={() => {
                  if (!isDesigner) {
                    setActiveCustomerWorkspaceOrderId(null);
                    setCurrentView('customer_dashboard');
                  } else {
                    setCurrentView('designer_dashboard');
                  }
                }}
                className="relative w-10 h-10 rounded-xl bg-[#0F766E] flex items-center justify-center shadow-xs text-white font-black text-sm tracking-tight border border-[#115E59]/50 hover:scale-105 transition-transform group"
                title="ProofPrint"
              >
                <span className="text-white">P</span>
              </button>

              {/* Expand Toggle Button */}
              <div className="relative group flex items-center justify-center">
                <button
                  id="btn-expand-sidebar"
                  onClick={() => setIsSidebarCollapsed(false)}
                  className="w-9 h-9 rounded-xl text-slate-400 hover:text-slate-900 hover:bg-slate-100 flex items-center justify-center transition-colors active:scale-95"
                  aria-label="Mở rộng thanh bên"
                >
                  <PanelLeftOpen className="w-4 h-4 stroke-[1.75]" />
                </button>

                {/* Tooltip */}
                <div className="pointer-events-none absolute left-full ml-3 px-2.5 py-1.5 bg-slate-900 text-white text-xs font-semibold rounded-lg shadow-xl whitespace-nowrap opacity-0 group-hover:opacity-100 transition-all duration-150 z-50 flex items-center gap-1.5">
                  <span>Mở rộng thanh bên</span>
                  <div className="absolute right-full top-1/2 -translate-y-1/2 -mr-[1px] border-4 border-transparent border-r-slate-900" />
                </div>
              </div>
            </div>

            {/* Vertical Centered Navigation Icon Rail */}
            <div className="py-4 flex flex-col items-center space-y-2.5">
              {activeNavItems.map((item) => {
                const isActive =
                  currentView === item.targetView ||
                  (isDesigner && currentView === 'order_workspace' && item.id === 'orders');

                return (
                  <div key={item.id} className="relative group flex items-center justify-center">
                    <button
                      onClick={() => handleNavClick(item)}
                      className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all ${
                        isActive
                          ? 'bg-[#0F766E] text-white shadow-xs'
                          : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100/90'
                      }`}
                      aria-label={item.label}
                    >
                      <span
                        className={`transition-colors ${
                          isActive ? 'text-white' : 'group-hover:text-slate-900'
                        }`}
                      >
                        {item.collapsedIcon}
                      </span>

                      {/* Dot indicator if has badge */}
                      {item.badge && !isActive && (
                        <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-orange-500 ring-2 ring-white" />
                      )}
                    </button>

                    {/* Floating Tooltip on Hover */}
                    <div className="pointer-events-none absolute left-full ml-3.5 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-slate-900 text-white text-xs font-semibold rounded-lg shadow-xl whitespace-nowrap opacity-0 scale-95 group-hover:opacity-100 group-hover:scale-100 transition-all duration-150 z-50 flex items-center gap-2 origin-left">
                      <span>{item.tooltip}</span>
                      {item.badge && (
                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-slate-800 text-orange-400">
                          {item.badge}
                        </span>
                      )}
                      <div className="absolute right-full top-1/2 -translate-y-1/2 -mr-[1px] border-4 border-transparent border-r-slate-900" />
                    </div>
                  </div>
                );
              })}

              {/* Designer Settings & Zalo in Collapsed */}
              {isDesigner && (
                <>
                  <div className="w-8 border-t border-slate-200 my-1" />
                  <div className="relative group flex items-center justify-center">
                    <button
                      onClick={() => setCurrentView('settings')}
                      className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all ${
                        currentView === 'settings'
                          ? 'bg-[#0F766E] text-white shadow-xs'
                          : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100/90'
                      }`}
                      aria-label="Cài đặt & Zalo"
                    >
                      <Settings
                        className={`w-5 h-5 stroke-[1.8] ${
                          currentView === 'settings'
                            ? 'text-white'
                            : 'group-hover:text-slate-900'
                        }`}
                      />
                    </button>

                    {/* Tooltip */}
                    <div className="pointer-events-none absolute left-full ml-3.5 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-slate-900 text-white text-xs font-semibold rounded-lg shadow-xl whitespace-nowrap opacity-0 scale-95 group-hover:opacity-100 group-hover:scale-100 transition-all duration-150 z-50 flex items-center gap-2 origin-left">
                      <span>Cài đặt & Zalo</span>
                      <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-slate-800 text-emerald-400">
                        Đã kết nối
                      </span>
                      <div className="absolute right-full top-1/2 -translate-y-1/2 -mr-[1px] border-4 border-transparent border-r-slate-900" />
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Bottom: Role Switcher Icon & Avatar */}
          <div className="p-3 border-t border-slate-200/70 bg-slate-50/50 flex flex-col items-center space-y-2.5">
            {/* Role switch icon button */}
            <div className="relative group flex items-center justify-center">
              <button
                onClick={() => switchRole(isDesigner ? 'customer' : 'vendor')}
                className="w-10 h-10 rounded-xl bg-[#0F766E] text-white hover:bg-[#115E59] flex items-center justify-center transition-all active:scale-95 shadow-xs"
                aria-label={
                  isDesigner
                    ? 'Chuyển sang Emma (Khách hàng)'
                    : 'Chuyển sang Alex (Nhà thiết kế)'
                }
              >
                <ArrowLeftRight className="w-4 h-4 text-white" />
              </button>

              {/* Tooltip */}
              <div className="pointer-events-none absolute left-full ml-3.5 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-slate-900 text-white text-xs font-semibold rounded-lg shadow-xl whitespace-nowrap opacity-0 scale-95 group-hover:opacity-100 group-hover:scale-100 transition-all duration-150 z-50 flex items-center gap-1.5 origin-left">
                <span>
                  {isDesigner
                    ? 'Chuyển sang Emma (Khách hàng)'
                    : 'Chuyển sang Alex (Nhà thiết kế)'}
                </span>
                <div className="absolute right-full top-1/2 -translate-y-1/2 -mr-[1px] border-4 border-transparent border-r-slate-900" />
              </div>
            </div>

            {/* Profile Avatar with Tooltip */}
            <div className="relative group flex items-center justify-center">
              <button
                onClick={() => setCurrentView('login')}
                className="relative"
                aria-label={currentUser.name}
              >
                <img
                  src={currentUser.avatar}
                  alt={currentUser.name}
                  className="w-9 h-9 rounded-full object-cover border border-slate-200 hover:ring-2 hover:ring-orange-400 transition-all"
                />
              </button>

              {/* Tooltip */}
              <div className="pointer-events-none absolute left-full ml-3.5 top-1/2 -translate-y-1/2 px-3 py-2 bg-slate-900 text-white text-xs font-semibold rounded-lg shadow-xl whitespace-nowrap opacity-0 scale-95 group-hover:opacity-100 group-hover:scale-100 transition-all duration-150 z-50 flex flex-col gap-0.5 origin-left">
                <span className="font-bold">{currentUser.name}</span>
                <span className="text-[10.5px] text-slate-300">
                  {currentUser.title}
                </span>
                <div className="absolute right-full top-1/2 -translate-y-1/2 -mr-[1px] border-4 border-transparent border-r-slate-900" />
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* ============================================================ */
        /* 2. EXPANDED VIEW (w-64: Full Standard Sidebar 256px)        */
        /* ============================================================ */
        <div className="flex flex-col justify-between h-full w-full">
          {/* Brand Header */}
          <div>
            <div className="p-4 pb-3.5 border-b border-slate-100 flex items-center justify-between gap-2">
              <button
                onClick={() => {
                  if (!isDesigner) {
                    setActiveCustomerWorkspaceOrderId(null);
                    setCurrentView('customer_dashboard');
                  } else {
                    setCurrentView('designer_dashboard');
                  }
                }}
                className="flex items-center gap-3 text-left min-w-0 flex-1 group"
              >
                {/* Logo Mark */}
                <div className="relative w-8 h-8 rounded-xl bg-[#0F766E] flex items-center justify-center shadow-xs text-white font-black text-sm tracking-tight border border-[#115E59]/50 group-hover:scale-105 transition-transform shrink-0">
                  <span className="text-white">P</span>
                </div>
                <div className="min-w-0">
                  <div className="font-extrabold text-slate-900 tracking-tight flex items-center gap-1.5 text-sm uppercase">
                    <span>ProofPrint</span>
                    <span
                      className={`text-[9px] font-bold tracking-wider px-1.5 py-0.2 rounded-full ${
                        isDesigner
                          ? 'bg-orange-50 text-orange-700 border border-orange-200/60'
                          : 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                      }`}
                    >
                      {isDesigner ? 'PRO' : 'PORTAL'}
                    </span>
                  </div>
                </div>
              </button>

              {/* Collapse button */}
              <button
                id="btn-collapse-sidebar"
                onClick={() => setIsSidebarCollapsed(true)}
                title="Thu gọn thanh bên"
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors shrink-0"
                aria-label="Thu gọn thanh bên"
              >
                <PanelLeftClose className="w-4 h-4 stroke-[1.75]" />
              </button>
            </div>

            {/* Navigation List */}
            <div className="p-2.5 space-y-0.5">
              <div className="px-2.5 pt-2 pb-1.5">
                {isDesigner ? (
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    QUẢN LÝ SẢN XUẤT
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider">
                      Cổng thông tin khách hàng
                    </span>
                    <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/60 px-1.5 py-0.2 rounded shrink-0 uppercase tracking-wider">
                      Khách hàng
                    </span>
                  </div>
                )}
              </div>

              {activeNavItems.map((item) => {
                const isActive =
                  currentView === item.targetView ||
                  (isDesigner && currentView === 'order_workspace' && item.id === 'orders');
                return (
                  <button
                    key={item.id}
                    onClick={() => handleNavClick(item)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all group ${
                      isActive
                        ? 'bg-[#0F766E] text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span
                        className={`transition-colors ${
                          isActive
                            ? 'text-white'
                            : 'text-slate-400 group-hover:text-slate-600'
                        }`}
                      >
                        {item.icon}
                      </span>
                      <span>{item.label}</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {item.badge && (
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-bold tracking-tight ${
                            isActive
                              ? 'bg-[#E0E7FF] text-[#101828]'
                              : item.id === 'change_requests'
                              ? 'bg-orange-50 text-orange-700 border border-orange-200/60'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}

              {/* Designer: Settings & Zalo Section with Dividers */}
              {isDesigner && (
                <>
                  {/* Divider */}
                  <div className="my-2 mx-1 border-t border-slate-200/80" />

                  {/* Settings & Zalo item */}
                  <button
                    onClick={() => setCurrentView('settings')}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all group ${
                      currentView === 'settings'
                        ? 'bg-[#0F766E] text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span
                        className={`transition-colors ${
                          currentView === 'settings'
                            ? 'text-white'
                            : 'text-slate-400 group-hover:text-slate-600'
                        }`}
                      >
                        <Settings className="w-4 h-4 stroke-[1.75]" />
                      </span>
                      <span>Cài đặt & Zalo</span>
                    </div>

                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-md font-semibold tracking-tight ${
                        currentView === 'settings'
                          ? 'bg-white/20 text-white'
                          : 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                      }`}
                    >
                      Đã kết nối
                    </span>
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Bottom Profile & Role Switcher */}
          <div className="p-3 border-t border-slate-200/70 bg-slate-50/50 space-y-2.5">
            {/* Role Section */}
            <div className="space-y-2">
              <div className="flex items-center justify-between px-1">
                <span className="flex items-center gap-1.5 font-bold text-slate-400 text-[10px] uppercase tracking-wider">
                  <ShieldCheck className="w-3.5 h-3.5 text-orange-600 stroke-[1.75]" />
                  VAI TRÒ HIỆN TẠI
                </span>
                <span
                  className={`font-bold text-[10px] px-2 py-0.5 rounded-md ${
                    isDesigner
                      ? 'bg-orange-50 text-orange-700 border border-orange-200/60'
                      : 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                  }`}
                >
                  {isDesigner ? 'Nhà thiết kế' : 'Khách hàng'}
                </span>
              </div>

              <button
                onClick={() => switchRole(isDesigner ? 'customer' : 'vendor')}
                className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold bg-[#0F766E] text-white hover:bg-[#115E59] transition-all active:scale-98 shadow-xs group"
              >
                <ArrowLeftRight className="w-3.5 h-3.5 text-white group-hover:rotate-180 transition-transform duration-300 stroke-[2]" />
                <span>
                  {isDesigner
                    ? 'Chuyển sang Emma (Khách hàng)'
                    : 'Chuyển sang Alex (Nhà thiết kế)'}
                </span>
              </button>
            </div>

            {/* User Card */}
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
              <div className="flex items-center gap-2.5 min-w-0">
                <img
                  src={currentUser.avatar}
                  alt={currentUser.name}
                  className="w-8 h-8 rounded-full object-cover border border-slate-200 shrink-0"
                />
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-900 truncate leading-tight">
                    {currentUser.name}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setCurrentView('login')}
                title="Đổi tài khoản / Đăng xuất"
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors"
              >
                <LogOut className="w-3.5 h-3.5 stroke-[1.75]" />
              </button>
            </div>

            {/* Brand Slogan Signature */}
            <div className="text-center pt-0.5">
              <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider">
                {isDesigner
                  ? 'Mọi thay đổi đều được lưu vết.'
                  : 'Phê duyệt chính xác. Đúng hẹn.'}
              </span>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
};
