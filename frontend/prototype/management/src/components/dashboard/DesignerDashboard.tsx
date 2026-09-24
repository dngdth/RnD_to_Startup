import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Order } from '../../types';
import { DesignerOrderCard } from './DesignerOrderCard';
import { TodaysTasksPanel, TodayTaskItem } from './TodaysTasksPanel';
import { DesignerActionModals } from './DesignerActionModals';
import { QuickResourcesWidget } from './QuickResourcesWidget';
import {
  Package,
  Clock,
  CheckCircle2,
  AlertCircle,
  Plus,
  Sparkles,
  Search,
  Filter,
  Layers,
  ArrowRight,
  TrendingUp,
  SlidersHorizontal,
  Flame,
  UserCheck,
  MessageSquare,
  ChevronDown,
  Check,
  X,
} from 'lucide-react';

export type MyWorkTab = 'assigned_to_me' | 'in_progress' | 'waiting_for_customer' | 'completed';

export const DesignerDashboard: React.FC = () => {
  const {
    orders,
    workspaces,
    currentUser,
    setSelectedOrderId,
    setSelectedVersion,
    setCurrentView,
    openDiffModal,
    openNewCRModal,
    setIsChangeRequestDetailOpen,
    showToast,
  } = useApp();

  // Active sub-tab in "My Work"
  const [activeTab, setActiveTab] = useState<MyWorkTab>('assigned_to_me');
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<'ALL' | 'URGENT' | 'HIGH' | 'MEDIUM' | 'LOW'>('ALL');
  const [isPriorityDropdownOpen, setIsPriorityDropdownOpen] = useState(false);
  const [isWorkDropdownOpen, setIsWorkDropdownOpen] = useState(false);

  // Modal actions
  const [actionModal, setActionModal] = useState<'upload' | 'edit_spec' | 'create_version' | 'send_review' | 'respond_cr' | null>(null);
  const [modalTargetOrder, setModalTargetOrder] = useState<Order | null>(null);

  // Today's Tasks list state
  const [todayTasks, setTodayTasks] = useState<TodayTaskItem[]>([
    {
      id: 'task-1',
      title: 'Tải lên bản phối cảnh sửa đổi',
      category: 'CAD 3D & Vị trí vector',
      orderId: 'order-1024',
      orderNumber: 'PP-1024',
      actionType: 'upload',
      completed: false,
      dueTime: 'Hôm nay, 14:00',
      priority: 'HIGH',
    },
    {
      id: 'task-2',
      title: 'Xem xét CR-018',
      category: 'Điều chỉnh thông số nhuộm chuyển màu Dip-dye',
      orderId: 'order-1015',
      orderNumber: 'PP-1015',
      actionType: 'review_cr',
      completed: false,
      dueTime: 'Hôm nay, 15:30',
      priority: 'URGENT',
    },
    {
      id: 'task-3',
      title: 'Cập nhật kích thước sản phẩm',
      category: 'Kích thước logo sau lưng & khoảng cách hạ mũ',
      orderId: 'order-1024',
      orderNumber: 'PP-1024',
      actionType: 'update_dim',
      completed: true,
      dueTime: 'Hoàn thành lúc 10:15',
      priority: 'MEDIUM',
    },
    {
      id: 'task-4',
      title: 'Phát hành Phiên bản 04',
      category: 'Phát hành hồ sơ kỹ thuật đã được phê duyệt',
      orderId: 'order-1024',
      orderNumber: 'PP-1024',
      actionType: 'publish_ver',
      completed: false,
      dueTime: 'Hôm nay, 17:00',
      priority: 'HIGH',
    },
  ]);

  const safeOrders = orders || [];

  // Categorize orders for the tabs
  const assignedToMeOrders = safeOrders.filter(
    (o) => !o.assignedTo || o.assignedTo === currentUser.name || o.assignedTo === 'Alex Rivera'
  );

  const inProgressOrders = safeOrders.filter(
    (o) => o.status === 'CHANGE_REQUESTED' || o.status === 'DRAFT'
  );

  const waitingForCustomerOrders = safeOrders.filter(
    (o) => o.status === 'IN_REVIEW'
  );

  const completedOrders = safeOrders.filter(
    (o) => o.status === 'APPROVED' || o.status === 'LOCKED_FOR_PRODUCTION'
  );

  const workTabOptions = [
    {
      id: 'assigned_to_me' as const,
      label: 'Phân công cho tôi',
      count: assignedToMeOrders.length,
      icon: UserCheck,
    },
    {
      id: 'in_progress' as const,
      label: 'Đang xử lý',
      count: inProgressOrders.length,
      icon: Clock,
    },
    {
      id: 'waiting_for_customer' as const,
      label: 'Chờ khách phản hồi',
      count: waitingForCustomerOrders.length,
      icon: MessageSquare,
    },
    {
      id: 'completed' as const,
      label: 'Hoàn thành',
      count: completedOrders.length,
      icon: CheckCircle2,
    },
  ];

  const currentWorkTab = workTabOptions.find((t) => t.id === activeTab) || workTabOptions[0];

  // Get current active tab list
  const getTabOrders = () => {
    switch (activeTab) {
      case 'assigned_to_me':
        return assignedToMeOrders;
      case 'in_progress':
        return inProgressOrders;
      case 'waiting_for_customer':
        return waitingForCustomerOrders;
      case 'completed':
        return completedOrders;
    }
  };

  // Filter tab orders by search and priority
  const filteredOrders = getTabOrders().filter((ord) => {
    const matchesSearch =
      ord.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ord.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ord.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ord.customerCompany.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesPriority =
      priorityFilter === 'ALL' ? true : ord.priority === priorityFilter;

    return matchesSearch && matchesPriority;
  });

  // Action handlers
  const handleOpenWorkspace = (orderId: string) => {
    setSelectedOrderId(orderId);
    setCurrentView('order_workspace');
  };

  const handleEditSpec = (order: Order) => {
    setModalTargetOrder(order);
    setActionModal('edit_spec');
  };

  const handleUploadDesign = (order: Order) => {
    setModalTargetOrder(order);
    setActionModal('upload');
  };

  const handleRespondCR = (order: Order) => {
    setModalTargetOrder(order);
    setActionModal('respond_cr');
  };

  const handleCreateVersion = (order: Order) => {
    setModalTargetOrder(order);
    setActionModal('create_version');
  };

  const handleCompareVersions = (order: Order) => {
    setSelectedOrderId(order.id);
    setSelectedVersion(order.currentVersion);
    openDiffModal();
  };

  const handleSendForReview = (order: Order) => {
    setModalTargetOrder(order);
    setActionModal('send_review');
  };

  const handleToggleTask = (taskId: string) => {
    setTodayTasks((prev) =>
      prev.map((t) => {
        if (t.id === taskId) {
          const newState = !t.completed;
          showToast(
            newState ? `Đã hoàn thành: ${t.title}` : `Mở lại công việc: ${t.title}`,
            newState ? 'success' : 'info'
          );
          return { ...t, completed: newState };
        }
        return t;
      })
    );
  };

  const handleExecuteTaskAction = (task: TodayTaskItem) => {
    const target = safeOrders.find((o) => o.id === task.orderId) || safeOrders[0];
    setModalTargetOrder(target);

    switch (task.actionType) {
      case 'upload':
        setActionModal('upload');
        break;
      case 'review_cr':
        setActionModal('respond_cr');
        break;
      case 'update_dim':
        setActionModal('edit_spec');
        break;
      case 'publish_ver':
        setActionModal('create_version');
        break;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/60 pb-16">
      {/* Top Banner with soft Peach / Warm Orange tint */}
      <div className="bg-gradient-to-b from-orange-50/50 via-amber-50/15 to-slate-50/60 border-b border-slate-200/80 px-4 sm:px-6 lg:px-8 pt-6 pb-5">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              {/* Badge cam */}
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-orange-700 bg-orange-100/90 px-2.5 py-0.5 rounded-full border border-orange-200/80 shadow-2xs">
                  Không gian thiết kế & Xưởng sản xuất
                </span>
              </div>

              {/* Tiêu đề chính lớn, thoáng đãng không kèm mô tả thừa */}
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                Hàng đợi sản xuất & Xử lý đơn hàng
              </h1>
            </div>
          </div>

          {/* Step 12 Prominent Banner: New Change Request from Emma (High-Contrast Redesign) */}
          {safeOrders.some(
            (o) =>
              o.id === 'order-1024' &&
              (o.status === 'CHANGE_REQUESTED' || o.changeRequests.some((cr) => cr.crNumber === 'CR-111'))
          ) && (
            <div className="mt-5 p-5 sm:p-6 rounded-2xl bg-gradient-to-r from-orange-500 via-rose-500 to-amber-500 text-white shadow-xl shadow-orange-500/25 border border-white/20 animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
                {/* Left Content Area (Constrained to prevent over-stretching) */}
                <div className="flex items-start gap-3.5 sm:gap-4 min-w-0 max-w-3xl">
                  <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-white/20 backdrop-blur-md text-white flex items-center justify-center shrink-0 border border-white/30 shadow-inner mt-0.5">
                    <AlertCircle className="w-5 h-5 sm:w-5.5 sm:h-5.5 stroke-[2.5] text-white" />
                  </div>

                  <div className="space-y-2 min-w-0 flex-1">
                    {/* 1. Badge Khẩn cấp */}
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[10px] font-black uppercase tracking-widest bg-white text-rose-600 px-2.5 py-0.5 rounded-md shadow-2xs">
                        KHẨN CẤP
                      </span>
                    </div>

                    {/* 2. Primary Title: Tên sản phẩm hiển thị lớn, rõ nét */}
                    <h3 className="text-lg sm:text-2xl font-black text-white tracking-tight leading-snug">
                      {safeOrders.find((o) => o.id === 'order-1024')?.productName ||
                        'Áo Hoodie dáng rộng vải nỉ dày cao cấp'}
                    </h3>

                    {/* 3. Translucent Quote Box (High Contrast Readability) */}
                    <div className="bg-white/15 backdrop-blur-md border border-white/25 rounded-xl px-3.5 py-2.5 shadow-xs">
                      <p className="text-xs sm:text-[13px] font-medium text-white leading-relaxed">
                        <span className="font-bold text-white/90">"</span>
                        Thêm chữ thêu chìm cùng tông màu ở cổ tay áo bên trái theo mã Pantone 11-0601 TCX, và kiểm tra khoảng cách an toàn khi hạ mũ áo.
                        <span className="font-bold text-white/90">"</span>
                      </p>
                    </div>
                  </div>
                </div>

                {/* Right CTA Button Area */}
                <div className="flex items-center gap-3 shrink-0 lg:self-center pl-13.5 sm:pl-15 lg:pl-0">
                  <button
                    onClick={() => {
                      setSelectedOrderId('order-1024');
                      setIsChangeRequestDetailOpen(true);
                    }}
                    className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-white hover:bg-slate-100 text-slate-900 text-xs sm:text-sm font-black shadow-lg shadow-black/15 flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer hover:shadow-xl"
                  >
                    <span>Mở yêu cầu chỉnh sửa</span>
                    <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
            <div className="p-3.5 rounded-2xl bg-white/90 border border-orange-200/60 shadow-2xs flex items-center justify-between">
              <div>
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                  Phân công cho tôi
                </span>
                <span className="text-2xl font-black text-slate-900">
                  {assignedToMeOrders.length}
                </span>
              </div>
              <div className="w-8 h-8 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center border border-orange-100">
                <UserCheck className="w-4 h-4" />
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-white/90 border border-slate-200/70 shadow-2xs flex items-center justify-between">
              <div>
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                  Đang xử lý
                </span>
                <span className="text-2xl font-black text-slate-900">
                  {inProgressOrders.length}
                </span>
              </div>
              <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-100">
                <AlertCircle className="w-4 h-4" />
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-white/90 border border-slate-200/70 shadow-2xs flex items-center justify-between">
              <div>
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                  Chờ khách hàng phản hồi
                </span>
                <span className="text-2xl font-black text-slate-900">
                  {waitingForCustomerOrders.length}
                </span>
              </div>
              <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100">
                <Clock className="w-4 h-4" />
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-white/90 border border-slate-200/70 shadow-2xs flex items-center justify-between">
              <div>
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                  Hoàn thành / Đã khóa
                </span>
                <span className="text-2xl font-black text-slate-900">
                  {completedOrders.length}
                </span>
              </div>
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Layout */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          {/* LEFT 2 COLUMNS: "My Work" Section with Tabs and Order Cards */}
          <section className="lg:col-span-2 space-y-6">
            {/* My Work Section Header & Tab Controls */}
            <div
              className="rounded-2xl border border-slate-200/80 shadow-2xs p-4 sm:p-5 space-y-4"
              style={{ backgroundColor: '#ccf1d2' }}
            >
              {/* Tiêu đề Việc của tôi được thể hiện rõ ràng ở giữa */}
              <div className="text-center pb-3 border-b border-slate-100">
                <h2
                  className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight"
                  style={{ fontFamily: 'system-ui' }}
                >
                  Việc của tôi
                </h2>
              </div>

              {/* Bố cục 3 bộ điều khiển: Dropdown Công việc + Thanh tìm kiếm + Dropdown Mức độ ưu tiên */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3.5 items-end pt-0.5">
                {/* 1. Dropdown Công việc (Chiếm 4 cột trên desktop) */}
                <div className="sm:col-span-1 lg:col-span-4 relative">
                  <label
                    className="text-[11px] font-bold uppercase tracking-wider block mb-1.5"
                    style={{ color: '#106024', borderColor: '#0b5b16' }}
                  >
                    Công việc
                  </label>
                  <button
                    onClick={() => {
                      setIsWorkDropdownOpen(!isWorkDropdownOpen);
                      setIsPriorityDropdownOpen(false);
                    }}
                    className="w-full px-3.5 py-2.5 rounded-xl text-xs font-semibold border flex items-center justify-between gap-2 transition-all cursor-pointer shadow-2xs bg-white border-slate-200/80 text-slate-800 hover:bg-slate-50 focus:outline-hidden focus:ring-2 focus:ring-orange-500/20"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <currentWorkTab.icon
                        className="w-4 h-4 stroke-[2.2] shrink-0"
                        style={{ color: '#0b5b16' }}
                      />
                      <span className="font-bold truncate text-slate-800">{currentWorkTab.label}</span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span
                        className="text-[11px] px-2 py-0.5 rounded-full font-mono font-bold leading-none"
                        style={{ color: '#0b5b16', backgroundColor: '#e4f0e2' }}
                      >
                        {currentWorkTab.count}
                      </span>
                      <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${isWorkDropdownOpen ? 'rotate-180' : ''}`} />
                    </div>
                  </button>

                  {/* Dropdown Menu Công việc */}
                  {isWorkDropdownOpen && (
                    <>
                      <div
                        className="fixed inset-0 z-20"
                        onClick={() => setIsWorkDropdownOpen(false)}
                      />
                      <div className="absolute left-0 right-0 sm:w-64 mt-1.5 rounded-xl bg-white border border-slate-200 shadow-xl py-1.5 z-30 animate-in fade-in zoom-in-95 duration-150">
                        <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                          Chọn phân loại công việc
                        </div>
                        {workTabOptions.map((tab) => {
                          const Icon = tab.icon;
                          const isSelected = activeTab === tab.id;
                          return (
                            <button
                              key={tab.id}
                              onClick={() => {
                                setActiveTab(tab.id);
                                setIsWorkDropdownOpen(false);
                              }}
                              className={`w-full text-left px-3 py-2.5 text-xs flex items-center justify-between transition-colors cursor-pointer ${
                                isSelected
                                  ? 'bg-orange-50 text-orange-700 font-bold'
                                  : 'text-slate-700 hover:bg-slate-50'
                              }`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <Icon className={`w-4 h-4 shrink-0 ${isSelected ? 'text-orange-600 stroke-[2.5]' : 'text-slate-400'}`} />
                                <span className="truncate">{tab.label}</span>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                                  isSelected ? 'bg-orange-100 text-orange-700' : 'bg-slate-100 text-slate-600'
                                }`}>
                                  {tab.count}
                                </span>
                                {isSelected && <Check className="w-3.5 h-3.5 text-orange-600 stroke-[2.5]" />}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>

                {/* 2. Thanh tìm kiếm đơn hàng (Chiếm 5 cột trên desktop) */}
                <div className="sm:col-span-1 lg:col-span-5 relative">
                  <label
                    className="text-[11px] font-bold uppercase tracking-wider block mb-1.5"
                    style={{ color: '#0b5b16' }}
                  >
                    Tìm kiếm đơn hàng
                  </label>
                  <div className="relative w-full">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Tìm theo mã, tên sản phẩm, khách hàng..."
                      className="w-full text-xs pl-8.5 pr-8 py-2.5 rounded-xl bg-slate-50 border border-slate-200/80 text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500/40 focus:bg-white transition-all shadow-2xs"
                    />
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                        title="Xóa tìm kiếm"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* 3. Dropdown Mức độ ưu tiên (Chiếm 3 cột trên desktop) */}
                <div className="sm:col-span-2 lg:col-span-3 relative">
                  <label
                    className="text-[11px] font-bold uppercase tracking-wider block mb-1.5"
                    style={{ color: '#0b5b16', borderColor: '#6a0a0a' }}
                  >
                    Mức độ ưu tiên
                  </label>
                  <button
                    onClick={() => {
                      setIsPriorityDropdownOpen(!isPriorityDropdownOpen);
                      setIsWorkDropdownOpen(false);
                    }}
                    className={`w-full px-3 py-2.5 rounded-xl text-xs font-semibold border flex items-center justify-between gap-2 transition-all cursor-pointer shadow-2xs ${
                      priorityFilter !== 'ALL'
                        ? 'bg-orange-50 border-orange-200 text-orange-800 font-bold'
                        : 'bg-white border-slate-200/80 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      <span className="truncate">
                        {priorityFilter === 'ALL'
                          ? 'Tất cả mức độ'
                          : `Ưu tiên: ${
                              priorityFilter === 'URGENT'
                                ? 'Khẩn cấp'
                                : priorityFilter === 'HIGH'
                                ? 'Cao'
                                : priorityFilter === 'MEDIUM'
                                ? 'Trung bình'
                                : 'Thấp'
                            }`}
                      </span>
                    </div>
                    <ChevronDown className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform duration-200 ${isPriorityDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {/* Dropdown Menu Mức độ ưu tiên */}
                  {isPriorityDropdownOpen && (
                    <>
                      <div
                        className="fixed inset-0 z-20"
                        onClick={() => setIsPriorityDropdownOpen(false)}
                      />
                      <div className="absolute right-0 left-0 sm:left-auto sm:w-48 mt-1.5 rounded-xl bg-white border border-slate-200 shadow-xl py-1 z-30 animate-in fade-in zoom-in-95 duration-150">
                        <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                          Lọc mức độ ưu tiên
                        </div>
                        {(
                          [
                            { key: 'ALL', label: 'Tất cả mức độ' },
                            { key: 'URGENT', label: 'Khẩn cấp' },
                            { key: 'HIGH', label: 'Ưu tiên cao' },
                            { key: 'MEDIUM', label: 'Trung bình' },
                            { key: 'LOW', label: 'Thấp' },
                          ] as const
                        ).map((p) => (
                          <button
                            key={p.key}
                            onClick={() => {
                              setPriorityFilter(p.key);
                              setIsPriorityDropdownOpen(false);
                            }}
                            className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between transition-colors cursor-pointer ${
                              priorityFilter === p.key
                                ? 'bg-orange-50 text-orange-700 font-bold'
                                : 'text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            <span>{p.label}</span>
                            {priorityFilter === p.key && (
                              <Check className="w-3.5 h-3.5 text-orange-600 stroke-[2.5]" />
                            )}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Order Cards Grid */}
            <div className="space-y-4">
              {filteredOrders.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center space-y-3 shadow-2xs">
                  <Package className="w-10 h-10 text-slate-300 mx-auto" />
                  <h3 className="text-sm font-bold text-slate-700">
                    Không tìm thấy đơn hàng nào trong mục này
                  </h3>
                  <p className="text-xs text-slate-400">
                    Hãy thử chọn bộ lọc khác hoặc kiểm tra các tab hàng đợi khác.
                  </p>
                </div>
              ) : (
                filteredOrders.map((order) => (
                  <DesignerOrderCard
                    key={order.id}
                    order={order}
                    onOpenWorkspace={handleOpenWorkspace}
                    onEditSpec={handleEditSpec}
                    onUploadDesign={handleUploadDesign}
                    onRespondCR={handleRespondCR}
                    onCreateVersion={handleCreateVersion}
                    onCompareVersions={handleCompareVersions}
                    onSendForReview={handleSendForReview}
                  />
                ))
              )}
            </div>
          </section>

          {/* RIGHT 1 COLUMN: Compact "Today's Tasks" Panel & Quick Shortcuts (Sticky) */}
          <aside className="lg:sticky lg:top-20 lg:self-start space-y-6 lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto lg:pr-1">
            {/* 1. COMPACT "TODAY'S TASKS" PANEL */}
            <TodaysTasksPanel
              tasks={todayTasks}
              onToggleTask={handleToggleTask}
              onExecuteAction={handleExecuteTaskAction}
            />

            {/* 2. QUICK RESOURCES & SPECS PANEL */}
            <QuickResourcesWidget onNotify={showToast} />
          </aside>
        </div>
      </div>

      {/* Modal Dialogs for All 7 Designer Actions */}
      <DesignerActionModals
        activeModal={actionModal}
        targetOrder={modalTargetOrder}
        onClose={() => {
          setActionModal(null);
          setModalTargetOrder(null);
        }}
      />
    </div>
  );
};
