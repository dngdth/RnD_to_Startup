# ProofPrint

Mission Phase 4 cho hai thành viên: [Approval/Production Lock và Audit/Workspace lifecycle](docs/mission_phase4_two_teammates.md).

ProofPrint là backend quản lý specification, review, approval và production snapshot cho sản phẩm
làm theo yêu cầu. Backend được viết bằng Python 3.12, FastAPI, SQLAlchemy và PostgreSQL.

Domain contract đã thống nhất được lưu tại
[`docs/proofprint_domain_contract.md`](docs/proofprint_domain_contract.md).

## Trạng thái hiện tại

Phần đang hoạt động tập trung vào authentication, Workspace access và review link cho Customer:

- Đăng nhập bằng email và mật khẩu, hash bằng Argon2id.
- Cấp access token JWT có thời hạn ngắn.
- Xác định `CurrentActor` từ bearer token ở mỗi request.
- Từ chối đăng nhập và vô hiệu hóa token hiện tại khi user có trạng thái `DISABLED`.
- Admin chỉ tạo, xem và khóa/mở tài khoản Designer; không truy cập Workspace.
- Designer chỉ thấy Workspace có membership `ACTIVE` và `can_view=true`.
- Designer nhập thông tin cơ bản của Customer khi tạo Workspace; Customer record, membership và review link được tạo trong cùng transaction.
- Customer không cần tài khoản; mở link, nhập username bất kỳ và nhận guest session bằng cookie HttpOnly.
- Chỉ Designer của Workspace có thể disable/rotate link; session của link cũ bị revoke ngay.
- Tạo Workspace và mở revision yêu cầu `Idempotency-Key`; quản lý review link yêu cầu `If-Match`.
- Designer có thể quản lý Draft dạng block có schema, đăng ký Asset và sắp xếp block.
- Asset chỉ thành `READY` khi có attestation từ dịch vụ upload và quét file tin cậy.
- Mọi mutation Draft dùng `If-Match`/`ETag` để chặn ghi đè khi revision đã thay đổi.
- Workspace đã approve hoặc khóa production có thể bắt đầu revision mới mà vẫn giữ các
  Version pointer lịch sử.
- Designer có thể release Draft thành Version bất biến và mở một Review Round cho Customer.
- Designer và Customer có guest session đều có thể đọc Version, Review Round và structured diff.
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
│   │   ├── dtos/                       # Kết quả use case độc lập transport
│   │   └── use_cases/                  # Một class execute() cho từng luồng nghiệp vụ
│   ├── infrastructure/
│   │   ├── database.py                 # Settings, engine và session factory
│   │   ├── models/                     # SQLAlchemy persistence models
│   │   ├── repositories/               # Cài đặt các domain interface
│   │   ├── security/                   # Argon2, JWT, review link và guest token
│   │   ├── di/                         # Composition/provider của use case
│   │   └── unit_of_work.py             # Transaction boundary cho command
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

- `ADMIN`: không được truy cập API Workspace.
- Designer không có membership hợp lệ: trả `404`.
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

Trước khi deploy, thay `AUTH_SECRET_KEY` và `REVIEW_LINK_SECRET_KEY` trong `.env` bằng hai secret
ngẫu nhiên khác nhau, mỗi secret có tối thiểu 32 ký tự; đồng thời bật
`GUEST_SESSION_COOKIE_SECURE=true` khi chạy HTTPS.

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

Customer không có tài khoản đăng nhập trong luồng MVP. Customer dùng review link và nhập username
khi tạo guest session. Các credential trên chỉ phục vụ local development và được tạo bởi
`scripts/seed_demo.sql`.

## API hiện có

