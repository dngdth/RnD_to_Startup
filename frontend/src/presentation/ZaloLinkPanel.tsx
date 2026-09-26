import { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, Copy, Link2, Loader2, RefreshCw, Unlink } from 'lucide-react';
import type { Proofprint } from '../application/proofprint';
import type { ZaloLinkCode, ZaloLinkStatus } from '../domain/models';

const BOT_NAME = import.meta.env.VITE_ZALO_BOT_NAME || 'bot.nWymkAQG';

export function ZaloLinkPanel({ api, mode, workspaceId, compact = false }: {
  api: Proofprint;
  mode: 'designer' | 'customer';
  workspaceId?: string;
  compact?: boolean;
}) {
  const [status, setStatus] = useState<ZaloLinkStatus | null>(null);
  const [issued, setIssued] = useState<ZaloLinkCode | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    const next = mode === 'designer'
      ? await api.myZaloStatus()
      : await api.customerZaloStatus(workspaceId || '');
    setStatus(next);
    if (next.linked) setIssued(null);
  }, [api, mode, workspaceId]);

  useEffect(() => { void load().catch((reason) => setError(reason.message)); }, [load]);
  useEffect(() => {
    if (!issued) return;
    const timer = window.setInterval(() => {
      void load().catch(() => undefined);
    }, 5000);
    return () => window.clearInterval(timer);
  }, [issued, load]);
  useEffect(() => {
    if (!error) return;
    const timer = window.setTimeout(() => setError(''), 5000);
    return () => window.clearTimeout(timer);
  }, [error]);

  const issue = async () => {
    setBusy(true); setError('');
    try {
      setIssued(mode === 'designer'
        ? await api.issueMyZaloLinkCode()
        : await api.issueCustomerZaloLinkCode(workspaceId || ''));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Không tạo được mã liên kết');
    } finally { setBusy(false); }
  };
  const revoke = async () => {
    setBusy(true); setError('');
    try {
      if (mode === 'designer') await api.revokeMyZaloLink();
      else await api.revokeCustomerZaloLink(workspaceId || '');
      setStatus({ linked: false, chat_display_name: null, linked_at: null });
      setIssued(null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Không ngắt được liên kết');
    } finally { setBusy(false); }
  };

  const subject = mode === 'designer' ? 'Designer' : 'khách hàng';
  return <section className={`${compact ? 'mt-5 border-t border-slate-100 pt-5' : 'rounded-2xl border border-slate-200 bg-white p-6 shadow-sm'}`}>
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <div className="flex items-center gap-2"><Link2 size={18} className="text-teal-700" /><h2 className="font-black">Zalo của {subject}</h2></div>
        <p className="mt-1 text-sm text-slate-600">Bot gửi thông báo đúng người sau khi xác nhận bằng mã dùng một lần.</p>
      </div>
      <button disabled={busy} onClick={() => void load().catch((reason) => setError(reason.message))} title="Kiểm tra lại" className="rounded-xl border border-slate-200 p-2 text-slate-500 disabled:opacity-50"><RefreshCw size={16} /></button>
    </div>
    {error && <p role="alert" className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    {status?.linked ? <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
      <div className="flex items-center gap-3"><CheckCircle2 className="text-emerald-600" size={22} /><div><p className="font-bold text-emerald-900">Đã liên kết</p><p className="text-xs text-emerald-800">{status.chat_display_name || 'Tài khoản Zalo đã xác nhận'}</p></div></div>
      <button disabled={busy} onClick={() => void revoke()} className="inline-flex items-center gap-2 rounded-xl border border-emerald-300 bg-white px-3 py-2 text-xs font-bold text-emerald-800"><Unlink size={15} /> Ngắt liên kết</button>
    </div> : <div className="mt-4">
      {!issued ? <button disabled={busy} onClick={() => void issue()} className="inline-flex items-center gap-2 rounded-xl bg-teal-700 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">{busy ? <Loader2 size={16} className="animate-spin" /> : <Link2 size={16} />} Tạo mã liên kết</button> : <div className="rounded-2xl border border-orange-200 bg-orange-50 p-4">
        <p className="text-sm font-semibold text-slate-800">Mở Zalo, tìm Bot <strong>{BOT_NAME}</strong> và gửi đúng mã sau:</p>
        <div className="mt-3 flex flex-wrap items-center gap-3"><code className="rounded-xl bg-white px-4 py-3 text-xl font-black tracking-widest text-orange-700">{issued.code}</code><button onClick={() => void navigator.clipboard.writeText(issued.code)} className="rounded-xl border border-orange-200 bg-white p-3 text-orange-700" title="Sao chép mã"><Copy size={17} /></button></div>
        <p className="mt-3 text-xs text-slate-600">Mã hết hạn lúc {new Date(issued.expires_at).toLocaleTimeString('vi-VN')}. Trạng thái được kiểm tra lại mỗi 5 giây.</p>
      </div>}
    </div>}
  </section>;
}
