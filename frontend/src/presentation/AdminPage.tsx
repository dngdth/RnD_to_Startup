import { useCallback, useEffect, useState } from 'react';
import { Plus, RefreshCw, UserRound } from 'lucide-react';
import type { Proofprint } from '../application/proofprint';
import type { Designer } from '../domain/models';

export function AdminPage({ api }: { api: Proofprint }) {
  const [designers, setDesigners] = useState<Designer[]>([]);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!error) return;
    const timer = window.setTimeout(() => setError(''), 5000);
    return () => window.clearTimeout(timer);
  }, [error]);
  const refresh = useCallback(async () => setDesigners(await api.designers()), [api]);
  useEffect(() => { void refresh().catch((e) => setError(e.message)); }, [refresh]);

  const changeStatus = async (item: Designer) => {
    setBusy(true); setError('');
    try {
      await api.setDesignerStatus(item.id, item.status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE');
      await refresh();
    } catch (e) { setError(e instanceof Error ? e.message : 'Không cập nhật được'); }
    finally { setBusy(false); }
  };

  return <div className="space-y-7">
    <div className="rounded-3xl bg-slate-950 text-white p-8"><div className="flex gap-3 items-center"><UserRound size={24} className="text-orange-400" /><h2 className="text-2xl font-black">Quản trị Designer</h2></div><p className="text-slate-300 text-sm mt-2">Tạo tài khoản, xem danh sách và khóa hoặc mở tài khoản Designer qua API quản trị.</p></div>
    {error && <p role="alert" className="p-4 bg-red-50 border border-red-200 text-red-800 rounded-xl">{error}</p>}
    <form className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4" onSubmit={async (event) => {
      event.preventDefault(); setBusy(true); setError('');
      try { await api.createDesigner(email, name, password); setEmail(''); setName(''); setPassword(''); await refresh(); }
      catch (e) { setError(e instanceof Error ? e.message : 'Không tạo được Designer'); }
      finally { setBusy(false); }
    }}><h3 className="font-black text-lg">Tạo Designer</h3><div className="grid md:grid-cols-3 gap-3"><input className="rounded-xl border p-3" type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required /><input className="rounded-xl border p-3" placeholder="Tên hiển thị" value={name} onChange={(e) => setName(e.target.value)} required /><input className="rounded-xl border p-3" type="password" placeholder="Mật khẩu tạm (ít nhất 8 ký tự)" value={password} onChange={(e) => setPassword(e.target.value)} minLength={8} required /></div><button disabled={busy} className="rounded-xl bg-orange-600 text-white px-4 py-2.5 font-bold text-sm flex items-center gap-2"><Plus size={17} /> Tạo tài khoản</button></form>
    <div className="flex items-center justify-between"><h3 className="text-xl font-black">Danh sách ({designers.length})</h3><button onClick={() => void refresh().catch((e) => setError(e.message))} className="border rounded-xl p-2.5"><RefreshCw size={17} /></button></div>
    <div className="grid md:grid-cols-2 gap-4">{designers.map((item) => <article key={item.id} className="bg-white rounded-2xl border border-slate-200 p-5 flex justify-between gap-3"><div><p className="font-bold">{item.display_name}</p><p className="text-sm text-slate-500">{item.email}</p><p className="text-xs mt-2 text-slate-500">{item.status} · {item.must_change_password ? 'Cần đổi mật khẩu' : 'Đã thiết lập mật khẩu'}</p></div><button disabled={busy} onClick={() => void changeStatus(item)} className="text-sm font-bold text-orange-700 hover:underline">{item.status === 'ACTIVE' ? 'Khóa' : 'Mở'}</button></article>)}</div>
  </div>;
}
