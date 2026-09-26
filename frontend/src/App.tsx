import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowRight, LayoutDashboard, LogOut, Plus, RefreshCw, ShieldCheck, Users } from 'lucide-react';
import { Proofprint } from './application/proofprint';
import type { User, Workspace } from './domain/models';
import { AUTH_REQUIRED_EVENT, ApiError, HttpTransport } from './infrastructure/http';
import LoginScreen from './presentation/LoginScreen';
import { AdminPage } from './presentation/AdminPage';
import { WorkspacePage } from './presentation/WorkspacePage';
import { ManagementShell } from './presentation/ManagementShell';
import { CreateWorkspaceDialog } from './presentation/CreateWorkspaceDialog';
import { CustomerPortal } from './presentation/CustomerPortal';
import { blockContent, type BlockDraft } from './presentation/SpecificationBlockEditor';
import previewImage from './assets/images/regenerated_image_1789657142741.jpg';

const api = new Proofprint(new HttpTransport());
const guestNameKey = (token: string) => `proofprint_guest_name_${token.split('.')[0]}`;
const workspaceFromPath = () => window.location.pathname.match(/^\/workspaces\/([0-9a-f-]+)/i)?.[1] || null;
const reviewFromPath = () => window.location.pathname.match(/^\/review\/([^/]+)/)?.[1] || null;

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [guest, setGuest] = useState<{ username: string; workspace: Workspace; draftCount: number } | null>(null);
  const [reviewToken, setReviewToken] = useState(reviewFromPath);
  const [workspaceId, setWorkspaceId] = useState<string | null>(workspaceFromPath);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [guestName, setGuestName] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [productType, setProductType] = useState('');
  const [initialBlocks, setInitialBlocks] = useState<BlockDraft[]>([]);
  const [createdLink, setCreatedLink] = useState('');
  const [health, setHealth] = useState(false);

  useEffect(() => {
    if (!error) return;
    const timer = window.setTimeout(() => setError(''), 5000);
    return () => window.clearTimeout(timer);
  }, [error]);
  useEffect(() => {
    if (!createdLink) return;
    const timer = window.setTimeout(() => setCreatedLink(''), 5000);
    return () => window.clearTimeout(timer);
  }, [createdLink]);

  useEffect(() => {
    const onAuthRequired = () => {
      setUser(null);
      setError('Phiên đăng nhập không còn hợp lệ. Đăng nhập lại để tiếp tục tạo Workspace.');
    };
    window.addEventListener(AUTH_REQUIRED_EVENT, onAuthRequired);
    return () => window.removeEventListener(AUTH_REQUIRED_EVENT, onAuthRequired);
  }, []);

  useEffect(() => {
    const onPopState = () => {
      setWorkspaceId(workspaceFromPath());
      setReviewToken(reviewFromPath());
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  useEffect(() => {
    api.health().then(() => setHealth(true)).catch(() => setHealth(false));
    const restore = async () => {
      try {
        if (reviewToken) {
          setGuest(null);
          const linkId = reviewToken.split('.')[0];
          const active = await api.guestWorkspace().catch(() => null);
          if (active?.review_link_id === linkId) {
            localStorage.setItem(guestNameKey(reviewToken), active.reviewer_username);
            setGuest({ username: active.reviewer_username, workspace: active.workspace, draftCount: active.draft_blocks.length });
          } else {
            const rememberedName = localStorage.getItem(guestNameKey(reviewToken));
            if (rememberedName) {
              setGuestName(rememberedName);
              await api.createGuestSession(reviewToken, rememberedName);
              const result = await api.guestWorkspace();
              setGuest({ username: result.reviewer_username, workspace: result.workspace, draftCount: result.draft_blocks.length });
            }
          }
        } else if (api.hasSession()) {
          setUser(await api.me());
        }
      } catch {
        if (!reviewToken) api.logout();
      } finally { setLoading(false); }
    };
    void restore();
  }, [reviewToken]);

  const refreshWorkspaces = useCallback(async () => {
    if (user?.system_role === 'DESIGNER') {
      setWorkspaces(await api.workspaces());
    }
  }, [user]);
  useEffect(() => { void refreshWorkspaces().catch((e) => setError(e.message)); }, [refreshWorkspaces]);

  const navigate = (path: string) => {
    window.history.pushState({}, '', path);
    setWorkspaceId(workspaceFromPath());
    setReviewToken(reviewFromPath());
    setError('');
  };

  const selected = useMemo(
    () => workspaces.find((item) => item.id === workspaceId), [workspaces, workspaceId],
  );

  if (loading) return <div className="min-h-screen grid place-items-center text-slate-600">Đang tải ProofPrint…</div>;

  if (reviewToken && !guest) {
    return <div className="min-h-screen grid place-items-center p-5 bg-[#faf9f7]">
      <form className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-slate-200 p-8 space-y-5" onSubmit={async (event) => {
        event.preventDefault(); setBusy(true); setError('');
        try {
          await api.createGuestSession(reviewToken, guestName);
          const result = await api.guestWorkspace();
          localStorage.setItem(guestNameKey(reviewToken), result.reviewer_username);
          setGuest({ username: result.reviewer_username, workspace: result.workspace, draftCount: result.draft_blocks.length });
        } catch (e) { setError(e instanceof Error ? e.message : 'Không mở được Workspace'); }
        finally { setBusy(false); }
      }}>
        <div className="w-12 h-12 rounded-2xl bg-emerald-700 text-white grid place-items-center font-black text-xl">P</div>
        <h1 className="text-2xl font-black text-slate-900">Xem Workspace</h1>
        <p className="text-sm text-slate-600">Nhập tên để tham gia vòng review qua đường dẫn mà Designer gửi.</p>
        <input className="w-full rounded-xl border border-slate-300 p-3" placeholder="Tên của bạn" value={guestName} onChange={(e) => setGuestName(e.target.value)} required maxLength={100} />
        {error && <p className="text-sm text-red-700">{error}</p>}
        <button disabled={busy} className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-bold p-3 rounded-xl">{busy ? 'Đang mở…' : 'Vào Workspace'}</button>
      </form>
    </div>;
  }

  if (!user && !guest) return <LoginScreen notice={error} onLogin={async (email, password, remember) => {
    const next = await api.login(email, password, remember);
    setUser(next);
    setError('');
  }} />;

  const isDesigner = user?.system_role === 'DESIGNER';
  const currentWorkspaceId = guest?.workspace.id || workspaceId;
  const logout = async () => {
    if (guest) {
      try { await api.logoutGuest(); }
      catch (cause) {
        if (!(cause instanceof ApiError && cause.status === 401)) {
          setError(cause instanceof Error ? cause.message : 'Không thu hồi được phiên khách. Vui lòng thử lại.');
          return;
        }
      }
    }
    api.logout();
    if (reviewToken) localStorage.removeItem(guestNameKey(reviewToken));
    setUser(null); setGuest(null); setWorkspaces([]); setShowCreate(false);
    navigate('/');
  };

  const createWorkspace = async () => {
    let prepared: Array<{ block_type: BlockDraft['block_type']; label: string; content: Record<string, unknown> }>;
    try {
      prepared = initialBlocks.map((block) => ({
        block_type: block.block_type, label: block.label.trim(), content: blockContent(block),
      }));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Thông số kỹ thuật chưa hợp lệ');
      return;
    }
    setBusy(true); setError('');
    try {
      const result = await api.createWorkspace(
        { name: customerName, email: customerEmail || undefined, phone: customerPhone || undefined },
        productType, prepared,
      );
      setCreatedLink(result.review_link.review_url);
      setShowCreate(false); setInitialBlocks([]);
      setCustomerName(''); setCustomerEmail(''); setCustomerPhone(''); setProductType('');
      await refreshWorkspaces();
      navigate(`/workspaces/${result.workspace.id}`);
    } catch (cause) {
      setError(cause instanceof ApiError && cause.status === 401
        ? 'Phiên đăng nhập không còn hợp lệ. Đăng nhập lại để tiếp tục tạo đơn hàng.'
        : cause instanceof Error ? cause.message : 'Không tạo được đơn hàng');
    } finally { setBusy(false); }
  };

  const createDialog = showCreate && <CreateWorkspaceDialog
    customerName={customerName} customerEmail={customerEmail} customerPhone={customerPhone}
    productType={productType} onCustomerName={setCustomerName} onCustomerEmail={setCustomerEmail}
    onCustomerPhone={setCustomerPhone} onProductType={setProductType}
    initialBlocks={initialBlocks} onInitialBlocks={setInitialBlocks}
    busy={busy} error={error} onCancel={() => setShowCreate(false)} onCreate={createWorkspace}
  />;

  if (isDesigner && user) return <>
    <ManagementShell api={api} user={user} workspaces={workspaces} workspaceId={workspaceId}
      onOpenWorkspace={(id) => navigate(`/workspaces/${id}`)} onHome={() => navigate('/')}
      onCreate={() => setShowCreate(true)}
      onRefresh={() => void refreshWorkspaces().catch((e) => setError(e.message))}
      onLogout={logout} />
    {error && !showCreate && <div role="alert" className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 rounded-xl border border-red-200 bg-red-50 text-red-800 p-4 shadow-xl">{error}</div>}
    {createDialog}
    {createdLink && <div className="fixed bottom-4 right-4 z-50 max-w-lg bg-emerald-800 text-white rounded-2xl p-5 shadow-xl"><p className="font-bold">Đã tạo đơn hàng. Liên kết để khách hàng xem:</p><a className="break-all underline text-sm" href={createdLink}>{createdLink}</a><button onClick={() => setCreatedLink('')} className="block text-xs mt-2 underline">Đóng</button></div>}
  </>;

  if (guest) return <>{error && <div role="alert" className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-xl border border-red-200 bg-red-50 p-4 text-red-800 shadow-xl">{error}</div>}<CustomerPortal api={api} username={guest.username} initialWorkspace={guest.workspace} initialBlockCount={guest.draftCount} onLogout={logout} /></>;

  return <div className="min-h-screen flex bg-[#faf9f7] text-slate-900">
    <aside className="hidden md:flex w-64 shrink-0 flex-col bg-slate-950 text-white p-5 gap-6 min-h-screen">
      <button onClick={() => navigate('/')} className="flex items-center gap-3 text-left">
        <span className="grid place-items-center w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-rose-600 font-black text-xl">P</span>
        <span><strong className="block text-lg tracking-tight">ProofPrint</strong><small className="text-slate-400">Workspace quản lý</small></span>
      </button>
      <nav className="space-y-2 text-sm font-semibold">
        {!guest && <button onClick={() => navigate('/')} className="flex items-center gap-2 w-full p-3 rounded-xl hover:bg-white/10"><LayoutDashboard size={17} /> Tổng quan</button>}
        {user?.system_role === 'ADMIN' && <button onClick={() => navigate('/admin')} className="flex items-center gap-2 w-full p-3 rounded-xl hover:bg-white/10"><Users size={17} /> Designer</button>}
        {isDesigner && workspaces.map((item) => <button key={item.id} onClick={() => navigate(`/workspaces/${item.id}`)} className={`block w-full text-left p-3 rounded-xl truncate ${workspaceId === item.id ? 'bg-orange-600' : 'hover:bg-white/10'}`}>{item.customer_name} · {item.product_type}</button>)}
      </nav>
      <div className="mt-auto text-xs text-slate-400 space-y-3">
        <div className="flex items-center gap-2"><span className={`w-2 h-2 rounded-full ${health ? 'bg-emerald-400' : 'bg-red-400'}`} /> API {health ? 'đang chạy' : 'chưa kết nối'}</div>
        <button onClick={logout} className="flex items-center gap-2 hover:text-white"><LogOut size={16} /> Đăng xuất</button>
      </div>
    </aside>
    <main className="flex-1 min-w-0">
      <header className="bg-white/90 border-b border-slate-200 px-5 md:px-8 py-4 flex items-center justify-between gap-3 sticky top-0 z-10 backdrop-blur">
        <div><p className="text-xs uppercase tracking-widest font-bold text-orange-700">ProofPrint</p><h1 className="text-xl font-black">{currentWorkspaceId ? (guest?.workspace.customer_name || selected?.customer_name || 'Workspace') : user?.system_role === 'ADMIN' ? 'Quản lý Designer' : 'Các Workspace'}</h1></div>
        <div className="flex items-center gap-3 text-sm"><span className="hidden sm:block text-slate-600">{guest?.username || user?.display_name}</span><button onClick={logout} className="md:hidden p-2" title="Đăng xuất"><LogOut size={18} /></button></div>
      </header>
      <div className="p-5 md:p-8 max-w-7xl mx-auto">
        {error && <div role="alert" className="mb-5 rounded-xl bg-red-50 border border-red-200 text-red-800 p-4">{error}</div>}
        {currentWorkspaceId ? <WorkspacePage key={currentWorkspaceId} api={api} id={currentWorkspaceId} guest={Boolean(guest)} onBack={() => {
          navigate('/');
          void refreshWorkspaces().catch((e) => setError(e.message));
        }} />
          : user?.system_role === 'ADMIN' ? <AdminPage api={api} />
            : <div className="space-y-7">
              <div className="relative overflow-hidden rounded-3xl bg-slate-950 text-white p-7 md:p-10 flex items-center justify-between gap-5">
                <div className="relative z-10 max-w-xl"><div className="flex items-center gap-2 text-orange-300 text-xs font-bold uppercase tracking-widest"><ShieldCheck size={16} /> Quản lý sản xuất</div><h2 className="text-3xl font-black mt-3">Một Workspace cho từng khách hàng</h2><p className="mt-3 text-slate-300 text-sm">Theo dõi Draft, Version, yêu cầu thay đổi, duyệt mẫu và khóa sản xuất bằng dữ liệu thật.</p></div>
                <img src={previewImage} alt="Mẫu thiết kế" className="hidden lg:block w-52 h-36 object-cover rounded-2xl opacity-80" />
              </div>
              <div className="flex justify-between items-center"><h2 className="text-xl font-black">Đơn hàng ({workspaces.length})</h2><div className="flex gap-2"><button onClick={() => void refreshWorkspaces().catch((e) => setError(e.message))} className="rounded-xl border border-slate-200 p-2.5" title="Làm mới"><RefreshCw size={17} /></button><button onClick={() => setShowCreate(true)} className="rounded-xl bg-orange-600 hover:bg-orange-700 text-white px-4 py-2.5 font-bold text-sm flex gap-2"><Plus size={17} /> Tạo đơn hàng</button></div></div>
              <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">{workspaces.map((item) => <button key={item.id} onClick={() => navigate(`/workspaces/${item.id}`)} className="text-left bg-white border border-slate-200 hover:border-orange-300 rounded-2xl p-5 shadow-sm group"><div className="flex justify-between"><span className="text-xs font-bold text-orange-700 uppercase">{item.workflow_status}</span><ArrowRight size={17} className="text-slate-400 group-hover:text-orange-600" /></div><h3 className="font-black text-lg mt-3">{item.customer_name}</h3><p className="text-sm text-slate-600 mt-1">{item.product_type}</p><p className="text-xs text-slate-400 mt-4">{item.record_status} · Sửa {new Date(item.updated_at).toLocaleDateString('vi-VN')}</p></button>)}</div>
              {workspaces.length === 0 && <div className="rounded-2xl border border-dashed border-slate-300 p-10 text-center text-slate-500">Chưa có Workspace. Tạo mới để bắt đầu.</div>}
            </div>}
      </div>
    </main>
    {createDialog}
    {createdLink && <div className="fixed bottom-4 right-4 z-40 max-w-lg bg-emerald-800 text-white rounded-2xl p-5 shadow-xl"><p className="font-bold">Workspace đã tạo. Link cho Customer:</p><a className="break-all underline text-sm" href={createdLink}>{createdLink}</a><button onClick={() => setCreatedLink('')} className="block text-xs mt-2 underline">Đóng</button></div>}
  </div>;
}
