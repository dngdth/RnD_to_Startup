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
│   └── use_cases/                # Một class execute() cho mỗi luồng
├── infrastructure/
│   ├── models/                   # SQLAlchemy persistence model
│   ├── repositories/             # Adapter triển khai domain interface
│   ├── security/                 # Argon2 và JWT adapter
│   ├── di/                       # Provider lắp repository vào use case
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
