import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { StatusBadge } from '../common/StatusBadge';
import {
  Package,
  Clock,
  GitPullRequest,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  ChevronRight,
  AlertCircle,
  Bell,
  Layers,
  FileCheck,
  Check,
  History,
  Info,
  MessageSquare,
  Building2,
} from 'lucide-react';

export const CustomerDashboard: React.FC = () => {
  const {
    currentUser,
    orders,
    setSelectedOrderId,
    setSelectedVersion,
    setCurrentView,
    openDiffModal,
    openNewCRModal,
    approveOrderVersion,
    notifications,
    setIsNotificationPanelOpen,
    showToast,
    setActiveCustomerWorkspaceOrderId,
  } = useApp();

  const [orderFilter, setOrderFilter] = useState<'all' | 'waiting' | 'production'>('all');

  const customerOrders = (orders || []).filter(
    (o) =>
      currentUser.role === 'vendor' ||
      o.customerName === currentUser.name ||
      o.customerCompany === currentUser.company
  );
  const awaitingApproval = customerOrders.filter((o) => o.status === 'IN_REVIEW');
  const inProductionOrders = customerOrders.filter((o) => o.status === 'LOCKED_FOR_PRODUCTION' || o.status === 'APPROVED');
  const openCRs = customerOrders
    .flatMap((o) => o.changeRequests || [])
    .filter((cr) => cr.status === 'OPEN' || cr.status === 'IN_PROGRESS');
  const attentionOrders = customerOrders.filter(
    (o) => o.status === 'IN_REVIEW' || o.status === 'CHANGE_REQUESTED'
  );

  const filteredOrders = customerOrders.filter((o) => {
    if (orderFilter === 'waiting') return o.status === 'IN_REVIEW';
    if (orderFilter === 'production') return o.status === 'LOCKED_FOR_PRODUCTION' || o.status === 'APPROVED';
    return true;
  });

  // Recent activities answering "Hoạt động gần đây"
  const recentActivitiesList = [
    {
      id: 'act-1',
      orderNumber: 'PP-1024',
      title: 'Designer vừa cập nhật phiên bản mới v04',
      time: '12 phút trước',
      description: 'Alex Rivera đã điều chỉnh kích thước logo sau lưng (-20%) và thay thế tệp vector PDF CMYK 300 DPI.',
      icon: <Sparkles className="w-4 h-4 text-orange-600" />,
      badgeBg: 'bg-orange-50 border border-orange-200',
      action: {
        label: 'Xem thay đổi',
        onClick: () => {
          setSelectedOrderId('order-1024');
          setSelectedVersion('v04');
          openDiffModal();
        },
      },
    },
    {
      id: 'act-2',
      orderNumber: 'PP-1024',
      title: 'Phiên bản mới v04 đang chờ Customer phê duyệt',
      time: '25 phút trước',
      description: 'Hồ sơ kỹ thuật mẫu Áo Hoodie nỉ dày đã sẵn sàng để bạn ký duyệt điện tử và chuyển sang xưởng may.',
      icon: <Clock className="w-4 h-4 text-amber-600" />,
      badgeBg: 'bg-amber-50 border border-amber-200',
      action: {
        label: 'Xem đơn hàng',
        onClick: () => {
          setSelectedOrderId('order-1024');
          setActiveCustomerWorkspaceOrderId('order-1024');
          setCurrentView('order_workspace');
        },
      },
    },
    {
      id: 'act-3',
      orderNumber: 'PP-1015',
      title: 'Có yêu cầu chỉnh sửa mới (CR-018)',
      time: '35 phút trước',
      description: 'Yêu cầu điều chỉnh hiệu ứng chuyển màu rách cổ điển Mineral Wash đang được nhà thiết kế xử lý.',
      icon: <GitPullRequest className="w-4 h-4 text-rose-500" />,
      badgeBg: 'bg-rose-50 border border-rose-200',
      action: {
        label: 'Xem yêu cầu',
        onClick: () => setCurrentView('change_requests'),
      },
    },
    {
      id: 'act-4',
      orderNumber: 'PP-1024',
      title: 'Có bình luận mới về thông số nón và bo viền',
      time: 'Hôm qua, 16:30',
      description: 'Emma Watson: "Kích thước 20 × 15 cm này nhìn thoáng và đẹp hơn nhiều!"',
      icon: <MessageSquare className="w-4 h-4 text-blue-600" />,
      badgeBg: 'bg-blue-50 border border-blue-200',
      action: {
        label: 'Vào Workspace',
        onClick: () => {
          setSelectedOrderId('order-1024');
          setActiveCustomerWorkspaceOrderId('order-1024');
          setCurrentView('order_workspace');
        },
      },
    },
    {
      id: 'act-5',
      orderNumber: 'PP-1031',
      title: 'Designer tải lên Tech Pack v02 cho Bomber Jacket',
      time: 'Hôm nay, 10:30',
      description: 'Alex Rivera đã tải lên hồ sơ kỹ thuật v02, cập nhật mẫu thêu xù Chenille và chần bông lót lụa.',
      icon: <Layers className="w-4 h-4 text-purple-600" />,
      badgeBg: 'bg-purple-50 border border-purple-200',
      action: {
        label: 'Xem đơn hàng',
        onClick: () => {
          setSelectedOrderId('order-1031');
          setActiveCustomerWorkspaceOrderId('order-1031');
          setCurrentView('order_workspace');
        },
      },
    },
  ];

  // Recent changes data answering "What changed?"
  const latestChangesList = [
    {
      id: 'chg-1',
      orderNumber: 'PP-1024',
      productName: 'Áo hoodie đặt may',
      versionTransition: 'v03 → v04',
      title: 'Kích thước & vị trí logo sau lưng',
      oldValue: '25 × 18 cm (Bị che)',
      newValue: '20 × 15 cm (-20% chiều rộng, Tối ưu)',
      aiReason: 'Điều chỉnh kích thước để đảm bảo nhìn thấy 100% khi mũ áo hạ xuống.',
      timestamp: '28 phút trước',
      orderId: 'order-1024',
      versionId: 'v04',
    },
    {
      id: 'chg-2',
      orderNumber: 'PP-1024',
      productName: 'Áo hoodie đặt may',
      versionTransition: 'v03 → v04',
      title: 'Định dạng tệp thiết kế',
      oldValue: 'Raster PNG (150 DPI)',
      newValue: 'CMYK Curve Vector PDF (300 DPI)',
      aiReason: 'Nâng cấp tệp vector để tách màu in lụa sắc nét.',
      timestamp: '30 phút trước',
      orderId: 'order-1024',
      versionId: 'v04',
    },
    {
      id: 'chg-3',
      orderNumber: 'PP-1021',
      productName: 'Áo Hoodie Zip khóa kim loại 2 chiều',
      versionTransition: 'v01 → v02',
      title: 'Khóa kéo YKK 2 chiều & bo nỉ dệt',
      oldValue: 'Khóa kéo tiêu chuẩn 1 chiều',
      newValue: 'Khóa kéo YKK 2 chiều răng đồng cổ điển',
      aiReason: 'Đồng bộ khóa kéo kim loại 2 chiều và bo dệt nỉ 2x2 chống bai giãn.',
      timestamp: 'Hôm qua',
      orderId: 'order-1021',
      versionId: 'v02',
    },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
              Cổng thông tin khách hàng · {currentUser.company || 'Urban Thread Apparel Co.'}
            </span>
            <span className="text-xs text-slate-400">{currentUser.name || 'Emma Watson'}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Trang chủ
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Theo dõi đơn hàng, yêu cầu thay đổi và các phiên bản đang chờ bạn phản hồi.
          </p>
        </div>

        {/* Action button if orders waiting */}
        {awaitingApproval.length > 0 && (
          <button
            onClick={() => {
              setSelectedOrderId(awaitingApproval[0].id);
              setSelectedVersion(awaitingApproval[0].currentVersion || 'v04');
              openDiffModal();
            }}
            className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-orange-500 to-rose-500 hover:from-orange-600 hover:to-rose-600 text-white text-xs font-bold shadow-md shadow-orange-500/20 transition-all flex items-center gap-2 shrink-0 active:scale-98"
          >
            <Sparkles className="w-4 h-4 stroke-[2.2]" />
            <span>Xem {awaitingApproval[0].currentVersion} ({awaitingApproval[0].productName})</span>
          </button>
        )}
      </div>

      {/* 4 Cards Tổng quan */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* ĐƠN HÀNG CỦA TÔI */}
        <div className="p-4.5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">
              ĐƠN HÀNG CỦA TÔI
            </span>
            <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-slate-900">
              {customerOrders.length}
            </span>
            <span className="text-[11px] font-semibold text-slate-400">
              đơn hàng
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Tổng số đơn hàng của khách hàng</p>
        </div>

        {/* CHỜ BẠN PHẢN HỒI */}
        <div className="p-4.5 rounded-2xl bg-gradient-to-br from-orange-50/70 via-white to-amber-50/40 border border-orange-200/90 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-orange-950 uppercase tracking-wider">
              CHỜ BẠN PHẢN HỒI
            </span>
            <div className="w-8 h-8 rounded-xl bg-orange-100 flex items-center justify-center text-orange-600">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-orange-950">
              {awaitingApproval.length}
            </span>
            <span className="text-[11px] font-bold text-orange-700 bg-orange-100/70 px-2 py-0.5 rounded-full">
              Cần xử lý
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Số đơn hàng / phiên bản đang chờ xem xét</p>
        </div>

        {/* YÊU CẦU CHỈNH SỬA */}
        <div className="p-4.5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">
              YÊU CẦU CHỈNH SỬA
            </span>
            <div className="w-8 h-8 rounded-xl bg-rose-50 flex items-center justify-center text-rose-500">
              <GitPullRequest className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-slate-900">
              {openCRs.length}
            </span>
            <span className="text-[11px] font-semibold text-slate-400">
              yêu cầu
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Yêu cầu thay đổi cần xem hoặc phản hồi</p>
        </div>

        {/* ĐÃ PHÊ DUYỆT */}
        <div className="p-4.5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">
              ĐÃ PHÊ DUYỆT
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-slate-900">
              {inProductionOrders.length}
            </span>
            <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60">
              Sẵn sàng
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Số đơn hàng / phiên bản đã phê duyệt</p>
        </div>
      </div>

      {/* SECTION: ĐƠN HÀNG CẦN BẠN CHÚ Ý */}
      <section id="orders-need-attention" className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                Đơn hàng cần bạn chú ý
              </h2>
              {attentionOrders.length > 0 && (
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-orange-100 text-orange-800 border border-orange-200">
                  {attentionOrders.length} đơn
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Hiển thị những đơn hàng đang cần bạn thao tác, kiểm tra thông số hoặc phản hồi phiên bản.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {attentionOrders.map((order) => {
            const hasWorkspace =
              order.hasWorkspace !== false &&
              (order.hasWorkspace || (order.specBlocks && order.specBlocks.length > 0));
            const isWaitingApproval = order.status === 'IN_REVIEW';

            return (
              <div
                key={order.id}
                className="p-5 sm:p-6 rounded-2xl bg-white border border-orange-200/90 shadow-2xs hover:shadow-sm transition-all flex flex-col justify-between space-y-4 relative overflow-hidden"
              >
                {/* Accent top gradient bar */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-orange-500 to-amber-500" />

                {/* Top Info */}
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-orange-900 bg-orange-100/80 px-2.5 py-0.5 rounded-md border border-orange-200">
                        #{order.orderNumber}
                      </span>
                      {hasWorkspace ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          <Sparkles className="w-3 h-3 text-emerald-600" />
                          <span>Có Workspace</span>
                        </span>
                      ) : (
                        <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                          Chưa có Workspace
                        </span>
                      )}
                    </div>
                    <StatusBadge status={order.status} size="sm" />
                  </div>

                  <div>
                    <h3 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight leading-snug">
                      {order.productName}
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">
                      {order.vendorCompany} · {order.category}
                    </p>
                  </div>

                  {/* Metadata Grid: Phiên bản & Hạn giao */}
                  <div className="grid grid-cols-2 gap-2.5 p-3 rounded-xl bg-slate-50/80 border border-slate-100 text-xs">
                    <div>
                      <span className="text-slate-400 block text-[10.5px] font-medium">Phiên bản</span>
                      <span className="font-bold text-slate-800">{order.currentVersion}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10.5px] font-medium">Hạn giao</span>
                      <span className="font-bold text-slate-800">{order.deliveryDate || order.dueDate || 'Đang cập nhật'}</span>
                    </div>
                  </div>

                  {/* Highlight note if PP-1024 or waiting approval */}
                  {isWaitingApproval && order.id === 'order-1024' && (
                    <div className="p-3 rounded-xl bg-orange-50/70 border border-orange-200/70 text-xs text-slate-700 space-y-1">
                      <div className="flex items-center gap-1.5 font-bold text-orange-950 text-[11.5px]">
                        <Sparkles className="w-3.5 h-3.5 text-orange-600" />
                        <span>Phiên bản v04 sẵn sàng ký duyệt</span>
                      </div>
                      <p className="text-[11px] text-slate-600 pl-5">
                        Thu nhỏ kích thước logo sau lưng (-20%) và nâng cấp tệp vector PDF CMYK chuẩn in lụa.
                      </p>
                    </div>
                  )}
                </div>

                {/* Actions & CTA */}
                <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2.5">
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Primary CTA: "Xem đơn hàng" */}
                    <button
                      onClick={() => {
                        if (hasWorkspace) {
                          setSelectedOrderId(order.id);
                          setSelectedVersion(order.currentVersion || 'v01');
                          setActiveCustomerWorkspaceOrderId(order.id);
                          setCurrentView('order_workspace');
                        } else {
                          showToast(
                            `Đơn hàng #${order.orderNumber} (${order.productName}) chưa có Workspace hồ sơ kỹ thuật Tech Pack.`,
                            'info'
                          );
                        }
                      }}
                      className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 active:scale-98"
                    >
                      <span>Xem đơn hàng</span>
                      <ArrowRight className="w-3.5 h-3.5 text-orange-400" />
                    </button>

                    {/* Quick review changes if in review */}
                    {isWaitingApproval && (
                      <button
                        onClick={() => {
                          setSelectedOrderId(order.id);
                          setSelectedVersion(order.currentVersion || 'v01');
                          openDiffModal(order.id);
                        }}
                        className="px-3 py-2 rounded-xl bg-orange-50 hover:bg-orange-100/90 text-orange-900 text-xs font-bold transition-colors border border-orange-200/80 flex items-center gap-1.5 cursor-pointer"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-orange-600" />
                        <span>Xem thay đổi</span>
                      </button>
                    )}

                    <button
                      onClick={() => {
                        setSelectedOrderId(order.id);
                        openNewCRModal();
                      }}
                      className="px-3 py-2 rounded-xl border border-rose-200 bg-white hover:bg-rose-50 text-rose-700 text-xs font-bold transition-colors"
                    >
                      Yêu cầu sửa
                    </button>
                  </div>

                  {isWaitingApproval && (
                    <button
                      onClick={() => {
                        approveOrderVersion(order.id, order.currentVersion || 'v04');
                        showToast(`Đã phê duyệt ${order.currentVersion} cho đơn hàng #${order.orderNumber}!`, 'success');
                      }}
                      className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors flex items-center gap-1"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Phê duyệt</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* SECTION: HOẠT ĐỘNG GẦN ĐÂY */}
      <section id="recent-activities" className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
              Hoạt động gần đây
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Cập nhật mới nhất từ nhà thiết kế, yêu cầu thay đổi và trạng thái phê duyệt.
            </p>
          </div>
          <button
            onClick={() => setCurrentView('audit_history')}
            className="text-xs font-bold text-orange-600 hover:text-orange-700 flex items-center gap-1"
          >
            <span>Xem lịch sử đơn hàng</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs space-y-3">
          {recentActivitiesList.map((act) => (
            <div
              key={act.id}
              className="p-3 sm:p-3.5 rounded-xl border border-slate-100 hover:border-slate-200 hover:bg-slate-50/60 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <div className="flex items-start gap-3">
                <div className={`w-8 h-8 rounded-xl shrink-0 flex items-center justify-center text-xs ${act.badgeBg}`}>
                  {act.icon}
                </div>
                <div className="space-y-0.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-[11px] font-bold text-orange-800 bg-orange-50 px-2 py-0.5 rounded border border-orange-100">
                      #{act.orderNumber}
                    </span>
                    <span className="text-xs font-bold text-slate-900">
                      {act.title}
                    </span>
                    <span className="text-[11px] text-slate-400">· {act.time}</span>
                  </div>
                  <p className="text-xs text-slate-600 leading-snug">
                    {act.description}
                  </p>
                </div>
              </div>

              {act.action && (
                <button
                  onClick={act.action.onClick}
                  className="self-end sm:self-center px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-colors shrink-0 flex items-center gap-1"
                >
                  <span>{act.action.label}</span>
                  <ChevronRight className="w-3 h-3" />
                </button>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* MY ORDERS */}
      <section id="my-orders" className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-black text-slate-900 tracking-tight">Đơn hàng của tôi</h2>
            <p className="text-xs text-slate-500">
              Trạng thái rõ ràng, phiên bản đang chờ và thao tác nhanh cho từng đợt sản xuất.
            </p>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl w-fit">
            <button
              onClick={() => setOrderFilter('all')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                orderFilter === 'all'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Tất cả ({customerOrders.length})
            </button>
            <button
              onClick={() => setOrderFilter('waiting')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                orderFilter === 'waiting'
                  ? 'bg-white text-orange-600 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Chờ phê duyệt ({awaitingApproval.length})
            </button>
            <button
              onClick={() => setOrderFilter('production')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                orderFilter === 'production'
                  ? 'bg-white text-emerald-700 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Đang sản xuất ({inProductionOrders.length})
            </button>
          </div>
        </div>

        {/* Clean, Customer-Centric Order Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredOrders.map((order) => {
            const isWaiting = order.status === 'IN_REVIEW';
            const isLocked = order.status === 'LOCKED_FOR_PRODUCTION';

            return (
              <div
                key={order.id}
                className={`p-5 rounded-2xl bg-white border transition-all duration-200 flex flex-col justify-between space-y-4 shadow-2xs ${
                  isWaiting
                    ? 'border-orange-300 ring-1 ring-orange-200/60 bg-gradient-to-br from-white via-white to-orange-50/20'
                    : 'border-slate-200/80 hover:border-slate-300'
                }`}
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-xs font-bold text-orange-800 bg-orange-50 px-2 py-0.5 rounded border border-orange-100">
                        #{order.orderNumber}
                      </span>
                      <span className="text-xs text-slate-400">· {order.category}</span>
                    </div>
                    <h3 className="text-base font-bold text-slate-900 tracking-tight">
                      {order.productName}
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {order.vendorCompany} · {order.targetQuantity} sản phẩm
                    </p>
                  </div>

                  <StatusBadge status={order.status} size="sm" />
                </div>

                {/* Direct Customer Answers Grid */}
                <div className="p-3 rounded-xl bg-slate-50/90 border border-slate-100 space-y-2 text-xs">
                  {/* Status question */}
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-medium">Trạng thái hiện tại:</span>
                    <span className="font-bold text-slate-900">
                      {isWaiting
                        ? 'Đang chờ bạn ký duyệt'
                        : isLocked
                        ? 'Đã khóa để sản xuất'
                        : 'Đã phê duyệt & sẵn sàng'}
                    </span>
                  </div>

                  {/* Version question */}
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-medium">Có phiên bản nào đang chờ không?</span>
                    <span
                      className={`font-bold ${
                        isWaiting ? 'text-orange-600 flex items-center gap-1' : 'text-slate-700'
                      }`}
                    >
                      {isWaiting ? (
                        <>
                          <Clock className="w-3 h-3 text-orange-500" />
                          <span>Có: Phiên bản 04</span>
                        </>
                      ) : (
                        `Không, đã duyệt ${order.currentVersion}`
                      )}
                    </span>
                  </div>

                  {/* Change question */}
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-medium">Tôi có thể yêu cầu thay đổi không?</span>
                    <span className="text-emerald-700 font-bold flex items-center gap-1">
                      <Check className="w-3 h-3" />
                      <span>Có, bất kỳ lúc nào</span>
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
                  <div className="flex items-center gap-2">
                    {isWaiting ? (
                      <button
                        onClick={() => {
                          setSelectedOrderId(order.id);
                          setSelectedVersion(order.currentVersion || 'v01');
                          openDiffModal(order.id);
                        }}
                        className="px-3 py-1.5 rounded-xl bg-orange-50 hover:bg-orange-100/90 text-orange-900 font-bold text-xs flex items-center gap-1.5 transition-colors border border-orange-200/80 cursor-pointer"
                      >
                        <Sparkles className="w-3 h-3 text-orange-600" />
                        <span>Xem thay đổi</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          const hasWorkspace =
                            order.hasWorkspace !== false &&
                            (order.hasWorkspace || (order.specBlocks && order.specBlocks.length > 0));
                          if (hasWorkspace) {
                            setSelectedOrderId(order.id);
                            setActiveCustomerWorkspaceOrderId(order.id);
                            setCurrentView('order_workspace');
                          } else {
                            showToast(
                              `Đơn hàng #${order.orderNumber} chưa được khởi tạo Workspace hồ sơ kỹ thuật Tech Pack.`,
                              'info'
                            );
                          }
                        }}
                        className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs flex items-center gap-1.5 transition-colors"
                      >
                        <FileCheck className="w-3 h-3 text-slate-600" />
                        <span>Xem hồ sơ kỹ thuật</span>
                      </button>
                    )}

                    <button
                      onClick={() => {
                        setSelectedOrderId(order.id);
                        openNewCRModal();
                      }}
                      className="px-3 py-1.5 rounded-xl border border-rose-200 bg-white hover:bg-rose-50 text-rose-700 font-bold text-xs transition-colors"
                    >
                      Yêu cầu thay đổi
                    </button>
                  </div>

                  <button
                    onClick={() => {
                      const hasWorkspace =
                        order.hasWorkspace !== false &&
                        (order.hasWorkspace || (order.specBlocks && order.specBlocks.length > 0));
                      if (hasWorkspace) {
                        setSelectedOrderId(order.id);
                        setActiveCustomerWorkspaceOrderId(order.id);
                        setCurrentView('order_workspace');
                      } else {
                        showToast(
                          `Đơn hàng #${order.orderNumber} chưa được khởi tạo Workspace hồ sơ kỹ thuật Tech Pack.`,
                          'info'
                        );
                      }
                    }}
                    className="text-xs font-semibold text-slate-400 hover:text-slate-700 flex items-center gap-1 transition-colors"
                  >
                    <span>Không gian làm việc</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* LATEST CHANGES + NOTIFICATIONS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LATEST CHANGES (What changed?) */}
        <section id="latest-changes" className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-black text-slate-900 tracking-tight">
                Thay đổi gần đây
              </h2>
              <p className="text-xs text-slate-500">
                Các cập nhật thông số và sai khác giữa các phiên bản
              </p>
            </div>

            <button
              onClick={() => {
                setSelectedOrderId('order-1024');
                setSelectedVersion('v04');
                openDiffModal();
              }}
              className="text-xs font-bold text-orange-600 hover:text-orange-700 flex items-center gap-1"
            >
              <span>Xem toàn bộ thay đổi</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3">
            {latestChangesList.map((item) => (
              <div
                key={item.id}
                className="p-4 rounded-2xl bg-white border border-slate-200/80 hover:border-slate-300 transition-all shadow-2xs space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold font-mono text-orange-800 bg-orange-50 px-2 py-0.5 rounded border border-orange-100">
                      #{item.orderNumber}
                    </span>
                    <span className="text-xs font-bold text-slate-900">{item.title}</span>
                  </div>
                  <span className="text-[11px] text-slate-400">{item.timestamp}</span>
                </div>

                {/* OLD -> NEW Visual Indicator */}
                <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                  <div className="p-2.5 rounded-xl bg-rose-50/60 border border-rose-100">
                    <span className="text-[10px] font-bold text-rose-700 uppercase block mb-0.5">
                      TRƯỚC (v03)
                    </span>
                    <span className="text-rose-900 font-medium line-through text-xs">
                      {item.oldValue}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-emerald-50/70 border border-emerald-200">
                    <span className="text-[10px] font-bold text-emerald-800 uppercase block mb-0.5">
                      SAU (v04)
                    </span>
                    <span className="text-emerald-950 font-bold text-xs">
                      {item.newValue}
                    </span>
                  </div>
                </div>

                <div className="text-[11px] text-slate-600 flex items-start gap-1.5 pt-0.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                  <span>{item.aiReason}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* NOTIFICATIONS */}
        <section id="customer-notifications" className="lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-black text-slate-900 tracking-tight">
                Thông báo
              </h2>
              <p className="text-xs text-slate-500">Cảnh báo thời gian thực về các đơn hàng của bạn.</p>
            </div>

            <button
              onClick={() => setIsNotificationPanelOpen(true)}
              className="text-xs font-bold text-orange-600 hover:text-orange-700 flex items-center gap-1"
            >
              <span>Mở trung tâm</span>
              <Bell className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs space-y-2.5">
            {notifications.slice(0, 4).map((n) => (
              <div
                key={n.id}
                onClick={() => {
                  if (n.orderId) setSelectedOrderId(n.orderId);
                  if (n.versionId) setSelectedVersion(n.versionId);
                  if (n.type === 'ai_summary') {
                    openDiffModal();
                  } else {
                    setCurrentView('order_workspace');
                  }
                }}
                className={`p-3 rounded-xl border transition-all cursor-pointer ${
                  !n.read
                    ? 'bg-orange-50/40 border-orange-200/80 hover:bg-orange-50/70'
                    : 'bg-white border-slate-100 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between gap-1 mb-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-700">
                    {n.title}
                  </span>
                  <span className="text-[10px] text-slate-400">{n.timestamp}</span>
                </div>
                <p className="text-xs font-semibold text-slate-800 leading-snug">
                  {n.message}
                </p>
                <div className="flex items-center justify-between mt-1 text-[10px]">
                  <span className="font-bold text-orange-600 hover:underline">
                    Xem trong không gian làm việc →
                  </span>
                  {!n.read && <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />}
                </div>
              </div>
            ))}

            <button
              onClick={() => setIsNotificationPanelOpen(true)}
              className="w-full py-2 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition-colors text-center"
            >
              Xem tất cả thông báo trong trung tâm nổi →
            </button>
          </div>
        </section>
      </div>
    </div>
  );
};
