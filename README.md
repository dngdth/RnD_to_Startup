# ProofPrint

ProofPrint là backend quản lý specification, review, approval và production snapshot cho sản phẩm
làm theo yêu cầu. Backend được viết bằng Python 3.12, FastAPI, SQLAlchemy và PostgreSQL.

Domain contract đã thống nhất được lưu tại
[`docs/proofprint_domain_contract.md`](docs/proofprint_domain_contract.md).

## Trạng thái hiện tại

API cũ `/api/v1/orders` đã được loại bỏ. Phần đang hoạt động tập trung vào authentication và
authorization làm nền móng cho các nghiệp vụ tiếp theo:

- Đăng nhập bằng email và mật khẩu, hash bằng Argon2id.
- Cấp access token JWT có thời hạn ngắn.
- Xác định `CurrentActor` từ bearer token ở mỗi request.
- Từ chối đăng nhập và vô hiệu hóa token hiện tại khi user có trạng thái `DISABLED`.
- Admin có thể xem toàn bộ Workspace.
- Designer và Customer chỉ thấy Workspace có membership `ACTIVE` và `can_view=true`.
- Tài nguyên nằm ngoài phạm vi của user trả về `404` để không làm lộ sự tồn tại.
- User thuộc Workspace nhưng thiếu quyền thao tác nhận `403`.

## Kiến trúc

Dự án sử dụng **feature-first Clean Architecture**. Code được nhóm theo module nghiệp vụ trước,
sau đó mỗi module mới chia thành các layer `domain`, `application`, `infrastructure` và
`presentation`.

```text
backend/
├── alembic/
│   ├── env.py
│   └── versions/                       # Lịch sử migration PostgreSQL
├── scripts/
│   └── seed_demo.sql                   # Dữ liệu demo, có thể chạy lặp lại
├── src/proofprint/
│   ├── api/
│   │   ├── errors.py                   # Chuyển application error thành HTTP response
│   │   ├── health.py                   # GET /health
│   │   └── v1.py                       # Tổng hợp router dưới prefix /api/v1
│   ├── core/
│   │   └── errors.py                   # Lỗi nghiệp vụ dùng chung, không phụ thuộc framework
│   ├── modules/
│   │   ├── identity/
│   │   │   ├── domain/
│   │   │   │   ├── entities.py         # UserStatus, SystemRole, CurrentActor, token
│   │   │   │   └── ports.py            # Interface repository, password và token
│   │   │   ├── application/
│   │   │   │   └── service.py          # Login và resolve CurrentActor
│   │   │   ├── infrastructure/
│   │   │   │   ├── repository.py       # SQLAlchemy authentication repository
│   │   │   │   ├── password.py         # Argon2 password verifier
│   │   │   │   └── token.py            # JWT access token codec
│   │   │   └── presentation/
│   │   │       ├── dependencies.py     # FastAPI dependency wiring
│   │   │       ├── schemas.py          # Login và current-user DTO
│   │   │       └── router.py           # /auth/login và /auth/me
│   │   └── workspaces/
│   │       ├── domain/
│   │       │   ├── entities.py         # WorkspaceSummary và WorkspaceGrant
│   │       │   └── ports.py            # WorkspaceAccessRepository interface
│   │       ├── application/
│   │       │   └── queries.py          # Kiểm tra scope và quyền xem Workspace
│   │       ├── infrastructure/
│   │       │   └── repository.py       # SQLAlchemy workspace repository
│   │       └── presentation/
│   │           ├── dependencies.py     # Khởi tạo workspace query service
│   │           ├── schemas.py          # Workspace response DTO
│   │           └── router.py           # List và detail Workspace API
│   ├── infrastructure/
│   │   ├── database.py                 # Settings, engine và session factory
│   │   └── models/
│   │       ├── base.py                 # SQLAlchemy DeclarativeBase
│   │       ├── identity.py             # Tenant, customer, user và credential tables
│   │       ├── workspace.py            # Workspace và membership tables
│   │       ├── specification.py        # Specification block và version tables
│   │       ├── review.py               # Review, approval và production tables
│   │       ├── collaboration.py        # Comment tables
│   │       ├── asset.py                # Asset tables
│   │       └── event.py                # Audit event và outbox tables
│   └── main.py                         # Tạo FastAPI app và đăng ký router/error handler
├── tests/
│   ├── test_architecture.py            # Chặn dependency sai chiều giữa các layer
│   ├── test_authentication.py          # Unit test authentication
│   ├── test_authorization_api.py       # API và authorization test
│   └── test_database_schema.py         # Kiểm tra SQLAlchemy metadata
├── compose.yaml
├── pyproject.toml
└── alembic.ini
```

## Trách nhiệm của từng layer

| Layer | Chứa gì | Được phép phụ thuộc |
| --- | --- | --- |
| `domain` | Entity, enum, business rule và port/interface | Python standard library, `core`, domain của module liên quan |
| `application` | Use case điều phối domain | `domain`, `core` |
| `infrastructure` | SQLAlchemy repository, JWT, Argon2 và adapter bên ngoài | `domain`, thư viện kỹ thuật |
| `presentation` | FastAPI router, request/response schema và dependency wiring | `application`, `domain`, `infrastructure` |
| `api` | Tổng hợp router, health check và ánh xạ lỗi HTTP | Presentation của các module và `core` |
| `main.py` | Composition root của ứng dụng | `api`, `core` |

Dependency phải đi từ layer ngoài vào layer trong:

```text
HTTP request
    │
    ▼
presentation/router
    │
    ▼
application/use case
    │
    ▼
domain entity + port
    ▲
    │
infrastructure adapter
```

