import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, Copy, RefreshCw, Trash2 } from 'lucide-react';
import type { Proofprint } from '../application/proofprint';
import type {
  AuditEvent, Block, ChangeRequest, Comment, Diff,
  ReviewLink, Version, Workspace,
} from '../domain/models';
import { WorkspaceDocumentView } from './WorkspaceDocumentView';
import { WorkspaceFilesPanel } from './WorkspaceFilesPanel';
import { WorkspaceVersionPanel } from './WorkspaceVersionPanel';
import { blockContent, blockTypeNames, draftFromBlock, newBlockDraft, SpecificationBlockEditor } from './SpecificationBlockEditor';
import { describeBlock } from './versionText';

const input = 'w-full rounded-xl border border-slate-300 bg-white p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200';
const button = 'rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold hover:border-orange-400 disabled:opacity-50';
const primary = 'rounded-xl bg-orange-600 hover:bg-orange-700 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50';
const card = 'rounded-2xl border border-slate-200 bg-white p-5 shadow-sm';
const formatDate = (date?: string | null) => date ? new Date(date).toLocaleString('vi-VN') : '—';
const workflowName: Record<Workspace['workflow_status'], string> = {
  DRAFT: 'Bản nháp', IN_REVIEW: 'Chờ khách duyệt', APPROVED: 'Đã phê duyệt',
  LOCKED_FOR_PRODUCTION: 'Đã khóa sản xuất',
};
const recordName: Record<Workspace['record_status'], string> = {
  ACTIVE: 'Đang hoạt động', ARCHIVED: 'Đã lưu trữ', CANCELLED: 'Đã hủy',
};
type Tab = 'document' | 'overview' | 'draft' | 'versions' | 'requests' | 'comments' | 'assets' | 'audit';

