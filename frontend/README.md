# ProofPrint frontend

React 19, TypeScript, Vite. The login visuals come from the supplied login archive. The management archive is retained in `prototype/management/src` as a reference; the active screens use the current backend contracts and database fields.

## Run locally

Start PostgreSQL, apply backend migrations and start the FastAPI server as described in the root README. Then:

```powershell
cd frontend
npm install
npm run dev
```

Open <http://127.0.0.1:3000>. Vite proxies `/api` and `/health` to `http://127.0.0.1:8000`. To change the backend origin, set `PROOFPRINT_API_ORIGIN` using `.env.local`; see `.env.example`.

The local seed provides two login accounts:

| Role | Email | Password |
| --- | --- | --- |
| Admin | `admin@proofprint.local` | `Admin123!` |
| Designer | `designer@proofprint.local` | `Designer123!` |

Customer opens a Workspace's review link and enters a display name. This creates a guest session using the existing API. No Customer password is required.

## API integration

The active UI calls the existing backend APIs for authentication, Designer management, Workspace creation and access, review links, guest sessions, Draft blocks, asset metadata, revisions, Versions and diff, Review Rounds, comments, Change Requests and their transitions, approval, production lock and snapshot, audit, and Workspace lifecycle. Mutations carry the required `If-Match` revision and `Idempotency-Key` headers.

There is no browser upload endpoint in the current backend. Asset registration needs a storage key, SHA-256 checksum and a trusted upload/scan attestation from the separate storage service. The frontend does not generate a fake attestation. Zalo Bot chat binding and notifications run through backend integration and do not have a management API in this version.

## Structure

```text
src/domain/          API-facing domain models
src/application/     Named operations and the transport port
src/infrastructure/  HTTP adapter and session token storage
src/presentation/    Login, Admin and Workspace screens
src/App.tsx          Routing and composition
prototype/management/src/  Original management prototype, excluded from the build
```

`npm run lint` checks TypeScript. `npm run build` creates the production bundle in `dist/`. Serve that bundle with an HTTP reverse proxy that forwards `/api` and `/health` to the backend and falls back to `index.html` for `/workspaces/...` and `/review/...` routes.
