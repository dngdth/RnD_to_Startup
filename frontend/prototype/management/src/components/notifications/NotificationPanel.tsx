import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { AppNotification } from '../../types';
import {
  Bell,
  X,
  CheckCheck,
  AlertCircle,
  GitBranch,
  Sparkles,
  Lock,
  GitPullRequest,
  ArrowRight,
  Zap,
  MessageSquare,
  CheckCircle2,
} from 'lucide-react';

export const NotificationPanel: React.FC = () => {
  const {
    isNotificationPanelOpen,
    setIsNotificationPanelOpen,
    notifications,
    markNotificationRead,
    markAllNotificationsRead,
    setSelectedOrderId,
    setSelectedVersion,
    setCurrentView,
    openDiffModal,
    simulateIncomingNotification,
    showToast,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'all' | 'unread'>('all');

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isNotificationPanelOpen) {
        setIsNotificationPanelOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isNotificationPanelOpen, setIsNotificationPanelOpen]);

  if (!isNotificationPanelOpen) return null;

  const unreadCount = notifications.filter((n) => !n.read).length;
  const filteredNotifications = notifications.filter((n) =>
    activeTab === 'unread' ? !n.read : true
  );

  // Group notifications: Today vs Yesterday / Earlier
  const todayNotifications = filteredNotifications.filter(
    (n) => n.group === 'Hôm nay' || n.group === 'Today' || (!n.group && n.timestamp !== 'Hôm qua' && n.timestamp !== 'Yesterday')
  );
  const yesterdayNotifications = filteredNotifications.filter(
    (n) => n.group === 'Hôm qua' || n.group === 'Yesterday' || n.timestamp === 'Hôm qua' || n.timestamp === 'Yesterday'
  );

  const getTypeMeta = (type: AppNotification['type']) => {
    switch (type) {
      case 'change_request':
        return {
          icon: <GitPullRequest className="w-3.5 h-3.5 text-rose-600 stroke-[2.2]" />,
          iconBg: 'bg-rose-50 border-rose-100 text-rose-600',
          badgeClass: 'text-rose-700 bg-rose-50/90 border-rose-200/80',
          defaultTitle: 'YÊU CẦU CHỈNH SỬA MỚI',
        };
      case 'new_version':
        return {
          icon: <GitBranch className="w-3.5 h-3.5 text-indigo-600 stroke-[2.2]" />,
          iconBg: 'bg-indigo-50 border-indigo-100 text-indigo-600',
          badgeClass: 'text-indigo-700 bg-indigo-50/90 border-indigo-200/80',
          defaultTitle: 'PHIÊN BẢN MỚI',
        };
      case 'ai_summary':
        return {
          icon: <Sparkles className="w-3.5 h-3.5 text-amber-600 stroke-[2.2]" />,
          iconBg: 'bg-amber-50 border-amber-100 text-amber-600',
          badgeClass: 'text-amber-700 bg-amber-50/90 border-amber-200/80',
          defaultTitle: 'TÓM TẮT AI ĐÃ SẴN SÀNG',
        };
      case 'comment':
        return {
          icon: <MessageSquare className="w-3.5 h-3.5 text-sky-600 stroke-[2.2]" />,
          iconBg: 'bg-sky-50 border-sky-100 text-sky-600',
          badgeClass: 'text-sky-700 bg-sky-50/90 border-sky-200/80',
          defaultTitle: 'BÌNH LUẬN MỚI',
        };
      case 'approval':
        return {
          icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 stroke-[2.2]" />,
          iconBg: 'bg-emerald-50 border-emerald-100 text-emerald-600',
          badgeClass: 'text-emerald-700 bg-emerald-50/90 border-emerald-200/80',
          defaultTitle: 'ĐÃ PHÊ DUYỆT',
        };
      case 'approval_required':
        return {
          icon: <AlertCircle className="w-3.5 h-3.5 text-orange-600 stroke-[2.2]" />,
          iconBg: 'bg-orange-50 border-orange-100 text-orange-600',
          badgeClass: 'text-orange-700 bg-orange-50/90 border-orange-200/80',
          defaultTitle: 'CẦN PHÊ DUYỆT',
        };
      case 'production_locked':
        return {
          icon: <Lock className="w-3.5 h-3.5 text-slate-600 stroke-[2.2]" />,
          iconBg: 'bg-slate-100 border-slate-200 text-slate-700',
          badgeClass: 'text-slate-700 bg-slate-100 border-slate-200',
          defaultTitle: 'ĐÃ KHÓA SẢN XUẤT',
        };
      default:
        return {
          icon: <Bell className="w-3.5 h-3.5 text-slate-600" />,
          iconBg: 'bg-slate-100 border-slate-200 text-slate-600',
          badgeClass: 'text-slate-700 bg-slate-100 border-slate-200',
          defaultTitle: 'THÔNG BÁO',
        };
    }
  };

  const handleNotificationClick = (n: AppNotification) => {
    markNotificationRead(n.id);

    if (n.orderId) {
      setSelectedOrderId(n.orderId);
    }
    if (n.versionId) {
      setSelectedVersion(n.versionId);
    }

    if (n.type === 'ai_summary') {
      setCurrentView('order_workspace');
      openDiffModal();
      showToast('Đã mở So sánh phiên bản & Tóm tắt AI trong không gian làm việc', 'info');
    } else if (n.type === 'change_request') {
      setCurrentView('order_workspace');
      showToast(`Đã mở đơn hàng xem Yêu cầu chỉnh sửa: ${n.title}`, 'info');
    } else {
      setCurrentView('order_workspace');
      showToast(`Đã chuyển đến Không gian làm việc cho ${n.title}`, 'info');
    }

    setIsNotificationPanelOpen(false);
  };

  const renderNotificationCard = (n: AppNotification) => {
    const meta = getTypeMeta(n.type);
    const displayTitle = n.title || meta.defaultTitle;

    return (
      <div
        key={n.id}
        onClick={() => handleNotificationClick(n)}
        className={`group relative p-3 rounded-2xl border transition-all duration-150 cursor-pointer ${
          !n.read
            ? 'bg-gradient-to-r from-orange-50/50 via-white to-amber-50/30 border-orange-200/90 shadow-2xs hover:border-orange-300 hover:shadow-xs'
            : 'bg-white/70 border-slate-200/60 hover:bg-slate-50/80 hover:border-slate-300/80 opacity-85 hover:opacity-100'
        }`}
      >
        <div className="flex items-start gap-3">
          {/* Icon Badge */}
          <div
            className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 border mt-0.5 ${meta.iconBg}`}
          >
            {meta.icon}
          </div>

          {/* Content */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-1.5 mb-1">
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider border ${meta.badgeClass}`}
              >
                {displayTitle}
              </span>

              <div className="flex items-center gap-1.5">
                {!n.read && (
                  <span
                    className="w-2 h-2 rounded-full bg-orange-500 ring-2 ring-orange-200 shrink-0 animate-pulse"
                    title="Chưa đọc"
                  />
                )}
              </div>
            </div>

            <p
              className={`text-xs leading-snug transition-colors ${
                !n.read ? 'font-bold text-slate-900 group-hover:text-slate-950' : 'font-medium text-slate-600'
              }`}
            >
              {n.message}
            </p>

            <div className="flex items-center justify-between mt-1.5 pt-1 text-[11px]">
              <span className="text-slate-400 font-medium">{n.timestamp}</span>
              <span className="text-[10px] font-bold text-orange-600 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5">
                <span>Xem đơn hàng</span>
                <ArrowRight className="w-2.5 h-2.5" />
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Click-outside backdrop */}
      <div
        className="fixed inset-0 z-40 bg-slate-900/10 backdrop-blur-[0.5px] transition-opacity animate-in fade-in duration-150"
        onClick={() => setIsNotificationPanelOpen(false)}
      />

      {/* Floating Notification Panel anchored to top navigation right */}
      <div
        id="floating-notification-panel"
        className="fixed top-16 right-4 sm:right-6 md:right-8 z-50 w-[420px] max-w-[calc(100vw-24px)] bg-white/95 backdrop-blur-2xl rounded-3xl border border-slate-200/90 shadow-[0_20px_50px_-10px_rgba(15,23,42,0.18),0_0_0_1px_rgba(0,0,0,0.04)] overflow-hidden flex flex-col max-h-[calc(100vh-5rem)] animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Fixed Header & Tabs */}
        <div className="shrink-0 p-4 pb-3 border-b border-slate-100/90 bg-gradient-to-b from-white to-slate-50/40">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <h3 className="text-base font-extrabold text-slate-900 tracking-tight">
                Thông báo
              </h3>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-orange-100 text-orange-800 border border-orange-200/50">
                  {unreadCount} chưa đọc
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              {unreadCount > 0 && (
                <button
                  id="mark-all-read-btn"
                  onClick={markAllNotificationsRead}
                  className="text-xs font-semibold text-slate-500 hover:text-orange-600 hover:bg-orange-50/80 px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1"
                  title="Đánh dấu tất cả là đã đọc"
                >
                  <CheckCheck className="w-3.5 h-3.5 stroke-[2]" />
                  <span>Đánh dấu đã đọc</span>
                </button>
              )}
              <button
                onClick={() => setIsNotificationPanelOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                title="Đóng"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Filter Tabs: [Tất cả] [Chưa đọc] */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100/80 rounded-xl w-fit">
            <button
              id="notif-tab-all"
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'all'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <span>Tất cả</span>
              <span className="ml-1.5 px-1.5 py-0.2 rounded-full text-[10px] font-extrabold bg-slate-200/70 text-slate-700">
                {notifications.length}
              </span>
            </button>

            <button
              id="notif-tab-unread"
              onClick={() => setActiveTab('unread')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'unread'
                  ? 'bg-white text-orange-600 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <span>Chưa đọc</span>
              {unreadCount > 0 && (
                <span className="ml-1.5 px-1.5 py-0.2 rounded-full text-[10px] font-extrabold bg-orange-100 text-orange-700">
                  {unreadCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Scrollable Notification List (Only this section scrolls vertically) */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-3 space-y-3">
          {filteredNotifications.length === 0 ? (
            <div className="py-12 px-4 text-center">
              <div className="w-10 h-10 rounded-2xl bg-orange-50 text-orange-500 flex items-center justify-center mx-auto mb-2.5">
                <Bell className="w-5 h-5 stroke-[1.75]" />
              </div>
              <p className="text-xs font-bold text-slate-700">Không có thông báo chưa đọc</p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Bạn đã cập nhật hết tất cả đơn hàng và yêu cầu xem xét.
              </p>
            </div>
          ) : (
            <>
              {/* Group: Hôm nay */}
              {todayNotifications.length > 0 && (
                <div className="space-y-2">
                  <div className="px-2 py-0.5">
                    <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-400">
                      Hôm nay
                    </h4>
                  </div>
                  <div className="space-y-2">
                    {todayNotifications.map(renderNotificationCard)}
                  </div>
                </div>
              )}

              {/* Group: Hôm qua */}
              {yesterdayNotifications.length > 0 && (
                <div className="space-y-2 pt-1 border-t border-slate-100">
                  <div className="px-2 py-0.5">
                    <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-400">
                      Hôm qua
                    </h4>
                  </div>
                  <div className="space-y-2">
                    {yesterdayNotifications.map(renderNotificationCard)}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Fixed Footer */}
        <div className="shrink-0 p-3 bg-slate-50/90 border-t border-slate-100/90 flex items-center justify-between text-xs">
          <button
            onClick={simulateIncomingNotification}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold text-slate-600 hover:text-orange-600 hover:bg-orange-50/80 transition-colors"
            title="Mô phỏng thông báo mới để kiểm tra chuông thông báo"
          >
            <Zap className="w-3 h-3 text-amber-500 fill-amber-500" />
            <span>Mô phỏng thông báo mới</span>
          </button>

          <button
            onClick={() => {
              setCurrentView('audit_history');
              setIsNotificationPanelOpen(false);
            }}
            className="text-[11px] font-semibold text-slate-500 hover:text-slate-800 transition-colors"
          >
            Lịch sử hoạt động →
          </button>
        </div>
      </div>
    </>
  );
};