export function WorkspacePage({ api, id, guest, onBack, initialTab = 'document' }: {
  api: Proofprint; id: string; guest: boolean; onBack: () => void;
  initialTab?: 'document' | 'overview' | 'versions' | 'requests' | 'audit';
}) {
  const client = useMemo(() => guest ? api.forGuest() : api, [api, guest]);
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [versions, setVersions] = useState<Version[]>([]);
  const [requests, setRequests] = useState<ChangeRequest[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [audit, setAudit] = useState<AuditEvent[]>([]);
  const [auditTotal, setAuditTotal] = useState(0);
  const [auditOffset, setAuditOffset] = useState(0);
  const [auditFilter, setAuditFilter] = useState('');
  const [link, setLink] = useState<ReviewLink | null>(null);
  const [version, setVersion] = useState<Version | null>(null);
  const [diff, setDiff] = useState<Diff | null>(null);
  const [requestDetail, setRequestDetail] = useState<ChangeRequest | null>(null);
  const [selectedVersionId, setSelectedVersionId] = useState('');
  const [tab, setTab] = useState<Tab>(initialTab);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [reason, setReason] = useState('Cập nhật theo yêu cầu');
  const [blockDraft, setBlockDraft] = useState(newBlockDraft);
  const [commentText, setCommentText] = useState('');
  const [commentFilter, setCommentFilter] = useState('');

  useEffect(() => {
    if (!error) return;
    const timer = window.setTimeout(() => setError(''), 5000);
    return () => window.clearTimeout(timer);
  }, [error]);
  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(''), 5000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const refresh = useCallback(async () => {
    const guestView = guest ? await client.guestWorkspace() : null;
    const ws = guestView ? guestView.workspace : await client.workspace(id);
    const [v, c, cr] = await Promise.all([client.versions(id), client.comments(id), client.changeRequests(id)]);
    setWorkspace(ws); setVersions(v); setComments(c); setRequests(cr);
    if (guestView) setBlocks(guestView.draft_blocks);
    setSelectedVersionId((previous) => previous && v.some((item) => item.id === previous)
      ? previous : ws.workflow_status === 'DRAFT' ? '' : ws.latest_version_id || v[0]?.id || '');
    if (!guest) {
      const [draft, reviewLink, auditPage] = await Promise.all([
        client.draft(id).catch(() => null), client.reviewLink(id).catch(() => null),
        client.audit(id, { limit: 50, offset: auditOffset, ...(auditFilter ? { event_type: auditFilter } : {}) }).catch(() => null),
      ]);
      setBlocks(draft?.blocks || []); setLink(reviewLink);
      setAudit(auditPage?.items || []); setAuditTotal(auditPage?.total || 0);
    }
  }, [client, id, guest, auditOffset, auditFilter]);

  useEffect(() => {
    setLoading(true);
    void refresh().catch((e) => setError(e instanceof Error ? e.message : 'Không tải được Workspace'))
      .finally(() => setLoading(false));
  }, [refresh]);

  useEffect(() => {
    if (!selectedVersionId) { setVersion(null); setDiff(null); return; }
    void client.version(id, selectedVersionId).then(setVersion)
      .catch((e) => setError(e instanceof Error ? e.message : 'Không tải được Version'));
    setDiff(null);
    void client.diff(id, selectedVersionId).then(setDiff).catch(() => setDiff(null));
  }, [client, id, selectedVersionId]);

  const run = async (label: string, task: () => Promise<unknown>): Promise<boolean> => {
    setBusy(true); setError(''); setNotice('');
    try { await task(); await refresh(); setNotice(label); return true; }
    catch (e) { setError(e instanceof Error ? e.message : 'Thao tác thất bại'); return false; }
    finally { setBusy(false); }
  };
  const revision = workspace?.revision ?? 0;
  const uploadImages = async (files: File[]): Promise<{ ids: string[]; error?: string }> => {
    if (!workspace || workspace.workflow_status !== 'DRAFT') throw new Error('Hãy mở bản nháp trước khi thêm ảnh.');
    const uploaded: string[] = [];
    let uploadError: string | undefined;
    let nextRevision = workspace.revision;
    setBusy(true); setError('');
    try {
      for (const file of files) {
        const result = await client.uploadWorkspaceImage(id, file, nextRevision);
        uploaded.push(result.asset.id);
        nextRevision = result.workspace_revision;
      }
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Không tải được ảnh.';
      uploadError = uploaded.length
        ? `${uploaded.length} ảnh đã tải lên; các ảnh còn lại thất bại: ${message}`
        : message;
    } finally {
      if (uploaded.length) {
        setWorkspace((current) => current ? { ...current, revision: nextRevision } : current);
      }
      try { await refresh(); }
      catch (cause) {
        const message = cause instanceof Error ? cause.message : 'Không tải lại được Workspace.';
        uploadError = uploadError ? `${uploadError} ${message}` : message;
      }
      setBusy(false);
    }
    if (!uploaded.length && uploadError) throw new Error(uploadError);
    return { ids: uploaded, error: uploadError };
  };
  const beginEditing = async (item?: { id?: string }) => {
    if (!workspace || guest) return;
    if (workspace.record_status !== 'ACTIVE') { setError('Workspace này không còn hoạt động để chỉnh sửa.'); return; }
    if (item?.id && selectedVersionId && selectedVersionId !== workspace.latest_version_id) {
      setError('Phiên bản cũ chỉ dùng để xem. Hãy chọn phiên bản mới nhất trước khi chỉnh sửa.');
      return;
    }
    if (workspace.workflow_status !== 'DRAFT') {
      const ok = await run(workspace.workflow_status === 'IN_REVIEW'
        ? 'Đã mở bản nháp mới; lượt duyệt phiên bản trước đã kết thúc'
        : 'Đã mở bản nháp mới từ phiên bản hiện tại',
      () => client.startRevision(id, 'Designer chỉnh sửa hồ sơ sản phẩm', revision));
      if (!ok) return;
    }
    const source = item?.id ? blocks.find((block) => block.id === item.id) : undefined;
    setBlockDraft(source ? draftFromBlock(source) : newBlockDraft());
    setSelectedVersionId('');
    setTab('draft');
  };
  const saveBlock = async (publish: boolean) => {
    if (workspace?.workflow_status !== 'DRAFT') { setError('Hãy mở bản nháp mới trước khi chỉnh sửa hạng mục.'); return; }
    let parsed: Record<string, unknown>;
    try { parsed = blockContent(blockDraft); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Thông số chưa hợp lệ'); return; }
    const existing = blocks.find((item) => item.id === blockDraft.id);
    const shouldPublish = publish;
    let releasedVersionId: string | null = null;
    const ok = await run(shouldPublish ? 'Đã lưu và phát hành phiên bản mới' : existing ? 'Đã lưu bản nháp' : 'Đã tạo hạng mục', async () => {
      const saved = await client.upsertBlock(id, blockDraft.id, {
        block_type: blockDraft.block_type, label: blockDraft.label.trim(), content: parsed,
        position: existing?.position ?? blocks.length, schema_version: 1,
      }, revision);
      if (shouldPublish) {
        const unresolvedBlockIds = [...new Set(comments.filter((item) => item.request_batch_id && !item.resolved_in_version_id && item.block_id).map((item) => item.block_id!))];
        try {
          const released = await client.releaseVersion(id, saved.workspace_revision, unresolvedBlockIds);
          releasedVersionId = released.version.id;
        }
        catch (cause) {
          await refresh();
          throw new Error(`Đã lưu hạng mục vào bản nháp nhưng chưa phát hành phiên bản: ${cause instanceof Error ? cause.message : 'thao tác thất bại'}`);
        }
      }
    });
    if (ok) {
      setBlockDraft(newBlockDraft());
      if (releasedVersionId) setSelectedVersionId(releasedVersionId);
      if (shouldPublish) setTab('document');
    }
  };
  const publishDraft = async () => {
    let releasedVersionId: string | null = null;
    const unresolvedBlockIds = [...new Set(comments.filter((item) => item.request_batch_id && !item.resolved_in_version_id && item.block_id).map((item) => item.block_id!))];
    const ok = await run('Đã phát hành Version mới', async () => {
      const released = await client.releaseVersion(id, revision, unresolvedBlockIds);
      releasedVersionId = released.version.id;
    });
    if (ok && releasedVersionId) {
      setSelectedVersionId(releasedVersionId);
      setTab('document');
    }
  };
  const selectedSummary = versions.find((item) => item.id === selectedVersionId);
  const selectedSnapshotBlocks = (version?.id === selectedVersionId ? version.snapshot || [] : []) as Array<{
    id?: string; label?: string; block_type?: string; content?: Record<string, unknown>;
  }>;
  const openChangeRequests = requests.filter((item) => item.status === 'REQUESTED' || item.status === 'ACKNOWLEDGED');
  const visibleComments = commentFilter ? comments.filter((item) => item.version_id === commentFilter) : comments;
  const tabs: Array<[Tab, string]> = guest
    ? [['document', 'Hồ sơ'], ['overview', 'Tổng quan'], ['versions', 'Phiên bản'], ['requests', 'Yêu cầu thay đổi'], ['comments', 'Bình luận']]
    : [['document', 'Hồ sơ'], ['overview', 'Tổng quan'], ['draft', 'Chỉnh sửa'], ['versions', 'Phiên bản'], ['requests', 'Yêu cầu thay đổi'], ['comments', 'Bình luận'], ['assets', 'Ảnh đính kèm'], ['audit', 'Lịch sử']];

  if (loading && !workspace) return <div className="p-10 text-center text-slate-500">Đang tải Workspace…</div>;
  if (!workspace) return <div role="alert" className="rounded-xl bg-red-50 p-5 text-red-700">{error || 'Không tìm thấy Workspace'}</div>;

  if (tab === 'document') return <>
    {error && <div role="alert" className="fixed left-1/2 top-20 z-50 -translate-x-1/2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800 shadow-xl">{error}</div>}
    {notice && <div role="status" className="fixed left-1/2 top-20 z-50 -translate-x-1/2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800 shadow-xl">{notice}</div>}
    <WorkspaceDocumentView api={client} workspace={workspace} versions={versions} selectedVersionId={selectedVersionId}
      onSelectVersion={setSelectedVersionId} blocks={selectedSnapshotBlocks.length ? selectedSnapshotBlocks : (!selectedVersionId ? blocks : [])}
      comments={comments} requests={requests} diff={diff} guest={guest} busy={busy}
      reviewUrl={link?.review_url || null} onBack={onBack} onRefresh={() => void refresh().catch((e) => setError(e.message))}
      onEditBlock={(item) => void beginEditing(item)}
      onAddBlock={() => void beginEditing()}
      onOpenRequests={() => setTab('requests')}
      onAcknowledgeRequest={(requestId) => run('Đã tiếp nhận yêu cầu', () => client.acknowledgeChangeRequest(requestId, revision))}
      onSubmitComment={(body, targetBlockId) => run('Đã gửi phản hồi', () => client.createComment(id, { body, version_id: selectedVersionId || null, block_id: targetBlockId }, revision))}
      onSubmitRequests={async (items) => {
        const ok = await run(`Đã gửi ${items.length} yêu cầu cho designer`, () => client.submitCustomerRequests(id, workspace.workflow_status === 'DRAFT' ? null : selectedVersionId || null, items, revision));
        if (ok) setSelectedVersionId('');
        return ok;
      }}
      onApprove={() => { if (selectedVersionId) void run('Đã duyệt Version', () => client.approve(id, selectedVersionId, revision)); }}
      onLock={() => { if (workspace.approved_version_id) void run('Đã khóa sản xuất', () => client.lockProduction(id, workspace.approved_version_id!, revision)); }} />
  </>;

  return <div className="space-y-5">
    <div className="rounded-2xl bg-white/95 border border-slate-200/80 p-4 sm:p-5 shadow-sm space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2 flex-wrap">
          {!guest && <button onClick={onBack} className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-100 text-xs font-bold text-slate-700 hover:bg-slate-200"><ArrowLeft size={14} /> Đơn hàng</button>}
          <span className="rounded-lg border border-orange-200 bg-orange-100 px-2 py-1 font-mono text-xs font-black text-orange-700">#{workspace.id.slice(0, 8)}</span>
          <span className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-bold text-slate-700">{workspace.customer_name}</span>
        </div>
        <div className="flex items-center gap-2"><span className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold">{versions.length} phiên bản</span><button onClick={() => void refresh().catch((e) => setError(e.message))} className="rounded-xl border border-slate-200 p-2 hover:bg-slate-50" title="Làm mới"><RefreshCw size={16} /></button></div>
      </div>
      <div><p className="text-[11px] font-bold uppercase tracking-widest text-orange-600">Hồ sơ kỹ thuật sản xuất</p><h2 className="mt-1 text-2xl sm:text-3xl font-black tracking-tight text-slate-900">{workspace.product_type}</h2><p className="mt-1 text-sm text-slate-500">{workspace.customer_name}</p></div>
      <div className="flex gap-2 flex-wrap text-xs font-bold"><span className="rounded-full bg-amber-50 border border-amber-200 text-amber-900 px-3 py-1">{workflowName[workspace.workflow_status]}</span><span className="rounded-full bg-slate-100 text-slate-700 px-3 py-1">{recordName[workspace.record_status]}</span><span className="rounded-full bg-slate-100 text-slate-700 px-3 py-1">Lần cập nhật {workspace.revision}</span></div>
    </div>
    {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 text-red-800 p-4">{error}</div>}
    {notice && <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-800 p-4 flex gap-2"><Check size={18} /> {notice}</div>}
    <div className="overflow-x-auto flex gap-2 rounded-2xl bg-white border border-slate-200 p-2">{tabs.map(([key, label]) => <button key={key} onClick={() => { if (key === 'draft') void beginEditing(); else setTab(key); }} className={`whitespace-nowrap rounded-xl px-4 py-2.5 text-xs font-bold ${tab === key ? 'bg-[#0F766E] text-white' : 'text-slate-600 hover:bg-slate-50'}`}>{label}</button>)}</div>

    {tab === 'overview' && <div className="grid lg:grid-cols-2 gap-5">
      <section className={card}><h3 className="text-lg font-black mb-4">Thông tin Workspace</h3><dl className="grid grid-cols-2 gap-3 text-sm"><dt className="text-slate-500">Khách hàng</dt><dd className="font-semibold">{workspace.customer_name}</dd><dt className="text-slate-500">Email</dt><dd>{workspace.customer_email || '—'}</dd><dt className="text-slate-500">Điện thoại</dt><dd>{workspace.customer_phone || '—'}</dd><dt className="text-slate-500">Sản phẩm</dt><dd>{workspace.product_type}</dd><dt className="text-slate-500">Cập nhật</dt><dd>{formatDate(workspace.updated_at)}</dd></dl></section>
      <section className={card}><h3 className="text-lg font-black mb-4">Tiến độ</h3><p className="text-sm text-slate-600">Version hiện tại: <strong>{selectedSummary ? `V${selectedSummary.number}` : 'Chưa phát hành'}</strong></p><p className="text-sm text-slate-600 mt-2">Yêu cầu đang xử lý: <strong>{openChangeRequests.length + comments.filter((item) => item.request_batch_id && !item.resolved_in_version_id).length}</strong></p><p className="text-sm text-slate-600 mt-2">Revision: <strong>{revision}</strong></p><button onClick={() => setTab('versions')} className={`${button} mt-4 flex gap-2 items-center`}>Xem Version <ArrowRight size={15} /></button></section>
      {!guest && <section className={card}><h3 className="text-lg font-black mb-3">Review link cho Customer</h3>{link ? <><p className="text-xs text-slate-500 mb-2">Link đang hoạt động · lần cấp {link.version}</p><a href={link.review_url} className="text-sm text-orange-700 break-all underline">{link.review_url}</a><div className="mt-3 flex gap-2 flex-wrap"><button className={button} onClick={() => void navigator.clipboard.writeText(link.review_url)}> <Copy size={14} className="inline" /> Sao chép</button><button disabled={busy} className={button} onClick={() => void run('Đã đổi review link', () => client.rotateReviewLink(id, reason, revision))}>Đổi link</button><button disabled={busy} className={button} onClick={() => void run('Đã vô hiệu hóa review link', () => client.disableReviewLink(id, reason, revision))}>Vô hiệu hóa</button></div></> : <p className="text-sm text-slate-500">Không có review link đang hoạt động.</p>}<input className={`${input} mt-4`} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Lý do đổi/vô hiệu hóa link" /></section>}
      {!guest && <section className={card}><h3 className="text-lg font-black mb-3">Trạng thái hồ sơ</h3><input className={input} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Lý do" /><div className="flex flex-wrap gap-2 mt-3"><button disabled={busy} className={button} onClick={() => void beginEditing()}>Chỉnh sửa hồ sơ</button><button disabled={busy} className={button} onClick={() => void run('Đã lưu trữ Workspace', () => client.archive(id, reason, revision))}>Lưu trữ</button><button disabled={busy} className={button} onClick={() => void run('Đã khôi phục Workspace', () => client.restore(id, reason, revision))}>Khôi phục</button><button disabled={busy} className="rounded-xl border border-red-300 text-red-700 px-3 py-2 text-sm font-bold disabled:opacity-50" onClick={() => { if (confirm('Hủy Workspace này?')) void run('Đã hủy Workspace', () => client.cancel(id, reason, revision)); }}>Hủy Workspace</button></div></section>}
    </div>}

    {tab === 'draft' && !guest && workspace.workflow_status !== 'DRAFT' && <section className={card}><h3 className="text-lg font-black">Chỉnh sửa trong bản nháp mới</h3><p className="mt-2 text-sm text-slate-600">V{versions[0]?.number || 1} đã phát hành được giữ nguyên. Khi mở bản nháp, lượt duyệt đang diễn ra sẽ kết thúc. Hãy lưu các thay đổi rồi phát hành V{(versions[0]?.number || 0) + 1} để khách hàng xem.</p><button disabled={busy} className={`${primary} mt-4`} onClick={() => void beginEditing()}>Mở bản nháp mới</button></section>}
    {tab === 'draft' && !guest && workspace.workflow_status === 'DRAFT' && <>
      <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-teal-200 bg-teal-50 px-5 py-4"><div><h3 className="font-black text-teal-950">Đang chỉnh sửa bản nháp cho V{(versions[0]?.number || 0) + 1}</h3><p className="mt-1 text-sm text-teal-800">Thêm hoặc sửa hạng mục, sau đó phát hành để khách hàng thấy phiên bản mới. V{versions[0]?.number || 0} vẫn được lưu trong lịch sử.</p></div><button disabled={busy || blocks.length === 0} className={primary} onClick={() => void publishDraft()}>Phát hành V{(versions[0]?.number || 0) + 1}</button></section>
      <div className="grid lg:grid-cols-[1fr_1fr] gap-5">
      <section className={card}><div className="flex justify-between items-center mb-4"><h3 className="text-lg font-black">Hạng mục kỹ thuật ({blocks.length})</h3><span className="text-xs text-slate-500">Chỉ sửa khi ở bản nháp</span></div><div className="space-y-3">{blocks.map((item, index) => <div key={item.id} className="rounded-xl border border-slate-200 p-3"><div className="flex justify-between gap-2"><div><strong>{item.label}</strong><span className="ml-2 text-xs text-slate-500">{blockTypeNames[item.block_type]}</span></div><div className="flex gap-1"><button title="Sửa" className={button} onClick={() => setBlockDraft(draftFromBlock(item))}>Sửa</button><button title="Lên" disabled={busy || index === 0} className={button} onClick={() => { const ids = blocks.map((b) => b.id); [ids[index - 1], ids[index]] = [ids[index], ids[index - 1]]; void run('Đã sắp xếp hạng mục', () => client.reorderBlocks(id, ids, revision)); }}>↑</button><button title="Xuống" disabled={busy || index === blocks.length - 1} className={button} onClick={() => { const ids = blocks.map((b) => b.id); [ids[index + 1], ids[index]] = [ids[index], ids[index + 1]]; void run('Đã sắp xếp hạng mục', () => client.reorderBlocks(id, ids, revision)); }}>↓</button><button title="Xóa" disabled={busy} className={button} onClick={() => { if (confirm(`Xóa ${item.label}?`)) void run('Đã xóa hạng mục', () => client.deleteBlock(id, item.id, revision)); }}><Trash2 size={15} /></button></div></div><p className="mt-3 line-clamp-3 text-xs text-slate-600">{describeBlock(item)}</p></div>)}{blocks.length === 0 && <p className="text-sm text-slate-500">Chưa có hạng mục kỹ thuật. Thêm ít nhất một hạng mục trước khi phát hành phiên bản.</p>}</div></section>
      <form className={card + ' space-y-4 h-fit'} onSubmit={(event) => { event.preventDefault(); void saveBlock(true); }}>
        <h3 className="text-lg font-black">{blocks.some((item) => item.id === blockDraft.id) ? 'Chỉnh sửa hạng mục' : 'Thêm hạng mục kỹ thuật'}</h3>
        <SpecificationBlockEditor draft={blockDraft} onChange={(next) => { setBlockDraft(next); setError(''); setNotice(''); }} onUploadImages={uploadImages} imageApi={client} workspaceId={id} />
        <div className="flex flex-wrap gap-2">
          <button disabled={busy} className={primary}>Lưu và phát hành V{(versions[0]?.number || 0) + 1}</button>
          <button type="button" disabled={busy} className={button} onClick={() => void saveBlock(false)}>Chỉ lưu bản nháp</button>
          {blocks.some((item) => item.id === blockDraft.id) && <button type="button" className={button} onClick={() => setBlockDraft(newBlockDraft())}>Bỏ sửa</button>}
        </div>
      </form>
      </div>
    </>}

    {tab === 'versions' && <>
      <WorkspaceVersionPanel workspace={workspace} versions={versions} selectedVersionId={selectedVersionId}
        version={version} diff={diff} guest={guest} busy={busy} blockCount={blocks.length}
        onSelectVersion={setSelectedVersionId} onOpenDocument={() => setTab('document')}
        onPublish={() => void publishDraft()} onBeginDraft={() => void beginEditing()} />
      {guest && workspace.workflow_status === 'IN_REVIEW' && selectedVersionId === workspace.latest_version_id && <section className={card + ' mt-5'}>
        <h3 className="font-black text-lg">Duyệt phiên bản V{selectedSummary?.number}</h3>
        <p className="mt-1 text-sm text-slate-500">Hãy kiểm tra hồ sơ trước khi xác nhận.</p>
        <button disabled={busy} className={`${primary} mt-3`} onClick={() => void run('Đã duyệt phiên bản', () => client.approve(id, selectedVersionId, revision))}>Phê duyệt phiên bản này</button>
      </section>}
    </>}
    {tab === 'requests' && <div className="grid lg:grid-cols-[1fr_1fr] gap-5"><section className={card}><h3 className="text-lg font-black mb-3">Yêu cầu thay đổi ({requests.length + comments.filter((item) => item.request_batch_id).length})</h3><div className="space-y-3">{comments.filter((item) => item.request_batch_id).map((item) => <div key={item.id} className="w-full rounded-xl border border-amber-200 bg-amber-50 p-3"><div className="flex justify-between gap-2"><strong className="text-sm text-amber-900">{item.resolved_in_version_id ? 'Đã xử lý' : 'Chưa xử lý'} · {blocks.find((block) => block.id === item.block_id)?.label || 'Hạng mục'}</strong><span className="text-xs text-slate-400">{formatDate(item.created_at)}</span></div><p className="mt-2 text-sm whitespace-pre-wrap">{item.body}</p><p className="mt-1 text-xs text-slate-500">{item.author_username || 'Khách hàng'}</p></div>)}{requests.map((item) => <button key={item.id} onClick={() => void client.changeRequest(item.id).then(setRequestDetail).catch((e) => setError(e.message))} className="w-full text-left border rounded-xl p-3 hover:border-orange-400"><div className="flex justify-between"><strong className="text-sm">{item.status}</strong><span className="text-xs text-slate-400">{formatDate(item.created_at)}</span></div><p className="text-sm mt-1">{item.message}</p><p className="text-xs text-slate-500 mt-1">{item.requester_username || 'Customer'}</p></button>)}{requests.length + comments.filter((item) => item.request_batch_id).length === 0 && <p className="text-sm text-slate-500">Chưa có yêu cầu.</p>}</div></section><div className="space-y-5">
      {guest && <section className={card + ' space-y-3'}><h3 className="font-black text-lg">Gửi yêu cầu theo hạng mục</h3><p className="text-sm text-slate-500">Mở hồ sơ, nhấn vào từng hạng mục để viết yêu cầu. Bạn có thể góp ý cho nhiều hạng mục rồi gửi tất cả một lần.</p><button className={primary} onClick={() => setTab('document')}>Mở hồ sơ kỹ thuật</button></section>}
      {requestDetail && <section className={card}><h3 className="font-black text-lg">Chi tiết yêu cầu</h3><p className="text-sm mt-2">{requestDetail.message}</p><p className="text-xs mt-2 text-slate-500">{requestDetail.status} · Block {requestDetail.block_id.slice(0, 8)}</p><p className="text-sm mt-2">{requestDetail.resolution_note}</p><div className="flex gap-2 flex-wrap mt-4">{guest ? <><button disabled={busy} className={button} onClick={() => void run('Đã xác nhận yêu cầu', () => client.confirmChangeRequest(requestDetail.id, revision))}>Xác nhận</button><button disabled={busy} className={button} onClick={() => void run('Đã mở lại yêu cầu', () => client.reopenChangeRequest(requestDetail.id, reason, revision))}>Mở lại</button><button disabled={busy} className={button} onClick={() => void run('Đã hủy yêu cầu', () => client.cancelChangeRequest(requestDetail.id, revision))}>Hủy</button></> : <><button disabled={busy} className={button} onClick={() => void run('Đã tiếp nhận yêu cầu', () => client.acknowledgeChangeRequest(requestDetail.id, revision))}>Tiếp nhận</button><button disabled={busy || !workspace.latest_version_id || workspace.latest_version_id === requestDetail.version_id} className={button} onClick={() => void run('Đã đánh dấu cập nhật', () => client.markChangeRequestUpdated(requestDetail.id, workspace.latest_version_id!, revision))}>Đã sửa ở Version mới</button><button disabled={busy} className={button} onClick={() => void run('Đã từ chối yêu cầu', () => client.rejectChangeRequest(requestDetail.id, reason, revision))}>Từ chối</button></>}</div><input className={`${input} mt-3`} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Ghi chú phản hồi" /></section>}
      </div></div>}

    {tab === 'comments' && <div className="grid lg:grid-cols-[1fr_1fr] gap-5"><section className={card}><div className="flex gap-2 justify-between items-center mb-3"><h3 className="text-lg font-black">Bình luận ({visibleComments.length})</h3><select className={input + ' max-w-44'} value={commentFilter} onChange={(e) => setCommentFilter(e.target.value)}><option value="">Tất cả Version</option>{versions.map((v) => <option key={v.id} value={v.id}>V{v.number}</option>)}</select></div><div className="space-y-3">{visibleComments.map((item) => <div key={item.id} className="rounded-xl bg-slate-50 p-3"><p className="text-sm">{item.body}</p><p className="text-xs text-slate-500 mt-2">{item.author_username || 'Designer'} · {formatDate(item.created_at)}</p></div>)}{visibleComments.length === 0 && <p className="text-sm text-slate-500">Chưa có bình luận.</p>}</div></section><form className={card + ' space-y-3 h-fit'} onSubmit={(event) => { event.preventDefault(); void run('Đã gửi bình luận', () => client.createComment(id, { body: commentText, version_id: selectedVersionId || null }, revision)).then((ok) => { if (ok) setCommentText(''); }); }}><h3 className="font-black text-lg">Thêm bình luận</h3><p className="text-sm text-slate-500">Bình luận gắn với Version đang chọn. Có thể lọc theo Version ở danh sách.</p><textarea className={input} value={commentText} onChange={(e) => setCommentText(e.target.value)} placeholder="Nhập bình luận" rows={4} required /><button disabled={busy} className={primary}>Gửi bình luận</button></form></div>}

    {tab === 'assets' && !guest && <WorkspaceFilesPanel api={client} workspaceId={id} version={version} draftBlocks={blocks} />}

    {tab === 'audit' && !guest && <section className={card}><div className="flex gap-3 flex-wrap justify-between"><div><h3 className="text-lg font-black">Audit History ({auditTotal})</h3><p className="text-sm text-slate-500">Sự kiện được ghi trong database; trạng thái không sửa trực tiếp trên giao diện.</p></div><input className={input + ' max-w-48'} value={auditFilter} onChange={(e) => { setAuditFilter(e.target.value); setAuditOffset(0); }} placeholder="Lọc event_type" /></div><div className="mt-4 space-y-2">{audit.map((item) => <div key={item.id} className="border-l-2 border-orange-400 pl-4 py-2"><div className="flex gap-3 justify-between"><strong className="text-sm">{item.event_type}</strong><span className="text-xs text-slate-500">{formatDate(item.created_at)}</span></div><p className="text-xs text-slate-500 mt-1">{item.entity_type} · {item.actor_username_snapshot || item.actor_id || 'Hệ thống'}</p><pre className="text-xs whitespace-pre-wrap mt-1 text-slate-500">{JSON.stringify(item.metadata)}</pre></div>)}{audit.length === 0 && <p className="text-sm text-slate-500">Không có sự kiện phù hợp.</p>}</div><div className="flex gap-2 mt-4"><button className={button} disabled={auditOffset === 0} onClick={() => setAuditOffset(Math.max(0, auditOffset - 50))}>Trước</button><span className="text-sm p-2">{auditOffset + 1}–{Math.min(auditOffset + 50, auditTotal)}</span><button className={button} disabled={auditOffset + 50 >= auditTotal} onClick={() => setAuditOffset(auditOffset + 50)}>Sau</button></div></section>}
  </div>;
}








