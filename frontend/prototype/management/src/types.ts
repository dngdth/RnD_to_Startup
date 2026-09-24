export type UserRole = 'vendor' | 'customer';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  company: string;
  avatar: string;
  title: string;
}

export type OrderStatus = 'DRAFT' | 'IN_REVIEW' | 'CHANGE_REQUESTED' | 'APPROVED' | 'LOCKED_FOR_PRODUCTION';

export type ChangeRequestStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'REJECTED';

export type ChangeRequestPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export interface SpecComment {
  id: string;
  authorId: string;
  authorName: string;
  authorRole: UserRole;
  authorAvatar: string;
  createdAt: string;
  text: string;
}

export interface SpecBlock {
  id: string;
  key: string;
  title: string;
  category: 'general' | 'material' | 'measurements' | 'artwork' | 'production' | 'assets';
  value: string;
  details?: Record<string, string | number>;
  modifiedInVersion?: string;
  previousValue?: string;
  changeDelta?: {
    label: string;
    from: string;
    to: string;
  };
  comments: SpecComment[];
  isLocked?: boolean;
}

export interface DesignFile {
  id: string;
  name: string;
  size: string;
  type: 'vector' | 'raster' | 'techpack' | 'mockup';
  version: string;
  uploadedAt: string;
  uploadedBy: string;
  previewUrl: string;
  cmykReady: boolean;
  resolutionDpi: number;
}

export interface OrderVersion {
  id: string;
  versionNumber: string; // e.g. "v01", "v02", "v03", "v04"
  title: string;
  createdAt: string;
  createdBy: string;
  status: OrderStatus;
  changeSummary: string[];
  aiNotes: string;
  snapshotData: {
    quantity: number;
    backLogoSize: string;
    designFileName: string;
    pantoneColor: string;
    material: string;
  };
}

export interface ChangeRequest {
  id: string;
  crNumber: string; // e.g. "CR-109"
  title: string;
  description: string;
  creatorId: string;
  creatorName: string;
  creatorRole: UserRole;
  creatorAvatar: string;
  status: ChangeRequestStatus;
  priority: ChangeRequestPriority;
  relatedVersion: string;
  affectedBlockKey: string;
  affectedBlockTitle: string;
  createdAt: string;
  resolvedInVersion?: string;
  resolutionNotes?: string;
}

export interface AuditLogItem {
  id: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  userAvatar: string;
  action: string;
  details: string;
  timestamp: string;
  relatedVersion?: string;
  orderId?: string;
  badgeType: 'create' | 'update' | 'approval' | 'lock' | 'ai' | 'comment';
  customerId?: string;
  customerName?: string;
  customerCompany?: string;
  customerAvatar?: string;
  category?: 'comment' | 'change_request' | 'approval' | 'version' | 'spec_update' | 'ai_summary' | 'production_lock';
  status?: 'pending' | 'resolved'; // 'Chưa xử lý' | 'Đã xử lý'
  isActionable?: boolean; // Can be marked as processed/resolved
  crNumber?: string;
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  type:
    | 'change_request'
    | 'new_version'
    | 'ai_summary'
    | 'approval_required'
    | 'production_locked'
    | 'comment'
    | 'approval';
  orderId?: string;
  versionId?: string;
  group?: 'Today' | 'Yesterday' | string;
}

export interface ZaloIntegrationConfig {
  connected: boolean;
  oaName: string;
  oaId: string;
  phoneNumber: string;
  webhookUrl: string;
  events: {
    changeRequestCreated: boolean;
    newVersionPublished: boolean;
    aiSummaryReady: boolean;
    approvalRequired: boolean;
    productionLocked: boolean;
  };
}

export interface Order {
  id: string;
  orderNumber: string; // e.g. "PP-1024"
  hasWorkspace?: boolean;
  productName: string;
  category: string;
  customerName: string;
  customerCompany: string;
  vendorName: string;
  vendorCompany: string;
  status: OrderStatus;
  currentVersion: string;
  lastUpdated: string;
  targetQuantity: number;
  deliveryDate: string;
  thumbnail: string;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  latestActivity?: string;
  assignedTo?: string; // e.g. "Alex Rivera"
  assignedToAvatar?: string;
  dueDate?: string;
  approvedBy?: string;
  approvedAt?: string;
  lockedBy?: string;
  lockedAt?: string;
  specBlocks: SpecBlock[];
  versions: OrderVersion[];
  changeRequests: ChangeRequest[];
  designFiles: DesignFile[];
}

export interface Workspace {
  id: string;
  name: string;
  code: string;
  activeOrdersCount: number;
  ordersCount?: number;
  description?: string;
  customerCompany?: string;
  vendorCompany?: string;
}
