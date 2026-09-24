import { FileText, Paperclip } from 'lucide-react';
import type { Proofprint } from '../application/proofprint';
import type { Block, Version } from '../domain/models';
import { WorkspaceImage } from './WorkspaceImage';
import type { SnapshotBlock } from './versionText';

type FileEntry = { key: string; label: string; filename: string; kind: string; assetId: string };

export function WorkspaceFilesPanel({ api, workspaceId, version, draftBlocks }: { api: Proofprint; workspaceId: string; version: Version | null; draftBlocks: Block[] }) {
  const blocks = (version?.snapshot || draftBlocks) as SnapshotBlock[];
  const files: FileEntry[] = blocks.flatMap((block, index) => {
    if (block.block_type !== 'image' && block.block_type !== 'file') return [];
    const content = block.content || {};
    const ids = Array.isArray(content.asset_ids) ? content.asset_ids : content.asset_id ? [content.asset_id] : [];
    const assets = (block as SnapshotBlock & { assets?: Array<{ asset_id?: string; original_filename?: string }> }).assets || [];
    return ids.filter((assetId): assetId is string => typeof assetId === 'string').map((assetId, assetIndex) => ({
      key: `${block.id || index}-${assetId}`,
      label: block.label || 'Hạng mục',
      filename: assets.find((item) => item.asset_id === assetId)?.original_filename || `Ảnh ${assetIndex + 1}`,
      kind: block.block_type || 'image', assetId,
    }));
  });
  return <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
    <div className="flex items-center gap-3"><span className="rounded-xl bg-violet-50 p-2 text-violet-700"><Paperclip size={21} /></span><div><h2 className="text-xl font-black">Ảnh đính kèm</h2><p className="text-sm text-slate-600">Các ảnh gắn với hạng mục sản phẩm được lưu cùng hồ sơ và từng phiên bản.</p></div></div>
    <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{files.map((item) => <div key={item.key} className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50">{item.kind === 'image' ? <WorkspaceImage api={api} workspaceId={workspaceId} assetId={item.assetId} alt={item.filename} className="h-48 w-full object-contain" /> : <div className="grid h-48 place-items-center"><FileText size={28} className="text-orange-600" /></div>}<div className="bg-white p-3"><p className="break-all text-sm font-bold text-slate-900">{item.filename}</p><p className="mt-1 text-xs text-slate-500">Hạng mục: {item.label}</p></div></div>)}{files.length === 0 && <p className="rounded-xl border border-dashed border-slate-200 p-6 text-sm text-slate-500">Hồ sơ này chưa có ảnh đính kèm.</p>}</div>
  </section>;
}
