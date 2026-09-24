import { Plus, Trash2, X } from 'lucide-react';
import { newBlockDraft, SpecificationBlockEditor, type BlockDraft } from './SpecificationBlockEditor';

const inputClass = 'mt-1 w-full rounded-xl border border-slate-300 bg-white p-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200';

export function CreateWorkspaceDialog({ customerName, customerEmail, customerPhone, productType,
  onCustomerName, onCustomerEmail, onCustomerPhone, onProductType,
  initialBlocks, onInitialBlocks, busy, error, onCancel, onCreate }: {
  customerName: string; customerEmail: string; customerPhone: string; productType: string;
  onCustomerName: (value: string) => void; onCustomerEmail: (value: string) => void;
  onCustomerPhone: (value: string) => void; onProductType: (value: string) => void;
  initialBlocks: BlockDraft[]; onInitialBlocks: (blocks: BlockDraft[]) => void;
  busy: boolean; error: string; onCancel: () => void; onCreate: () => Promise<void>;
}) {
  return <div className="fixed inset-0 z-40 grid place-items-center bg-slate-950/60 p-3 sm:p-5" role="dialog" aria-modal="true" aria-label="Tạo đơn hàng">
    <form className="flex max-h-[calc(100vh-2rem)] w-full max-w-3xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl" onSubmit={(event) => { event.preventDefault(); void onCreate(); }}>
      <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-5 sm:px-7"><div><h2 className="text-xl font-black text-slate-900">Tạo đơn hàng</h2><p className="mt-1 text-sm text-slate-500">Nhập thông tin đơn hàng và các hạng mục kỹ thuật ban đầu.</p></div><button type="button" onClick={onCancel} aria-label="Đóng" className="rounded-xl p-2 hover:bg-slate-100"><X size={18} /></button></div>
      <div className="min-h-0 space-y-6 overflow-y-auto px-5 py-5 sm:px-7">
        <section className="grid gap-4 sm:grid-cols-2"><label className="text-sm font-bold text-slate-700">Tên khách hàng<input className={inputClass} value={customerName} onChange={(event) => onCustomerName(event.target.value)} required maxLength={200} placeholder="Ví dụ: Công ty Minh Anh" /></label><label className="text-sm font-bold text-slate-700">Loại sản phẩm<input className={inputClass} value={productType} onChange={(event) => onProductType(event.target.value)} required maxLength={80} placeholder="Ví dụ: Áo thun đồng phục" /></label><label className="text-sm font-bold text-slate-700">Email khách hàng <span className="font-normal text-slate-400">(không bắt buộc)</span><input className={inputClass} value={customerEmail} onChange={(event) => onCustomerEmail(event.target.value)} type="email" placeholder="ten@congty.vn" /></label><label className="text-sm font-bold text-slate-700">Số điện thoại khách hàng <span className="font-normal text-slate-400">(không bắt buộc)</span><input className={inputClass} value={customerPhone} onChange={(event) => onCustomerPhone(event.target.value)} placeholder="Dùng để gắn chat Zalo Bot" /></label></section>
        <section className="border-t border-slate-100 pt-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="text-lg font-black text-slate-900">Hạng mục kỹ thuật ban đầu ({initialBlocks.length})</h3><p className="mt-1 text-sm text-slate-500">Các hạng mục sẽ có ngay trong bản nháp của đơn hàng mới.</p></div><button type="button" disabled={initialBlocks.length >= 30} onClick={() => onInitialBlocks([...initialBlocks, newBlockDraft()])} className="inline-flex items-center gap-2 rounded-xl border border-orange-200 bg-orange-50 px-3 py-2 text-sm font-bold text-orange-700 disabled:opacity-50"><Plus size={16} /> Thêm hạng mục</button></div>
          <div className="mt-4 space-y-4">{initialBlocks.map((block, index) => <div key={block.id} className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4 sm:p-5"><div className="mb-4 flex items-center justify-between"><p className="text-sm font-black">Hạng mục {index + 1}</p><button type="button" onClick={() => onInitialBlocks(initialBlocks.filter((item) => item.id !== block.id))} className="inline-flex items-center gap-1 text-xs font-bold text-rose-700"><Trash2 size={14} /> Xóa</button></div><SpecificationBlockEditor draft={block} initial onChange={(next) => onInitialBlocks(initialBlocks.map((item) => item.id === block.id ? next : item))} /></div>)}{initialBlocks.length === 0 && <p className="rounded-xl border border-dashed border-slate-200 p-5 text-center text-sm text-slate-500">Chưa thêm hạng mục. Chọn “Thêm hạng mục” để nhập thông số trước khi tạo đơn.</p>}</div>
          <p className="mt-3 text-xs text-slate-500">Hình ảnh và tệp đính kèm cần được tải lên sau khi tạo đơn hàng.</p>
        </section>
        {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      </div>
      <div className="flex items-center justify-end gap-2 border-t border-slate-100 bg-white px-5 py-4 sm:px-7"><button type="button" onClick={onCancel} className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-bold">Hủy</button><button disabled={busy} className="rounded-xl bg-orange-600 px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50">{busy ? 'Đang tạo…' : 'Tạo đơn hàng'}</button></div>
    </form>
  </div>;
}
