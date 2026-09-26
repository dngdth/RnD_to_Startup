import React, { createContext, useContext, useState } from 'react';
import {
  UserProfile,
  UserRole,
  Order,
  OrderStatus,
  ChangeRequest,
  ChangeRequestStatus,
  AuditLogItem,
  AppNotification,
  ZaloIntegrationConfig,
  Workspace,
  OrderVersion,
} from '../types';
import {
  MOCK_USERS,
  INITIAL_ORDERS,
  INITIAL_AUDIT_LOGS,
  INITIAL_NOTIFICATIONS,
  INITIAL_ZALO_CONFIG,
  MOCK_WORKSPACES,
} from '../data/mockData';

export type AppView =
  | 'login'
  | 'designer_dashboard'
  | 'customer_dashboard'
  | 'order_workspace'
  | 'orders'
  | 'change_requests'
  | 'diff_view'
  | 'audit_history'
  | 'notifications'
  | 'settings'
  | 'workspaces';

interface ToastState {
  id: number;
  message: string;
  type: 'success' | 'info' | 'warning' | 'error';
}

interface AppContextType {
  currentUser: UserProfile;
  switchRole: (role: UserRole) => void;
  currentView: AppView;
  setCurrentView: (view: AppView) => void;
  selectedOrderId: string;
  setSelectedOrderId: (id: string) => void;
  activeCustomerWorkspaceOrderId: string | null;
  setActiveCustomerWorkspaceOrderId: (id: string | null) => void;
  selectedOrder: Order;
  selectedVersion: string;
  setSelectedVersion: (ver: string) => void;
  orders: Order[];
  workspaces: Workspace[];
  activeWorkspace: Workspace;
  setActiveWorkspace: (ws: Workspace) => void;
  auditLogs: AuditLogItem[];
  notifications: AppNotification[];
  unreadNotificationsCount: number;
  zaloConfig: ZaloIntegrationConfig;
  diffBaseVersion: string | null;
  diffTargetVersion: string | null;
  diffViewStep: 'select_product' | 'compare';
  setDiffViewStep: (step: 'select_product' | 'compare') => void;
  setDiffVersions: (base: string | null, target: string | null) => void;
  isDiffModalOpen: boolean;
  openDiffModal: (orderId?: string, baseVersion?: string, targetVersion?: string) => void;
  closeDiffModal: () => void;
  navigateToDiffView: (orderId?: string, baseVersion?: string, targetVersion?: string) => void;
  isNewCRModalOpen: boolean;
  openNewCRModal: () => void;
  closeNewCRModal: () => void;
  isNotificationPanelOpen: boolean;
  setIsNotificationPanelOpen: (open: boolean) => void;
  isSidebarCollapsed: boolean;
  setIsSidebarCollapsed: (collapsed: boolean) => void;
  toggleSidebarCollapsed: () => void;
  toast: ToastState | null;
  showToast: (message: string, type?: 'success' | 'info' | 'warning' | 'error') => void;
  // Live Pitch Demo Workflow
  demoStep: number;
  setDemoStep: (step: number) => void;
  goToDemoStep: (step: number) => void;
  nextDemoStep: () => void;
  prevDemoStep: () => void;
  resetDemo: () => void;
  // Production Snapshot
  isProductionSnapshotOpen: boolean;
  setIsProductionSnapshotOpen: (open: boolean) => void;
  openProductionSnapshot: () => void;
  closeProductionSnapshot: () => void;
  // Change Request Detail
  activeChangeRequestDetail: ChangeRequest | null;
  setActiveChangeRequestDetail: (cr: ChangeRequest | null) => void;
  isChangeRequestDetailOpen: boolean;
  setIsChangeRequestDetailOpen: (open: boolean) => void;
  // Workflow step helper actions
  updateSpecForEmmaCR: () => void;
  createVersion05: () => void;
  sendVersion05ForReview: () => void;
  // Mutations
  approveOrderVersion: (orderId: string, versionNumber: string, note?: string) => void;
  requestChanges: (orderId: string, title: string, description: string, affectedBlockKey: string, priority?: string) => void;
  lockForProduction: (orderId: string) => void;
  unlockProduction: (orderId: string) => void;
  updateSpecBlock: (orderId: string, blockId: string, newValue: string, details?: Record<string, string | number>) => void;
  addSpecComment: (orderId: string, blockId: string, text: string) => void;
  createChangeRequest: (data: {
    title: string;
    description: string;
    affectedBlockKey: string;
    affectedBlockTitle: string;
    priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  }) => void;
  updateChangeRequestStatus: (crId: string, status: ChangeRequestStatus, note?: string) => void;
  publishNewVersion: (orderId: string, title: string, changes: string[]) => void;
  uploadDesignFile: (orderId: string, fileData: { name: string; size: string; type: 'vector' | 'raster' | 'techpack' | 'mockup'; cmykReady?: boolean; resolutionDpi?: number }) => void;
  updateOrderThumbnail: (orderId: string, thumbnail: string) => void;
  sendForCustomerReview: (orderId: string, note?: string) => void;
  markNotificationRead: (notifId: string) => void;
  markAllNotificationsRead: () => void;
  toggleAuditLogResolved: (logId: string) => void;
  toggleZaloEvent: (eventName: keyof ZaloIntegrationConfig['events']) => void;
  sendTestZaloNotification: () => void;
  isBellAnimating: boolean;
  triggerBellAnimation: () => void;
  simulateIncomingNotification: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<UserProfile>(MOCK_USERS.vendor);
  const [currentView, setCurrentView] = useState<AppView>('designer_dashboard');
  const [selectedOrderId, setSelectedOrderId] = useState<string>('order-1024');
  const [activeCustomerWorkspaceOrderId, setActiveCustomerWorkspaceOrderId] = useState<string | null>(null);
  const [selectedVersion, setSelectedVersion] = useState<string>('v04');
  const [orders, setOrders] = useState<Order[]>(INITIAL_ORDERS);
  const [workspaces, setWorkspaces] = useState<Workspace[]>(MOCK_WORKSPACES);
  const [activeWorkspace, setActiveWorkspace] = useState<Workspace>(MOCK_WORKSPACES[0]);
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>(INITIAL_AUDIT_LOGS);
  const [notifications, setNotifications] = useState<AppNotification[]>(INITIAL_NOTIFICATIONS);
  const [zaloConfig, setZaloConfig] = useState<ZaloIntegrationConfig>(INITIAL_ZALO_CONFIG);