`domain` và `application` không được import FastAPI, Pydantic, SQLAlchemy hoặc presentation và
infrastructure. Quy tắc này được bảo vệ tự động bởi `tests/test_architecture.py`.

## Luồng authentication

```text
POST /api/v1/auth/login
    → identity.presentation.router
    → AuthenticationService.login()
    → AuthenticationRepository.find_by_email()
    → Argon2PasswordVerifier.verify()
    → JwtAccessTokenCodec.issue()
```

Với API cần đăng nhập:

```text
Authorization: Bearer <access_token>
    → get_current_actor()
    → AuthenticationService.resolve_actor()
    → CurrentActor
```

Không lấy role hoặc user ID từ request body. Mọi thông tin người thực hiện đều phải lấy từ
`CurrentActor` đã được xác thực.

## Luồng authorization Workspace

```text
GET /api/v1/workspaces/{workspace_id}
    → resolve CurrentActor
    → WorkspaceQueryService.get_for()
    → kiểm tra SystemRole hoặc WorkspaceGrant
    → trả WorkspaceResponse
```

- `ADMIN`: được cấp toàn bộ quyền trên mọi Workspace.
- User không phải Admin và không có membership hợp lệ: trả `404`.
- Có membership nhưng `can_view=false`: trả `403`.
- Có membership `ACTIVE` và `can_view=true`: trả Workspace cùng permission hiện tại.

## Thêm một module nghiệp vụ mới

Ví dụ khi triển khai module `reviews`, tạo cấu trúc:

```text
modules/reviews/
├── domain/
│   ├── entities.py
│   └── ports.py
├── application/
│   └── commands.py
├── infrastructure/
│   └── repository.py
└── presentation/
    ├── dependencies.py
    ├── schemas.py
    └── router.py
```

Thứ tự triển khai khuyến nghị:

1. Định nghĩa entity, rule và repository port trong `domain`.
2. Viết use case trong `application` và unit test bằng in-memory adapter.
3. Cài đặt port bằng SQLAlchemy trong `infrastructure`.
4. Tạo request/response schema và router trong `presentation`.
5. Đăng ký router module tại `api/v1.py`.
6. Thêm migration nếu database schema thay đổi.
7. Chạy lint, test và `alembic check`.

Không tạo một `BaseService` chứa CRUD dùng chung nếu điều đó làm mất tên và rule của nghiệp vụ.
Các use case nên có tên rõ ràng như `approve_version`, `submit_review` hoặc `lock_production`.

## Chạy dự án local

Yêu cầu:

- Python 3.12+
- Docker và Docker Compose
- `uv`

Tại thư mục gốc dự án:

```bat
cd backend
if not exist .env copy .env.example .env
uv sync --extra dev
docker compose up -d db
uv run alembic upgrade head
docker compose exec -T db psql -U proofprint -d proofprint < scripts\seed_demo.sql
uv run uvicorn proofprint.main:app --reload
```

Các địa chỉ local:

- API: <http://127.0.0.1:8000>
- Swagger UI: <http://127.0.0.1:8000/docs>
- OpenAPI JSON: <http://127.0.0.1:8000/openapi.json>

Trước khi deploy, thay `AUTH_SECRET_KEY` trong `.env` bằng secret ngẫu nhiên có tối thiểu 32 ký tự.

## Database và migration

Kiểm tra migration hiện tại:

```bat
uv run alembic current
uv run alembic heads
```

Đưa database lên migration mới nhất:

```bat
uv run alembic upgrade head
```

Sau khi chủ động thay đổi SQLAlchemy models, tạo migration mới:

```bat
uv run alembic revision --autogenerate -m "describe schema change"
uv run alembic upgrade head
```

Kiểm tra models và database migration có bị lệch nhau không:

```bat
uv run alembic check
```

## Tài khoản demo

| Role | Email | Password |
| --- | --- | --- |
| Admin | `admin@proofprint.local` | `Admin123!` |
| Designer | `designer@proofprint.local` | `Designer123!` |
| Customer | `customer@proofprint.local` | `Customer123!` |

Các credential này chỉ phục vụ local development và được tạo bởi `scripts/seed_demo.sql`.

## API hiện có

| Method | Endpoint | Authentication | Mô tả |
| --- | --- | --- | --- |
| `GET` | `/health` | Không | Kiểm tra API đang hoạt động |
| `POST` | `/api/v1/auth/login` | Không | Đăng nhập và nhận access token |
| `GET` | `/api/v1/auth/me` | Bearer token | Lấy thông tin CurrentActor |
| `GET` | `/api/v1/workspaces` | Bearer token | Danh sách Workspace được phép xem |
| `GET` | `/api/v1/workspaces/{workspace_id}` | Bearer token | Chi tiết Workspace và permission |

Ví dụ đăng nhập:

```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "designer@proofprint.local",
  "password": "Designer123!"
}
```

Sử dụng `access_token` trong các request tiếp theo:

```http
Authorization: Bearer <access_token>
```

## Kiểm tra chất lượng code

```bat
cd backend
uv run ruff check src tests alembic
uv run pytest -q
uv run alembic check
```

Test suite hiện kiểm tra:

- Đăng nhập đúng và sai mật khẩu.
- User bị disable.
- JWT bị chỉnh sửa trái phép.
- Phạm vi Workspace của Designer và Customer.
- Quyền truy cập đặc biệt của Admin.
- Phân biệt `403` và `404` theo authorization contract.
- Metadata của toàn bộ database schema.
- Dependency direction của Clean Architecture.
