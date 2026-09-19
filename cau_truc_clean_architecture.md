# Clean Architecture của ProofPrint

Backend dùng cấu trúc **layer-first**, tham khảo cách tổ chức của `dut-ai-quiz`: domain và
application nằm ở lõi; database, bảo mật và FastAPI là adapter ở vòng ngoài.

## Cây thư mục

```text
backend/src/proofprint/
├── domain/
│   ├── entities/                 # Entity, value/enum thuần Python
│   ├── interfaces/               # Protocol mà application cần
│   └── exceptions.py             # Lỗi nghiệp vụ độc lập transport
├── application/
│   ├── dtos/                     # Dữ liệu trả về độc lập FastAPI/Pydantic
│   └── use_cases/                # Một class execute() cho mỗi luồng
├── infrastructure/
│   ├── models/                   # SQLAlchemy persistence model
│   ├── repositories/             # Adapter triển khai domain interface
│   ├── security/                 # Argon2, JWT, HMAC review link và guest token
│   ├── di/                       # Provider lắp repository vào use case
│   ├── unit_of_work.py           # Một transaction cho một use case ghi
│   └── database.py               # Settings, engine, session
├── presentation/
│   ├── api/
│   │   ├── routers/              # FastAPI endpoint
│   │   ├── dependencies.py       # Dependency theo request
│   │   ├── errors.py             # Domain/application error → HTTP
│   │   └── router.py             # Router /api/v1
│   └── schemas/                  # Pydantic request/response DTO
└── main.py                       # Composition root cấp ứng dụng
```

## Dependency rule

```text
presentation ──► application ──► domain
      │                              ▲
      └────────► infrastructure ─────┘
```

- `domain` chỉ dùng standard library và code trong `domain`.
- `application` chỉ phụ thuộc `domain`; không biết FastAPI, Pydantic, SQLAlchemy, JWT hay Argon2.
- `infrastructure` triển khai interface do `domain` sở hữu.
- `presentation` chuyển HTTP input thành lời gọi use case và domain output thành response DTO.
- `main.py` chỉ tạo app, gắn router và error handler.

`backend/tests/test_architecture.py` quét AST để chặn import sai chiều trong hai layer lõi.

## Các use case hiện tại

| Use case | Trách nhiệm |
| --- | --- |
| `AuthenticateUser` | Chuẩn hóa email, kiểm tra password/status và phát hành access token |
| `ResolveCurrentActor` | Giải mã token, tải user hiện tại và từ chối user đã bị disable |
| `ListWorkspaces` | Admin thấy tất cả; user khác chỉ thấy workspace trong scope |
| `GetWorkspace` | Áp dụng quy tắc `404` ngoài scope và `403` khi thiếu `can_view` |
| `CreateWorkspace` | Tạo workspace, Designer membership, review link và audit trong một transaction |
| `ReviewLinkManager` | Xem, disable hoặc rotate link; rotate revoke toàn bộ guest session cũ |
| `CreateGuestSession` | Kiểm tra review link, chuẩn hóa email và tạo cookie session cho Customer |
| `ResolveGuestSession` | Xác thực token trong cookie, trạng thái session và trạng thái link hiện tại |
| `GetGuestWorkspace` | Chỉ trả workspace đúng với phạm vi của Guest Principal |

Các use case đều nhận dependency qua constructor và có phương thức `execute()`. Vì vậy unit test
có thể truyền repository trong bộ nhớ mà không cần khởi động PostgreSQL hay FastAPI.

## Luồng request

Đăng nhập:

```text
POST /api/v1/auth/login
  → authentication router
  → AuthenticateUser.execute()
  → AuthenticationRepository + PasswordVerifier + AccessTokenCodec
  → TokenResponse
```

Đọc workspace:

```text
GET /api/v1/workspaces/{id}
  → bearer dependency
  → ResolveCurrentActor.execute()
  → GetWorkspace.execute()
  → WorkspaceAccessRepository
  → WorkspaceResponse
```

Customer mở review link:

```text
POST /api/v1/guest/sessions { review_token, email }
  → CreateGuestSession.execute()
  → kiểm tra workspace_review_links đang ACTIVE
  → lưu hash token trong workspace_guest_sessions
  → trả cookie HttpOnly proofprint_guest_session

GET /api/v1/guest/workspace
  → ResolveGuestSession.execute()
  → kiểm tra session chưa hết hạn/revoke và link vẫn ACTIVE
  → GetGuestWorkspace.execute()
  → chỉ trả đúng workspace gắn với session
```

Review URL không chứa trạng thái đăng nhập của Customer. Token link được ký HMAC và cố định trong
suốt một phiên bản link; guest token chỉ xuất hiện một lần ở cookie, database chỉ lưu SHA-256 hash.
Khi Designer/Admin rotate link, link cũ và tất cả session phát sinh từ nó mất hiệu lực ngay.

## Cách thêm tính năng

Với nghiệp vụ `submit_review`, triển khai theo thứ tự:

1. Thêm entity/rule vào `domain/entities` và interface cần thiết vào `domain/interfaces`.
2. Thêm `application/use_cases/submit_review.py`, nhận interface qua constructor.
3. Viết unit test cho use case bằng fake/in-memory adapter.
4. Cài đặt interface trong `infrastructure/repositories` hoặc adapter phù hợp.
5. Đăng ký provider trong `infrastructure/di`.
6. Thêm Pydantic schema và FastAPI router trong `presentation`.
7. Đăng ký router tại `presentation/api/router.py`.
8. Nếu schema database đổi, thêm Alembic migration và chạy toàn bộ test.

Không đưa business rule vào router hoặc SQLAlchemy model. Không tạo `BaseService` CRUD chung nếu
nó làm mất tên và invariant của nghiệp vụ.
