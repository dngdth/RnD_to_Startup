import type { RequestOptions, Transport } from '../application/proofprint';

export class ApiError extends Error {
  constructor(message: string, readonly status: number) { super(message); }
}

const TOKEN_KEY = 'proofprint_access_token';
export const AUTH_REQUIRED_EVENT = 'proofprint:auth-required';

export class HttpTransport implements Transport {
  private token = sessionStorage.getItem(TOKEN_KEY) || localStorage.getItem(TOKEN_KEY);

  hasToken() { return Boolean(this.token); }
  newIdempotencyKey() { return crypto.randomUUID(); }

  setToken(token: string | null, remember = false) {
    this.token = token;
    sessionStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(TOKEN_KEY);
    if (token) (remember ? localStorage : sessionStorage).setItem(TOKEN_KEY, token);
  }

  async uploadImage<T>(path: string, file: File, revision: number): Promise<T> {
    const response = await fetch(`/api/v1${path}`, {
      method: 'POST', credentials: 'include', body: file,
      headers: {
        ...(this.token ? { Authorization: `Bearer ${this.token}` } : {}),
        'Content-Type': 'application/octet-stream',
        'X-File-Name': encodeURIComponent(file.name),
        'If-Match': `W/"${revision}"`,
      },
    }).catch(() => { throw new ApiError('Không kết nối được backend.', 0); });
    const payload = await response.json().catch(() => null);
    if (response.status === 401) {
      this.setToken(null);
      window.dispatchEvent(new Event(AUTH_REQUIRED_EVENT));
    }
    if (!response.ok) throw new ApiError(
      typeof payload?.detail === 'string' ? payload.detail : `Tải ảnh thất bại (HTTP ${response.status})`,
      response.status,
    );
    return payload as T;
  }

  async binary(path: string, guest = false): Promise<Blob> {
    const response = await fetch(`/api/v1${path}`, {
      credentials: 'include',
      headers: this.token && !guest ? { Authorization: `Bearer ${this.token}` } : {},
    }).catch(() => { throw new ApiError('Không kết nối được backend.', 0); });
    if (!response.ok) throw new ApiError(`Không tải được ảnh (HTTP ${response.status})`, response.status);
    return response.blob();
  }

  async request<T>(method: string, path: string, body?: unknown, options: RequestOptions = {}): Promise<T> {
    const headers: Record<string, string> = {};
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    if (this.token && !options.guest) headers.Authorization = `Bearer ${this.token}`;
    if (options.revision !== undefined) headers['If-Match'] = `W/"${options.revision}"`;
    if (options.idempotencyKey) headers['Idempotency-Key'] = options.idempotencyKey;
    if (options.attestation) headers['X-Asset-Attestation'] = options.attestation;
    let response: Response;
    try {
      response = await fetch(path === '/health' ? path : `/api/v1${path}`, {
        method, headers, credentials: 'include',
        body: body === undefined ? undefined : JSON.stringify(body),
      });
    } catch {
      throw new ApiError('Không kết nối được backend. Kiểm tra API đang chạy.', 0);
    }
    if (response.status === 204) return undefined as T;
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      if (response.status === 401 && !options.guest) {
        this.setToken(null);
        window.dispatchEvent(new Event(AUTH_REQUIRED_EVENT));
      }
      const detail = payload?.detail;
      const message = typeof payload?.message === 'string' ? payload.message
        : typeof detail === 'string' ? detail
          : Array.isArray(detail)
            ? detail.map((item: { msg?: string }) => item.msg || 'Dữ liệu chưa hợp lệ').join('; ')
            : `API trả về HTTP ${response.status}`;
      throw new ApiError(message, response.status);
    }
    return payload as T;
  }
}
