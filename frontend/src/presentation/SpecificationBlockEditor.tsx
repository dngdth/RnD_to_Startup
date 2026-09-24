import { useEffect, useRef, useState } from 'react';
import { ImagePlus, X } from 'lucide-react';
import type { Proofprint } from '../application/proofprint';
import type { BlockType } from '../domain/models';
import { WorkspaceImage } from './WorkspaceImage';
import { MarkdownContent } from './MarkdownContent';

export const blockTypeNames: Record<BlockType, string> = {
  text: 'Mô tả', markdown: 'Nội dung chi tiết (.md)', quantity: 'Số lượng', color: 'Màu sắc', dimension: 'Kích thước',
  material: 'Chất liệu', image: 'Ảnh đính kèm', file: 'Tệp đính kèm (cũ)',
  note: 'Ghi chú', print_area: 'Vùng in hoặc thêu',
};

export const blockTypes: BlockType[] = [
  'text', 'markdown', 'quantity', 'color', 'dimension', 'material', 'image', 'file', 'note', 'print_area',
];

type Field = { key: string; label: string; required?: boolean; kind?: 'number' | 'textarea' | 'unit'; placeholder?: string };
const fieldDefinitions: Record<BlockType, Field[]> = {
  text: [{ key: 'value', label: 'Nội dung mô tả', required: true, kind: 'textarea', placeholder: 'Ví dụ: Áo thun cổ tròn' }],
  markdown: [{ key: 'markdown', label: 'Nội dung Markdown', required: true, kind: 'textarea', placeholder: '## Chất liệu vải\n- 420 GSM\n- 100% Cotton' }],
  quantity: [{ key: 'value', label: 'Số lượng', required: true, kind: 'number' }, { key: 'unit', label: 'Đơn vị', required: true, placeholder: 'Ví dụ: cái' }],
  color: [{ key: 'name', label: 'Tên màu', required: true, placeholder: 'Ví dụ: Xanh navy' }, { key: 'hex', label: 'Mã HEX (không bắt buộc)', placeholder: '#1F2937' }, { key: 'pantone', label: 'Mã Pantone (không bắt buộc)' }],
  dimension: [{ key: 'width', label: 'Chiều rộng', required: true, kind: 'number' }, { key: 'height', label: 'Chiều cao', required: true, kind: 'number' }, { key: 'unit', label: 'Đơn vị', required: true, kind: 'unit' }],
  material: [{ key: 'name', label: 'Tên chất liệu', required: true, placeholder: 'Ví dụ: Cotton 100%' }, { key: 'code', label: 'Mã chất liệu (không bắt buộc)' }, { key: 'details', label: 'Chi tiết (không bắt buộc)', kind: 'textarea' }],
  image: [{ key: 'caption', label: 'Chú thích (không bắt buộc)' }],
  file: [{ key: 'asset_id', label: 'ID tệp đã tải lên', required: true }, { key: 'description', label: 'Mô tả (không bắt buộc)' }],
  note: [{ key: 'text', label: 'Nội dung ghi chú', required: true, kind: 'textarea' }],
  print_area: [{ key: 'surface', label: 'Vị trí in hoặc thêu', required: true, placeholder: 'Ví dụ: Lưng áo' }, { key: 'width', label: 'Chiều rộng', required: true, kind: 'number' }, { key: 'height', label: 'Chiều cao', required: true, kind: 'number' }, { key: 'unit', label: 'Đơn vị', required: true, kind: 'unit' }],
};

export function blockFieldName(type: BlockType, key: string): string {
  return fieldDefinitions[type].find((field) => field.key === key)?.label || key;
}

export type BlockDraft = { id: string; block_type: BlockType; label: string; fields: Record<string, string> };

export function newBlockDraft(block_type: BlockType = 'text'): BlockDraft {
  return { id: crypto.randomUUID(), block_type, label: blockTypeNames[block_type], fields: { unit: block_type === 'quantity' ? 'cái' : 'cm' } };
}

export function draftFromBlock(block: { id: string; block_type: BlockType; label: string; content: Record<string, unknown> }): BlockDraft {
  const content = { ...block.content };
  if (block.block_type === 'image' && content.asset_id && !content.asset_ids) {
    content.asset_ids = [content.asset_id];
  }
  return {
    id: block.id, block_type: block.block_type, label: block.label,
    fields: Object.fromEntries(Object.entries(content).map(([key, value]) => [key, Array.isArray(value) ? value.join(',') : String(value ?? '')])),
  };
}

