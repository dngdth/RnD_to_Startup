# Cấu trúc Clean Architecture của ProofPrint

Tài liệu này giải thích **cấu trúc backend hiện tại** của dự án. Backend đang làm mẫu cho sản phẩm thiết kế quần áo, nhưng `product_type` và loại `SpecificationBlock` được để mở để sau này hỗ trợ sản phẩm khác.

## Nhìn nhanh toàn bộ thư mục

```text
backend/
├── src/proofprint/
│   ├── domain/
│   │   ├── entities.py           # Dữ liệu nghiệp vụ và các quy tắc cốt lõi
│   │   ├── errors.py             # Các lỗi nghiệp vụ
│   │   └── repositories.py       # Hợp đồng đọc/ghi OrderWorkspace
│   ├── application/
│   │   └── orders.py             # Các thao tác mà hệ thống cho phép thực hiện
│   ├── infrastructure/
│   │   ├── database.py           # Cấu hình và kết nối PostgreSQL
│   │   ├── models.py             # Cách các đối tượng được lưu thành bảng
│   │   └── order_repository.py   # Code đọc/ghi order bằng SQLAlchemy
│   ├── presentation/
│   │   ├── api.py                # API, dữ liệu request/response, mã lỗi HTTP
│   │   └── dependencies.py       # Khai báo route cần OrderService
│   └── main.py                   # Tạo FastAPI app và nối các lớp với nhau
├── alembic/
│   ├── env.py                    # Cấu hình chạy migration
│   └── versions/0001_initial.py # Migration tạo các bảng đầu tiên
├── tests/
│   ├── test_order_domain.py      # Kiểm tra quy tắc nghiệp vụ
│   └── test_order_api.py         # Kiểm tra luồng API bằng repository trong bộ nhớ
├── .env.example                  # Mẫu cấu hình DATABASE_URL
├── compose.yaml                  # PostgreSQL local bằng Docker Compose
├── pyproject.toml                # Thông tin package, dependency và công cụ dev
├── uv.lock                       # Phiên bản dependency đã được khóa
└── alembic.ini                   # Cấu hình lệnh Alembic
```

Các file `__init__.py` đánh dấu thư mục Python package; hiện chúng không chứa luồng nghiệp vụ riêng. `.gitignore` loại `.env`, `.venv` và các file cache khỏi Git.

## Ý tưởng chính của Clean Architecture

Hãy hình dung hệ thống có một **lõi nghiệp vụ** ở giữa. Quy tắc như “không được duyệt version cũ” phải đúng dù sau này ta đổi FastAPI, đổi cách lưu dữ liệu hay thêm giao diện mới.

```text
HTTP request
    ↓
presentation (nhận request, trả response)
    ↓
application  (điều phối một thao tác)
    ↓
domain       (quyết định thao tác có hợp lệ không)

infrastructure (PostgreSQL) thực hiện hợp đồng đọc/ghi mà domain định nghĩa.
main.py nối các thành phần lúc ứng dụng khởi động.
```

**Chiều phụ thuộc của code đi về phía lõi:** `domain` không import FastAPI hay SQLAlchemy. `application` dùng `domain`. `infrastructure` dùng `domain` để chuyển đổi dữ liệu. `presentation` gọi `application`. Nhờ vậy, business rule không bị trộn vào route HTTP hoặc câu lệnh SQL.

## `domain/` — nghiệp vụ là gì và luật nào phải đúng?

`entities.py` chứa các đối tượng nghiệp vụ, không phải bảng database:

| Thành phần | Ý nghĩa trong dự án |
| --- | --- |
| `OrderWorkspace` | Một đơn hàng đang được làm việc. Nó quản lý block hiện tại, các version đã phát hành, approval, trạng thái và version dùng để sản xuất. Đây là **aggregate root**: các thao tác quan trọng của order đi qua nó. |
| `SpecificationBlock` | Một phần thông tin của sản phẩm, ví dụ vùng in logo sau áo. `block_type`, `label`, `content`, `position` giúp biểu diễn nhiều loại thông số. |
| `SpecificationVersion` | Bản chụp specification tại lúc phát hành. Nội dung được tách khỏi bản đang chỉnh sửa để sửa sau này không làm đổi version cũ. |
| `Approval` | Ghi lại ai duyệt, duyệt version nào và vào lúc nào. |
| `OrderStatus` | Những trạng thái hiện có: `draft`, `in_review`, `approved`, `locked_for_production`. |

Business rule nằm trong các phương thức của `OrderWorkspace`. Ví dụ, `publish_version()` yêu cầu có ít nhất một block và không tạo bản mới nếu nội dung không đổi; `approve()` chỉ nhận version mới nhất đang chờ duyệt; `lock_for_production()` chỉ chạy sau khi version mới nhất đã được duyệt. `put_block()` đưa order về `draft` để chuẩn bị vòng sửa mới, nhưng vẫn giữ `production_version_id` cũ cho đến khi bản mới được duyệt và khóa.

`errors.py` đặt tên cho các lỗi nghiệp vụ như `InvalidState` và `StaleVersion`. Nhờ đó code gọi domain biết *vì sao* thao tác bị từ chối. `repositories.py` khai báo `OrderRepository` với hai việc `get()` và `save()`: domain/application biết **cần** đọc ghi order, nhưng không cần biết **đọc ghi bằng PostgreSQL như thế nào**.

