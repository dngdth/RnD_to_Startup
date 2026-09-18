# ProofPrint

Backend Python cho workspace quản lý specification, review, approval và production snapshot của
sản phẩm làm theo yêu cầu. Domain contract đã chốt nằm tại
[`docs/proofprint_domain_contract.md`](docs/proofprint_domain_contract.md).

## Trạng thái triển khai

API cũ dạng `/api/v1/orders` đã được gỡ. Lát cắt hiện tại tập trung vào nền móng xác thực và phân
quyền trước khi triển khai các command nghiệp vụ:

- Đăng nhập email/mật khẩu với Argon2id.
- Access token JWT có thời hạn ngắn.
- `CurrentActor` luôn được suy ra từ bearer token.
- User bị `DISABLED` mất quyền sử dụng token ngay ở request tiếp theo.
- Admin xem được mọi Workspace.
- Designer và Customer chỉ thấy Workspace có membership `ACTIVE` và `can_view=true`.
- Tài nguyên ngoài scope trả `404`; membership có scope nhưng thiếu permission trả `403`.

## Cấu trúc

```text
backend/
  src/proofprint/
    domain/          # CurrentActor, role, grant, error và repository port
    application/     # Authentication và authorization use case
    infrastructure/  # JWT/Argon2, SQLAlchemy model và repository PostgreSQL
    presentation/    # FastAPI route, schema và dependency
    main.py          # Composition root
  alembic/           # Migration PostgreSQL
  scripts/           # Dữ liệu demo chạy lặp không bị trùng
  tests/             # Unit/API/schema tests
```

## Chạy local

Yêu cầu Python 3.12+, Docker, Docker Compose và `uv`:

```bat
cd backend
if not exist .env copy .env.example .env
uv sync --extra dev
docker compose up -d db
uv run alembic upgrade head
docker compose exec -T db psql -U proofprint -d proofprint < scripts\seed_demo.sql
uv run uvicorn proofprint.main:app --reload
```

Swagger: <http://127.0.0.1:8000/docs>

Trước khi deploy, thay `AUTH_SECRET_KEY` trong `.env` bằng secret ngẫu nhiên tối thiểu 32 ký tự.

## Tài khoản demo

| Role | Email | Password |
| --- | --- | --- |
| Admin | `admin@proofprint.local` | `Admin123!` |
| Designer | `designer@proofprint.local` | `Designer123!` |
| Customer | `customer@proofprint.local` | `Customer123!` |

Đây chỉ là credential local do `scripts/seed_demo.sql` tạo; không dùng ở môi trường thật.

## API hiện có

```text
GET  /health
POST /api/v1/auth/login
GET  /api/v1/auth/me
GET  /api/v1/workspaces
GET  /api/v1/workspaces/{workspace_id}
```

Đăng nhập:

```json
POST /api/v1/auth/login
{
  "email": "designer@proofprint.local",
  "password": "Designer123!"
}
```

Lấy `access_token` từ response rồi gửi trong các request sau:

```text
Authorization: Bearer <access_token>
```

## Kiểm tra

```bat
uv run ruff check src tests alembic
uv run pytest -q
uv run alembic current
```