| Method | Endpoint | Authentication | Mô tả |
| --- | --- | --- | --- |
| `GET` | `/health` | Không | Kiểm tra API đang hoạt động |
| `POST` | `/api/v1/auth/login` | Không | Đăng nhập và nhận access token |
| `GET` | `/api/v1/auth/me` | Bearer token | Lấy thông tin CurrentActor |
| `POST` | `/api/v1/admin/designers` | Admin bearer token | Tạo tài khoản Designer |
| `GET` | `/api/v1/admin/designers` | Admin bearer token | Danh sách tài khoản Designer |
| `PATCH` | `/api/v1/admin/designers/{designer_id}/status` | Admin bearer token | Khóa/mở tài khoản Designer |
| `POST` | `/api/v1/workspaces` | Designer bearer token + `Idempotency-Key` | Tạo Customer, Workspace và review link |
| `GET` | `/api/v1/workspaces` | Bearer token | Danh sách Workspace được phép xem |
| `GET` | `/api/v1/workspaces/{workspace_id}` | Bearer token | Chi tiết Workspace và permission |
| `GET` | `/api/v1/workspaces/{workspace_id}/draft` | Designer bearer token | Đọc Workspace và các specification block |
| `PUT` | `/api/v1/workspaces/{workspace_id}/blocks/{block_id}` | Designer bearer token + `If-Match` | Tạo mới hoặc thay toàn bộ một Draft block |
| `DELETE` | `/api/v1/workspaces/{workspace_id}/blocks/{block_id}` | Designer bearer token + `If-Match` | Xóa Draft block |
| `PATCH` | `/api/v1/workspaces/{workspace_id}/blocks/order` | Designer bearer token + `If-Match` | Sắp xếp lại toàn bộ Draft block |
| `POST` | `/api/v1/workspaces/{workspace_id}/assets` | Designer bearer token + `If-Match` + asset attestation | Đăng ký metadata file đã upload và quét |
| `GET` | `/api/v1/workspaces/{workspace_id}/assets/{asset_id}` | Designer bearer token | Đọc metadata Asset trong Workspace |
| `POST` | `/api/v1/workspaces/{workspace_id}/revisions` | Designer bearer token + `If-Match` + `Idempotency-Key` | Mở Draft revision mới sau approval/production lock |
| `POST` | `/api/v1/workspaces/{workspace_id}/versions` | Designer bearer token + `If-Match` + `Idempotency-Key` | Release Draft và mở Review Round |
| `GET` | `/api/v1/workspaces/{workspace_id}/versions` | Designer bearer token hoặc guest cookie | Danh sách Version bất biến |
| `GET` | `/api/v1/workspaces/{workspace_id}/versions/{version_id}` | Designer bearer token hoặc guest cookie | Chi tiết snapshot của Version |
| `GET` | `/api/v1/workspaces/{workspace_id}/versions/{version_id}/diff` | Designer bearer token hoặc guest cookie | Structured diff với Version trước |
| `GET` | `/api/v1/workspaces/{workspace_id}/review-rounds/{review_round_id}` | Designer bearer token hoặc guest cookie | Chi tiết Review Round |
| `POST` | `/api/v1/workspaces/{workspace_id}/comments` | Designer bearer token hoặc guest cookie + `If-Match` | Tạo Comment theo Workspace, Version, block hoặc Change Request |
| `GET` | `/api/v1/workspaces/{workspace_id}/comments` | Designer bearer token hoặc guest cookie | Danh sách và lọc Comment |
| `POST` | `/api/v1/workspaces/{workspace_id}/versions/{version_id}/change-requests` | Guest cookie + `If-Match` + `Idempotency-Key` | Customer tạo Change Request trên exact Version |
| `GET` | `/api/v1/workspaces/{workspace_id}/change-requests` | Designer bearer token hoặc guest cookie | Danh sách Change Request |
| `GET` | `/api/v1/change-requests/{change_request_id}` | Designer bearer token hoặc guest cookie | Chi tiết Change Request |
| `POST` | `/api/v1/change-requests/{change_request_id}/acknowledge` | Designer bearer token + `If-Match` | Tiếp nhận Change Request |
| `POST` | `/api/v1/change-requests/{change_request_id}/reject` | Designer bearer token + `If-Match` | Từ chối Change Request kèm lý do |
| `POST` | `/api/v1/change-requests/{change_request_id}/mark-updated` | Designer bearer token + `If-Match` | Gắn Change Request với Version mới đã release |
| `POST` | `/api/v1/change-requests/{change_request_id}/confirm` | Guest cookie + `If-Match` | Xác nhận yêu cầu đã được xử lý |
| `POST` | `/api/v1/change-requests/{change_request_id}/reopen` | Guest cookie + `If-Match` | Mở lại và tạo Change Request con |
| `POST` | `/api/v1/change-requests/{change_request_id}/cancel` | Cookie của guest đã tạo + `If-Match` | Hủy Change Request của chính guest đó |
| `POST` | `/api/v1/workspaces/{workspace_id}/versions/{version_id}/request-changes` | Guest cookie + `If-Match` + `Idempotency-Key` | Đóng vòng review và đưa Workspace về Draft |
| `POST` | `/api/v1/workspaces/{workspace_id}/versions/{version_id}/approvals` | Guest cookie + `If-Match` + `Idempotency-Key` | Duyệt exact Version của Review Round đang mở |
| `POST` | `/api/v1/workspaces/{workspace_id}/versions/{version_id}/production-lock` | Designer bearer token + `If-Match` + `Idempotency-Key` | Khóa sản xuất exact Version đã duyệt |
| `GET` | `/api/v1/workspaces/{workspace_id}/production-snapshot` | Designer bearer token hoặc guest cookie | Đọc Version đã khóa sản xuất |
| `GET` | `/api/v1/workspaces/{workspace_id}/audit-events` | Designer bearer token | Lọc và phân trang lịch sử audit |
| `POST` | `/api/v1/workspaces/{workspace_id}/archive` | Designer bearer token + `If-Match` | Lưu trữ Workspace, bắt buộc nêu lý do |
| `POST` | `/api/v1/workspaces/{workspace_id}/restore` | Bearer token của Designer tạo Workspace + `If-Match` | Khôi phục Workspace đã lưu trữ |
| `POST` | `/api/v1/workspaces/{workspace_id}/cancel` | Designer bearer token + `If-Match` | Hủy Workspace chưa từng khóa sản xuất |
| `GET` | `/api/v1/workspaces/{workspace_id}/review-link` | Bearer token | Lấy active review link |
| `POST` | `/api/v1/workspaces/{workspace_id}/review-link/disable` | Bearer token + `If-Match` | Disable link và revoke session |
| `POST` | `/api/v1/workspaces/{workspace_id}/review-link/rotate` | Bearer token + `If-Match` | Cấp link mới cho cùng Workspace |
| `POST` | `/api/v1/guest/sessions` | Review token + username | Tạo guest session HttpOnly |
| `GET` | `/api/v1/guest/workspace` | Guest cookie | Customer đọc Workspace được link cấp |

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

