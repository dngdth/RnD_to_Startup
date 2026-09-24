import type { Diff } from '../domain/models';

export type SnapshotBlock = {
  id?: string;
  label?: string;
  block_type?: string;
  content?: Record<string, unknown>;
  position?: number;
};

const fieldNames: Record<string, string> = {
  name: 'Tên', value: 'Giá trị', unit: 'Đơn vị', hex: 'Mã màu', pantone: 'Mã Pantone',
  width: 'Chiều rộng', height: 'Chiều cao', size: 'Kích thước', material: 'Chất liệu',
  text: 'Nội dung', note: 'Ghi chú', quantity: 'Số lượng', label: 'Tên hạng mục',
  original_filename: 'Tên tệp', position: 'Vị trí', block_type: 'Loại hạng mục',
  markdown: 'Nội dung chi tiết', asset_ids: 'Ảnh đính kèm', caption: 'Chú thích',
};

export function formatHumanValue(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  if (typeof value === 'boolean') return value ? 'Có' : 'Không';
  if (Array.isArray(value)) return value.map(formatHumanValue).join(', ');
  if (typeof value === 'object') {
    return Object.entries(value).map(([key, item]) => `${fieldNames[key] || key}: ${formatHumanValue(item)}`).join(' · ');
  }
  return '—';
}

export function describeBlock(block: SnapshotBlock): string {
  const content = block.content || {};
  if (block.block_type === 'markdown') {
    const firstLine = String(content.markdown || '').split('\n').find((line) => line.trim()) || '';
    return `${block.label || 'Nội dung chi tiết'}: ${firstLine.replace(/^#+\s*/, '').slice(0, 100)}`;
  }
  if (block.block_type === 'image') {
    const count = Array.isArray(content.asset_ids) ? content.asset_ids.length : content.asset_id ? 1 : 0;
    return `${block.label || 'Ảnh đính kèm'}: ${count} ảnh${content.caption ? ` · ${content.caption}` : ''}`;
  }
  const main = content.name ?? content.value ?? content.text ?? content.note;
  const detail = main !== undefined
    ? `${formatHumanValue(main)}${content.unit ? ` ${formatHumanValue(content.unit)}` : ''}`
    : formatHumanValue(content);
  return `${block.label || 'Hạng mục'}: ${detail}`;
}

export function describeChange(
  change: Diff['changed'][number],
  blocks: SnapshotBlock[],
): { title: string; before: string; after: string } {
  const block = blocks.find((item) => item.id === change.block_id);
  const field = change.field_path.split('.').at(-1) || change.field_path;
  const label = block?.label || 'Hạng mục';
  const title = ['name', 'value', 'text', 'note'].includes(field)
    ? label : `${label} · ${fieldNames[field] || field}`;
  return { title, before: formatHumanValue(change.before), after: formatHumanValue(change.after) };
}
