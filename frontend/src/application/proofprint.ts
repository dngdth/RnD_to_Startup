import type {
  Asset, AuditEvent, Block, BlockType, ChangeRequest, Comment, Designer,
  Diff, ReviewLink, ReviewRound, User, Version, Workspace,
} from '../domain/models';

export interface RequestOptions {
  revision?: number;
  idempotencyKey?: string;
  attestation?: string;
  guest?: boolean;
}

export interface Transport {
  request<T>(method: string, path: string, body?: unknown, options?: RequestOptions): Promise<T>;
  uploadImage<T>(path: string, file: File, revision: number): Promise<T>;
  binary(path: string, guest?: boolean): Promise<Blob>;
  setToken(token: string | null, remember?: boolean): void;
  hasToken(): boolean;
  newIdempotencyKey(): string;
}

class GuestTransport implements Transport {
  constructor(private readonly delegate: Transport) {}

  request<T>(method: string, path: string, body?: unknown, options: RequestOptions = {}) {
    return this.delegate.request<T>(method, path, body, { ...options, guest: true });
  }
  uploadImage<T>(path: string, file: File, revision: number) {
    return this.delegate.uploadImage<T>(path, file, revision);
  }
  binary(path: string) { return this.delegate.binary(path, true); }
  setToken(token: string | null, remember?: boolean) { this.delegate.setToken(token, remember); }
  hasToken() { return this.delegate.hasToken(); }
  newIdempotencyKey() { return this.delegate.newIdempotencyKey(); }
}

const workspacePath = (id: string) => `/workspaces/${encodeURIComponent(id)}`;
const changePath = (id: string) => `/change-requests/${encodeURIComponent(id)}`;
const mutation = (revision: number): RequestOptions => ({ revision });

/** Named application operations. UI code never constructs API headers or paths. */
export class Proofprint {
  constructor(private readonly transport: Transport) {}

  forGuest() { return new Proofprint(new GuestTransport(this.transport)); }

  private retryable(revision?: number): RequestOptions {
    return { revision, idempotencyKey: this.transport.newIdempotencyKey() };
  }

  hasSession() { return this.transport.hasToken(); }
  logout() { this.transport.setToken(null); }
  logoutGuest() { return this.transport.request<void>('DELETE', '/guest/sessions/current', undefined, { guest: true }); }
  health() { return this.transport.request<{ status: string }>('GET', '/health'); }

  async login(email: string, password: string, remember: boolean): Promise<User> {
    const token = await this.transport.request<{ access_token: string }>(
      'POST', '/auth/login', { email, password }, { guest: true },
    );
    this.transport.setToken(token.access_token, remember);
    return this.me();
  }
  me() { return this.transport.request<User>('GET', '/auth/me'); }

  designers() { return this.transport.request<Designer[]>('GET', '/admin/designers'); }
  createDesigner(email: string, display_name: string, temporary_password: string) {
    return this.transport.request<Designer>('POST', '/admin/designers', {
      email, display_name, temporary_password,
    });
  }
  setDesignerStatus(id: string, status: 'ACTIVE' | 'DISABLED') {
    return this.transport.request<Designer>(
      'PATCH', `/admin/designers/${encodeURIComponent(id)}/status`, { status },
    );
  }

  workspaces() { return this.transport.request<Workspace[]>('GET', '/workspaces'); }
  workspace(id: string) { return this.transport.request<Workspace>('GET', workspacePath(id)); }
  createWorkspace(customer: { name: string; email?: string; phone?: string }, product_type: string,
    initial_blocks: Array<{ block_type: BlockType; label: string; content: Record<string, unknown> }> = []) {
    return this.transport.request<{ workspace: Workspace; review_link: ReviewLink }>(
      'POST', '/workspaces', { customer, product_type, initial_blocks }, this.retryable(),
    );
  }
  reviewLink(id: string) {
    return this.transport.request<ReviewLink>('GET', `${workspacePath(id)}/review-link`);
  }
  disableReviewLink(id: string, reason: string, revision: number) {
    return this.transport.request<void>(
      'POST', `${workspacePath(id)}/review-link/disable`, { reason }, mutation(revision),
    );
  }
  rotateReviewLink(id: string, reason: string, revision: number) {
    return this.transport.request<ReviewLink>(
      'POST', `${workspacePath(id)}/review-link/rotate`, { reason }, mutation(revision),
    );
  }

