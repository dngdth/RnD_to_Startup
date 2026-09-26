import { useEffect, useState } from 'react';
import {
  ArrowLeft, ArrowRight, CheckCircle2, ChevronDown, Clock3,
  FileCheck2, FileText, GitCompareArrows, Image, Layers3, LockKeyhole,
  MessageSquare, Package, Palette, Paperclip, Pencil, Plus, Printer,
  RefreshCw, Ruler, Share2, StickyNote, X,
} from 'lucide-react';
import type { ChangeRequest, Comment, Diff, Version, Workspace } from '../domain/models';
import type { Proofprint } from '../application/proofprint';
import { ZaloLinkPanel } from './ZaloLinkPanel';
import { describeBlock, describeChange, formatHumanValue, type SnapshotBlock } from './versionText';
import { MarkdownContent } from './MarkdownContent';
import { WorkspaceImage } from './WorkspaceImage';

type DocumentBlock = { id?: string; label?: string; block_type?: string; content?: Record<string, unknown>; position?: number };
type FilterMode = 'all' | 'changed' | 'comments';

const detailLabel: Record<string, string> = {
  value: 'Giá trị', unit: 'Đơn vị', name: 'Tên', hex: 'Mã màu', width: 'Chiều rộng',
  height: 'Chiều cao', size: 'Kích thước', material: 'Chất liệu', details: 'Chi tiết',
  text: 'Nội dung', surface: 'Vị trí', note: 'Ghi chú', quantity: 'Số lượng',
  pantone: 'Mã Pantone', code: 'Mã chất liệu', asset_id: 'Mã tài sản',
  caption: 'Chú thích', description: 'Mô tả', markdown: 'Nội dung chi tiết',
};
const blockVisuals: Record<string, { Icon: typeof Package; color: string }> = {
  text: { Icon: FileText, color: 'border-orange-200 bg-orange-50 text-orange-600' },
  markdown: { Icon: FileText, color: 'border-orange-200 bg-orange-50 text-orange-600' },
  quantity: { Icon: Package, color: 'border-amber-200 bg-amber-50 text-amber-600' },
  color: { Icon: Palette, color: 'border-violet-200 bg-violet-50 text-violet-600' },
  dimension: { Icon: Ruler, color: 'border-sky-200 bg-sky-50 text-sky-600' },
  material: { Icon: Layers3, color: 'border-emerald-200 bg-emerald-50 text-emerald-600' },
  image: { Icon: Image, color: 'border-rose-200 bg-rose-50 text-rose-600' },
  file: { Icon: Paperclip, color: 'border-violet-200 bg-violet-50 text-violet-600' },
  note: { Icon: StickyNote, color: 'border-slate-200 bg-slate-50 text-slate-600' },
  print_area: { Icon: Printer, color: 'border-teal-200 bg-teal-50 text-teal-600' },
};
function BlockIcon({ type }: { type?: string }) {
  const { Icon, color } = blockVisuals[type || 'text'] || blockVisuals.text;
  return <span className={`rounded-lg border p-1.5 ${color}`}><Icon size={15} /></span>;
}
const statusLabel: Record<string, string> = {
  DRAFT: 'Bản nháp', IN_REVIEW: 'Đang chờ khách hàng phê duyệt',
  APPROVED: 'Đã phê duyệt', LOCKED_FOR_PRODUCTION: 'Đã khóa sản xuất',
};
const versionStatusLabel: Record<string, string> = {
  IN_REVIEW: 'Chờ khách duyệt', APPROVED: 'Đã duyệt',
  LOCKED_FOR_PRODUCTION: 'Đã khóa sản xuất', HISTORICAL: 'Phiên bản cũ',
};
const formatValue = (value: unknown): string => {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return String(value);
  return JSON.stringify(value);
};
const fieldLabel = (path: string) => {
  const name = path.split('.').at(-1) || path;
  return detailLabel[name] || name;
};

