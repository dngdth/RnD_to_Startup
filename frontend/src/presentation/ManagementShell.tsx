import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import {
  AlertCircle, ArrowLeftRight, ArrowRight, Bell, CheckCircle2, ChevronDown,
  ChevronRight, Clock3, GitBranch, GitPullRequest, History, LayoutDashboard,
  LogOut, Menu, Package, Plus, Search, Settings, ShoppingBag, SlidersHorizontal,
  UserCheck, X,
} from 'lucide-react';
import type { Proofprint } from '../application/proofprint';
import type { ChangeRequest, User, Workspace } from '../domain/models';
import apparelPreview from '../assets/images/regenerated_image_1789657142741.jpg';
import { WorkspacePage } from './WorkspacePage';

type View = 'dashboard' | 'orders' | 'requests' | 'versions' | 'audit' | 'settings';
type WorkFilter = 'assigned' | 'progress' | 'waiting' | 'completed';

const statusLabel: Record<string, string> = {
  DRAFT: 'Bản nháp', IN_REVIEW: 'Đang chờ duyệt', APPROVED: 'Đã phê duyệt',
  LOCKED_FOR_PRODUCTION: 'Đã khóa sản xuất', ARCHIVED: 'Đã lưu trữ', CANCELLED: 'Đã hủy',
};
const isOpen = (request: ChangeRequest) => ['REQUESTED', 'ACKNOWLEDGED'].includes(request.status);
type InboxRow = { workspace: Workspace; request: { id: string; message: string; created_at: string; status: string } };
const displayDate = (value: string) => new Date(value).toLocaleDateString('vi-VN');