  createGuestSession(review_token: string, username: string) {
    return this.transport.request<{ workspace_id: string; username: string; expires_at: string }>(
      'POST', '/guest/sessions', { review_token, username }, { guest: true },
    );
  }
  guestWorkspace() {
    return this.transport.request<{ review_link_id: string; reviewer_username: string; workspace: Workspace; draft_blocks: Block[] }>(
      'GET', '/guest/workspace', undefined, { guest: true },
    );
  }

  draft(id: string) {
    return this.transport.request<{ workspace: Workspace; blocks: Block[] }>(
      'GET', `${workspacePath(id)}/draft`,
    );
  }
  upsertBlock(id: string, blockId: string, body: {
    block_type: BlockType; label: string; content: Record<string, unknown>;
    position: number; schema_version: number;
  }, revision: number) {
    return this.transport.request<{ block: Block; workspace_revision: number }>(
      'PUT', `${workspacePath(id)}/blocks/${encodeURIComponent(blockId)}`, body,
      mutation(revision),
    );
  }
  deleteBlock(id: string, blockId: string, revision: number) {
    return this.transport.request<void>(
      'DELETE', `${workspacePath(id)}/blocks/${encodeURIComponent(blockId)}`,
      undefined, mutation(revision),
    );
  }
  reorderBlocks(id: string, block_ids: string[], revision: number) {
    return this.transport.request<{ blocks: Block[]; workspace_revision: number }>(
      'PATCH', `${workspacePath(id)}/blocks/order`, { block_ids }, mutation(revision),
    );
  }
  registerAsset(id: string, body: {
    storage_key: string; original_filename: string; content_type: string;
    size_bytes: number; checksum: string;
  }, attestation: string, revision: number) {
    return this.transport.request<{ asset: Asset; workspace_revision: number }>(
      'POST', `${workspacePath(id)}/assets`, body, { revision, attestation },
    );
  }
  asset(id: string, assetId: string) {
    return this.transport.request<Asset>(
      'GET', `${workspacePath(id)}/assets/${encodeURIComponent(assetId)}`,
    );
  }
  uploadWorkspaceImage(id: string, file: File, revision: number) {
    return this.transport.uploadImage<{ asset: Asset; workspace_revision: number }>(
      `${workspacePath(id)}/images`, file, revision,
    );
  }
  workspaceImage(id: string, assetId: string) {
    return this.transport.binary(`${workspacePath(id)}/images/${encodeURIComponent(assetId)}`);
  }
  startRevision(id: string, reason: string, revision: number) {
    return this.transport.request<Workspace>(
      'POST', `${workspacePath(id)}/revisions`, { reason }, this.retryable(revision),
    );
  }

  versions(id: string) {
    return this.transport.request<Version[]>('GET', `${workspacePath(id)}/versions`);
  }
  version(id: string, versionId: string) {
    return this.transport.request<Version>(
      'GET', `${workspacePath(id)}/versions/${encodeURIComponent(versionId)}`,
    );
  }
  diff(id: string, versionId: string) {
    return this.transport.request<Diff>(
      'GET', `${workspacePath(id)}/versions/${encodeURIComponent(versionId)}/diff`,
    );
  }
  round(id: string, roundId: string) {
    return this.transport.request<ReviewRound>(
      'GET', `${workspacePath(id)}/review-rounds/${encodeURIComponent(roundId)}`,
    );
  }
  releaseVersion(id: string, revision: number, resolvedRequestBlockIds: string[] = []) {
    return this.transport.request<{
      version: Version; review_round: ReviewRound; workspace_revision: number;
    }>('POST', `${workspacePath(id)}/versions`, { resolved_request_block_ids: resolvedRequestBlockIds }, this.retryable(revision));
  }

  comments(id: string, filter?: { version_id?: string; block_id?: string; change_request_id?: string }) {
    const query = new URLSearchParams(filter || {}).toString();
    return this.transport.request<Comment[]>(
      'GET', `${workspacePath(id)}/comments${query ? `?${query}` : ''}`,
    );
  }
  createComment(id: string, body: {
    body: string; version_id?: string | null; block_id?: string | null;
    change_request_id?: string | null;
  }, revision: number) {
    return this.transport.request<{ comment: Comment; workspace_revision: number }>(
      'POST', `${workspacePath(id)}/comments`, body, mutation(revision),
    );
  }

  submitCustomerRequests(id: string, versionId: string | null,
    items: Array<{ block_id: string; message: string }>, revision: number) {
    return this.transport.request<{
      batch_id: string; workspace_revision: number;
      items: Array<{ block_id: string; comment_id: string | null; change_request_id: string | null }>;
    }>(
      'POST', `${workspacePath(id)}/customer-request-batches`,
      { version_id: versionId, items }, this.retryable(revision),
    );
  }

