import { useEffect, useState } from 'react';
import type { Proofprint } from '../application/proofprint';

export function WorkspaceImage({ api, workspaceId, assetId, alt, className = '' }: {
  api: Proofprint; workspaceId: string; assetId: string; alt: string; className?: string;
}) {
  const [url, setUrl] = useState('');
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let active = true;
    let objectUrl = '';
    setFailed(false);
    setUrl('');
    void api.workspaceImage(workspaceId, assetId).then((blob) => {
      if (!active) return;
      objectUrl = URL.createObjectURL(blob);
      setUrl(objectUrl);
    }).catch(() => { if (active) setFailed(true); });
    return () => { active = false; if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [api, workspaceId, assetId]);
  if (failed) return <div className="grid min-h-28 place-items-center rounded-xl bg-slate-100 p-3 text-xs text-slate-500">Không tải được ảnh</div>;
  if (!url) return <div className="grid min-h-28 place-items-center rounded-xl bg-slate-100 p-3 text-xs text-slate-500">Đang tải ảnh…</div>;
  return <img src={url} alt={alt} className={className} onError={() => setFailed(true)} />;
}
