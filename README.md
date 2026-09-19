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

Dự án sử dụng **layer-first Clean Architecture**, tương tự cách tổ chức trong `dut-ai-quiz`.
Mỗi layer có một chiều phụ thuộc rõ ràng; từng nghiệp vụ trong application được biểu diễn bằng
một use case có phương thức `execute()`.

```text
backend/
├── alembic/
│   ├── env.py
│   └── versions/                       # Lịch sử migration PostgreSQL
├── scripts/
│   └── seed_demo.sql                   # Dữ liệu demo, có thể chạy lặp lại
├── src/proofprint/
│   ├── domain/
│   │   ├── entities/                   # Entity/enum thuần Python
│   │   ├── interfaces/                 # Repository và service protocol
│   │   └── exceptions.py               # Lỗi độc lập framework
│   ├── application/
│   │   └── use_cases/                  # Một class execute() cho từng luồng nghiệp vụ
│   ├── infrastructure/
│   │   ├── database.py                 # Settings, engine và session factory
│   │   ├── models/                     # SQLAlchemy persistence models
│   │   ├── repositories/               # Cài đặt các domain interface
│   │   ├── security/                   # Argon2 và JWT adapter
│   │   └── di/                         # Composition/provider của use case
│   ├── presentation/
│   │   ├── api/
│   │   │   ├── routers/                # FastAPI endpoint
│   │   │   ├── dependencies.py         # Request-scoped dependency wiring
│   │   │   ├── errors.py               # Application error → HTTP response
│   │   │   └── router.py               # Tổng hợp router /api/v1
│   │   └── schemas/                    # Pydantic request/response DTO
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
| `domain` | Entity, enum, business rule, exception và interface | Chỉ Python standard library và chính `domain` |
| `application` | Use case `execute()` điều phối domain | `domain` |
| `infrastructure` | SQLAlchemy repository, JWT, Argon2 và adapter bên ngoài | `domain`, thư viện kỹ thuật |
| `presentation` | FastAPI router, request/response schema và dependency wiring | `application`, `domain`, `infrastructure` |
| `main.py` | Composition root cấp ứng dụng | `presentation`, `domain` |

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

`domain` và `application` không được import FastAPI, Pydantic, SQLAlchemy, JWT, Argon2 hoặc các
layer bên ngoài. Quy tắc này được bảo vệ tự động bởi `tests/test_architecture.py`.

## Luồng authentication

```text
POST /api/v1/auth/login
    → presentation.api.routers.authentication
    → AuthenticateUser.execute()
    → AuthenticationRepository.find_by_email()
    → Argon2PasswordVerifier.verify()
    → JwtAccessTokenCodec.issue()
```

Với API cần đăng nhập:

```text
Authorization: Bearer <access_token>
    → get_current_actor()
    → ResolveCurrentActor.execute()
    → CurrentActor
```

Không lấy role hoặc user ID từ request body. Mọi thông tin người thực hiện đều phải lấy từ
`CurrentActor` đã được xác thực.

## Luồng authorization Workspace

```text
GET /api/v1/workspaces/{workspace_id}
    → resolve CurrentActor
    → GetWorkspace.execute()
    → kiểm tra SystemRole hoặc WorkspaceGrant
    → trả WorkspaceResponse
```

- `ADMIN`: được cấp toàn bộ quyền trên mọi Workspace.
- User không phải Admin và không có membership hợp lệ: trả `404`.
- Có membership nhưng `can_view=false`: trả `403`.
- Có membership `ACTIVE` và `can_view=true`: trả Workspace cùng permission hiện tại.

## Thêm một nghiệp vụ mới

Ví dụ khi triển khai nghiệp vụ `reviews`, bổ sung theo đúng layer:

```text
domain/entities/review.py
domain/interfaces/review.py
application/use_cases/submit_review.py
infrastructure/repositories/reviews.py
presentation/schemas/reviews.py
presentation/api/routers/reviews.py
```

Thứ tự triển khai khuyến nghị:

1. Định nghĩa entity, rule và repository port trong `domain`.
2. Viết một use case có `execute()` trong `application/use_cases` và unit test bằng in-memory adapter.
3. Cài đặt port bằng SQLAlchemy trong `infrastructure`.
4. Tạo request/response schema và router trong `presentation`.
5. Đăng ký router tại `presentation/api/router.py`.
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