  changeRequests(id: string) {
    return this.transport.request<ChangeRequest[]>('GET', `${workspacePath(id)}/change-requests`);
  }
  changeRequest(id: string) {
    return this.transport.request<ChangeRequest>('GET', changePath(id));
  }
  createChangeRequest(id: string, versionId: string, block_id: string,
    message: string, field_path: string | null, revision: number) {
    return this.transport.request<{ change_request: ChangeRequest; workspace_revision: number }>(
      'POST', `${workspacePath(id)}/versions/${encodeURIComponent(versionId)}/change-requests`,
      { block_id, message, field_path }, this.retryable(revision),
    );
  }
  requestChanges(id: string, versionId: string, decision_note: string, revision: number) {
    return this.transport.request<{ review_round: ReviewRound; workspace_revision: number }>(
      'POST', `${workspacePath(id)}/versions/${encodeURIComponent(versionId)}/request-changes`,
      { decision_note: decision_note || null }, this.retryable(revision),
    );
  }
  acknowledgeChangeRequest(id: string, revision: number) {
    return this.transport.request<{ change_request: ChangeRequest; workspace_revision: number }>(
      'POST', `${changePath(id)}/acknowledge`, undefined, mutation(revision),
    );
  }
  markChangeRequestUpdated(id: string, resolved_in_version_id: string, revision: number) {
    return this.transport.request<{ change_request: ChangeRequest; workspace_revision: number }>(
      'POST', `${changePath(id)}/mark-updated`, { resolved_in_version_id }, mutation(revision),
    );
  }
  confirmChangeRequest(id: string, revision: number) {
    return this.transport.request<{ change_request: ChangeRequest; workspace_revision: number }>(
      'POST', `${changePath(id)}/confirm`, undefined, { ...mutation(revision), guest: true },
    );
  }
  reopenChangeRequest(id: string, message: string, revision: number) {
    return this.transport.request<{
      reopened_change_request: ChangeRequest; new_change_request: ChangeRequest;
      workspace_revision: number;
    }>('POST', `${changePath(id)}/reopen`, { message: message || null },
      { ...mutation(revision), guest: true });
  }
  rejectChangeRequest(id: string, resolution_note: string, revision: number) {
    return this.transport.request<{ change_request: ChangeRequest; workspace_revision: number }>(
      'POST', `${changePath(id)}/reject`, { resolution_note }, mutation(revision),
    );
  }
  cancelChangeRequest(id: string, revision: number) {
    return this.transport.request<{ change_request: ChangeRequest; workspace_revision: number }>(
      'POST', `${changePath(id)}/cancel`, undefined, { ...mutation(revision), guest: true },
    );
  }

  approve(id: string, versionId: string, revision: number) {
    return this.transport.request<{ workspace_revision: number }>(
      'POST', `${workspacePath(id)}/versions/${encodeURIComponent(versionId)}/approvals`,
      undefined, { ...this.retryable(revision), guest: true },
    );
  }
  lockProduction(id: string, versionId: string, revision: number) {
    return this.transport.request<{
      version: Version; workspace_revision: number;
    }>('POST', `${workspacePath(id)}/versions/${encodeURIComponent(versionId)}/production-lock`,
      undefined, this.retryable(revision));
  }
  productionSnapshot(id: string) {
    return this.transport.request<{ version: Version; workspace_revision: number }>(
      'GET', `${workspacePath(id)}/production-snapshot`,
    );
  }

  audit(id: string, query: Record<string, string | number> = {}) {
    const search = new URLSearchParams(
      Object.entries(query).map(([key, value]) => [key, String(value)]),
    ).toString();
    return this.transport.request<{ items: AuditEvent[]; total: number; limit: number; offset: number }>(
      'GET', `${workspacePath(id)}/audit-events${search ? `?${search}` : ''}`,
    );
  }
  archive(id: string, reason: string, revision: number) {
    return this.transport.request<Workspace>(
      'POST', `${workspacePath(id)}/archive`, { reason }, mutation(revision),
    );
  }
  restore(id: string, reason: string, revision: number) {
    return this.transport.request<Workspace>(
      'POST', `${workspacePath(id)}/restore`, { reason: reason || null }, mutation(revision),
    );
  }
  cancel(id: string, reason: string, revision: number) {
    return this.transport.request<Workspace>(
      'POST', `${workspacePath(id)}/cancel`, { reason: reason || null }, mutation(revision),
    );
  }
}
