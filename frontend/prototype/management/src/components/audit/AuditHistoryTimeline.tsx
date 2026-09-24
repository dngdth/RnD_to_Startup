import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { AuditLogItem } from '../../types';
import {
  Users,
  Search,
  CheckCircle2,
  Clock,
  Sparkles,
  GitPullRequest,
  GitBranch,
  ShieldCheck,
  Lock,
  MessageSquare,
  ArrowRight,
  ExternalLink,
  ChevronRight,
  Check,
  RotateCcw,
  SlidersHorizontal,
  ChevronLeft,
  Calendar,
  Building2,
} from 'lucide-react';

interface CustomerSummary {
  id: string;
  name: string;
  company: string;
  avatar: string;
  orders: string[];
  totalActivities: number;
  pendingCount: number;
  latestActivityTimestamp: string;
}

export const AuditHistoryTimeline: React.FC = () => {
  const {
    auditLogs,
    orders,
    setCurrentView,
    setSelectedOrderId,
    toggleAuditLogResolved,
    showToast,
    currentUser,
  } = useApp();

  const isCustomer = currentUser.role === 'customer';

  // Search & Filter States
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('cust-emma');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending'>('all');
  const [timelineSearchQuery, setTimelineSearchQuery] = useState('');
  const [isMobileViewingTimeline, setIsMobileViewingTimeline] = useState(false);

  // For customer role, always lock selectedCustomerId to their own account
  useEffect(() => {
    if (isCustomer) {
      setSelectedCustomerId('cust-emma');
    }
  }, [isCustomer]);

  // Group and extract customer list from orders and audit logs
  const customerList = useMemo<CustomerSummary[]>(() => {
    const map = new Map<string, CustomerSummary>();

    // Seed from orders
    orders.forEach((ord) => {
      const custId = ord.customerName === 'Emma Watson'
        ? 'cust-emma'
        : ord.customerName === 'Michael Chen'
        ? 'cust-michael'
        : ord.customerName === 'Sophia Lee'
        ? 'cust-sophia'
        : ord.customerName === 'David Nguyen'
        ? 'cust-david'
        : `cust-${ord.customerName.toLowerCase().replace(/\s+/g, '-')}`;

      if (!map.has(custId)) {
        map.set(custId, {
          id: custId,
          name: ord.customerName,
          company: ord.customerCompany,
          avatar:
            custId === 'cust-emma'
              ? 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
              : custId === 'cust-michael'
              ? 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80'
              : custId === 'cust-sophia'
              ? 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80'
              : 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
          orders: [],
          totalActivities: 0,
          pendingCount: 0,
          latestActivityTimestamp: '',
        });
      }
      const existing = map.get(custId)!;
      if (!existing.orders.includes(ord.orderNumber)) {
        existing.orders.push(ord.orderNumber);
      }
    });

    // Count activities and pending from auditLogs
    (auditLogs || []).forEach((log) => {
      const custId = log.customerId ||
        (log.customerName === 'Emma Watson' || log.userName === 'Emma Watson'
          ? 'cust-emma'
          : log.customerName === 'Michael Chen' || log.userName === 'Michael Chen'
          ? 'cust-michael'
          : log.customerName === 'Sophia Lee' || log.userName === 'Sophia Lee'
          ? 'cust-sophia'
          : log.customerName === 'David Nguyen' || log.userName === 'David Nguyen'
          ? 'cust-david'
          : 'cust-emma');

      if (map.has(custId)) {
        const c = map.get(custId)!;
        c.totalActivities += 1;
        if (log.status === 'pending' || (log.isActionable && log.status !== 'resolved')) {
          c.pendingCount += 1;
        }
        if (!c.latestActivityTimestamp) {
          c.latestActivityTimestamp = log.timestamp;
        }
      }
    });

    return Array.from(map.values());
  }, [orders, auditLogs]);

  // Filter customer list by search query (name, company, order code)
  const filteredCustomers = useMemo(() => {
    if (!customerSearchQuery.trim()) return customerList;
    const q = customerSearchQuery.toLowerCase().trim();
    return customerList.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.company.toLowerCase().includes(q) ||
        c.orders.some((o) => o.toLowerCase().includes(q))
    );
  }, [customerList, customerSearchQuery]);

  // Ensure an active customer is selected
  const activeCustomer = useMemo(() => {
    const found = customerList.find((c) => c.id === selectedCustomerId);
    return found || customerList[0] || null;
  }, [customerList, selectedCustomerId]);

  // Activity logs strictly for the active customer
  const customerLogs = useMemo(() => {
    if (!activeCustomer) return [];

    return (auditLogs || []).filter((log) => {
      const logCustId = log.customerId ||
        (log.customerName === 'Emma Watson' || log.userName === 'Emma Watson'
          ? 'cust-emma'
          : log.customerName === 'Michael Chen' || log.userName === 'Michael Chen'
          ? 'cust-michael'
          : log.customerName === 'Sophia Lee' || log.userName === 'Sophia Lee'
          ? 'cust-sophia'
          : log.customerName === 'David Nguyen' || log.userName === 'David Nguyen'
          ? 'cust-david'
          : 'cust-emma');

      return logCustId === activeCustomer.id;
    });
  }, [auditLogs, activeCustomer]);

  // Filtered customer logs by category, status, and timeline search
  const filteredTimelineLogs = useMemo(() => {
    return customerLogs.filter((log) => {
      // Category filter
      let matchesCategory = true;
      if (categoryFilter !== 'all') {
        if (categoryFilter === 'comment') {
          matchesCategory = log.category === 'comment' || log.badgeType === 'comment';
        } else if (categoryFilter === 'change_request') {
          matchesCategory = log.category === 'change_request' || log.crNumber !== undefined || log.action.includes('CR-');
        } else if (categoryFilter === 'approval') {
          matchesCategory = log.category === 'approval' || log.badgeType === 'approval' || log.action.includes('Phê duyệt');
        } else if (categoryFilter === 'version') {
          matchesCategory = log.category === 'version' || log.category === 'spec_update' || log.badgeType === 'update';
        } else if (categoryFilter === 'ai') {
          matchesCategory = log.category === 'ai_summary' || log.badgeType === 'ai';
        }
      }

      // Status filter (all vs pending)
      let matchesStatus = true;
      if (statusFilter === 'pending') {
        matchesStatus = log.status === 'pending' || (log.isActionable && log.status !== 'resolved');
      }

      // Timeline text search
      let matchesSearch = true;
      if (timelineSearchQuery.trim()) {
        const q = timelineSearchQuery.toLowerCase().trim();
        matchesSearch =
          log.action.toLowerCase().includes(q) ||
          log.details.toLowerCase().includes(q) ||
          log.userName.toLowerCase().includes(q) ||
          (log.orderId ? log.orderId.toLowerCase().includes(q) : false) ||
          (log.crNumber ? log.crNumber.toLowerCase().includes(q) : false);
      }

      return matchesCategory && matchesStatus && matchesSearch;
    });
  }, [customerLogs, categoryFilter, statusFilter, timelineSearchQuery]);

  // Stats for the active customer
  const activeCustomerPendingCount = useMemo(() => {
    return customerLogs.filter(
      (log) => log.status === 'pending' || (log.isActionable && log.status !== 'resolved')
    ).length;
  }, [customerLogs]);

  // Helper for activity icon and badge styling
  const getActivityMeta = (log: AuditLogItem) => {
    if (log.badgeType === 'ai' || log.category === 'ai_summary') {
      return {
        icon: <Sparkles className="w-3.5 h-3.5 text-amber-600" />,
        badgeLabel: 'AI Summary',
        badgeBg: 'bg-amber-50 text-amber-800 border-amber-200/70',
        dotBorder: 'border-amber-400 bg-amber-50',
      };
    }
    if (log.badgeType === 'approval' || log.category === 'approval') {
      return {
        icon: <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />,
        badgeLabel: 'Phê duyệt',
        badgeBg: 'bg-emerald-50 text-emerald-800 border-emerald-200/70',
        dotBorder: 'border-emerald-400 bg-emerald-50',
      };
    }
    if (log.badgeType === 'lock' || log.category === 'production_lock') {
      return {
        icon: <Lock className="w-3.5 h-3.5 text-indigo-600" />,
        badgeLabel: 'Khóa sản xuất',
        badgeBg: 'bg-indigo-50 text-indigo-800 border-indigo-200/70',
        dotBorder: 'border-indigo-400 bg-indigo-50',
      };
    }
    if (log.badgeType === 'comment' || log.category === 'comment') {
      return {
        icon: <MessageSquare className="w-3.5 h-3.5 text-sky-600" />,
        badgeLabel: 'Bình luận',
        badgeBg: 'bg-sky-50 text-sky-800 border-sky-200/70',
        dotBorder: 'border-sky-400 bg-sky-50',
      };
    }
    if (log.category === 'change_request' || log.crNumber) {
      return {
        icon: <GitPullRequest className="w-3.5 h-3.5 text-rose-600" />,
        badgeLabel: log.crNumber || 'Change Request',
        badgeBg: 'bg-rose-50 text-rose-800 border-rose-200/70',
        dotBorder: 'border-rose-400 bg-rose-50',
      };
    }
    if (log.category === 'version') {
      return {
        icon: <GitBranch className="w-3.5 h-3.5 text-purple-600" />,
        badgeLabel: log.relatedVersion || 'Phiên bản mới',
        badgeBg: 'bg-purple-50 text-purple-800 border-purple-200/70',
        dotBorder: 'border-purple-400 bg-purple-50',
      };
    }
    return {
      icon: <Clock className="w-3.5 h-3.5 text-slate-600" />,
      badgeLabel: 'Cập nhật',
      badgeBg: 'bg-slate-100 text-slate-700 border-slate-200',
      dotBorder: 'border-slate-300 bg-slate-50',
    };
  };

  const handleNavigateToOrder = (orderId?: string) => {
    if (orderId) {
      const match = orders.find((o) => o.orderNumber === orderId || o.id === orderId);
      if (match) {
        setSelectedOrderId(match.id);
      }
    }
    setCurrentView('order_workspace');
  };

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-4rem)] overflow-hidden bg-slate-50/50">
      {/* Top Banner / Breadcrumb */}
      <div className="shrink-0 px-4 sm:px-6 py-3.5 bg-white border-b border-slate-200/80 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Mobile Back Button when viewing timeline in vendor mode */}
          {!isCustomer && isMobileViewingTimeline && (
            <button
              onClick={() => setIsMobileViewingTimeline(false)}
              className="lg:hidden p-1.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 transition-colors"
              title="Quay lại danh sách khách hàng"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                {isCustomer ? 'Lịch sử của đơn hàng' : 'Lịch sử hoạt động'}
              </h1>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200/60">
                {isCustomer ? `Đơn hàng #${activeCustomer?.orders[0] || '—'}` : 'Theo khách hàng'}
              </span>
            </div>
            <p className="text-xs text-slate-500 hidden sm:block">
              {isCustomer
                ? 'Lưu vết toàn bộ quá trình trao đổi, yêu cầu chỉnh sửa thông số và chữ ký phê duyệt.'
                : 'Quản lý chi tiết từng bình luận, yêu cầu chỉnh sửa và mốc phát hành theo từng khách hàng.'}
            </p>
          </div>
        </div>

        {/* Global Pending Quick Summary */}
        <div className="flex items-center gap-2 text-xs">
          {isCustomer ? (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-emerald-50 border border-emerald-200/60 text-emerald-800 font-bold">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Hồ sơ bảo chứng · Bất biến</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-orange-50 border border-orange-200/60 text-orange-800 font-bold">
              <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
              <span>
                {customerList.reduce((acc, c) => acc + c.pendingCount, 0)} việc cần xử lý
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Main 2-Panel Layout (Vendor: Split-pane, Customer: Full-width single view) */}
      <div className="flex-1 flex overflow-hidden">
        {/* ========================================================================= */}
        {/* LEFT PANEL: Danh sách khách hàng (CHỈ DÀNH CHO VENDOR)                     */}
        {/* ========================================================================= */}
        {!isCustomer && (
        <div
          className={`${
            isMobileViewingTimeline ? 'hidden lg:flex' : 'flex'
          } w-full lg:w-80 xl:w-88 shrink-0 bg-white border-r border-slate-200/80 flex-col h-full`}
        >
          {/* Left Panel Header */}
          <div className="p-3.5 border-b border-slate-100 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-slate-600" />
                <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Khách hàng ({filteredCustomers.length})
                </span>
              </div>
            </div>

            {/* Customer Search Box */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={customerSearchQuery}
                onChange={(e) => setCustomerSearchQuery(e.target.value)}
                placeholder="Tìm khách hàng, công ty, mã đơn..."
                className="w-full text-xs pl-8 pr-3 py-2 rounded-xl border border-slate-200 bg-slate-50/70 focus:bg-white focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all text-slate-900 placeholder:text-slate-400"
              />
            </div>
          </div>

          {/* Customer List Scrollable */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1.5 divide-y divide-slate-100/50">
            {filteredCustomers.length === 0 ? (
              <div className="py-12 px-4 text-center">
                <p className="text-xs text-slate-500 font-medium">Không tìm thấy khách hàng</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Thử tìm theo từ khóa khác</p>
              </div>
            ) : (
              filteredCustomers.map((customer) => {
                const isSelected = activeCustomer?.id === customer.id;

                return (
                  <button
                    key={customer.id}
                    onClick={() => {
                      setSelectedCustomerId(customer.id);
                      setIsMobileViewingTimeline(true);
                    }}
                    className={`w-full text-left p-3 rounded-2xl transition-all group flex flex-col gap-2 relative ${
                      isSelected
                        ? 'bg-slate-900 text-white shadow-xs border border-slate-800'
                        : 'bg-white hover:bg-slate-50 text-slate-900 border border-transparent hover:border-slate-200/80'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2.5">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <img
                          src={customer.avatar}
                          alt={customer.name}
                          className={`w-9 h-9 rounded-xl object-cover shrink-0 border ${
                            isSelected ? 'border-slate-700' : 'border-slate-200'
                          }`}
                        />
                        <div className="min-w-0">
                          <h3
                            className={`text-xs font-extrabold truncate ${
                              isSelected ? 'text-white' : 'text-slate-900'
                            }`}
                          >
                            {customer.name}
                          </h3>
                          <p
                            className={`text-[11px] font-medium truncate ${
                              isSelected ? 'text-slate-300' : 'text-slate-500'
                            }`}
                          >
                            {customer.company}
                          </p>
                        </div>
                      </div>

                      <ChevronRight
                        className={`w-4 h-4 shrink-0 transition-transform ${
                          isSelected
                            ? 'text-orange-400 translate-x-0.5'
                            : 'text-slate-300 group-hover:text-slate-500'
                        }`}
                      />
                    </div>

                    {/* Orders and Activity Badges */}
                    <div className="flex items-center justify-between gap-1.5 pt-1 border-t border-slate-100/10">
                      {/* Orders chips */}
                      <div className="flex flex-wrap items-center gap-1">
                        {customer.orders.slice(0, 2).map((ord) => (
                          <span
                            key={ord}
                            className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-md ${
                              isSelected
                                ? 'bg-slate-800 text-slate-300 border border-slate-700'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            #{ord}
                          </span>
                        ))}
                        {customer.orders.length > 2 && (
                          <span
                            className={`text-[9px] font-bold px-1 py-0.2 rounded ${
                              isSelected ? 'text-slate-400' : 'text-slate-500'
                            }`}
                          >
                            +{customer.orders.length - 2}
                          </span>
                        )}
                      </div>

                      {/* Status / Pending badge */}
                      {customer.pendingCount > 0 ? (
                        <span
                          className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            isSelected
                              ? 'bg-orange-500/25 text-orange-300 border border-orange-500/40'
                              : 'bg-orange-50 text-orange-700 border border-orange-200'
                          }`}
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse shrink-0" />
                          <span>{customer.pendingCount} việc mới</span>
                        </span>
                      ) : (
                        <span
                          className={`text-[10px] font-medium ${
                            isSelected ? 'text-slate-400' : 'text-slate-400'
                          }`}
                        >
                          {customer.totalActivities} sự kiện
                        </span>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
        )}

        {/* ========================================================================= */}
        {/* RIGHT CONTENT: Timeline hoạt động                                        */}
        {/* ========================================================================= */}
        <div
          className={`${
            !isCustomer && !isMobileViewingTimeline ? 'hidden lg:flex' : 'flex'
          } flex-1 flex-col h-full overflow-hidden bg-slate-50/40`}
        >
          {activeCustomer ? (
            <>
              {/* Selected Customer Header Banner */}
              <div className="shrink-0 p-4 sm:p-5 bg-white border-b border-slate-200/80">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3.5">
                    <img
                      src={activeCustomer.avatar}
                      alt={activeCustomer.name}
                      className="w-12 h-12 rounded-2xl object-cover border-2 border-white shadow-xs shrink-0 ring-1 ring-slate-200"
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                          {activeCustomer.name}
                        </h2>
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 flex items-center gap-1">
                          <Building2 className="w-3 h-3 text-slate-500" />
                          {activeCustomer.company}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        <span className="text-xs text-slate-500">Đơn hàng phụ trách:</span>
                        {activeCustomer.orders.map((ord) => (
                          <button
                            key={ord}
                            onClick={() => handleNavigateToOrder(ord)}
                            className="inline-flex items-center gap-1 text-[11px] font-mono font-bold px-2 py-0.5 rounded-lg bg-orange-50 text-orange-800 border border-orange-200/60 hover:bg-orange-100 transition-colors"
                            title={`Mở đơn hàng #${ord}`}
                          >
                            <span>#{ord}</span>
                            <ExternalLink className="w-2.5 h-2.5" />
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Summary Metric Pills */}
                  <div className="flex items-center gap-2 self-start sm:self-center">
                    <div className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200/70 text-center">
                      <div className="text-sm font-extrabold text-slate-900">
                        {customerLogs.length}
                      </div>
                      <div className="text-[10px] font-semibold text-slate-400 uppercase">
                        Sự kiện
                      </div>
                    </div>

                    <div
                      className={`px-3 py-1.5 rounded-xl border text-center ${
                        activeCustomerPendingCount > 0
                          ? 'bg-orange-50 border-orange-200 text-orange-900'
                          : 'bg-emerald-50 border-emerald-200 text-emerald-900'
                      }`}
                    >
                      <div className="text-sm font-extrabold">
                        {activeCustomerPendingCount}
                      </div>
                      <div className="text-[10px] font-semibold uppercase">
                        {activeCustomerPendingCount > 0 ? 'Chưa xử lý' : 'Đã hoàn tất'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Filter and Search Toolbar */}
                <div className="mt-4 pt-3.5 border-t border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-2.5">
                  {/* Category Filter Tabs */}
                  <div className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
                    {[
                      { id: 'all', label: 'Tất cả' },
                      { id: 'comment', label: 'Comment' },
                      { id: 'change_request', label: 'Change Request' },
                      { id: 'approval', label: 'Approval' },
                      { id: 'version', label: 'Version' },
                    ].map((tab) => {
                      const isActive = categoryFilter === tab.id;
                      return (
                        <button
                          key={tab.id}
                          onClick={() => setCategoryFilter(tab.id)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                            isActive
                              ? 'bg-slate-900 text-white shadow-2xs'
                              : 'bg-slate-100/80 text-slate-600 hover:bg-slate-200/70 hover:text-slate-900'
                          }`}
                        >
                          {tab.label}
                        </button>
                      );
                    })}

                    <div className="h-4 w-px bg-slate-200 mx-1 shrink-0" />

                    {/* Status Filter: [ Tất cả ] [ Chưa xử lý ] */}
                    <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-xl shrink-0">
                      <button
                        onClick={() => setStatusFilter('all')}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                          statusFilter === 'all'
                            ? 'bg-white text-slate-900 shadow-2xs'
                            : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        Tất cả
                      </button>
                      <button
                        onClick={() => setStatusFilter('pending')}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                          statusFilter === 'pending'
                            ? 'bg-orange-500 text-white shadow-2xs'
                            : 'text-orange-700 hover:text-orange-900'
                        }`}
                      >
                        <span>Chưa xử lý</span>
                        {activeCustomerPendingCount > 0 && (
                          <span
                            className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${
                              statusFilter === 'pending'
                                ? 'bg-white/30 text-white'
                                : 'bg-orange-100 text-orange-800'
                            }`}
                          >
                            {activeCustomerPendingCount}
                          </span>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Local Timeline Search */}
                  <div className="relative min-w-[200px] md:w-60">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      value={timelineSearchQuery}
                      onChange={(e) => setTimelineSearchQuery(e.target.value)}
                      placeholder="Tìm trong timeline..."
                      className="w-full text-xs pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-orange-500 text-slate-800 transition-all placeholder:text-slate-400"
                    />
                  </div>
                </div>
              </div>

              {/* Scrollable Timeline Stream */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
                {filteredTimelineLogs.length === 0 ? (
                  <div className="py-16 text-center max-w-sm mx-auto">
                    <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
                      <SlidersHorizontal className="w-6 h-6" />
                    </div>
                    <h3 className="text-sm font-bold text-slate-800">
                      Không có sự kiện phù hợp bộ lọc
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">
                      Thử chuyển sang tab "Tất cả" hoặc xóa từ khóa tìm kiếm để xem toàn bộ lịch sử.
                    </p>
                    <button
                      onClick={() => {
                        setCategoryFilter('all');
                        setStatusFilter('all');
                        setTimelineSearchQuery('');
                      }}
                      className="mt-3 px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-900 text-white hover:bg-slate-800 transition-colors"
                    >
                      Đặt lại bộ lọc
                    </button>
                  </div>
                ) : (
                  <div className="max-w-3xl mx-auto">
                    {/* Vertical Timeline Track */}
                    <div className="relative pl-6 sm:pl-8 border-l-2 border-slate-200 space-y-5 ml-3 sm:ml-4 my-2">
                      {filteredTimelineLogs.map((log) => {
                        const meta = getActivityMeta(log);
                        const isPending =
                          log.status === 'pending' || (log.isActionable && log.status !== 'resolved');
                        const isResolved = log.status === 'resolved';

                        return (
                          <div key={log.id} className="relative group">
                            {/* Timeline Node Dot */}
                            <div
                              className={`absolute -left-[35px] sm:-left-[43px] top-2.5 w-8 h-8 rounded-full border-2 flex items-center justify-center shadow-2xs transition-all ${
                                isPending
                                  ? 'bg-amber-50 border-amber-400 ring-4 ring-amber-100/80 scale-105'
                                  : isResolved
                                  ? 'bg-emerald-50 border-emerald-300'
                                  : meta.dotBorder
                              }`}
                            >
                              {isPending ? (
                                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
                              ) : isResolved ? (
                                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                              ) : (
                                meta.icon
                              )}
                            </div>

                            {/* Timeline Card */}
                            <div
                              className={`p-4 sm:p-5 rounded-2xl border transition-all duration-150 ${
                                isPending
                                  ? 'bg-white border-amber-300/90 shadow-[0_4px_20px_-4px_rgba(245,158,11,0.15)] ring-1 ring-amber-200/60'
                                  : isResolved
                                  ? 'bg-slate-50/70 border-slate-200/70 opacity-85 hover:opacity-100'
                                  : 'bg-white border-slate-200/80 shadow-2xs hover:border-slate-300'
                              }`}
                            >
                              {/* Header Row: User Info + Timestamp + Status Badge */}
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 mb-2">
                                <div className="flex items-center gap-2 min-w-0">
                                  <img
                                    src={log.userAvatar}
                                    alt={log.userName}
                                    className="w-6 h-6 rounded-full object-cover border border-slate-200 shrink-0"
                                  />
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span
                                      className={`text-xs font-extrabold ${
                                        isPending ? 'text-slate-950' : 'text-slate-800'
                                      }`}
                                    >
                                      {log.userName}
                                    </span>
                                    <span className="text-[11px] text-slate-400 font-medium">·</span>
                                    <span
                                      className={`text-xs font-bold ${
                                        isPending ? 'text-orange-950 font-black' : 'text-slate-700'
                                      }`}
                                    >
                                      {log.action}
                                    </span>
                                  </div>
                                </div>

                                <div className="flex items-center gap-2 shrink-0">
                                  <span className="text-[11px] font-mono text-slate-400 font-medium">
                                    {log.timestamp}
                                  </span>

                                  {/* Item Status Badge */}
                                  {isPending && (
                                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1 shadow-2xs">
                                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
                                      Chưa xử lý
                                    </span>
                                  )}

                                  {isResolved && (
                                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200/70 flex items-center gap-1">
                                      <Check className="w-3 h-3 text-emerald-600 stroke-[2.5]" />
                                      Đã xử lý
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Action Details Body */}
                              <div
                                className={`text-xs leading-relaxed my-2 pl-8 border-l-2 ${
                                  isPending
                                    ? 'border-amber-300 text-slate-900 font-medium'
                                    : 'border-slate-200/60 text-slate-600'
                                }`}
                              >
                                {log.details}
                              </div>

                              {/* Footer Meta + Quick Action Buttons */}
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-2.5 mt-2 border-t border-slate-100 text-[11px]">
                                {/* Metadata badges (Order, Version, Category) */}
                                <div className="flex flex-wrap items-center gap-1.5">
                                  {log.orderId && (
                                    <span className="font-mono font-bold text-orange-800 bg-orange-50 border border-orange-200/60 px-2 py-0.5 rounded-md">
                                      #{log.orderId}
                                    </span>
                                  )}

                                  {log.relatedVersion && (
                                    <span className="font-mono font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">
                                      {log.relatedVersion}
                                    </span>
                                  )}

                                  <span
                                    className={`px-2 py-0.5 rounded-md font-semibold border ${meta.badgeBg}`}
                                  >
                                    {meta.badgeLabel}
                                  </span>
                                </div>

                                {/* Action Buttons for Pending / Resolved items */}
                                <div className="flex items-center gap-2 self-end sm:self-auto">
                                  {!isCustomer && log.isActionable && (
                                    <button
                                      onClick={() => {
                                        toggleAuditLogResolved(log.id);
                                        showToast(
                                          isPending
                                            ? `Đã đánh dấu "${log.action}" là Đã xử lý`
                                            : `Đã mở lại trạng thái Chưa xử lý`,
                                          'success'
                                        );
                                      }}
                                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                                        isPending
                                          ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-2xs'
                                          : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                                      }`}
                                      title={isPending ? 'Đánh dấu là đã xử lý' : 'Đánh dấu chưa xử lý'}
                                    >
                                      {isPending ? (
                                        <>
                                          <Check className="w-3 h-3 stroke-[2.5]" />
                                          <span>Đánh dấu đã xử lý</span>
                                        </>
                                      ) : (
                                        <>
                                          <RotateCcw className="w-3 h-3" />
                                          <span>Mở lại</span>
                                        </>
                                      )}
                                    </button>
                                  )}

                                  {/* Deep link button to order workspace */}
                                  <button
                                    onClick={() => handleNavigateToOrder(log.orderId)}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold text-slate-600 hover:text-slate-950 hover:bg-slate-100 transition-colors"
                                  >
                                    <span>Xem đơn hàng</span>
                                    <ArrowRight className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center p-8 text-center text-slate-400">
              <p className="text-xs">Vui lòng chọn một khách hàng từ danh sách bên trái.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