## `application/` — thực hiện một use case

`orders.py` chứa `OrderService`, nơi gom các thao tác như tạo order, thêm/sửa block, phát hành version, duyệt và khóa sản xuất. Mỗi phương thức thường làm ba bước: lấy order qua `OrderRepository`, gọi phương thức domain để áp dụng business rule, rồi lưu lại. Ví dụ `OrderService.approve()` tìm order, gọi `order.approve(...)`, sau đó `save(order)`.

Lớp này là cầu nối giữa yêu cầu từ bên ngoài và domain. Nó không tự viết SQL và không quyết định mã HTTP `200`, `404` hay `409`.

## `infrastructure/` — kết nối và lưu dữ liệu thật

`database.py` đọc `DATABASE_URL` từ `.env`/biến môi trường, tạo SQLAlchemy engine và session. `get_session()` cấp một session cho mỗi lần xử lý request.

`models.py` định nghĩa các bảng PostgreSQL: `order_workspaces`, `specification_blocks`, `specification_versions`, `approvals`. Đây là **ORM model**, tức hình dạng dữ liệu khi lưu trong database. Nó khác với **domain entity** trong `entities.py`, là hình dạng dùng để diễn đạt nghiệp vụ. Ví dụ `VersionRow.snapshot` được lưu dưới dạng `JSONB`, còn `SpecificationVersion` dùng snapshot để kiểm tra và trả lại một bản nội dung độc lập.

`order_repository.py` chứa `SqlAlchemyOrderRepository`, phần triển khai thật của hợp đồng `OrderRepository`. `get()` đọc các row và dựng lại `OrderWorkspace`; `save()` chuyển dữ liệu từ domain sang row rồi commit. Adapter này thêm version và approval mới, không cập nhật lại nội dung của version/approval đã lưu. Đây là cách code hiện tại bảo vệ lịch sử qua đường ghi của ứng dụng; chưa có cơ chế database chặn một người sửa trực tiếp các row lịch sử bằng SQL.

## `presentation/` và `main.py` — đưa nghiệp vụ ra API

`api.py` khai báo các route FastAPI như `POST /api/v1/orders`, `PUT /api/v1/orders/{order_id}/blocks/{block_id}` và `POST /api/v1/orders/{order_id}/versions`. Các class request kiểm tra dữ liệu đầu vào. Các hàm `order_view()`/`version_view()` đổi kết quả domain thành dữ liệu trả về. Lỗi `OrderNotFound` thành HTTP `404`; lỗi sai trạng thái hoặc duyệt version cũ thành `409`.

`dependencies.py` chỉ khai báo rằng route cần một `OrderService`. `main.py` là nơi **lắp ráp**: tạo FastAPI app, gắn router, tạo `OrderService` với `SqlAlchemyOrderRepository` và session PostgreSQL, rồi đăng ký bộ xử lý lỗi. Cách này cho phép test API thay repository PostgreSQL bằng repository trong bộ nhớ mà không phải sửa route.

## Một request đi qua các lớp như thế nào?

Ví dụ shop sửa kích thước logo sau áo từ `25 × 18 cm` thành `20 × 15 cm`:

1. Frontend gửi `PUT /api/v1/orders/{order_id}/blocks/{block_id}` với nội dung mới.
2. `presentation/api.py` kiểm tra request và gọi `OrderService.put_block()`.
3. `application/orders.py` lấy order qua `OrderRepository`.
4. `infrastructure/order_repository.py` đọc PostgreSQL, dựng thành `OrderWorkspace`.
5. `OrderWorkspace.put_block()` thay block đang chỉnh sửa và chuyển trạng thái về `draft`. Version đã phát hành trước đó không bị sửa.
6. Repository lưu block/trạng thái mới xuống PostgreSQL; API trả kết quả cho frontend.

Sau đó shop gọi API phát hành version. Domain chụp toàn bộ các block thành một `SpecificationVersion` mới. Khách duyệt **đúng ID của version này**, rồi shop khóa nó để `production_version_id` trỏ tới bản sản xuất mới.

## Những file hỗ trợ và phạm vi hiện tại

`alembic/` và `alembic.ini` quản lý thay đổi cấu trúc database theo từng migration; `0001_initial.py` tạo bốn bảng đầu tiên. `compose.yaml` chạy PostgreSQL local. `pyproject.toml` và `uv.lock` giúp cài đúng dependency. `.env.example` cho biết biến môi trường cần có, còn `.env` thật không được đưa lên Git.

`test_order_domain.py` kiểm tra version cũ không đổi, không được duyệt version cũ, phải duyệt trước khi khóa. `test_order_api.py` kiểm tra các route và mã lỗi bằng repository trong bộ nhớ, nên không cần khởi động PostgreSQL để chạy hai file test này.

Đây là bộ khung ban đầu. Các phần trong brief như change request, diff, AI summary, upload asset, đăng nhập/phân quyền và audit đầy đủ **chưa có code triển khai**. Khi thêm chức năng, nên đặt business rule vào `domain`, use case vào `application`, phần database vào `infrastructure`, và endpoint vào `presentation`.
