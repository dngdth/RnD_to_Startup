export type Role = 'ADMIN' | 'DESIGNER' | 'CUSTOMER';

export interface User {
  id: string;
  email: string;
  display_name: string;
  system_role: Role;
}

export interface Workspace {
  id: string;
  customer_id: string;
  customer_name: string;
  customer_email: string | null;
  customer_phone: string | null;
  product_type: string;
  workflow_status: 'DRAFT' | 'IN_REVIEW' | 'APPROVED' | 'LOCKED_FOR_PRODUCTION';
  record_status: 'ACTIVE' | 'ARCHIVED' | 'CANCELLED';
  latest_version_id: string | null;
  approved_version_id: string | null;
  production_version_id: string | null;
  revision: number;
  updated_at: string;
  permissions?: {
    can_view: boolean;
    can_edit: boolean;
    can_review: boolean;
    can_approve: boolean;
    can_lock_production: boolean;
  } | null;
}

export type BlockType =
  | 'text' | 'markdown' | 'quantity' | 'color' | 'dimension' | 'material'
  | 'image' | 'file' | 'note' | 'print_area';

export interface Block {
  id: string;
  workspace_id: string;
  block_type: BlockType;
  label: string;
  content: Record<string, unknown>;
  position: number;
  schema_version: number;
  created_by: string;
  updated_by: string;
  created_at: string;
  updated_at: string;
}

export interface Version {
  id: string;
  workspace_id: string;
  number: number;
  previous_version_id: string | null;
  content_hash: string;
  schema_version: number;
  created_by: string;
  created_at: string;
  status: string;
  snapshot?: Array<Record<string, unknown>>;
}

export interface ReviewRound {
  id: string;
  workspace_id: string;
  version_id: string;
  status: string;
  opened_at: string;
  closed_at: string | null;
  decision_note: string | null;
}

export interface ChangeRequest {
  id: string;
  workspace_id: string;
  review_round_id: string;
  version_id: string;
  block_id: string;
  field_path: string | null;
  message: string;
  status: string;
  requester_username: string | null;
  resolution_note: string | null;
  resolved_in_version_id: string | null;
  created_at: string;
}

export interface Comment {
  id: string;
  workspace_id: string;
  version_id: string | null;
  block_id: string | null;
  change_request_id: string | null;
  request_batch_id: string | null;
  resolved_in_version_id: string | null;
  body: string;
  author_username: string | null;
  created_at: string;
}

export interface ReviewLink {
  id: string;
  workspace_id: string;
  version: number;
  status: string;
  review_url: string;
  created_at: string;
}

export interface Asset {
  id: string;
  workspace_id: string;
  storage_key: string;
  original_filename: string;
  content_type: string;
  size_bytes: number;
  checksum: string;
  status: string;
  created_at: string;
}

export interface AuditEvent {
  id: string;
  event_type: string;
  entity_type: string;
  actor_id: string | null;
  actor_username_snapshot: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface Designer {
  id: string;
  email: string;
  display_name: string;
  status: 'ACTIVE' | 'DISABLED';
  must_change_password: boolean;
  created_at: string;
}

export interface Diff {
  added: Array<Record<string, unknown>>;
  removed: Array<Record<string, unknown>>;
  changed: Array<{ block_id: string; field_path: string; before: unknown; after: unknown }>;
  reordered: Array<{ block_id: string; before_position: number; after_position: number }>;
}