Designer tạo Workspace và nhập thông tin cơ bản của Customer trong cùng request:

```http
POST /api/v1/workspaces
Authorization: Bearer <designer_access_token>
Idempotency-Key: create-workspace-<uuid>
Content-Type: application/json

{
  "customer": {
    "name": "Công ty Ánh Dương",
    "email": "contact@anhduong.example",
    "phone": "0901234567"
  },
  "product_type": "apparel"
}
```

Response trả về Workspace vừa tạo và `review_url` để Designer gửi cho Customer.

Khi đọc Draft, client lưu `ETag` từ response và gửi lại trong mọi request mutation:

```http
GET /api/v1/workspaces/<workspace_id>/draft
Authorization: Bearer <designer_access_token>

PUT /api/v1/workspaces/<workspace_id>/blocks/<client_generated_block_uuid>
Authorization: Bearer <designer_access_token>
If-Match: W/"0"
Content-Type: application/json

{
  "block_type": "dimension",
  "label": "Kích thước thành phẩm",
  "content": {"width": 30, "height": 20, "unit": "cm"},
  "position": 0,
  "schema_version": 1
}
```

Nếu Workspace đã đổi revision, API trả `412`; client phải tải lại Draft trước khi retry.
PUT cùng `block_id` và cùng payload có thể retry với ETag ngay trước lần ghi đầu tiên mà không
tăng revision hoặc tạo audit event thứ hai.