export function blockContent(draft: BlockDraft): Record<string, unknown> {
  if (!draft.label.trim()) throw new Error('Vui lòng nhập tên hạng mục.');
  const content: Record<string, unknown> = {};
  for (const field of fieldDefinitions[draft.block_type]) {
    const raw = (draft.fields[field.key] || '').trim();
    if (field.required && !raw) throw new Error(`Vui lòng nhập ${field.label.toLocaleLowerCase('vi')} cho hạng mục “${draft.label}”.`);
    if (!raw) continue;
    if (field.kind === 'number') {
      const value = Number(raw);
      if (!Number.isFinite(value) || value <= 0 || (draft.block_type === 'quantity' && !Number.isInteger(value))) {
        throw new Error(`${field.label} phải là số dương${draft.block_type === 'quantity' ? ' nguyên' : ''}.`);
      }
      content[field.key] = value;
    } else {
      content[field.key] = raw;
    }
  }
  if (draft.block_type === 'image') {
    const assetIds = (draft.fields.asset_ids || '').split(',').map((item) => item.trim()).filter(Boolean);
    if (!assetIds.length || assetIds.length > 20 || assetIds.some((id) => !/^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(id))) {
      throw new Error('Vui lòng thêm từ 1 đến 20 ảnh cho hạng mục.');
    }
    content.asset_ids = [...new Set(assetIds)];
  }
  if (draft.block_type === 'color' && content.hex && !/^#[0-9a-fA-F]{6}$/.test(String(content.hex))) {
    throw new Error('Mã HEX cần có dạng #RRGGBB.');
  }
  if (draft.block_type === 'file' && !/^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(String(content.asset_id || ''))) {
    throw new Error('ID tài sản cần là UUID hợp lệ.');
  }
  return content;
}

