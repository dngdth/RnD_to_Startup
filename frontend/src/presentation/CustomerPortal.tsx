import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowRight, CheckCircle2, Clock3, FileText, GitPullRequest,
  LayoutDashboard, LogOut, Package, RefreshCw,
} from 'lucide-react';
import type { Proofprint } from '../application/proofprint';
import type { ChangeRequest, Version, Workspace } from '../domain/models';
import { WorkspacePage } from './WorkspacePage';

const statusName: Record<Workspace['workflow_status'], string> = {
  DRAFT: 'Bản nháp', IN_REVIEW: 'Chờ phê duyệt',
  APPROVED: 'Đã phê duyệt', LOCKED_FOR_PRODUCTION: 'Đã khóa sản xuất',
};

export function CustomerPortal({ api, username, initialWorkspace, initialBlockCount, onLogout }: {
  api: Proofprint; username: string; initialWorkspace: Workspace; initialBlockCount: number; onLogout: () => void;
}) {
  const client = useMemo(() => api.forGuest(), [api]);
  const [view, setView] = useState<'home' | 'order'>('home');
  const [workspace, setWorkspace] = useState(initialWorkspace);
  const [technicalCount, setTechnicalCount] = useState(initialBlockCount);
  const [versions, setVersions] = useState<Version[]>([]);
  const [requests, setRequests] = useState<ChangeRequest[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!error) return;
    const timer = window.setTimeout(() => setError(''), 5000);
    return () => window.clearTimeout(timer);
  }, [error]);

  const refresh = useCallback(async () => {
    setBusy(true); setError('');
    try {
      const [guest, versionList, requestList] = await Promise.all([
        client.guestWorkspace(), client.versions(initialWorkspace.id),
        client.changeRequests(initialWorkspace.id),
      ]);
      const count = guest.workspace.latest_version_id
        ? (await client.version(initialWorkspace.id, guest.workspace.latest_version_id)).snapshot?.length || 0
        : guest.draft_blocks.length;
      setWorkspace(guest.workspace);
      setTechnicalCount(count);
      setVersions(versionList);
      setRequests(requestList);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Không tải được thông tin đơn hàng.');
    } finally { setBusy(false); }
  }, [client, initialWorkspace.id]);

  useEffect(() => { void refresh(); }, [refresh]);

  const openRequests = requests.filter((item) => ['REQUESTED', 'ACKNOWLEDGED', 'REOPENED'].includes(item.status));
  const isWaiting = workspace.workflow_status === 'IN_REVIEW';
  const isApproved = workspace.workflow_status === 'APPROVED' || workspace.workflow_status === 'LOCKED_FOR_PRODUCTION';
  const latestVersion = versions.find((item) => item.id === workspace.latest_version_id);
  const statCards = [
    { title: 'Đơn hàng của tôi', value: 1, note: 'Đơn hàng được chia sẻ với bạn', icon: Package, accent: 'text-slate-700 bg-slate-100' },
    { title: 'Chờ bạn phản hồi', value: isWaiting ? 1 : 0, note: 'Phiên bản đang chờ xem xét', icon: Clock3, accent: 'text-orange-600 bg-orange-100' },
    { title: 'Yêu cầu chỉnh sửa', value: openRequests.length, note: 'Yêu cầu còn đang xử lý', icon: GitPullRequest, accent: 'text-rose-600 bg-rose-50' },
    { title: 'Đã phê duyệt', value: isApproved ? 1 : 0, note: 'Đơn hàng đã được chấp thuận', icon: CheckCircle2, accent: 'text-emerald-600 bg-emerald-50' },
  ];

  return <div className="flex min-h-screen bg-[#faf9f8] text-slate-900 [--sidebar-width:0px] md:[--sidebar-width:16rem]">
    <aside className="hidden w-64 shrink-0 flex-col bg-[#0d1223] p-5 text-white md:flex">
      <div className="mb-9 flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-orange-500 to-rose-600 text-xl font-black">P</span><div><strong className="block text-lg">ProofPrint</strong><small className="text-slate-400">Cổng thông tin khách hàng</small></div></div>
      <nav className="space-y-2 text-sm font-semibold"><button onClick={() => { setView('home'); void refresh(); }} className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left ${view === 'home' ? 'bg-white/15' : 'hover:bg-white/10'}`}><LayoutDashboard size={18} /> Trang chủ</button><button onClick={() => setView('order')} className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left ${view === 'order' ? 'bg-white/15' : 'hover:bg-white/10'}`}><Package size={18} /> {workspace.product_type}</button></nav>
      <div className="mt-auto border-t border-white/10 pt-5"><p className="mb-3 truncate text-xs text-slate-400">{username} · {workspace.customer_name}</p><button onClick={onLogout} className="flex items-center gap-2 text-sm text-slate-300 hover:text-white"><LogOut size={16} /> Thoát</button></div>
    </aside>
    <div className="min-w-0 flex-1">
      <header className="sticky top-0 z-30 flex min-h-20 items-center justify-between gap-3 border-b border-slate-200 bg-white px-5 sm:px-8"><div><span className="text-xs font-bold uppercase tracking-widest text-orange-700">ProofPrint</span><h1 className="text-xl font-black">{view === 'home' ? 'Trang chủ' : workspace.product_type}</h1></div><div className="flex items-center gap-3"><span className="hidden text-sm text-slate-600 sm:block">{username}</span><button onClick={onLogout} className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 md:hidden">Thoát</button></div></header>
      <main className={view === 'home' ? 'min-h-[calc(100vh-5rem)] bg-[radial-gradient(circle_at_0%_0%,#fff2f4,transparent_40%),radial-gradient(circle_at_100%_30%,#fff5dd,transparent_40%)]' : ''}>
        {view === 'order' ? <div className="p-5 sm:p-8"><div className="mx-auto max-w-[1600px]"><WorkspacePage api={api} id={workspace.id} guest onBack={() => { setView('home'); void refresh(); }} /></div></div> : <div className="mx-auto max-w-6xl space-y-7 p-5 sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4"><div><div className="mb-2 flex flex-wrap items-center gap-2"><span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-emerald-800">Cổng thông tin khách hàng · {workspace.customer_name}</span><span className="text-xs text-slate-400">{username}</span></div><h2 className="text-3xl font-black tracking-tight">Trang chủ</h2><p className="mt-1 text-sm text-slate-500">Theo dõi đơn hàng, yêu cầu thay đổi và các phiên bản đang chờ bạn phản hồi.</p></div><button onClick={() => void refresh()} disabled={busy} className="rounded-xl border border-slate-200 bg-white p-2.5 text-slate-600 disabled:opacity-50" title="Làm mới"><RefreshCw size={18} /></button></div>
          {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p>}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{statCards.map(({ title, value, note, icon: Icon, accent }) => <div key={title} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex items-start justify-between gap-2"><span className="text-[11px] font-bold uppercase tracking-wide text-slate-600">{title}</span><span className={`rounded-xl p-2 ${accent}`}><Icon size={16} /></span></div><div className="mt-2 flex items-baseline gap-2"><strong className="text-3xl font-black">{value}</strong><span className="text-xs text-slate-400">{title === 'Yêu cầu chỉnh sửa' ? 'yêu cầu' : 'đơn hàng'}</span></div><p className="mt-1 text-[11px] text-slate-500">{note}</p></div>)}</div>
          <section><div className="mb-3"><h3 className="text-xl font-black">Đơn hàng của bạn <span className="ml-1 rounded-full bg-orange-100 px-2 py-0.5 text-xs text-orange-800">1 đơn</span></h3><p className="mt-1 text-xs text-slate-500">Mở đơn hàng để xem các hạng mục kỹ thuật và gửi phản hồi.</p></div><article className="relative max-w-2xl overflow-hidden rounded-2xl border border-orange-200 bg-white p-5 shadow-sm sm:p-6"><div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-orange-500 to-amber-400" /><div className="flex flex-wrap items-center justify-between gap-2"><span className="rounded-md border border-orange-200 bg-orange-50 px-2 py-1 font-mono text-xs font-bold text-orange-800">#{workspace.id.slice(0, 8)}</span><span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-800">{statusName[workspace.workflow_status]}</span></div><h4 className="mt-4 text-lg font-black">{workspace.product_type}</h4><p className="mt-1 text-sm text-slate-500">{workspace.customer_name}</p><div className="mt-4 grid grid-cols-2 gap-3 rounded-xl border border-slate-100 bg-slate-50 p-3 text-xs"><div><span className="text-slate-400">Phiên bản</span><strong className="mt-1 block">{latestVersion ? `v${String(latestVersion.number).padStart(2, '0')}` : 'Bản nháp'}</strong></div><div><span className="text-slate-400">Hạng mục kỹ thuật</span><strong className="mt-1 block">{technicalCount} hạng mục</strong></div></div><div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4"><span className="flex items-center gap-1.5 text-xs text-slate-500"><FileText size={14} /> Cập nhật {new Date(workspace.updated_at).toLocaleDateString('vi-VN')}</span><button onClick={() => setView('order')} className="flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white">Xem đơn hàng <ArrowRight size={15} /></button></div></article></section>
        </div>}
      </main>
    </div>
  </div>;
}
