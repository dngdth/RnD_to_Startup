import React, { useState, useEffect } from 'react';
import { AppProvider, useApp, AppView } from './context/AppContext';
import { Sidebar } from './components/layout/Sidebar';
import { Topbar } from './components/layout/Topbar';
import { Toast } from './components/common/Toast';
import { DiffViewerModal } from './components/diff/DiffViewerModal';
import { NewChangeRequestModal } from './components/changerequests/NewChangeRequestModal';
import { NotificationPanel } from './components/notifications/NotificationPanel';
import { DesignerDashboard } from './components/dashboard/DesignerDashboard';
import { CustomerDashboard } from './components/dashboard/CustomerDashboard';
import { OrderWorkspaceView } from './components/workspace/OrderWorkspaceView';
import { DiffViewScreen } from './components/diff/DiffViewScreen';
import { OrdersListScreen } from './components/orders/OrdersListScreen';
import { ChangeRequestListScreen } from './components/changerequests/ChangeRequestListScreen';
import { WorkspacesScreen } from './components/workspaces/WorkspacesScreen';
import { AuditHistoryTimeline } from './components/audit/AuditHistoryTimeline';
import { ZaloIntegrationSettings } from './components/settings/ZaloIntegrationSettings';
import { LoginPage } from './components/auth/LoginPage';
import { ProductionSnapshotModal } from './components/production/ProductionSnapshotModal';
import { ChangeRequestDetailModal } from './components/changerequests/ChangeRequestDetailModal';

const MainContent: React.FC = () => {
  const {
    currentView,
    setCurrentView,
    currentUser,
    isChangeRequestDetailOpen,
    setIsChangeRequestDetailOpen,
    showToast,
    orders,
    selectedOrderId,
    setSelectedOrderId,
  } = useApp();
  const [isLoggedOut, setIsLoggedOut] = useState(false);

  // Security guard: Route & Order access control for customer role
  useEffect(() => {
    if (currentUser.role === 'customer') {
      const vendorOnlyViews: AppView[] = [
        'designer_dashboard',
        'workspaces',
        'settings',
      ];
      if (vendorOnlyViews.includes(currentView)) {
        setCurrentView('customer_dashboard');
        showToast('Khu vực này chỉ dành riêng cho Nhà thiết kế / Nhà cung cấp.', 'warning');
      }

      // Ensure customer cannot interact with an order they don't own
      const currentSelectedOrder = orders.find((o) => o.id === selectedOrderId);
      if (
        currentSelectedOrder &&
        currentSelectedOrder.customerName !== currentUser.name &&
        currentSelectedOrder.customerCompany !== currentUser.company
      ) {
        const myOrder = orders.find(
          (o) => o.customerName === currentUser.name || o.customerCompany === currentUser.company
        );
        if (myOrder) {
          setSelectedOrderId(myOrder.id);
        }
      }
    }
  }, [currentUser, currentView, orders, selectedOrderId, setCurrentView, setSelectedOrderId, showToast]);

  if (isLoggedOut) {
    return <LoginPage onSuccess={() => setIsLoggedOut(false)} />;
  }

  const renderView = () => {
    // If customer role attempts to access vendor-only views, safeguard by showing customer orders
    if (currentUser.role === 'customer') {
      const vendorOnlyViews: AppView[] = [
        'designer_dashboard',
        'workspaces',
        'settings',
      ];
      if (vendorOnlyViews.includes(currentView)) {
        return <CustomerDashboard />;
      }
    }

    switch (currentView) {
      case 'designer_dashboard':
        return currentUser.role === 'vendor' ? (
          <DesignerDashboard />
        ) : (
          <OrdersListScreen />
        );

      case 'customer_dashboard':
        return <CustomerDashboard />;

      case 'order_workspace':
        return <OrderWorkspaceView />;

      case 'diff_view':
        return <DiffViewScreen />;

      case 'orders':
        return <OrdersListScreen />;

      case 'change_requests':
        return <ChangeRequestListScreen />;

      case 'workspaces':
        return currentUser.role === 'vendor' ? (
          <WorkspacesScreen />
        ) : (
          <OrdersListScreen />
        );

      case 'audit_history':
        return <AuditHistoryTimeline />;

      case 'settings':
        return currentUser.role === 'vendor' ? (
          <ZaloIntegrationSettings />
        ) : (
          <OrdersListScreen />
        );

      default:
        return currentUser.role === 'vendor' ? (
          <DesignerDashboard />
        ) : (
          <OrdersListScreen />
        );
    }
  };

  return (
    <div className="relative flex h-screen w-screen overflow-hidden ambient-glow-mesh font-sans text-slate-900 antialiased selection:bg-rose-100 selection:text-rose-950">
      {/* Very subtle ambient blurred background blobs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden z-0">
        <div className="absolute top-[-10%] left-[15%] w-[500px] h-[500px] rounded-full bg-rose-200/25 blur-[120px] mix-blend-multiply" />
        <div className="absolute top-[20%] right-[10%] w-[550px] h-[550px] rounded-full bg-orange-200/20 blur-[130px] mix-blend-multiply" />
        <div className="absolute bottom-[-10%] left-[35%] w-[600px] h-[600px] rounded-full bg-amber-100/35 blur-[140px] mix-blend-multiply" />
      </div>

      {/* Persistent Left Sidebar */}
      <Sidebar />

      {/* Main App Container */}
      <div className="relative z-10 flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Persistent Topbar */}
        <Topbar />

        {/* Scrollable View Content */}
        <main id="workspace-scroll-container" className="flex-1 overflow-y-auto min-w-0">
          {renderView()}
        </main>
      </div>

      {/* Global Modals & Overlay Drawers */}
      <DiffViewerModal />
      <NewChangeRequestModal />
      <ChangeRequestDetailModal
        isOpen={isChangeRequestDetailOpen}
        onClose={() => setIsChangeRequestDetailOpen(false)}
      />
      <ProductionSnapshotModal />
      <NotificationPanel />
      <Toast />
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <MainContent />
    </AppProvider>
  );
}