export function SpecificationBlockEditor({ draft, onChange, initial = false, onUploadImages, imageApi, workspaceId }: {
  draft: BlockDraft;
  onChange: (next: BlockDraft) => void;
  initial?: boolean;
  onUploadImages?: (files: File[]) => Promise<{ ids: string[]; error?: string }>;
  imageApi?: Proofprint;
  workspaceId?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const markdownRef = useRef<HTMLInputElement>(null);
  const draftRef = useRef(draft);
  draftRef.current = draft;
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  useEffect(() => {
    if (!uploadError) return;
    const timer = window.setTimeout(() => setUploadError(''), 5000);
    return () => window.clearTimeout(timer);
  }, [uploadError]);
  const imageIds = (draft.fields.asset_ids || '').split(',').map((item) => item.trim()).filter(Boolean);
  const acceptImages = async (files: File[]) => {
    if (!onUploadImages || files.length === 0 || uploading) return;
    if (imageIds.length + files.length > 20) { setUploadError('Mỗi hạng mục có tối đa 20 ảnh.'); return; }
    setUploading(true); setUploadError('');
    try {
      const result = await onUploadImages(files);
      if (result.ids.length) {
        const current = draftRef.current;
        const currentIds = (current.fields.asset_ids || '').split(',').map((item) => item.trim()).filter(Boolean);
        onChange({ ...current, fields: { ...current.fields, asset_ids: [...currentIds, ...result.ids].join(',') } });
      }
      if (result.error) setUploadError(result.error);
    } catch (cause) {
      setUploadError(cause instanceof Error ? cause.message : 'Không tải được ảnh.');
    } finally { setUploading(false); }
  };
  const inputClass = 'w-full rounded-xl border border-slate-300 bg-white p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200';
  return <div className="space-y-3">
    <div className="grid gap-3 sm:grid-cols-2">
      <label className="block text-xs font-bold text-slate-700">Loại thông số
        <select className={`${inputClass} mt-1`} value={draft.block_type} onChange={(event) => {
          const nextType = event.target.value as BlockType;
          const next = newBlockDraft(nextType);
          onChange({ ...next, id: draft.id, label: draft.label === blockTypeNames[draft.block_type] ? next.label : draft.label });
        }}>{blockTypes.map((type) => <option key={type} value={type} disabled={(initial && (type === 'image' || type === 'file')) || (type === 'file' && draft.block_type !== 'file')}>{blockTypeNames[type]}{initial && (type === 'image' || type === 'file') ? ' — thêm sau' : ''}</option>)}</select>
      </label>
      <label className="block text-xs font-bold text-slate-700">Tên hạng mục
        <input className={`${inputClass} mt-1`} value={draft.label} onChange={(event) => onChange({ ...draft, label: event.target.value })} required maxLength={200} placeholder="Ví dụ: Sản phẩm, Số lượng, Chất liệu vải" />
      </label>
    </div>
    <p className="text-xs text-slate-500">Tên hạng mục là tiêu đề của phần thông số trong đơn hàng, ví dụ “Số lượng” hoặc “Logo & hình in”.</p>
    <div className="grid gap-3 sm:grid-cols-2">{fieldDefinitions[draft.block_type].map((field) => <label key={field.key} className={`block text-xs font-bold text-slate-700 ${field.kind === 'textarea' ? 'sm:col-span-2' : ''}`}>{field.label}
      {field.kind === 'textarea' ? <textarea className={`${inputClass} mt-1 min-h-20`} value={draft.fields[field.key] || ''} onChange={(event) => onChange({ ...draft, fields: { ...draft.fields, [field.key]: event.target.value } })} required={field.required} placeholder={field.placeholder} />
        : field.kind === 'unit' ? <select className={`${inputClass} mt-1`} value={draft.fields[field.key] || 'cm'} onChange={(event) => onChange({ ...draft, fields: { ...draft.fields, [field.key]: event.target.value } })}><option value="mm">mm</option><option value="cm">cm</option><option value="inch">inch</option></select>
          : <input className={`${inputClass} mt-1`} type={field.kind === 'number' ? 'number' : 'text'} min={field.kind === 'number' ? (draft.block_type === 'quantity' ? '1' : '0.01') : undefined} step={field.kind === 'number' ? (draft.block_type === 'quantity' ? '1' : 'any') : undefined} value={draft.fields[field.key] || ''} onChange={(event) => onChange({ ...draft, fields: { ...draft.fields, [field.key]: event.target.value } })} required={field.required} placeholder={field.placeholder} />}
    </label>)}</div>
    {draft.block_type === 'markdown' && <div className="space-y-3"><input ref={markdownRef} type="file" accept=".md,text/markdown,text/plain" className="hidden" onChange={async (event) => { const file = event.target.files?.[0]; if (file) { if (file.size > 100_000) setUploadError('File .md không được vượt quá 100 KB.'); else { const markdown = await file.text(); const current = draftRef.current; onChange({ ...current, fields: { ...current.fields, markdown } }); } } event.target.value = ''; }} /><button type="button" className="rounded-xl border border-orange-200 bg-orange-50 px-3 py-2 text-xs font-bold text-orange-800" onClick={() => markdownRef.current?.click()}>Chọn file .md</button><p className="text-xs text-slate-500">Nội dung file được lưu vào hạng mục và giữ trong từng phiên bản.</p>{uploadError && <p role="alert" className="text-xs text-red-700">{uploadError}</p>}{draft.fields.markdown && <div className="rounded-xl border border-slate-200 bg-white p-4"><p className="mb-2 text-xs font-bold text-slate-500">Xem trước</p><MarkdownContent markdown={draft.fields.markdown} /></div>}</div>}
    {draft.block_type === 'image' && !initial && <div className="space-y-3"><input ref={inputRef} type="file" accept="image/*,.svg,.heic,.heif,.avif,.tif,.tiff,.bmp,.ico" multiple className="hidden" onChange={(event) => { void acceptImages(Array.from(event.target.files || [])); event.target.value = ''; }} /><div role="button" tabIndex={0} onClick={() => inputRef.current?.click()} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') inputRef.current?.click(); }} onDragOver={(event) => { event.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={(event) => { event.preventDefault(); setDragging(false); void acceptImages(Array.from(event.dataTransfer.files)); }} className={`cursor-pointer rounded-2xl border-2 border-dashed p-7 text-center transition ${dragging ? 'border-orange-500 bg-orange-50' : 'border-slate-300 bg-slate-50 hover:border-orange-300'}`}><ImagePlus size={25} className="mx-auto text-orange-600" /><p className="mt-2 text-sm font-bold">{uploading ? 'Đang tải ảnh lên…' : 'Kéo ảnh vào đây hoặc nhấn để chọn nhiều ảnh'}</p><p className="mt-1 text-xs text-slate-500">PNG, JPG, GIF, WebP, SVG, BMP, TIFF, AVIF, HEIC · tối đa 15 MB/ảnh và 20 ảnh/hạng mục</p></div>{uploadError && <p role="alert" className="text-xs text-red-700">{uploadError}</p>}{imageIds.length > 0 && <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{imageIds.map((id, index) => <div key={id} className="relative overflow-hidden rounded-xl border border-slate-200 bg-slate-50">{imageApi && workspaceId && <WorkspaceImage api={imageApi} workspaceId={workspaceId} assetId={id} alt={`Ảnh ${index + 1}`} className="h-32 w-full object-cover" />}<button type="button" onClick={() => onChange({ ...draft, fields: { ...draft.fields, asset_ids: imageIds.filter((item) => item !== id).join(',') } })} className="absolute right-1 top-1 rounded-lg bg-white p-1 text-red-600 shadow" aria-label={`Bỏ ảnh ${index + 1}`}><X size={14} /></button></div>)}</div>}</div>}
    {draft.block_type === 'file' && <p className="text-xs text-amber-700">Hạng mục tệp cũ chỉ dùng để xem. Để thêm ảnh, chọn loại “Ảnh đính kèm”.</p>}
  </div>;
}
