import { ArrowRight, GitCompareArrows, Plus } from 'lucide-react';
import type { Diff, Version, Workspace } from '../domain/models';
import { describeBlock, describeChange, type SnapshotBlock } from './versionText';

const statusText: Record<string, string> = {
  IN_REVIEW: 'Đang chờ khách duyệt', APPROVED: 'Đã duyệt',
  LOCKED_FOR_PRODUCTION: 'Đã khóa sản xuất', HISTORICAL: 'Phiên bản cũ',
};
const dateText = (value: string) => new Date(value).toLocaleString('vi-VN');

export function WorkspaceVersionPanel({ workspace, versions, selectedVersionId, version, diff,
  guest, busy, blockCount, onSelectVersion, onOpenDocument, onPublish, onBeginDraft }: {
  workspace: Workspace; versions: Version[]; selectedVersionId: string;
  version: Version | null; diff: Diff | null; guest: boolean; busy: boolean;
  blockCount: number; onSelectVersion: (id: string) => void;
  onOpenDocument: () => void; onPublish: () => void; onBeginDraft: () => void;
}) {
  const selected = versions.find((item) => item.id === selectedVersionId);
  const snapshot = (version?.id === selectedVersionId ? version.snapshot || [] : []) as SnapshotBlock[];
  const previous = versions.find((item) => item.id === version?.previous_version_id);
  return <div className="space-y-5">
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div><p className="text-xs font-bold uppercase tracking-widest text-orange-600">Lịch sử hồ sơ</p><h2 className="mt-1 text-2xl font-black text-slate-900">Các phiên bản sản phẩm</h2><p className="mt-2 text-sm text-slate-600">Chọn V1, V2… để xem nội dung đã phát hành. Mỗi phiên bản được giữ nguyên để đối chiếu.</p></div>
        {!guest && workspace.workflow_status === 'DRAFT' && <button disabled={busy || blockCount === 0} onClick={onPublish} className="rounded-xl bg-orange-600 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">Phát hành bản nháp thành V{(versions[0]?.number || 0) + 1}</button>}
        {!guest && workspace.workflow_status !== 'DRAFT' && <button disabled={busy} onClick={onBeginDraft} className="inline-flex items-center gap-2 rounded-xl border border-orange-300 bg-orange-50 px-4 py-2.5 text-sm font-bold text-orange-800"><Plus size={16} /> Tạo bản chỉnh sửa tiếp theo</button>}
      </div>
      <div className="mt-5 flex flex-wrap gap-3" aria-label="Chọn phiên bản">
        {workspace.workflow_status === 'DRAFT' && <button onClick={() => onSelectVersion('')} className={`rounded-xl border px-4 py-3 text-left ${!selectedVersionId ? 'border-teal-600 bg-teal-50 ring-2 ring-teal-100' : 'border-slate-200 bg-white'}`}><span className="block text-sm font-black">Bản nháp đang chỉnh sửa</span><span className="text-xs text-slate-500">Chưa phát hành · {blockCount} hạng mục</span></button>}
        {[...versions].sort((a, b) => b.number - a.number).map((item) => <button key={item.id} onClick={() => onSelectVersion(item.id)} className={`min-w-44 rounded-xl border px-4 py-3 text-left transition ${selectedVersionId === item.id ? 'border-orange-500 bg-orange-50 ring-2 ring-orange-100' : 'border-slate-200 bg-white hover:border-orange-300'}`}><span className="block text-base font-black">Phiên bản V{item.number}</span><span className="block text-xs font-semibold text-slate-600">{statusText[item.status] || item.status}</span><span className="mt-1 block text-[11px] text-slate-500">{dateText(item.created_at)}</span></button>)}
        {versions.length === 0 && <p className="text-sm text-slate-500">Chưa phát hành phiên bản nào. Hoàn tất các hạng mục trong bản nháp rồi phát hành V1.</p>}
      </div>
    </section>

    {!selectedVersionId && workspace.workflow_status === 'DRAFT' && <section className="rounded-2xl border border-teal-200 bg-teal-50 p-5"><h3 className="font-black text-teal-950">Bản nháp hiện tại</h3><p className="mt-1 text-sm text-teal-900">Bạn có thể thêm hoặc sửa nhiều hạng mục ở bản nháp. Khi đã xong, phát hành một lần để tạo phiên bản mới cho khách hàng xem.</p></section>}
    {selected && <div className="grid gap-5 xl:grid-cols-2">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-wider text-orange-600">Nội dung đã phát hành</p><h3 className="mt-1 text-xl font-black">Phiên bản V{selected.number}</h3><p className="mt-1 text-xs text-slate-500">{statusText[selected.status] || selected.status} · {dateText(selected.created_at)}</p></div><button onClick={onOpenDocument} className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold">Xem hồ sơ <ArrowRight size={15} /></button></div>
        <div className="mt-4 space-y-2">{snapshot.map((item, index) => <div key={item.id || index} className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm"><span className="mr-2 font-bold text-orange-700">{index + 1}.</span><span className="font-semibold text-slate-900">{describeBlock(item)}</span></div>)}{snapshot.length === 0 && <p className="text-sm text-slate-500">Đang tải nội dung phiên bản…</p>}</div>
      </section>
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2"><GitCompareArrows size={18} className="text-orange-600" /><h3 className="text-xl font-black">Thay đổi ở V{selected.number}</h3></div>
        <p className="mt-1 text-sm text-slate-500">{previous ? `So với V${previous.number}` : 'Đây là phiên bản đầu tiên của sản phẩm.'}</p>
        {diff && <div className="mt-4 space-y-2 text-sm">
          {diff.changed.map((change, index) => { const display = describeChange(change, snapshot); return <div key={`c${index}`} className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3"><strong className="text-slate-900">{display.title}:</strong> <span className="text-slate-500 line-through">{display.before}</span> <span className="font-black text-orange-700">→ {display.after}</span></div>; })}
          {diff.added.map((item, index) => <div key={`a${index}`} className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3"><span className="font-bold text-emerald-800">Đã thêm · </span>{describeBlock(item as SnapshotBlock)}</div>)}
          {diff.removed.map((item, index) => <div key={`r${index}`} className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3"><span className="font-bold text-rose-800">Đã xóa · </span>{describeBlock(item as SnapshotBlock)}</div>)}
          {diff.reordered.map((item, index) => <div key={`o${index}`} className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3">Đổi vị trí hạng mục từ {item.before_position + 1} sang {item.after_position + 1}</div>)}
          {diff.changed.length + diff.added.length + diff.removed.length + diff.reordered.length === 0 && <p className="rounded-xl bg-slate-50 p-4 text-slate-500">Không có thay đổi so với phiên bản trước.</p>}
        </div>}
      </section>
    </div>}
    {!selectedVersionId && workspace.workflow_status !== 'DRAFT' && <p className="rounded-2xl border border-dashed border-slate-200 bg-white p-6 text-sm text-slate-500">Chọn một phiên bản phía trên để xem nội dung và thay đổi.</p>}
  </div>;
}
