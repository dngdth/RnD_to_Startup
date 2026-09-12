# ProofPrint

Backend Python mẫu cho workspace quản lý specification và approval của sản phẩm làm theo yêu cầu. Giai đoạn đầu dùng ví dụ in trên áo; `product_type` và `SpecificationBlock.block_type` có thể mở rộng cho loại sản phẩm khác.

## Cấu trúc

```text
backend/
  src/proofprint/
    domain/          # Entity, value object, business rule, repository port
    application/     # Use case; chỉ phụ thuộc domain
    infrastructure/  # SQLAlchemy, PostgreSQL, repository adapter
    presentation/    # Route, HTTP request/response và dependency contract
    main.py          # Composition root: tạo app và nối dependency với adapter SQLAlchemy
  alembic/           # Migration schema PostgreSQL
  tests/             # Test business rule và luồng API với repository trong bộ nhớ
```

`OrderWorkspace` là aggregate root. Một order có các block specification đang chỉnh sửa, các `SpecificationVersion` là snapshot đã phát hành, và các `Approval` gắn đúng một version. Sửa draft sau khi khóa sản xuất không làm thay đổi snapshot cũ. Một version mới phải được duyệt trước khi thành bản sản xuất mới.

## Chạy local

Yêu cầu Python 3.12+, Docker, Docker Compose và `uv`. Nếu Uvicorn vẫn chạy từ lần thử trước, nhấn `Ctrl+C` để dừng trước. Chạy các lệnh sau trong Command Prompt (CMD) từ thư mục gốc của dự án. `uv sync` tự tạo/cập nhật `.venv`, không cần tạo lại môi trường đang active hoặc cài qua `pip`:

```bat
cd backend
if not exist .env copy .env.example .env
uv sync --extra dev
docker compose up -d db
uv run alembic upgrade head
uv run uvicorn proofprint.main:app --reload
```

PostgreSQL được ánh xạ ra cổng `55432` trên máy, tránh xung đột với PostgreSQL khác ở cổng `5432`. Nếu đã có `.env` từ cấu hình cũ, sửa `DATABASE_URL` thành `postgresql+psycopg://proofprint:proofprint@127.0.0.1:55432/proofprint` trước khi chạy Alembic. API docs: <http://localhost:8000/docs>. `GET /health` chỉ kiểm tra tiến trình API; `/` không có route nên trả về 404.

## Luồng API mẫu

1. `POST /api/v1/orders` với `{"customer_id":"<UUID>","product_type":"apparel"}`.
2. `PUT /api/v1/orders/{order_id}/blocks/{block_id}` với `{"block_type":"print_area","label":"Logo sau","content":{"width_cm":25,"height_cm":18},"position":0}`. Client tự tạo UUID cho `block_id` để thao tác này có thể lặp lại.
3. `POST /api/v1/orders/{order_id}/versions` để phát hành snapshot và nhận `version_id`.
4. `POST /api/v1/orders/{order_id}/versions/{version_id}/approve` với `{"approver_id":"<UUID>"}`.
5. `POST /api/v1/orders/{order_id}/production-lock` để chọn version đã duyệt làm production snapshot.
6. `GET /api/v1/orders/{order_id}` để xem trạng thái, block hiện tại, lịch sử version, approval và `production_version_id`. `GET /api/v1/orders/{order_id}/versions/{version_id}` trả về snapshot đã phát hành để khách xem trước khi duyệt. `GET /api/v1/orders/{order_id}/production-snapshot` trả về bản đang được khóa để sản xuất.

Từ thư mục `backend`, chạy test domain và API (API dùng repository trong bộ nhớ, không cần PostgreSQL):

```bat
uv run python -m unittest discover -s tests -v
```

Đây là lát cắt kỹ thuật đầu tiên để review kiến trúc và domain. Chưa có đăng nhập/phân quyền, change request, diff, AI summary, upload asset hoặc audit đầy đủ; không nên mở API này ra Internet trước khi thêm xác thực và kiểm soát quyền.