  // Modals & Panels
  const [diffBaseVersion, setDiffBaseVersion] = useState<string | null>(null);
  const [diffTargetVersion, setDiffTargetVersion] = useState<string | null>(null);
  const [diffViewStep, setDiffViewStep] = useState<'select_product' | 'compare'>('select_product');
  const [isDiffModalOpen, setIsDiffModalOpen] = useState(false);
  const [isNewCRModalOpen, setIsNewCRModalOpen] = useState(false);
  const [isNotificationPanelOpen, setIsNotificationPanelOpen] = useState(false);
  const [isBellAnimating, setIsBellAnimating] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);

  const setDiffVersions = (base: string | null, target: string | null) => {
    setDiffBaseVersion(base);
    setDiffTargetVersion(target);
  };

  const openDiffModal = (orderId?: string, baseVersion?: string, targetVersion?: string) => {
    if (orderId) {
      setSelectedOrderId(orderId);
    }
    if (baseVersion !== undefined) setDiffBaseVersion(baseVersion);
    if (targetVersion !== undefined) setDiffTargetVersion(targetVersion);
    setIsDiffModalOpen(true);
  };

  const navigateToDiffView = (orderId?: string, baseVersion?: string, targetVersion?: string) => {
    if (orderId) {
      setSelectedOrderId(orderId);
      setDiffViewStep('compare');
    } else {
      setDiffViewStep('select_product');
    }
    if (baseVersion !== undefined) setDiffBaseVersion(baseVersion);
    if (targetVersion !== undefined) setDiffTargetVersion(targetVersion);
    setCurrentView('diff_view');
  };

  // Sidebar Collapse / Expand state with localStorage persistence
  const [isSidebarCollapsed, setIsSidebarCollapsedState] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('proofprint_sidebar_collapsed');
      return saved === 'true';
    } catch {
      return false;
    }
  });

  const setIsSidebarCollapsed = (collapsed: boolean) => {
    setIsSidebarCollapsedState(collapsed);
    try {
      localStorage.setItem('proofprint_sidebar_collapsed', String(collapsed));
    } catch {
      // ignore
    }
  };

  const toggleSidebarCollapsed = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };

  // Live Presentation Demo State
  const [demoStep, setDemoStep] = useState<number>(1);
  const [isProductionSnapshotOpen, setIsProductionSnapshotOpen] = useState(false);
  const [activeChangeRequestDetail, setActiveChangeRequestDetail] = useState<ChangeRequest | null>(null);
  const [isChangeRequestDetailOpen, setIsChangeRequestDetailOpen] = useState(false);

  const triggerBellAnimation = () => {
    setIsBellAnimating(true);
    setTimeout(() => {
      setIsBellAnimating(false);
    }, 1800);
  };

  const simulateIncomingNotification = () => {
    const samples = [
      {
        title: 'YÊU CẦU THAY ĐỔI MỚI',
        message: 'Khách hàng Emma vừa gửi Change Request CR-112 cho đơn PP-1024.',
        type: 'change_request' as const,
        orderId: 'order-1024',
        versionId: 'v04',
      },
      {
        title: 'TÓM TẮT AI ĐÃ SẴN SÀNG',
        message: 'AI đã hoàn tất tóm tắt các thay đổi trong Phiên bản 04: tất cả nằm trong ngưỡng dung sai in.',
        type: 'ai_summary' as const,
        orderId: 'order-1024',
        versionId: 'v04',
      },
      {
        title: 'PHIÊN BẢN MỚI ĐƯỢC PHÁT HÀNH',
        message: 'Phiên bản v04 đã được cập nhật tệp vector CMYK 300 DPI.',
        type: 'new_version' as const,
        orderId: 'order-1024',
        versionId: 'v04',
      },
      {
        title: 'BÌNH LUẬN MỚI TỪ KHÁCH HÀNG',
        message: 'Emma vừa bình luận: "Vị trí logo sau lưng đã rất cân đối, cảm ơn bạn!"',
        type: 'comment' as const,
        orderId: 'order-1024',
        versionId: 'v04',
      },
      {
        title: 'KHÁCH HÀNG ĐÃ PHÊ DUYỆT',
        message: 'Khách hàng Emma đã phê duyệt thông số kỹ thuật cho Đơn hàng PP-1018.',
        type: 'approval' as const,
        orderId: 'order-1018',
        versionId: 'v03',
      },
      {
        title: 'ĐÃ KHÓA SẢN XUẤT',
        message: 'Đơn hàng PP-1021 đã được chốt và khóa sản xuất hoàn tất (Production Locked).',
        type: 'production_locked' as const,
        orderId: 'order-1021',
        versionId: 'v02',
      },
    ];
    const item = samples[Math.floor(Math.random() * samples.length)];
    addNotification(item.title, item.message, item.type, item.orderId, item.versionId);
    showToast(`Nhận thông báo mới: "${item.title}"`, 'info');
  };

  const showToast = (message: string, type: 'success' | 'info' | 'warning' | 'error' = 'success') => {
    const id = Date.now();
    setToast({ id, message, type });
    setTimeout(() => {
      setToast((prev) => (prev?.id === id ? null : prev));
    }, 4000);
  };

  const switchRole = (role: UserRole) => {
    const targetUser = MOCK_USERS[role];
    setCurrentUser(targetUser);
    if (role === 'customer') {
      setCurrentView('customer_dashboard');
      setActiveCustomerWorkspaceOrderId(null);
    } else {
      setCurrentView('designer_dashboard');
    }
    showToast(`Đã chuyển giao diện sang ${targetUser.name} (${targetUser.title})`, 'info');
  };

  const selectedOrder = orders.find((o) => o.id === selectedOrderId) || orders[0];

  const unreadNotificationsCount = notifications.filter((n) => !n.read).length;

  const addAuditLog = (
    action: string,
    details: string,
    badgeType: 'create' | 'update' | 'approval' | 'lock' | 'ai' | 'comment',
    orderId?: string,
    relatedVersion?: string
  ) => {
    const newLog: AuditLogItem = {
      id: `log-${Date.now()}`,
      userId: currentUser.id,
      userName: currentUser.name,
      userRole: currentUser.role,
      userAvatar: currentUser.avatar,
      action,
      details,
      timestamp: 'Just now',
      relatedVersion: relatedVersion || selectedVersion,
      orderId: orderId || selectedOrder.orderNumber,
      badgeType,
    };
    setAuditLogs((prev) => [newLog, ...prev]);
  };

  const addNotification = (
    title: string,
    message: string,
    type: AppNotification['type'],
    orderId?: string,
    versionId?: string
  ) => {
    const newNotif: AppNotification = {
      id: `notif-${Date.now()}`,
      title,
      message,
      timestamp: 'Just now',
      read: false,
      type,
      orderId,
      versionId,
      group: 'Today',
    };
    setNotifications((prev) => [newNotif, ...prev]);
    triggerBellAnimation();
  };

  const approveOrderVersion = (orderId: string, versionNumber: string, note?: string) => {
    const approver = currentUser.role === 'customer' ? 'Emma Watson' : currentUser.name;
    setOrders((prev) =>
      prev.map((ord) => {
        if (ord.id === orderId) {
          return {
            ...ord,
            status: 'APPROVED' as OrderStatus,
            approvedBy: approver,
            approvedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            versions: ord.versions.map((v) =>
              v.versionNumber === versionNumber ? { ...v, status: 'APPROVED' as OrderStatus } : v
            ),
          };
        }
        return ord;
      })
    );

    addAuditLog(
      `Phê duyệt Phiên bản ${versionNumber}`,
      note ? `Được ký duyệt bởi ${approver} kèm ghi chú: "${note}"` : `Được ký duyệt bởi ${approver} và xác nhận chuẩn bị sản xuất.`,
      'approval',
      selectedOrder.orderNumber,
      versionNumber
    );

    addNotification(
      'Phiên bản đã được phê duyệt',
      `${approver} đã chính thức phê duyệt Phiên bản ${versionNumber} cho Đơn hàng #${selectedOrder.orderNumber}.`,
      'approval_required',
      orderId,
      versionNumber
    );

    showToast(`Phiên bản ${versionNumber} đã được phê duyệt chính thức bởi ${approver}!`, 'success');
  };

  const requestChanges = (
    orderId: string,
    title: string,
    description: string,
    affectedBlockKey: string,
    priority: string = 'HIGH'
  ) => {
    const crCount = selectedOrder.changeRequests.length + 110;
    const newCRNumber = `CR-${crCount}`;
    const newCR: ChangeRequest = {
      id: `cr-${Date.now()}`,
      crNumber: newCRNumber,
      title,
      description,
      creatorId: currentUser.id,
      creatorName: currentUser.role === 'customer' ? 'Emma Watson' : currentUser.name,
      creatorRole: currentUser.role,
      creatorAvatar: currentUser.avatar,
      status: 'OPEN',
      priority: priority as any,
      relatedVersion: selectedVersion,
      affectedBlockKey,
      affectedBlockTitle: selectedOrder.specBlocks.find((b) => b.key === affectedBlockKey)?.title || 'Thông số kỹ thuật',
      createdAt: 'Vừa xong',
    };

    setOrders((prev) =>
      prev.map((ord) => {
        if (ord.id === orderId) {
          return {
            ...ord,
            status: 'CHANGE_REQUESTED' as OrderStatus,
            changeRequests: [newCR, ...ord.changeRequests],
          };
        }
        return ord;
      })
    );

    addAuditLog(
      `Đã gửi Yêu cầu chỉnh sửa ${newCRNumber}`,
      `"${title}" trên Phiên bản ${selectedVersion}.`,
      'create',
      selectedOrder.orderNumber,
      selectedVersion
    );

    addNotification(
      'Yêu cầu chỉnh sửa mới từ Emma',
      `${currentUser.role === 'customer' ? 'Emma Watson' : currentUser.name} đã gửi ${newCRNumber}: "${title}".`,
      'change_request',
      orderId
    );

    showToast(`Đã gửi Yêu cầu chỉnh sửa ${newCRNumber} thành công.`, 'info');
  };

  const lockForProduction = (orderId: string) => {
    const locker = currentUser.role === 'customer' ? 'Emma Watson' : currentUser.name;
    const lockTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setOrders((prev) =>
      prev.map((ord) => {
        if (ord.id === orderId) {
          return {
            ...ord,
            status: 'LOCKED_FOR_PRODUCTION' as OrderStatus,
            lockedBy: locker,
            lockedAt: lockTime,
            approvedBy: ord.approvedBy || 'Emma Watson',
            approvedAt: ord.approvedAt || lockTime,
            specBlocks: ord.specBlocks.map((b) => ({ ...b, isLocked: true })),
          };
        }
        return ord;
      })
    );

    addAuditLog(
      'Đã khóa để sản xuất',
      `Đã tạo ảnh chụp sản xuất cho Phiên bản ${selectedVersion}. Bản thiết kế hiện đã bất biến. Được duyệt bởi Emma.`,
      'lock',
      selectedOrder.orderNumber,
      selectedVersion
    );

    addNotification(
      'Đã khóa sản xuất',
      `Đơn hàng #${selectedOrder.orderNumber} đã được khóa để đưa vào dây chuyền may xưởng. Được duyệt bởi Emma.`,
      'production_locked',
      orderId
    );

    setIsProductionSnapshotOpen(true);
    showToast('Đơn hàng đã khóa để sản xuất! Đã xác thực ảnh chụp sản xuất.', 'success');
  };

  const updateSpecForEmmaCR = () => {
    setOrders((prev) =>
      prev.map((ord) => {
        if (ord.id === 'order-1024') {
          const updatedBlocks = ord.specBlocks.map((b) => {
            if (b.key === 'logo') {
              return {
                ...b,
                value: '',
                details: {
                  ...b.details,
                  'Cổ tay áo trái': 'Thêu chữ tonal chìm Pantone 11-0601 TCX cao 1.2 cm',
                  'Khoảng cách gấu tay': 'Cách mép bo tay áo 5 cm',
                },
                changeDelta: {
                  label: 'Sleeve Wordmark',
                  from: 'None',
                  to: 'Tonal embroidery (Pantone 11-0601 TCX)',
                },
              };
            }
            if (b.key === 'design_files') {
              return {
                ...b,
                value: 'design_v5.png (hoodie_back_vector_v5_cuff_spec.pdf) + Tech Pack PDF',
                changeDelta: {
                  label: 'Design File',
                  from: 'design_v4.png',
                  to: 'design_v5.png',
                },
              };
            }
            return b;
          });
          return {
            ...ord,
            specBlocks: updatedBlocks,
          };
        }
        return ord;
      })
    );
    addAuditLog(
      'Updated Specification for CR-111',
      'Added tonal sleeve embroidery on left cuff sleeve in Pantone 11-0601 TCX.',
      'update',
      'PP-1024',
      'v04'
    );
  };

  const createVersion05 = () => {
    const v05: OrderVersion = {
      id: 'ver-5',
      versionNumber: 'v05',
      title: 'Version 05 — Added sleeve embroidery & refined cuff ribbing',
      createdAt: 'Just now',
      createdBy: 'Alex Rivera (Designer)',
      status: 'IN_REVIEW',
      changeSummary: [
        'Added subtle tonal embroidery wordmark on left cuff sleeve in Pantone 11-0601 TCX',
        'Maintained 20 × 15 cm back logo dimensions with 100% resting hood clearance',
        'Replaced master production asset with design_v5.png (300 DPI CMYK vector)',
      ],
      aiNotes: 'AI Tolerance Verification: Sleeve embroidery file matches tension rating of 420 GSM French Terry cuff ribbing. Zero distortion detected.',
      snapshotData: {
        quantity: 60,
        backLogoSize: '20 × 15 cm',
        designFileName: 'design_v5.png',
        pantoneColor: 'Pantone 19-4052 TCX (Classic Deep Navy)',
        material: '420 GSM 100% Combed Cotton Heavy French Terry',
      },
    };

    setOrders((prev) =>
      prev.map((ord) => {
        if (ord.id === 'order-1024') {
          const versionsWithoutV5 = ord.versions.filter((v) => v.versionNumber !== 'v05');
          return {
            ...ord,
            currentVersion: 'v05',
            status: 'IN_REVIEW',
            versions: [v05, ...versionsWithoutV5],
            changeRequests: ord.changeRequests.map((cr) =>
              cr.crNumber === 'CR-111'
                ? { ...cr, status: 'RESOLVED' as ChangeRequestStatus, resolvedInVersion: 'v05' }
                : cr
            ),
          };
        }
        return ord;
      })
    );
    setSelectedVersion('v05');
    addAuditLog(
      'Created Version 05',
      'Compiled Version 05 with cuff embroidery and updated design_v5.png.',
      'create',
      'PP-1024',
      'v05'
    );
  };

  const sendVersion05ForReview = () => {
    setOrders((prev) =>
      prev.map((ord) => {
        if (ord.id === 'order-1024') {
          return {
            ...ord,
            status: 'IN_REVIEW',
          };
        }
        return ord;
      })
    );

    addNotification(
      'Version 05 is waiting for your approval',
      'Alex Rivera submitted Version 05 with left cuff tonal embroidery wordmark.',
      'approval_required',
      'order-1024',
      'v05'
    );

    addAuditLog(
      'Dispatched Version 05 for Approval',
      'Version 05 is waiting for Emma Watson\'s review.',
      'update',
      'PP-1024',
      'v05'
    );
  };

  const goToDemoStep = (step: number) => {
    setDemoStep(step);
    switch (step) {
      case 1:
        // 1. Login as Customer.
        setCurrentUser(MOCK_USERS.customer);
        setCurrentView('customer_dashboard');
        setSelectedOrderId('order-1024');
        setIsDiffModalOpen(false);
        setIsNewCRModalOpen(false);
        setIsChangeRequestDetailOpen(false);
        setIsProductionSnapshotOpen(false);
        showToast('Bước 1: Đăng nhập với tư cách Khách hàng (Emma Watson)', 'info');
        break;

      case 2:
        // 2. Open ORDER #PP-1024 — Custom Hoodie.
        setCurrentUser(MOCK_USERS.customer);
        setSelectedOrderId('order-1024');
        setCurrentView('order_workspace');
        setIsDiffModalOpen(false);
        setIsNewCRModalOpen(false);
        setIsChangeRequestDetailOpen(false);
        showToast('Bước 2: Mở Đơn hàng #PP-1024 — Áo Hoodie theo yêu cầu', 'info');
        break;

      case 3:
        // 3. Show Version 03.
        setCurrentUser(MOCK_USERS.customer);
        setSelectedOrderId('order-1024');
        setCurrentView('order_workspace');
        setSelectedVersion('v03');
        setIsDiffModalOpen(false);
        showToast('Bước 3: Hiển thị thông số kỹ thuật chuẩn của Phiên bản 03', 'info');
        break;

      case 4:
        // 4. Switch to Version 04.
        setCurrentUser(MOCK_USERS.customer);
        setSelectedOrderId('order-1024');
        setCurrentView('order_workspace');
        setSelectedVersion('v04');
        setIsDiffModalOpen(false);
        showToast('Bước 4: Chuyển sang Phiên bản 04 (Chờ xem xét)', 'info');
        break;

      case 5:
        // 5. Display Diff: Back Logo: 25 × 18 cm → 20 × 15 cm, Design File: design_v3.png → design_v4.png
        setCurrentUser(MOCK_USERS.customer);
        setSelectedOrderId('order-1024');
        setCurrentView('order_workspace');
        setSelectedVersion('v04');
        setIsDiffModalOpen(true);
        setIsNewCRModalOpen(false);
        showToast('Bước 5: Hiển thị so sánh (Logo lưng & Tệp thiết kế)', 'info');
        break;

      case 6:
        // 6. Display AI Change Summary.
        setCurrentUser(MOCK_USERS.customer);
        setSelectedOrderId('order-1024');
        setCurrentView('order_workspace');
        setSelectedVersion('v04');
        setIsDiffModalOpen(true);
        showToast('Bước 6: Hiển thị tóm tắt thay đổi từ AI', 'info');
        break;

      case 7:
        // 7. Customer clicks Request Changes.
        setCurrentUser(MOCK_USERS.customer);
        setSelectedOrderId('order-1024');
        setCurrentView('order_workspace');
        setIsDiffModalOpen(false);
        setIsNewCRModalOpen(true);
        showToast('Bước 7: Khách hàng nhấn Yêu cầu chỉnh sửa', 'info');
        break;

      case 8:
        // 8. Open modal: "Describe what you want to change."
        setCurrentUser(MOCK_USERS.customer);
        setIsDiffModalOpen(false);
        setIsNewCRModalOpen(true);
        showToast('Bước 8: Mở hộp thoại "Mô tả nội dung bạn muốn chỉnh sửa."', 'info');
        break;

      case 9:
        // 9. Submit request.
        setIsNewCRModalOpen(false);
        setOrders((prev) =>
          prev.map((ord) =>
            ord.id === 'order-1024'
              ? {
                  ...ord,
                  status: 'CHANGE_REQUESTED' as OrderStatus,
                  changeRequests: [
                    {
                      id: 'cr-emma-111',
                      crNumber: 'CR-111',
                      title: 'Thêm thêu chữ tinh tế đồng màu trên cổ tay áo trái',
                      description:
                        'Vui lòng thêm thêu chữ tinh tế đồng màu trên cổ tay áo trái theo mã Pantone 11-0601 TCX, và xác nhận khoảng hở mũ trùm đầu khi thả lỏng.',
                      creatorId: MOCK_USERS.customer.id,
                      creatorName: 'Emma Watson',
                      creatorRole: 'customer',
                      creatorAvatar: MOCK_USERS.customer.avatar,
                      status: 'OPEN',
                      priority: 'HIGH',
                      relatedVersion: 'v04',
                      affectedBlockKey: 'logo',
                      affectedBlockTitle: 'Thông số Logo & Hình in',
                      createdAt: 'Vừa xong',
                    },
                    ...ord.changeRequests.filter((c) => c.crNumber !== 'CR-111'),
                  ],
                }
              : ord
          )
        );
        showToast('Bước 9: Emma Watson đã gửi yêu cầu chỉnh sửa!', 'success');
        break;

      case 10:
        // 10. Show a new notification for the Designer.
        addNotification(
          'Yêu cầu chỉnh sửa mới từ Emma',
          'Emma Watson đã gửi CR-111: Thêm thêu chữ tinh tế đồng màu trên cổ tay áo trái.',
          'change_request',
          'order-1024',
          'v04'
        );
        triggerBellAnimation();
        showToast('Bước 10: Nhà thiết kế đã nhận thông báo mới!', 'info');
        break;

      case 11:
        // 11. Switch to Designer account.
        setCurrentUser(MOCK_USERS.vendor);
        setCurrentView('designer_dashboard');
        setIsDiffModalOpen(false);
        setIsNewCRModalOpen(false);
        setIsChangeRequestDetailOpen(false);
        showToast('Bước 11: Chuyển sang tài khoản Nhà thiết kế (Alex Rivera)', 'info');
        break;

      case 12:
        // 12. Show "New Change Request from Emma."
        setCurrentUser(MOCK_USERS.vendor);
        setCurrentView('designer_dashboard');
        showToast('Bước 12: Hiển thị "Yêu cầu chỉnh sửa mới từ Emma"', 'info');
        break;

      case 13:
        // 13. Designer opens Change Request.
        setCurrentUser(MOCK_USERS.vendor);
        setIsChangeRequestDetailOpen(true);
        showToast('Bước 13: Nhà thiết kế mở Yêu cầu chỉnh sửa CR-111', 'info');
        break;

      case 14:
        // 14. Designer updates specification.
        setCurrentUser(MOCK_USERS.vendor);
        setIsChangeRequestDetailOpen(true);
        updateSpecForEmmaCR();
        showToast('Bước 14: Nhà thiết kế đã cập nhật thông số kỹ thuật', 'success');
        break;

      case 15:
        // 15. Create Version 05.
        setCurrentUser(MOCK_USERS.vendor);
        setIsChangeRequestDetailOpen(true);
        createVersion05();
        showToast('Bước 15: Đã tạo Phiên bản 05', 'success');
        break;

      case 16:
        // 16. Send Version 05 for review.
        setCurrentUser(MOCK_USERS.vendor);
        sendVersion05ForReview();
        setIsChangeRequestDetailOpen(false);
        showToast('Bước 16: Đã gửi Phiên bản 05 để khách hàng xem xét!', 'success');
        break;

      case 17:
        // 17. Switch back to Customer.
        setCurrentUser(MOCK_USERS.customer);
        setCurrentView('order_workspace');
        setSelectedVersion('v05');
        setIsChangeRequestDetailOpen(false);
        setIsDiffModalOpen(false);
        setIsNewCRModalOpen(false);
        showToast('Bước 17: Chuyển lại sang Khách hàng (Emma Watson)', 'info');
        break;

      case 18:
        // 18. Show "Version 05 is waiting for your approval."
        setCurrentUser(MOCK_USERS.customer);
        setCurrentView('order_workspace');
        setSelectedVersion('v05');
        showToast('Bước 18: Hiển thị "Phiên bản 05 đang chờ bạn phê duyệt"', 'info');
        break;

      case 19:
        // 19. Customer clicks Approve Version.
        setCurrentUser(MOCK_USERS.customer);
        approveOrderVersion('order-1024', 'v05');
        showToast('Bước 19: Khách hàng đã phê duyệt Phiên bản 05!', 'success');
        break;

      case 20:
        // 20. Show APPROVED.
        setCurrentUser(MOCK_USERS.customer);
        showToast('Bước 20: Trạng thái hiện tại là ĐÃ PHÊ DUYỆT', 'success');
        break;

      case 21:
        // 21. Show Lock for Production.
        setCurrentUser(MOCK_USERS.customer);
        showToast('Bước 21: Nổi bật hành động "Khóa để sản xuất"', 'info');
        break;

      case 22:
        // 22. Click it.
        setCurrentUser(MOCK_USERS.customer);
        lockForProduction('order-1024');
        showToast('Bước 22: Đang khóa đơn hàng để xưởng may sản xuất...', 'info');
        break;

      case 23:
        // 23. Final state: LOCKED FOR PRODUCTION.
        setCurrentUser(MOCK_USERS.customer);
        setIsProductionSnapshotOpen(true);
        showToast('Bước 23: Trạng thái cuối cùng — ĐÃ KHÓA ĐỂ SẢN XUẤT!', 'success');
        break;

      default:
        break;
    }
  };

  const nextDemoStep = () => {
    if (demoStep >= 23) {
      resetDemo();
    } else {
      goToDemoStep(demoStep + 1);
    }
  };

  const prevDemoStep = () => {
    if (demoStep > 1) {
      goToDemoStep(demoStep - 1);
    }
  };

  const resetDemo = () => {
    setOrders(INITIAL_ORDERS);
    setCurrentUser(MOCK_USERS.customer);
    setCurrentView('customer_dashboard');
    setSelectedOrderId('order-1024');
    setSelectedVersion('v04');
    setDemoStep(1);
    setIsDiffModalOpen(false);
    setIsNewCRModalOpen(false);
    setIsChangeRequestDetailOpen(false);
    setIsProductionSnapshotOpen(false);
    showToast('Đã đặt lại kịch bản Demo về Bước 1 (Đăng nhập Khách hàng)', 'info');
  };

  const unlockProduction = (orderId: string) => {
    setOrders((prev) =>
      prev.map((ord) => {
        if (ord.id === orderId) {
          return {
            ...ord,
            status: 'IN_REVIEW' as OrderStatus,
            lockedBy: undefined,
            lockedAt: undefined,
            specBlocks: ord.specBlocks.map((b) => ({ ...b, isLocked: false })),
          };
        }
        return ord;
      })
    );

    addAuditLog(
      'Đã mở khóa sản xuất',
      'Đơn hàng được chuyển lại trạng thái xem xét để chỉnh sửa.',
      'update',
      selectedOrder.orderNumber,
      selectedVersion
    );

    showToast('Đã mở khóa sản xuất để tiếp tục chỉnh sửa.', 'info');
  };

  const updateSpecBlock = (
    orderId: string,
    blockId: string,
    newValue: string,
    details?: Record<string, string | number>
  ) => {
    setOrders((prev) =>
      prev.map((ord) => {
        if (ord.id === orderId) {
          return {
            ...ord,
            specBlocks: ord.specBlocks.map((b) => {
              if (b.id === blockId) {
                return {
                  ...b,
                  value: newValue,
                  details: details || b.details,
                  modifiedInVersion: ord.currentVersion,
                };
              }
              return b;
            }),
          };
        }
        return ord;
      })
    );

    addAuditLog(
      'Đã chỉnh sửa khối thông số',
      `Cập nhật nội dung thông số trên ${selectedOrder.orderNumber}.`,
      'update',
      selectedOrder.orderNumber,
      selectedVersion
    );

    showToast('Đã cập nhật khối thông số kỹ thuật thành công.', 'success');
  };

  const addSpecComment = (orderId: string, blockId: string, text: string) => {
    const newComment = {
      id: `c-${Date.now()}`,
      authorId: currentUser.id,
      authorName: currentUser.name,
      authorRole: currentUser.role,
      authorAvatar: currentUser.avatar,
      createdAt: 'Vừa xong',
      text,
    };

    setOrders((prev) =>
      prev.map((ord) => {
        if (ord.id === orderId) {
          return {
            ...ord,
            specBlocks: ord.specBlocks.map((b) => {
              if (b.id === blockId) {
                return {
                  ...b,
                  comments: [...b.comments, newComment],
                };
              }
              return b;
            }),
          };
        }
        return ord;
      })
    );

    addAuditLog(
      'Thêm bình luận vào thông số',
      `Đã bình luận: "${text.substring(0, 45)}${text.length > 45 ? '...' : ''}"`,
      'comment',
      selectedOrder.orderNumber
    );

    showToast('Đã gửi bình luận vào khối thông số kỹ thuật.', 'info');
  };

  const createChangeRequest = (data: {
    title: string;
    description: string;
    affectedBlockKey: string;
    affectedBlockTitle: string;
    priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  }) => {
    requestChanges(
      selectedOrder.id,
      data.title,
      data.description,
      data.affectedBlockKey,
      data.priority || 'HIGH'
    );
    setIsNewCRModalOpen(false);
  };

  const updateChangeRequestStatus = (crId: string, status: ChangeRequestStatus, note?: string) => {
    setOrders((prev) =>
      prev.map((ord) => ({
        ...ord,
        changeRequests: ord.changeRequests.map((cr) =>
          cr.id === crId
            ? {
                ...cr,
                status,
                resolvedInVersion: status === 'RESOLVED' ? ord.currentVersion : cr.resolvedInVersion,
                resolutionNotes: note || cr.resolutionNotes,
              }
            : cr
        ),
      }))
    );

    addAuditLog(
      `Cập nhật trạng thái ${crId} thành ${status}`,
      note || `Chuyển trạng thái bởi ${currentUser.name}.`,
      'update',
      selectedOrder.orderNumber
    );

    showToast(`Đã cập nhật trạng thái Yêu cầu chỉnh sửa thành ${status}.`, 'info');
  };

  const publishNewVersion = (orderId: string, title: string, changes: string[]) => {
    const nextVerNum = `v0${selectedOrder.versions.length + 1}`;
    const newVersion = {
      id: `ver-${Date.now()}`,
      versionNumber: nextVerNum,
      title,
      createdAt: 'Vừa xong',
      createdBy: `${currentUser.name} (${currentUser.role === 'vendor' ? 'Xưởng sản xuất' : 'Khách hàng'})`,
      status: 'IN_REVIEW' as OrderStatus,
      changeSummary: changes,
      aiNotes: `Tóm tắt AI đã tạo cho ${nextVerNum}. Đã xác nhận sai số dung sai.`,
      snapshotData: {
        quantity: selectedOrder.targetQuantity,
        backLogoSize: '20 × 15 cm',
        designFileName: 'artwork_master.pdf',
        pantoneColor: 'Pantone 19-4052 TCX',
        material: '420 GSM Vải nỉ chân cua French Terry cao cấp',
      },
    };

    setOrders((prev) =>
      prev.map((ord) => {
        if (ord.id === orderId) {
          return {
            ...ord,
            currentVersion: nextVerNum,
            status: 'IN_REVIEW' as OrderStatus,
            versions: [newVersion, ...ord.versions],
          };
        }
        return ord;
      })
    );

    setSelectedVersion(nextVerNum);

    addAuditLog(
      `Đã phát hành Phiên bản ${nextVerNum}`,
      `"${title}" với ${changes.length} thay đổi được ghi nhận.`,
      'update',
      selectedOrder.orderNumber,
      nextVerNum
    );

    addNotification(
      'Đã phát hành phiên bản mới',
      `Phiên bản ${nextVerNum} đã sẵn sàng xem xét trên #${selectedOrder.orderNumber}.`,
      'new_version',
      orderId,
      nextVerNum
    );

    showToast(`Đã phát hành Phiên bản ${nextVerNum}!`, 'success');
  };

  const uploadDesignFile = (
    orderId: string,
    fileData: {
      name: string;
      size: string;
      type: 'vector' | 'raster' | 'techpack' | 'mockup';
      cmykReady?: boolean;
      resolutionDpi?: number;
    }
  ) => {
    const newFile = {
      id: `df-${Date.now()}`,
      name: fileData.name,
      size: fileData.size,
      type: fileData.type,
      version: selectedVersion,
      uploadedAt: 'Vừa xong',
      uploadedBy: currentUser.name,
      previewUrl: 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=600&auto=format&fit=crop&q=80',
      cmykReady: fileData.cmykReady ?? true,
      resolutionDpi: fileData.resolutionDpi ?? 300,
    };

    setOrders((prev) =>
      prev.map((ord) => {
        if (ord.id === orderId) {
          return {
            ...ord,
            designFiles: [newFile, ...(ord.designFiles || [])],
            lastUpdated: 'Vừa xong',
          };
        }
        return ord;
      })
    );

    addAuditLog(
      'Tải lên tệp thiết kế',
      `Đã tải lên ${fileData.name} (${fileData.size}) cho ${selectedVersion}`,
      'create',
      selectedOrder.orderNumber,
      selectedVersion
    );

    showToast(`Tải lên ${fileData.name} thành công. Đã xác thực chuẩn CMYK và DPI.`, 'success');
  };

  const updateOrderThumbnail = (orderId: string, thumbnail: string) => {
    setOrders((prev) =>
      prev.map((ord) => {
        if (ord.id === orderId) {
          return {
            ...ord,
            thumbnail,
            lastUpdated: 'Vừa xong',
          };
        }
        return ord;
      })
    );
  };

  const sendForCustomerReview = (orderId: string, note?: string) => {
    setOrders((prev) =>
      prev.map((ord) => {
        if (ord.id === orderId) {
          return {
            ...ord,
            status: 'IN_REVIEW' as OrderStatus,
            lastUpdated: 'Vừa xong',
            latestActivity: `Gửi để khách hàng ký duyệt: ${note || 'Đã gửi bản sửa đổi'}`,
          };
        }
        return ord;
      })
    );

    addNotification(
      'Nhà thiết kế yêu cầu xem xét',
      `${currentUser.name} đã gửi ${selectedVersion} của #${selectedOrder.orderNumber} để khách hàng ký duyệt.`,
      'approval_required',
      orderId,
      selectedVersion
    );

    addAuditLog(
      'Gửi để khách hàng xem xét',
      note || `Đã gửi ${selectedVersion} cho ${selectedOrder.customerName} để kiểm tra kỹ thuật số.`,
      'update',
      selectedOrder.orderNumber,
      selectedVersion
    );

    showToast(`Đã gửi ${selectedVersion} để khách hàng xem xét! Đã phát thông báo.`, 'success');
  };

  const markNotificationRead = (notifId: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === notifId ? { ...n, read: true } : n))
    );
  };

  const markAllNotificationsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    showToast('Đã đánh dấu tất cả thông báo là đã đọc', 'info');
  };

  const toggleAuditLogResolved = (logId: string) => {
    setAuditLogs((prev) =>
      prev.map((log) => {
        if (log.id === logId) {
          const nextStatus = log.status === 'resolved' ? 'pending' : 'resolved';
          return {
            ...log,
            status: nextStatus,
          };
        }
        return log;
      })
    );
  };

  const toggleZaloEvent = (eventName: keyof ZaloIntegrationConfig['events']) => {
    setZaloConfig((prev) => ({
      ...prev,
      events: {
        ...prev.events,
        [eventName]: !prev.events[eventName],
      },
    }));
    showToast(`Đã cập nhật kích hoạt webhook Zalo cho ${eventName}`, 'info');
  };

  const sendTestZaloNotification = () => {
    showToast('Đã gửi cảnh báo ZNS Zalo thử nghiệm: "Đơn hàng #PP-1024 v04 đang chờ phê duyệt"', 'success');
  };

  return (
    <AppContext.Provider
      value={{
        currentUser,
        switchRole,
        currentView,
        setCurrentView,
        selectedOrderId,
        setSelectedOrderId,
        activeCustomerWorkspaceOrderId,
        setActiveCustomerWorkspaceOrderId,
        selectedOrder,
        selectedVersion,
        setSelectedVersion,
        orders,
        workspaces,
        activeWorkspace,
        setActiveWorkspace,
        auditLogs,
        toggleAuditLogResolved,
        notifications,
        unreadNotificationsCount,
        zaloConfig,
        diffBaseVersion,
        diffTargetVersion,
        diffViewStep,
        setDiffViewStep,
        setDiffVersions,
        isDiffModalOpen,
        openDiffModal,
        closeDiffModal: () => setIsDiffModalOpen(false),
        navigateToDiffView,
        isNewCRModalOpen,
        openNewCRModal: () => setIsNewCRModalOpen(true),
        closeNewCRModal: () => setIsNewCRModalOpen(false),
        isNotificationPanelOpen,
        setIsNotificationPanelOpen,
        isSidebarCollapsed,
        setIsSidebarCollapsed,
        toggleSidebarCollapsed,
        toast,
        showToast,
        // Live Pitch Demo Workflow
        demoStep,
        setDemoStep,
        goToDemoStep,
        nextDemoStep,
        prevDemoStep,
        resetDemo,
        // Production Snapshot
        isProductionSnapshotOpen,
        setIsProductionSnapshotOpen,
        openProductionSnapshot: () => setIsProductionSnapshotOpen(true),
        closeProductionSnapshot: () => setIsProductionSnapshotOpen(false),
        // Change Request Detail
        activeChangeRequestDetail,
        setActiveChangeRequestDetail,
        isChangeRequestDetailOpen,
        setIsChangeRequestDetailOpen,
        // Helper actions
        updateSpecForEmmaCR,
        createVersion05,
        sendVersion05ForReview,
        // Mutations
        approveOrderVersion,
        requestChanges,
        lockForProduction,
        unlockProduction,
        updateSpecBlock,
        addSpecComment,
        createChangeRequest,
        updateChangeRequestStatus,
        publishNewVersion,
        uploadDesignFile,
        updateOrderThumbnail,
        sendForCustomerReview,
        markNotificationRead,
        markAllNotificationsRead,
        toggleZaloEvent,
        sendTestZaloNotification,
        isBellAnimating,
        triggerBellAnimation,
        simulateIncomingNotification,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