`POST /assets` yêu cầu header `X-Asset-Attestation`. Dịch vụ upload tin cậy chỉ cấp attestation
sau khi file đã upload, checksum/size/content type đã khớp và quét malware thành công. Header là
`<unix_timestamp>:<HMAC-SHA256 hex>` trên JSON canonical gồm `verified_at`, `workspace_id`,
`storage_key`, `content_type`, `size_bytes`, `checksum`, `result: "CLEAN"`; key là
`ASSET_ATTESTATION_SECRET_KEY`. Attestation hết hạn sau 15 phút. Trình duyệt không giữ secret này.
Môi trường production phải đặt secret riêng và triển khai dịch vụ upload/quét file để cấp header.

`POST /workspaces/{id}/revisions` cũng yêu cầu `If-Match` và `Idempotency-Key`.
Disable/rotate review link yêu cầu `If-Match` và trả ETag mới.

Release Version dùng cả revision và idempotency:

```http
POST /api/v1/workspaces/<workspace_id>/versions
Authorization: Bearer <designer_access_token>
If-Match: W/"3"
Idempotency-Key: release-<uuid>
```

Server canonicalize Draft, tính SHA-256 `content_hash`, tạo Version cùng Review Round trong một
transaction và chuyển Workspace sang `IN_REVIEW`. Retry với cùng `Idempotency-Key` không tạo
Version hoặc Outbox Message trùng.

Để gửi notification sau commit, cấu hình `NOTIFICATION_WEBHOOK_URL` và
`NOTIFICATION_WEBHOOK_SECRET_KEY`, rồi chạy worker riêng:

```bat
cd backend
uv run python -m proofprint.infrastructure.outbox
```

Worker gửi event theo cơ chế ít nhất một lần và retry lỗi. Webhook dùng
`X-ProofPrint-Event-ID` để khử trùng, và xác minh `X-ProofPrint-Signature` là HMAC-SHA256 của
raw request body. Worker không chạy trong tiến trình API.

Luồng Customer: lấy phần token ở cuối `review_url`, rồi tạo guest session:

```http
POST /api/v1/guest/sessions
Content-Type: application/json

{
  "review_token": "<token-cuối-review_url>",
  "username": "Khách hàng A"
}
```

Response sẽ đặt cookie HttpOnly. Trình duyệt tự gửi cookie đó khi gọi
`GET /api/v1/guest/workspace`; không dùng Bearer token cho Customer.

Trong Phase 3, Customer có thể tạo nhiều Change Request khi Review Round còn mở rồi mới bấm
Request Changes. Designer acknowledge các yêu cầu ở Draft, chỉnh nội dung, release Version mới và
mark từng yêu cầu là Updated. Customer phải gọi API đọc exact Version mới trước khi Confirm hoặc
Reopen. Admin không có quyền trên các endpoint Workspace, Comment hay Change Request.

Trong Phase 4, Approval chỉ nhận Version đang review và sẽ tự xác nhận các Change Request
`UPDATED` trỏ đúng Version đó. Production Lock chỉ nhận exact Version đã được duyệt.
Archive/Restore/Cancel tác động tới `record_status`, không làm mất Version, Approval hoặc Audit
History cũ. Admin vẫn chỉ quản lý tài khoản Designer.

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
- Phạm vi Workspace của Designer và Guest Reviewer.
- Admin bị tách khỏi phạm vi Workspace và chỉ quản lý tài khoản Designer.
- Phân biệt `403` và `404` theo authorization contract.
- Review link cố định, signed bằng HMAC và có thể rotate.
- Rotate link revoke mọi guest session của link cũ.
- Customer username được chuẩn hóa và guest session chỉ truy cập đúng một Workspace.
- Vòng đời Comment và Change Request, Request Changes, idempotency của guest và optimistic locking.
- Guest chỉ Confirm/Reopen sau khi đã xem Version xử lý tương ứng.
- Metadata của toàn bộ database schema.
- Dependency direction của Clean Architecture.