export function ManagementShell({ api, user, workspaces, workspaceId, onOpenWorkspace,
  onHome, onCreate, onRefresh, onLogout }: {
  api: Proofprint; user: User; workspaces: Workspace[]; workspaceId: string | null;
  onOpenWorkspace: (id: string) => void; onHome: () => void; onCreate: () => void;
  onRefresh: () => void; onLogout: () => void;
}) {
  const [view, setView] = useState<View>('dashboard');
  const [filter, setFilter] = useState<WorkFilter>('assigned');
  const [search, setSearch] = useState('');
  const [priorityOpen, setPriorityOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [requests, setRequests] = useState<Array<{ workspace: Workspace; request: ChangeRequest }>>([]);
  const [draftRequestComments, setDraftRequestComments] = useState<InboxRow[]>([]);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    let cancelled = false;
    const load = () => Promise.all(workspaces.map(async (workspace) => {
      try {
        const [changes, comments] = await Promise.all([api.changeRequests(workspace.id), api.comments(workspace.id)]);
        return {
          changes: changes.map((request) => ({ workspace, request })),
          drafts: comments.filter((item) => item.request_batch_id).map((item) => ({
            workspace, request: { id: item.id, message: item.body, created_at: item.created_at, status: item.resolved_in_version_id ? 'Đã xử lý' : 'Chưa xử lý' },
          })),
        };
      } catch { return { changes: [], drafts: [] }; }
    })).then((rows) => { if (!cancelled) { setRequests(rows.flatMap((row) => row.changes)); setDraftRequestComments(rows.flatMap((row) => row.drafts)); } })
      .catch((error) => { if (!cancelled) setLoadError(error instanceof Error ? error.message : 'Không tải được yêu cầu thay đổi'); });
    void load();
    const timer = window.setInterval(() => { void load(); }, 30000);
    return () => { cancelled = true; window.clearInterval(timer); };
  }, [api, workspaces]);

  const active = workspaces.filter((item) => item.record_status === 'ACTIVE');
  const progress = active.filter((item) => item.workflow_status === 'DRAFT' || requests.some((row) => row.workspace.id === item.id && isOpen(row.request)));
  const waiting = active.filter((item) => item.workflow_status === 'IN_REVIEW');
  const completed = active.filter((item) => ['APPROVED', 'LOCKED_FOR_PRODUCTION'].includes(item.workflow_status));
  const assigned = active;
  const groups: Record<WorkFilter, Workspace[]> = { assigned, progress, waiting, completed };
  const searchMatch = (item: Workspace) => `${item.customer_name} ${item.product_type} ${item.id}`.toLocaleLowerCase('vi').includes(search.toLocaleLowerCase('vi'));
  const filtered = groups[filter].filter(searchMatch);
  const openRequests = useMemo<InboxRow[]>(() => [...requests.filter((row) => isOpen(row.request)), ...draftRequestComments.filter((row) => row.request.status === 'Chưa xử lý')].sort((a, b) => b.request.created_at.localeCompare(a.request.created_at)), [requests, draftRequestComments]);
  const selected = workspaces.find((item) => item.id === workspaceId);

  const nav: Array<[View, string, typeof LayoutDashboard, number?]> = [
    ['dashboard', 'Tổng quan', LayoutDashboard],
    ['orders', 'Đơn hàng', ShoppingBag, workspaces.length],
    ['requests', 'Yêu cầu thay đổi', GitPullRequest, openRequests.length],
    ['versions', 'So sánh phiên bản', GitBranch],
    ['audit', 'Lịch sử hoạt động', History],
    ['settings', 'Cài đặt & Zalo', Settings],
  ];
  const titles: Record<View, string> = {
    dashboard: 'Không gian Thiết kế & Xưởng sản xuất', orders: 'Đơn hàng sản xuất',
    requests: 'Yêu cầu thay đổi', versions: 'So sánh phiên bản',
    audit: 'Lịch sử hoạt động', settings: 'Cài đặt & Zalo',
  };
  const navigate = (next: View) => { setView(next); onHome(); };

  return <div className="relative flex h-screen w-screen overflow-hidden ambient-glow-mesh text-slate-900" style={{ '--sidebar-width': collapsed ? '5rem' : '16rem' } as CSSProperties}>
    <aside className={`${collapsed ? 'w-20' : 'w-64'} shrink-0 bg-white/95 border-r border-slate-200/80 flex flex-col z-30 h-screen transition-[width] duration-300`}>
      <div className="p-4 border-b border-slate-100 flex items-center gap-3 min-h-16">
        <button onClick={() => navigate('dashboard')} className="w-9 h-9 shrink-0 rounded-xl bg-[#0F766E] text-white font-black text-sm">P</button>
        {!collapsed && <button onClick={() => navigate('dashboard')} className="font-black text-sm tracking-tight text-slate-900">PROOFPRINT <span className="text-[10px] px-1.5 py-0.5 rounded-full text-orange-600 border border-orange-200">PRO</span></button>}
        <button className="ml-auto text-slate-400 hover:text-slate-700" onClick={() => setCollapsed(!collapsed)} aria-label="Thu gọn thanh bên"><Menu size={17} /></button>
      </div>
      <div className="flex-1 overflow-y-auto px-3 pt-5">
        {!collapsed && <p className="text-[10px] font-bold tracking-widest text-slate-400 px-2.5 mb-3">QUẢN LÝ SẢN XUẤT</p>}
        <nav className="space-y-1">
          {nav.map(([key, label, Icon, count]) => <button key={key} onClick={() => navigate(key)} title={label} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-colors ${!workspaceId && view === key ? 'bg-[#0F766E] text-white' : 'text-slate-600 hover:bg-slate-100'}`}>
            <Icon size={17} strokeWidth={1.8} className="shrink-0" />
            {!collapsed && <><span className="truncate">{label}</span>{Boolean(count) && <span className="ml-auto rounded-full bg-white/80 text-slate-700 px-2 py-0.5 text-[10px]">{count}</span>}</>}
          </button>)}
        </nav>
      </div>
      <div className="border-t border-slate-200 p-3 space-y-2">
        {!collapsed && <p className="text-[10px] text-slate-400 font-bold px-2">VAI TRÒ HIỆN TẠI · NHÀ THIẾT KẾ</p>}
        <div className="rounded-xl border border-slate-200 bg-white p-2.5 flex items-center gap-2 text-xs font-bold min-w-0"><span className="w-8 h-8 shrink-0 rounded-full bg-emerald-100 text-emerald-800 grid place-items-center">{user.display_name.slice(0, 1).toUpperCase()}</span>{!collapsed && <span className="truncate">{user.display_name}</span>}</div>
        <button onClick={onLogout} className="flex items-center gap-2 p-2 text-xs text-slate-500 hover:text-rose-700"><LogOut size={15} />{!collapsed && 'Đăng xuất'}</button>
        {!collapsed && <p className="text-[9px] text-center font-bold text-slate-400 pt-2">MỌI THAY ĐỔI ĐỀU ĐƯỢC LƯU VẾT.</p>}
      </div>
    </aside>

    <div className="relative z-10 flex-1 flex flex-col min-w-0 h-full overflow-hidden">
      <header className="h-16 shrink-0 border-b border-slate-200/70 bg-white/80 backdrop-blur-xl px-4 sm:px-6 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-xs sm:text-[13px] min-w-0"><button onClick={() => navigate('dashboard')} className="text-slate-400 hover:text-slate-800">Tổng quan</button><ChevronRight size={14} className="text-slate-300 shrink-0" /><span className="font-semibold truncate">{selected ? `Workspace · ${selected.customer_name}` : titles[view]}</span></div>
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative hidden lg:block"><Search size={15} className="absolute top-1/2 -translate-y-1/2 left-3 text-slate-400" /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Tìm mã đơn hàng, thông số, tên thiết kế..." className="w-56 xl:w-96 rounded-xl border border-slate-200 bg-slate-50/60 py-2 pl-9 pr-3 text-xs focus:outline-none focus:ring-2 focus:ring-teal-100" /></div>
          <span className="hidden xl:flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600"><ArrowLeftRight size={14} className="text-orange-600" />Vai trò: <b className="text-slate-900">Nhà thiết kế</b></span>
          <button onClick={() => navigate('requests')} aria-label="Yêu cầu thay đổi" className="relative rounded-xl border border-slate-200 p-2 text-slate-600"><Bell size={17} />{openRequests.length > 0 && <span className="absolute -top-1 -right-1 rounded-full bg-amber-500 px-1 text-[10px] text-white">{openRequests.length}</span>}</button>
          <span className="w-8 h-8 rounded-full bg-emerald-100 grid place-items-center text-emerald-800 text-xs font-bold">{user.display_name.slice(0, 1).toUpperCase()}</span>
        </div>
      </header>
      <main className="flex-1 overflow-y-auto min-w-0" id="workspace-scroll-container">
        {workspaceId ? <div className="p-5 sm:p-8"><WorkspacePage key={workspaceId} api={api} id={workspaceId} guest={false} initialTab={view === 'requests' ? 'requests' : view === 'versions' ? 'versions' : view === 'audit' ? 'audit' : 'document'} onBack={() => navigate('orders')} /></div>
        : view === 'dashboard' ? <>
          <div className="bg-gradient-to-b from-orange-50/50 via-amber-50/15 to-transparent border-b border-slate-200/80 px-4 sm:px-6 lg:px-8 pt-6 pb-5">
            <div className="max-w-7xl mx-auto">
              <span className="inline-block rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-[11px] font-bold tracking-wide text-orange-700">KHÔNG GIAN THIẾT KẾ & XƯỞNG SẢN XUẤT</span>
              <h1 className="text-2xl sm:text-3xl font-black mt-2 tracking-tight">Hàng đợi sản xuất & Xử lý đơn hàng</h1>
              {openRequests[0] && <div className="mt-5 rounded-2xl bg-gradient-to-r from-orange-500 via-rose-500 to-amber-500 p-6 sm:p-7 text-white shadow-lg shadow-orange-200/50 flex flex-col lg:flex-row lg:items-center gap-4">
                <span className="rounded-2xl border border-white/40 bg-white/10 p-3 w-fit"><AlertCircle size={23} /></span>
                <div className="flex-1 min-w-0"><span className="rounded-md bg-white px-2 py-1 text-[10px] font-black text-rose-600">CẦN XỬ LÝ</span><h2 className="text-xl sm:text-2xl font-black mt-2">{openRequests[0].workspace.customer_name} · {openRequests[0].workspace.product_type}</h2><p className="mt-2 bg-white/15 border border-white/30 rounded-xl p-3 text-sm font-semibold max-w-3xl">“{openRequests[0].request.message}”</p></div>
                <button onClick={() => { setView('requests'); onOpenWorkspace(openRequests[0].workspace.id); }} className="bg-white text-slate-900 rounded-xl px-5 py-3 font-black text-xs shadow-lg flex items-center gap-2 w-fit">Mở yêu cầu chỉnh sửa <ArrowRight size={16} /></button>
              </div>}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-6">
                {([['PHÂN CÔNG CHO TÔI', assigned.length, UserCheck, 'bg-orange-50 text-orange-600 border-orange-100'], ['ĐANG XỬ LÝ', progress.length, AlertCircle, 'bg-rose-50 text-rose-600 border-rose-100'], ['CHỜ KHÁCH HÀNG PHẢN HỒI', waiting.length, Clock3, 'bg-amber-50 text-amber-600 border-amber-100'], ['HOÀN THÀNH / ĐÃ KHÓA', completed.length, CheckCircle2, 'bg-emerald-50 text-emerald-600 border-emerald-100']] as const).map(([label, count, Icon, iconStyle]) => <div key={label} className="rounded-2xl bg-white/90 border border-slate-200 p-4 flex items-center justify-between shadow-sm"><div><span className="text-[11px] font-semibold tracking-wider text-slate-500">{label}</span><p className="text-2xl font-black mt-1">{count}</p></div><span className={`rounded-xl p-2 border ${iconStyle}`}><Icon size={18} /></span></div>)}
              </div>
            </div>
          </div>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-16 grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            <section className="lg:col-span-2 space-y-5">
              <div className="rounded-2xl border border-slate-200 p-5" style={{ backgroundColor: '#ccf1d2' }}>
                <h2 className="text-center text-2xl font-black border-b border-white/70 pb-3">Việc của tôi</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 mt-4">
                  <div className="lg:col-span-4 relative"><label className="block text-[11px] font-bold text-green-900 mb-1.5">CÔNG VIỆC</label><button onClick={() => setFilterOpen(!filterOpen)} className="w-full rounded-xl bg-white border border-slate-200 px-3 py-2.5 text-xs font-bold flex items-center justify-between"><span>{({ assigned: 'Phân công cho tôi', progress: 'Đang xử lý', waiting: 'Chờ khách phản hồi', completed: 'Hoàn thành' } as const)[filter]} ({groups[filter].length})</span><ChevronDown size={14} /></button>{filterOpen && <div className="absolute z-20 top-full mt-1 w-full bg-white rounded-xl border border-slate-200 shadow-lg p-1">{(['assigned', 'progress', 'waiting', 'completed'] as WorkFilter[]).map((key) => <button key={key} onClick={() => { setFilter(key); setFilterOpen(false); }} className="block w-full text-left rounded-lg p-2 text-xs hover:bg-orange-50">{({ assigned: 'Phân công cho tôi', progress: 'Đang xử lý', waiting: 'Chờ khách phản hồi', completed: 'Hoàn thành' } as const)[key]}</button>)}</div>}</div>
                  <div className="lg:col-span-5"><label className="block text-[11px] font-bold text-green-900 mb-1.5">TÌM KIẾM ĐƠN HÀNG</label><div className="relative"><Search size={14} className="absolute top-1/2 -translate-y-1/2 left-3 text-slate-400" /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Tìm theo mã, tên sản phẩm, khách hàng..." className="w-full rounded-xl bg-slate-50 border border-slate-200 py-2.5 pl-8 pr-8 text-xs" />{search && <button onClick={() => setSearch('')} className="absolute top-1/2 -translate-y-1/2 right-3 text-slate-400"><X size={14} /></button>}</div></div>
                  <div className="lg:col-span-3 relative"><label className="block text-[11px] font-bold text-green-900 mb-1.5">MỨC ĐỘ ƯU TIÊN</label><button onClick={() => setPriorityOpen(!priorityOpen)} className="w-full rounded-xl bg-white border border-slate-200 px-3 py-2.5 text-xs font-semibold flex items-center justify-between"><span className="flex gap-2 items-center"><SlidersHorizontal size={14} />Tất cả mức độ</span><ChevronDown size={14} /></button>{priorityOpen && <p className="absolute z-20 top-full mt-1 rounded-xl bg-white p-3 border border-slate-200 shadow-lg text-xs text-slate-600">API hiện chưa có mức độ ưu tiên.</p>}</div>
                </div>
              </div>
              <div className="space-y-3">{filtered.map((item) => <WorkspaceCard key={item.id} item={item} dashboard onClick={() => onOpenWorkspace(item.id)} />)}{filtered.length === 0 && <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">Không có đơn hàng phù hợp.</div>}</div>
            </section>
            <aside className="lg:sticky lg:top-5 space-y-5">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex justify-between items-center border-b border-slate-100 pb-3"><h2 className="font-black text-sm tracking-wide">🟠 NHIỆM VỤ HÔM NAY</h2><span className="rounded-full border border-orange-200 px-2 py-1 text-[11px] text-orange-700">{openRequests.length} cần xử lý</span></div><div className="space-y-2 mt-4">{openRequests.slice(0, 5).map(({ workspace, request }) => <button key={request.id} onClick={() => { setView('requests'); onOpenWorkspace(workspace.id); }} className="w-full text-left rounded-xl border border-slate-200 p-3 hover:border-orange-300"><p className="font-bold text-xs text-slate-800 line-clamp-2">{request.message}</p><p className="mt-1 text-[11px] text-slate-500">{workspace.customer_name} · {displayDate(request.created_at)}</p></button>)}{openRequests.length === 0 && <p className="text-xs text-slate-500">Hiện không có yêu cầu thay đổi cần xử lý.</p>}</div></div>
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="font-black text-sm">Truy cập nhanh</h2><button onClick={() => navigate('orders')} className="flex items-center gap-2 text-xs mt-3 text-teal-700 font-bold">Xem tất cả đơn hàng <ArrowRight size={14} /></button><button onClick={onCreate} className="flex items-center gap-2 text-xs mt-3 text-orange-700 font-bold">Tạo đơn hàng <Plus size={14} /></button></div>
            </aside>
          </div>
        </> : <div className="max-w-7xl mx-auto p-5 sm:p-8 space-y-5">
          <div className="flex items-center justify-between gap-3"><div><p className="text-[11px] font-bold text-orange-700 tracking-widest">PROOFPRINT</p><h1 className="text-2xl font-black mt-1">{titles[view]}</h1></div><div className="flex gap-2"><button onClick={onRefresh} title="Làm mới" className="rounded-xl border border-slate-200 bg-white p-2.5"><ArrowLeftRight size={17} /></button>{view === 'orders' && <button onClick={onCreate} className="rounded-xl bg-[#0F766E] text-white px-4 py-2.5 font-bold text-xs flex items-center gap-2"><Plus size={16} />Tạo đơn hàng</button>}</div></div>
          {view === 'orders' && <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">{workspaces.filter(searchMatch).map((item) => <WorkspaceCard key={item.id} item={item} onClick={() => onOpenWorkspace(item.id)} />)}</div>}
          {view === 'requests' && <div className="space-y-3">{[...requests, ...draftRequestComments].filter((row) => searchMatch(row.workspace)).sort((a, b) => b.request.created_at.localeCompare(a.request.created_at)).map(({ workspace, request }) => <button key={request.id} onClick={() => onOpenWorkspace(workspace.id)} className="w-full text-left rounded-2xl border border-slate-200 bg-white p-5 hover:border-orange-300"><span className="text-[11px] font-bold text-orange-700">{request.status}</span><h2 className="font-black mt-1">{workspace.customer_name} · {workspace.product_type}</h2><p className="text-sm text-slate-600 mt-2">{request.message}</p><p className="text-xs text-slate-400 mt-3">{displayDate(request.created_at)}</p></button>)}{requests.length + draftRequestComments.length === 0 && <p className="text-sm text-slate-500">Chưa có yêu cầu thay đổi.</p>}</div>}
          {view === 'versions' && <><p className="text-sm text-slate-600">Chọn Workspace để xem và so sánh các phiên bản của hồ sơ.</p><div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">{workspaces.filter(searchMatch).map((item) => <WorkspaceCard key={item.id} item={item} onClick={() => onOpenWorkspace(item.id)} />)}</div></>}
          {view === 'audit' && <><p className="text-sm text-slate-600">Chọn Workspace để xem lịch sử hoạt động và thay đổi.</p><div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">{workspaces.filter(searchMatch).map((item) => <WorkspaceCard key={item.id} item={item} onClick={() => onOpenWorkspace(item.id)} />)}</div></>}
          {view === 'settings' && <div className="rounded-2xl border border-slate-200 bg-white p-6"><h2 className="font-black">Tích hợp Zalo</h2><p className="text-sm text-slate-600 mt-2">Cấu hình Bot và liên kết chat được quản lý ở backend. Giao diện quản trị kết nối chưa có API trong phiên bản này.</p></div>}
        </div>}
        {loadError && <p className="mx-8 mb-6 text-sm text-red-700" role="alert">{loadError}</p>}
      </main>
    </div>
  </div>;
}

function WorkspaceCard({ item, onClick, dashboard = false }: { item: Workspace; onClick: () => void; dashboard?: boolean }) {
  if (dashboard) return <div className="group relative rounded-2xl bg-white border border-slate-200/90 hover:border-orange-300 shadow-[0_2px_10px_rgba(15,23,42,0.03)] hover:shadow-[0_8px_24px_rgba(251,146,60,0.08)] transition-all duration-200 p-3.5 sm:p-5 flex items-stretch gap-4">
    <button onClick={onClick} className="w-28 h-28 sm:w-36 sm:h-36 rounded-xl sm:rounded-2xl overflow-hidden bg-slate-100 border border-slate-200/80 shrink-0 grid place-items-center" aria-label={`Mở ${item.customer_name}`}>
      {/áo|đồng phục|tạp dề|apparel/i.test(item.product_type) ? <img src={apparelPreview} alt="Ảnh minh họa sản phẩm" className="w-full h-full object-cover" /> : <Package size={38} className="text-slate-300" />}
    </button>
    <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5"><div><span className="inline-flex rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 text-[11px] font-semibold text-amber-900">{statusLabel[item.workflow_status]}</span><h3 className="mt-2 text-base sm:text-lg font-bold text-slate-900 group-hover:text-orange-600">{item.product_type}</h3><p className="text-xs text-slate-500 mt-1 truncate">{item.customer_name}</p></div><div className="mt-3"><p className="text-xs font-semibold text-slate-500 mb-2">Cập nhật: {displayDate(item.updated_at)}</p><button onClick={onClick} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold">Mở Workspace <ArrowRight size={14} /></button></div></div>
  </div>;
  return <button onClick={onClick} className="w-full text-left rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm hover:border-orange-300 hover:-translate-y-0.5 transition-all">
    <div className="flex justify-between items-start gap-2"><span className="text-[11px] font-bold uppercase text-orange-700">{statusLabel[item.workflow_status] || item.workflow_status}</span><ArrowRight size={16} className="text-slate-400" /></div>
    <h3 className="font-black text-base mt-3">{item.customer_name}</h3><p className="text-xs text-slate-600 mt-1">{item.product_type}</p><p className="text-[11px] text-slate-400 mt-4">{statusLabel[item.record_status]} · Sửa {displayDate(item.updated_at)}</p>
  </button>;
}