export function WorkspaceDocumentView({ api, workspace, versions, selectedVersionId, onSelectVersion,
  blocks, comments, requests, diff, guest, busy, reviewUrl, onBack, onRefresh,
  onEditBlock, onAddBlock, onOpenRequests, onAcknowledgeRequest, onSubmitComment, onSubmitRequests,
  onApprove, onLock }: {
  api: Proofprint; workspace: Workspace; versions: Version[]; selectedVersionId: string;
  onSelectVersion: (id: string) => void; blocks: DocumentBlock[];
  comments: Comment[]; requests: ChangeRequest[]; diff: Diff | null; guest: boolean; busy: boolean;
  reviewUrl: string | null; onBack: () => void; onRefresh: () => void;
  onEditBlock: (block: DocumentBlock) => void; onAddBlock: () => void;
  onOpenRequests: () => void;
  onAcknowledgeRequest: (id: string) => Promise<boolean>;
  onSubmitComment: (body: string, blockId: string | null) => Promise<boolean>;
  onSubmitRequests: (items: Array<{ block_id: string; message: string }>) => Promise<boolean>;
  onApprove: () => void; onLock: () => void;
}) {
  const [filter, setFilter] = useState<FilterMode>('all');
  const [tocOpen, setTocOpen] = useState(false);
  const [compareOpen, setCompareOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedbackFilter, setFeedbackFilter] = useState<'all' | 'open' | 'done'>('all');
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackBlockId, setFeedbackBlockId] = useState('');
  const [draftRequests, setDraftRequests] = useState<Record<string, string>>({});
  useEffect(() => { setDraftRequests({}); setFeedbackBlockId(''); }, [workspace.id, selectedVersionId]);
  const pendingRequests = blocks.filter((block) => block.id && draftRequests[block.id]?.trim())
    .map((block) => ({ block_id: block.id!, message: draftRequests[block.id!].trim() }));
  const currentBlock = blocks.find((block) => block.id === feedbackBlockId);
  const canSubmitRequests = (workspace.workflow_status === 'DRAFT' && !selectedVersionId) ||
    (workspace.workflow_status === 'IN_REVIEW' && selectedVersionId === workspace.latest_version_id);
  const openBlockFeedback = (blockId: string) => {
    if (!guest || !blockId) return;
    setFeedbackBlockId(blockId);
    setFeedbackOpen(true);
  };
  const selected = versions.find((item) => item.id === selectedVersionId);
  const changedIds = new Set([
    ...(diff?.changed || []).map((item) => item.block_id),
    ...(diff?.added || []).map((item) => String(item.id || '')),
  ]);
  const commentedIds = new Set([...comments.map((item) => item.block_id), ...requests.map((item) => item.block_id), ...Object.keys(draftRequests).filter((id) => draftRequests[id]?.trim())].filter(Boolean));
  const visibleBlocks = blocks.filter((block) => filter === 'all' || (filter === 'changed' ? changedIds.has(block.id || '') : commentedIds.has(block.id || '')));
  const quantityBlock = blocks.find((item) => item.block_type === 'quantity');
  const quantity = quantityBlock?.content?.value;
  const quantityUnit = quantityBlock?.content?.unit;
  const openRequestCount = workspace.workflow_status === 'IN_REVIEW' ? 0 : undefined;
  const previous = versions.filter((item) => selected && item.number < selected.number).sort((a, b) => b.number - a.number)[0];
  const firstChange = diff?.changed?.[0];
  const firstChangeLabel = blocks.find((item) => item.id === firstChange?.block_id)?.label;
  const openRequests = requests.filter((item) => ['REQUESTED', 'ACKNOWLEDGED', 'REOPENED'].includes(item.status));
  const openFeedbackCount = openRequests.length + comments.filter((item) => item.request_batch_id && !item.resolved_in_version_id).length;
  const feedback = [
    ...requests.map((item) => ({ id: item.id, kind: 'request' as const, blockId: item.block_id, author: item.requester_username || 'Khách hàng', body: item.message, date: item.created_at, status: item.status })),
    ...comments.map((item) => ({ id: item.id, kind: item.request_batch_id ? 'request' as const : 'comment' as const, blockId: item.block_id, author: item.author_username || 'Người dùng', body: item.body, date: item.created_at, status: item.request_batch_id ? item.resolved_in_version_id ? 'UPDATED' : 'REQUESTED' : '' })),
  ].filter((item) => feedbackFilter === 'all' || (feedbackFilter === 'open' ? item.kind === 'request' && ['REQUESTED', 'ACKNOWLEDGED', 'REOPENED'].includes(item.status) : item.kind === 'request' && !['REQUESTED', 'ACKNOWLEDGED', 'REOPENED'].includes(item.status)))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const goToBlock = (blockId: string | null) => {
    if (!blockId) return;
    setFilter('all');
    setFeedbackOpen(false);
    window.setTimeout(() => document.getElementById(`spec-${blockId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 0);
  };

  return <div className="-mx-5 -mt-5 sm:-mx-8 sm:-mt-8 bg-slate-50/50 min-h-screen pb-20">
    <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-4 sm:px-6 lg:px-8 py-3 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-2.5">
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={onBack} className="inline-flex items-center gap-1.5 rounded-xl bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-200"><ArrowLeft size={14} /> Đơn hàng</button>
          <div className="flex flex-wrap items-center gap-1.5 rounded-xl bg-slate-50 border border-slate-200/70 p-1">
            <span className="rounded-lg border border-orange-200 bg-orange-100 px-2 py-0.5 font-mono text-xs font-black text-orange-700">#{workspace.id.slice(0, 8)}</span>
            <span className="rounded-lg border border-slate-200 bg-white px-2 py-0.5 text-xs font-bold">{workspace.customer_name}</span>
            {quantity !== undefined && <span className="rounded-lg border border-slate-200 bg-white px-2 py-0.5 text-xs text-slate-600">SL: <b>{formatValue(quantity)} {formatValue(quantityUnit)}</b></span>}
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <span className="rounded-xl border border-orange-200 bg-orange-50 px-3 py-2 text-sm font-black text-orange-800">{selected ? `Đang xem V${selected.number}` : 'Đang xem bản nháp'}</span>
          <button onClick={() => setCompareOpen(true)} className="hidden sm:flex items-center gap-1.5 rounded-xl border border-orange-200 bg-orange-50 px-3 py-1.5 text-xs font-bold text-orange-700"><GitCompareArrows size={14} /> {previous && selected ? `So sánh v${previous.number}→v${selected.number}` : 'So sánh phiên bản'}</button>
          <button onClick={onRefresh} title="Làm mới" className="rounded-xl border border-slate-200 p-2 text-slate-600"><RefreshCw size={15} /></button>
        </div>
      </div>
      <h1 className="mt-2 text-xl sm:text-2xl font-black tracking-tight text-slate-900">{workspace.product_type}</h1>
    </div>

    <nav className="mx-4 mt-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:mx-6 lg:mx-8" aria-label="Các phiên bản của sản phẩm">
      <div className="flex flex-wrap items-center justify-between gap-2"><div><p className="text-sm font-black text-slate-900">Xem phiên bản sản phẩm</p><p className="text-xs text-slate-500">Chọn V1, V2… để xem hồ sơ đã phát hành. Bản nháp là nơi chuẩn bị thay đổi tiếp theo.</p></div><span className="text-xs font-semibold text-slate-500">{versions.length} phiên bản đã phát hành</span></div>
      <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
        {workspace.workflow_status === 'DRAFT' && <button onClick={() => onSelectVersion('')} className={`shrink-0 rounded-xl border px-4 py-2 text-sm font-bold ${!selectedVersionId ? 'border-teal-600 bg-teal-700 text-white' : 'border-slate-200 bg-white text-slate-700'}`}>Bản nháp hiện tại</button>}
        {[...versions].sort((a, b) => b.number - a.number).map((item) => <button key={item.id} onClick={() => onSelectVersion(item.id)} className={`shrink-0 rounded-xl border px-4 py-2 text-left ${selectedVersionId === item.id ? 'border-orange-500 bg-orange-50 ring-2 ring-orange-100' : 'border-slate-200 bg-white hover:border-orange-300'}`}><span className="block text-sm font-black text-slate-900">V{item.number}</span><span className="block text-[11px] text-slate-500">{versionStatusLabel[item.status] || item.status}</span></button>)}
      </div>
    </nav>

    <div className="px-4 sm:px-6 lg:px-8 py-5">
      <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap"><div className="relative"><button onClick={() => setTocOpen(!tocOpen)} className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold flex items-center gap-2"><FileCheck2 size={14} className="text-orange-500" /> Mục lục ({blocks.length}) <ChevronDown size={13} /></button>{tocOpen && <div className="absolute top-full left-0 mt-2 z-30 w-64 rounded-xl border border-slate-200 bg-white p-1 shadow-xl">{blocks.map((block, index) => <button key={block.id || index} onClick={() => { document.getElementById(`spec-${block.id || index}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }); setTocOpen(false); }} className="w-full rounded-lg px-3 py-2 text-left text-xs hover:bg-orange-50">{index + 1}. {block.label || `Mục ${index + 1}`}</button>)}</div>}</div>
          <div className="flex rounded-xl border border-slate-200 bg-slate-50 p-1">{([['all', 'Tất cả', blocks.length], ['changed', 'Thay đổi', changedIds.size], ['comments', 'Có thảo luận', commentedIds.size]] as const).map(([key, label, count]) => <button key={key} onClick={() => setFilter(key)} className={`rounded-lg px-3 py-1.5 text-xs font-bold ${filter === key ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500'}`}>{label} <span className="ml-1 rounded-full bg-orange-100 px-1.5 text-orange-800">{count}</span></button>)}</div>
        </div>
        <button onClick={() => setFeedbackOpen(true)} className="fixed right-4 top-44 z-30 flex items-center gap-2 rounded-xl bg-slate-900 px-3 py-2 text-xs font-bold text-white shadow-xl"><MessageSquare size={14} /> {guest ? 'Góp ý của bạn' : 'Góp ý của khách hàng'} <span className="rounded-full bg-orange-500 px-1.5">{guest ? pendingRequests.length : openFeedbackCount}</span></button>
      </div>
    </div>

    <div className="mx-4 sm:mx-6 lg:mx-8 rounded-3xl border border-slate-200/90 bg-white p-5 sm:p-8 lg:p-10 shadow-[0_4px_30px_rgba(15,23,42,0.03)]">
      <div className="border-b border-slate-100 pb-7 mb-7">
        <p className="text-[11px] font-bold uppercase tracking-widest text-orange-600">Hồ sơ kỹ thuật sản xuất</p>
        <h2 className="mt-2 text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-slate-900">{workspace.product_type}</h2>
        <div className="mt-3 flex items-center gap-2 flex-wrap"><span className="rounded-xl border border-orange-200 bg-orange-100 px-3 py-1.5 text-xs font-black text-orange-900">{selected ? `Phiên bản v${selected.number}` : 'Bản nháp'}</span><button onClick={() => setCompareOpen(true)} className="rounded-xl bg-orange-600 px-4 py-1.5 text-xs font-bold text-white flex items-center gap-1.5"><GitCompareArrows size={14} /> {previous && selected ? `Xem so sánh v${previous.number}→v${selected.number}` : 'Xem so sánh'}</button></div>
        <div className="mt-6 rounded-2xl border border-[#4a5a7d] bg-[#3b4b6d] p-4 sm:p-5 text-white flex flex-wrap items-center justify-between gap-3 shadow-md"><div><p className="text-xs font-black uppercase tracking-wider text-amber-400">● Cần chú ý trong {selected ? `phiên bản v${selected.number}` : 'bản nháp'}</p><p className="mt-2 text-xs sm:text-sm text-slate-200">{firstChange ? `${firstChangeLabel || 'Hạng mục'} · ${fieldLabel(firstChange.field_path)}: ${formatHumanValue(firstChange.before)} → ${formatHumanValue(firstChange.after)}.` : changedIds.size > 0 ? `${changedIds.size} mục có thay đổi so với phiên bản trước.` : 'Đọc kỹ các thông số kỹ thuật trước khi sản xuất.'} {statusLabel[workspace.workflow_status]}.</p></div><button onClick={() => setCompareOpen(true)} className="rounded-xl bg-orange-600 px-3.5 py-2 text-xs font-bold flex items-center gap-1.5">So sánh trực quan <ArrowRight size={14} /></button></div>
      </div>
      <div className="space-y-4">{visibleBlocks.map((block, index) => <section id={`spec-${block.id || index}`} key={block.id || index} onClick={() => openBlockFeedback(block.id || '')} onKeyDown={(event) => { if (guest && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); openBlockFeedback(block.id || ''); } }} tabIndex={guest ? 0 : undefined} aria-label={guest ? `Góp ý cho ${block.label || `Mục ${index + 1}`}` : undefined} className={`rounded-2xl border bg-white p-4 sm:p-5 scroll-mt-40 ${guest ? 'cursor-pointer hover:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-300' : ''} ${feedbackBlockId === block.id && feedbackOpen ? 'border-orange-400 ring-2 ring-orange-100' : changedIds.has(block.id || '') ? 'border-amber-300' : 'border-slate-200'}`}>
        <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-3"><div className="flex items-center gap-2"><BlockIcon type={block.block_type} /><h3 className="text-xs font-black uppercase tracking-wider text-slate-800">{block.label || `Mục ${index + 1}`}</h3></div><div className="flex items-center gap-2">{changedIds.has(block.id || '') && <span className="text-[10px] font-bold text-orange-700">Đã thay đổi</span>}{!guest && (workspace.workflow_status === 'DRAFT' ? !selectedVersionId : selectedVersionId === workspace.latest_version_id) && <button onClick={() => onEditBlock(block)} className="text-xs text-slate-500 hover:text-orange-700 flex items-center gap-1"><Pencil size={12} /> {workspace.workflow_status === 'DRAFT' ? 'Sửa' : 'Sửa trong bản mới'}</button>}{guest && <span className="text-xs font-semibold text-orange-700">{draftRequests[block.id || '']?.trim() ? 'Đã viết yêu cầu' : 'Nhấn để góp ý'}</span>}{commentedIds.has(block.id || '') && <button onClick={(event) => { event.stopPropagation(); setFeedbackBlockId(block.id || ''); setFeedbackOpen(true); }} className="text-xs text-slate-500 flex items-center gap-1"><MessageSquare size={12} /> {comments.filter((item) => item.block_id === block.id).length + requests.filter((item) => item.block_id === block.id).length}</button>}</div></div>
        {block.content?.value !== undefined && <p className="mt-3 text-base font-black text-slate-900">{formatValue(block.content.value)}{block.content.unit ? ` ${formatValue(block.content.unit)}` : ''}</p>}
        {(block.block_type === 'color' || block.block_type === 'material') && block.content?.name !== undefined && <div className="mt-3 flex items-center gap-2">{block.block_type === 'color' && typeof block.content.hex === 'string' && /^#[0-9a-fA-F]{6}$/.test(block.content.hex) && <span aria-label={`Màu ${block.content.hex}`} className="h-5 w-5 rounded-md border border-slate-200" style={{ backgroundColor: block.content.hex }} />}<p className="text-base font-black text-slate-900">{formatValue(block.content.name)}</p></div>}
        {block.block_type === 'markdown' && typeof block.content?.markdown === 'string' && <div className="mt-4"><MarkdownContent markdown={block.content.markdown} /></div>}
        {block.block_type === 'image' && <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{(Array.isArray(block.content?.asset_ids) ? block.content.asset_ids : block.content?.asset_id ? [block.content.asset_id] : []).filter((assetId): assetId is string => typeof assetId === 'string').map((assetId, imageIndex) => <WorkspaceImage key={assetId} api={api} workspaceId={workspace.id} assetId={assetId} alt={`${block.label || 'Ảnh đính kèm'} ${imageIndex + 1}`} className="max-h-[32rem] w-full rounded-xl border border-slate-200 object-contain bg-slate-50" />)}</div>}
        {(diff?.changed || []).filter((change) => change.block_id === block.id).map((change, changeIndex) => <div key={changeIndex} className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs"><p className="font-bold uppercase text-amber-800">Mục thay đổi: {fieldLabel(change.field_path)}</p><span className="text-slate-400 line-through">{formatHumanValue(change.before)}</span><span className="mx-2 text-orange-600">↓</span><b className="text-amber-900">{formatHumanValue(change.after)}</b></div>)}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-4">{Object.entries(block.content || {}).filter(([key]) => key !== 'value' && key !== 'unit' && key !== 'markdown' && !(block.block_type === 'image' && (key === 'asset_id' || key === 'asset_ids')) && !((block.block_type === 'color' || block.block_type === 'material') && key === 'name')).map(([key, value]) => <div key={key}><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{detailLabel[key] || key.replaceAll('_', ' ')}</p><p className="mt-1 text-sm font-bold text-slate-900 break-words">{formatValue(value)}</p></div>)}{Object.keys(block.content || {}).length === 0 && <p className="text-sm text-slate-500">Chưa có nội dung.</p>}</div>
      </section>)}{visibleBlocks.length === 0 && <div className="rounded-2xl border border-dashed border-slate-200 p-10 text-center text-sm text-slate-500">{blocks.length === 0 ? 'Hồ sơ chưa có hạng mục kỹ thuật.' : 'Không có hạng mục nào trong bộ lọc này.'}</div>}</div>
      <div className="mt-8 border-t border-slate-100 pt-5 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500"><span className="flex items-center gap-2"><FileCheck2 size={15} className="text-emerald-600" /> {blocks.length} hạng mục kỹ thuật trong hồ sơ</span>{!guest && <button onClick={onAddBlock} className="rounded-xl border border-orange-200 bg-orange-50 px-4 py-2.5 text-sm font-black text-orange-800 flex items-center gap-2 hover:bg-orange-100"><Plus size={17} /> Thêm hạng mục mới</button>}</div>
    </div>

    {!guest && <section className="mx-4 mt-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:mx-6 lg:mx-8">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="text-lg font-black text-slate-900">Link sản phẩm cho khách hàng</h3><p className="mt-1 text-sm text-slate-600">Gửi link này để khách hàng xem phiên bản hiện tại, góp ý và phê duyệt.</p></div>{reviewUrl && <button onClick={() => void navigator.clipboard.writeText(reviewUrl)} className="inline-flex items-center gap-2 rounded-xl bg-teal-700 px-4 py-2 text-sm font-bold text-white"><Share2 size={16} /> Sao chép link</button>}</div>
      {reviewUrl ? <a href={reviewUrl} target="_blank" rel="noreferrer" className="mt-3 block break-all text-sm font-semibold text-orange-700 underline underline-offset-2">{reviewUrl}</a> : <p className="mt-3 text-sm text-slate-500">Chưa có link khách hàng đang hoạt động.</p>}
      <ZaloLinkPanel api={api} mode="customer" workspaceId={workspace.id} compact />
    </section>}
    <div className="fixed bottom-0 right-0 z-40 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-white/95 px-4 sm:px-6 lg:px-8 py-3 shadow-[0_-4px_16px_rgba(15,23,42,0.05)]" style={{ left: 'var(--sidebar-width, 0px)' }}><p className="text-xs font-semibold text-slate-600 flex items-center gap-2">{workspace.workflow_status === 'IN_REVIEW' ? <Clock3 size={16} className="text-amber-500" /> : workspace.workflow_status === 'LOCKED_FOR_PRODUCTION' ? <LockKeyhole size={16} className="text-emerald-600" /> : <CheckCircle2 size={16} className="text-teal-700" />}{statusLabel[workspace.workflow_status]}{openRequestCount !== undefined && ' · Đang chờ phản hồi từ khách hàng'}</p><div className="flex items-center gap-2"><button onClick={guest ? () => setFeedbackOpen(true) : onOpenRequests} className="rounded-xl border border-rose-200 px-3 py-2 text-xs font-bold text-rose-700">{guest ? 'Gửi góp ý' : 'Yêu cầu chỉnh sửa'}</button>{guest && workspace.workflow_status === 'IN_REVIEW' && <button disabled={busy || selectedVersionId !== workspace.latest_version_id} onClick={onApprove} className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white disabled:opacity-50">Phê duyệt phiên bản</button>}{!guest && workspace.workflow_status === 'APPROVED' && <button disabled={busy} onClick={onLock} className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white disabled:opacity-50">Khóa sản xuất</button>}</div></div>
    {compareOpen && <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 p-4" role="dialog" aria-modal="true" aria-label="So sánh phiên bản">
      <div className="max-h-[85vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl">
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-4"><div><p className="text-xs font-bold uppercase text-orange-600">Thay đổi của sản phẩm</p><h2 className="mt-1 text-xl font-black">{selected ? previous ? `V${previous.number} → V${selected.number}` : `Phiên bản đầu tiên · V${selected.number}` : 'Bản nháp'}</h2></div><button onClick={() => setCompareOpen(false)} aria-label="Đóng" className="rounded-xl border border-slate-200 p-2"><X size={18} /></button></div>
        {diff ? <div className="mt-5 space-y-3 text-sm">
          {diff.changed.map((change, index) => { const display = describeChange(change, blocks as SnapshotBlock[]); return <div key={`c${index}`} className="rounded-xl border border-amber-200 bg-amber-50 p-4"><strong>{display.title}:</strong> <span className="text-slate-500 line-through">{display.before}</span> <span className="font-black text-orange-700">→ {display.after}</span></div>; })}
          {diff.added.map((item, index) => <div key={`a${index}`} className="rounded-xl border border-emerald-200 bg-emerald-50 p-4"><b>Đã thêm · </b>{describeBlock(item as SnapshotBlock)}</div>)}
          {diff.removed.map((item, index) => <div key={`r${index}`} className="rounded-xl border border-rose-200 bg-rose-50 p-4"><b>Đã xóa · </b>{describeBlock(item as SnapshotBlock)}</div>)}
          {diff.reordered.map((item, index) => <div key={`o${index}`} className="rounded-xl border border-sky-200 bg-sky-50 p-4">Đổi vị trí từ {item.before_position + 1} sang {item.after_position + 1}</div>)}
          {diff.changed.length + diff.added.length + diff.removed.length + diff.reordered.length === 0 && <p className="text-slate-500">Không có thay đổi so với phiên bản trước.</p>}
        </div> : <p className="mt-5 text-sm text-slate-500">Chọn phiên bản đã phát hành để xem thay đổi.</p>}
      </div>
    </div>}    {feedbackOpen && <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label={guest ? 'Góp ý của bạn' : 'Góp ý của khách hàng'}>
      <button aria-label="Đóng góp ý" onClick={() => setFeedbackOpen(false)} className="absolute inset-0 w-full bg-slate-950/40" />
      <aside className="absolute right-0 top-0 bottom-0 flex w-full max-w-[460px] flex-col bg-white shadow-2xl">
        <div className="border-b border-slate-200 px-5 py-4"><div className="flex items-center justify-between"><div><h2 className="font-black text-slate-900">{guest ? 'Góp ý của bạn' : 'Góp ý của khách hàng'} <span className="ml-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800">{guest ? pendingRequests.length : openFeedbackCount}</span></h2><p className="text-xs text-slate-500">{guest ? 'Viết yêu cầu riêng cho từng hạng mục, sau đó gửi tất cả một lần.' : 'Yêu cầu thay đổi và bình luận trong Workspace'}</p></div><button onClick={() => setFeedbackOpen(false)} aria-label="Đóng" className="rounded-lg p-2 hover:bg-slate-100"><X size={18} /></button></div></div>
        {guest && <div className="border-b border-orange-100 bg-orange-50/60 p-4"><label htmlFor="request-block" className="text-xs font-bold text-slate-700">Hạng mục đang góp ý</label><select id="request-block" value={feedbackBlockId} onChange={(event) => setFeedbackBlockId(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"><option value="">Chọn hạng mục</option>{blocks.map((block) => <option key={block.id} value={block.id}>{block.label}</option>)}</select>{currentBlock && <><p className="mt-3 text-xs font-bold text-slate-700">Yêu cầu cho {currentBlock.label}</p><textarea aria-label={`Yêu cầu cho ${currentBlock.label}`} value={draftRequests[currentBlock.id || ''] || ''} onChange={(event) => setDraftRequests((previous) => ({ ...previous, [currentBlock.id!]: event.target.value }))} maxLength={5000} rows={4} placeholder="Viết nội dung cần chỉnh sửa cho hạng mục này..." className="mt-2 w-full resize-y rounded-xl border border-slate-200 bg-white p-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200" /><p className="mt-1 text-[11px] text-slate-500">Nội dung được giữ lại khi bạn chọn hạng mục khác.</p></>}</div>}
        <div className="flex gap-2 border-b border-slate-100 px-5 py-3">{guest ? <span className="text-xs font-bold text-slate-700">Đã soạn {pendingRequests.length} yêu cầu · {blocks.length - pendingRequests.length} hạng mục chưa góp ý</span> : ([['all', 'Tất cả', requests.length + comments.length], ['open', 'Chưa xử lý', openFeedbackCount], ['done', 'Đã xử lý', requests.length - openRequests.length + comments.filter((item) => item.request_batch_id && item.resolved_in_version_id).length]] as const).map(([key, label, count]) => <button key={key} onClick={() => setFeedbackFilter(key)} className={`rounded-lg px-3 py-1.5 text-xs font-bold ${feedbackFilter === key ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'}`}>{label} {count}</button>)}</div>
        <div className="flex-1 space-y-3 overflow-y-auto p-5">{guest && <section className="space-y-2"><h3 className="text-xs font-black uppercase tracking-wide text-slate-700">Yêu cầu chuẩn bị gửi</h3>{pendingRequests.map((item) => <button key={item.block_id} onClick={() => setFeedbackBlockId(item.block_id)} className={`w-full rounded-xl border p-3 text-left ${feedbackBlockId === item.block_id ? 'border-orange-400 bg-orange-50' : 'border-slate-200'}`}><span className="text-xs font-black text-orange-700">{blocks.find((block) => block.id === item.block_id)?.label}</span><p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">{item.message}</p></button>)}{pendingRequests.length === 0 && <p className="rounded-xl border border-dashed border-slate-200 p-4 text-xs text-slate-500">Nhấn vào hạng mục trong hồ sơ để viết yêu cầu.</p>}</section>}{feedback.map((item) => <article key={`${item.kind}-${item.id}`} className={`rounded-2xl border p-4 ${item.kind === 'request' && ['REQUESTED', 'ACKNOWLEDGED', 'REOPENED'].includes(item.status) ? 'border-amber-300' : 'border-slate-200'}`}><div className="flex items-start justify-between gap-2"><div><p className="text-sm font-bold text-slate-900">{item.author}</p><p className="text-[11px] text-slate-500">{new Date(item.date).toLocaleString('vi-VN')}</p></div><span className={`rounded-lg px-2 py-1 text-[10px] font-bold ${item.kind === 'request' ? 'bg-amber-50 text-amber-800' : 'bg-sky-50 text-sky-700'}`}>{item.kind === 'request' ? item.status === 'REQUESTED' ? 'Chưa tiếp nhận' : item.status === 'ACKNOWLEDGED' ? 'Đã tiếp nhận' : item.status === 'UPDATED' ? 'Đã xử lý' : item.status === 'CONFIRMED' ? 'Đã xác nhận' : item.status === 'REOPENED' ? 'Mở lại' : item.status === 'REJECTED' ? 'Từ chối' : 'Đã hủy' : 'Bình luận'}</span></div><p className="mt-3 text-xs font-bold text-orange-700">{blocks.find((block) => block.id === item.blockId)?.label || 'Góp ý chung'}</p><p className="mt-2 text-sm leading-6 text-slate-700">{item.body}</p><div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3"><button onClick={() => goToBlock(item.blockId)} disabled={!item.blockId || !blocks.some((block) => block.id === item.blockId)} className="text-xs font-semibold text-slate-500 hover:text-orange-700 disabled:opacity-40">Cuộn đến vị trí →</button>{item.kind === 'request' && !guest && item.status === 'REQUESTED' && requests.some((request) => request.id === item.id) && <button disabled={busy} onClick={() => void onAcknowledgeRequest(item.id)} className="rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50">Tiếp nhận yêu cầu</button>}</div></article>)}{feedback.length === 0 && !guest && <p className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">Chưa có góp ý trong bộ lọc này.</p>}</div>
        {guest ? <div className="border-t border-slate-200 p-4"><p className="mb-3 text-xs text-slate-500">Chỉ những hạng mục đã viết yêu cầu mới được gửi. Gửi một lần cho bản {selected ? `v${selected.number}` : 'nháp'} hiện tại.</p><button disabled={busy || pendingRequests.length === 0 || !canSubmitRequests} onClick={() => void onSubmitRequests(pendingRequests).then((ok) => { if (ok) { setDraftRequests({}); setFeedbackBlockId(''); setFeedbackOpen(false); } })} className="w-full rounded-xl bg-orange-600 px-4 py-3 text-sm font-black text-white disabled:opacity-50">{busy ? 'Đang gửi…' : `Gửi tất cả ${pendingRequests.length} yêu cầu`}</button>{!canSubmitRequests && <p className="mt-2 text-xs text-red-600">Vui lòng mở phiên bản hiện tại để gửi yêu cầu.</p>}</div> : <form className="border-t border-slate-200 p-4" onSubmit={(event) => { event.preventDefault(); if (feedbackText.trim()) void onSubmitComment(feedbackText.trim(), selectedVersionId ? feedbackBlockId || null : null).then((ok) => { if (ok) setFeedbackText(''); }); }}><label className="text-xs font-bold text-slate-700">Thêm phản hồi</label><select value={selectedVersionId ? feedbackBlockId : ''} onChange={(event) => setFeedbackBlockId(event.target.value)} className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs"><option value="">Góp ý chung</option>{selectedVersionId && blocks.map((block) => <option key={block.id} value={block.id}>{block.label}</option>)}</select><div className="mt-2 flex gap-2"><input value={feedbackText} onChange={(event) => setFeedbackText(event.target.value)} placeholder="Viết phản hồi..." className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm" /><button disabled={busy || !feedbackText.trim()} className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white disabled:opacity-50">Gửi</button></div></form>}
      </aside>
    </div>}
  </div>;
}
