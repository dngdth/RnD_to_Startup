# Mission Phase 4 cho hai thành viên dự án

## Bối cảnh và cách nhận việc

ProofPrint có ba actor: **Admin** chỉ quản lý tài khoản Designer; **Designer** tạo và quản lý Workspace; **Customer** mở review link, nhập username và thao tác bằng guest session cookie, không có tài khoản. Phase 3 (Comment, Change Request, Request Changes) là đầu vào của Phase 4.

Code nháp của các API Phase 4 bên dưới đã có trong working tree, nhưng **chưa commit và chưa được kiểm thử tích hợp với PostgreSQL**. Hai thành viên nhận nhiệm vụ **tiếp quản, rà soát, sửa lỗi và hoàn thiện** phần của mình, không viết lại API từ đầu. Trước khi hai bạn tạo branch/PR, người phụ trách repo cần đưa code nháp lên một nhánh chung để cả hai cùng lấy được. Không sửa migration cũ; nếu thật sự cần đổi schema, tạo migration mới sau `0007_phase3_collaboration`.

Quy ước chung cho mọi API ghi: actor lấy từ bearer token hoặc guest session cookie, không tin `actor_id`/username trong body; yêu cầu `If-Match: W/"<workspace_revision>"`; thành công tăng Workspace revision và trả `ETag` mới; revision cũ trả `412`; thay đổi trạng thái, Audit Event và Outbox Message phải nằm trong cùng transaction. Admin không được truy cập các API Workspace của hai mission.

## Mission 1 — Approval và Production Lock

**Người phụ trách:** Bạn 1  
**Mục tiêu:** Customer duyệt đúng Version đã xem xét; Designer khóa đúng Version đó để sản xuất. Version, Approval và lịch sử đã phát hành không bị sửa/xóa.

### API 1.1 — Customer duyệt Version

`POST /api/v1/workspaces/{workspace_id}/versions/{version_id}/approvals`

- **Ai gọi:** Customer có guest session cookie hợp lệ của chính Workspace. Customer không đăng nhập và không gửi `guest_session_id` hay username trong body.
- **Header bắt buộc:** `If-Match` và `Idempotency-Key`. Không cần body.
- **API làm gì:** Khóa Workspace trong transaction; kiểm tra Workspace `ACTIVE`, workflow `IN_REVIEW`, `version_id` đúng `latest_version_id` và Review Round của Version đang `OPEN`. Không cho duyệt nếu còn Change Request `REQUESTED`/`ACKNOWLEDGED` ở bất kỳ vòng nào. Change Request `UPDATED` phải có `resolved_in_version_id` đúng Version này; các yêu cầu đó được tự chuyển thành `CONFIRMED` trong cùng transaction. Tạo đúng **một** Approval cho Version, lưu snapshot username và phiên bản review link từ guest session; đóng Review Round thành `APPROVED`; chuyển Workspace thành `APPROVED`, đặt `approved_version_id`.
- **Kết quả:** `201`, `{ approval, workspace_revision }` và `ETag` mới. Ghi `VERSION_APPROVED` vào Audit và Outbox.
- **Retry:** Cùng guest, Workspace và `Idempotency-Key` trả lại kết quả đã lưu, không tạo Approval/Audit/Outbox thứ hai. Dùng lại key cho Version khác trả `409`. Database vẫn phải bảo vệ `UNIQUE(version_id)`.

### API 1.2 — Designer khóa Version để sản xuất

`POST /api/v1/workspaces/{workspace_id}/versions/{version_id}/production-lock`

- **Ai gọi:** Designer có membership của Workspace và `can_lock_production=true`; Admin và Customer không được gọi.
- **Header bắt buộc:** `If-Match` và `Idempotency-Key`. Không cần body.
- **API làm gì:** Khóa Workspace; kiểm tra record `ACTIVE`, workflow `APPROVED`, `approved_version_id == version_id` và tồn tại Approval của **exact Version**. Không tự chọn Version mới nhất. Đặt `production_version_id`, chuyển workflow sang `LOCKED_FOR_PRODUCTION`.
- **Kết quả:** `{ version, approval, workspace_revision }` và `ETag` mới. Ghi `PRODUCTION_LOCKED` vào Audit/Outbox, bao gồm ID của Version và Approval.
- **Retry:** Cùng key hoặc khóa lại đúng Version đã là Production Snapshot không được tạo event/trạng thái trùng. Version khác trả `409`; Workspace đã Archive/Cancel không được nhận lệnh mới.

### API 1.3 — Đọc Production Snapshot

`GET /api/v1/workspaces/{workspace_id}/production-snapshot`

- **Ai gọi:** Designer có `can_view` hoặc Customer có guest session của Workspace; Admin không được đọc.
- **API làm gì:** Trả về nội dung bất biến của `production_version_id` kèm Approval tương ứng. Đây là bản dùng cho sản xuất, **không mặc định lấy `latest_version_id`**. Sau `Start Revision`, snapshot đã khóa trước đó vẫn đọc được.
- **Kết quả:** `{ version, approval, workspace_revision }`; nếu chưa từng khóa sản xuất thì `404`.

### Việc Bạn 1 phải hoàn thành

1. Rà soát [use case Approval/Lock](../backend/src/proofprint/application/use_cases/manage_approvals.py), [repository](../backend/src/proofprint/infrastructure/repositories/approval_production.py), [router](../backend/src/proofprint/presentation/api/routers/approval_production.py) và schema response; sửa mọi chỗ sai contract phía trên.
2. Thêm integration test PostgreSQL cho luồng `Release → Approve → Production Lock → Start Revision → đọc Production Snapshot cũ` và cho trường hợp Approve cạnh tranh với Request Changes: chỉ một quyết định thắng.
3. Kiểm tra rollback không để Approval, trạng thái Review Round, CR tự confirm, Audit hoặc Outbox dở dang. Kiểm tra retry cùng/different idempotency key, Version sai, ETag cũ, thiếu quyền và guest session sai Workspace.
4. Bàn giao một PR chỉ cho phạm vi Mission 1, kèm lệnh chạy test và kết quả. Không đổi nghiệp vụ Admin/Designer/Customer.

**Đạt khi:** Các điều kiện trên có test tự động, test PostgreSQL chạy thành công, OpenAPI hiển thị đủ 3 endpoint, không có hai Approval cho một Version và Production Snapshot luôn trỏ đúng Version đã duyệt.

## Mission 2 — Audit và trạng thái vận hành Workspace

**Người phụ trách:** Bạn 2  
**Mục tiêu:** Designer xem được lịch sử thao tác và quản lý trạng thái `ACTIVE`/`ARCHIVED`/`CANCELLED` mà không làm mất dữ liệu Version, Approval hoặc Audit.

### API 2.1 — Xem Audit History

`GET /api/v1/workspaces/{workspace_id}/audit-events`

- **Ai gọi:** Designer có membership `ACTIVE` và `can_view`; Admin/Customer không được đọc API này.
- **Query:** `limit` (mặc định 50, tối đa 100), `offset`, tùy chọn `event_type`, `entity_type`, `actor_id`, `guest_session_id`, `created_from`, `created_to`.
- **API làm gì:** Chỉ lấy event của đúng Workspace, lọc theo query, sắp xếp ổn định theo `created_at DESC, id DESC`. Không cho người ngoài suy đoán dữ liệu Workspace.
- **Kết quả:** `{ items, total, limit, offset }`; mỗi event gồm actor hoặc guest session, loại event, entity, Version liên quan, metadata và thời gian. Audit là append-only.

### API 2.2 — Archive Workspace

`POST /api/v1/workspaces/{workspace_id}/archive`

- **Ai gọi:** Designer có `can_edit` trên Workspace.
- **Header/body:** `If-Match`; body `{ "reason": "Lý do lưu trữ" }` (3–500 ký tự sau khi trim).
- **API làm gì:** Chỉ cho phép khi `record_status=ACTIVE`; đổi thành `ARCHIVED` ở **bất kỳ workflow status** nào. Không đổi workflow status, Version hay Approval. Workspace đã Archive chỉ được đọc/audit hoặc Restore, các command nghiệp vụ khác bị từ chối.
- **Kết quả:** Workspace mới, `revision`/`ETag` mới; Audit/Outbox `WORKSPACE_ARCHIVED` có lý do.

### API 2.3 — Restore Workspace

`POST /api/v1/workspaces/{workspace_id}/restore`

- **Ai gọi:** Chính Designer đã tạo Workspace (`created_by`), vẫn có membership active và `can_view`.
- **Header/body:** `If-Match`; body `{ "reason": "..." }` tùy chọn.
- **API làm gì:** Chỉ `ARCHIVED → ACTIVE`, giữ nguyên workflow status, Version và Approval. Không Restore Workspace `CANCELLED`.
- **Kết quả:** Workspace mới, `revision`/`ETag` mới; Audit/Outbox `WORKSPACE_RESTORED`.

### API 2.4 — Cancel Workspace

`POST /api/v1/workspaces/{workspace_id}/cancel`

- **Ai gọi:** Designer có `can_edit`.
- **Header/body:** `If-Match`; body `{ "reason": "..." }` tùy chọn.
- **API làm gì:** Chỉ cho phép khi record đang `ACTIVE` và Workspace **chưa từng** Production Lock (`production_version_id` phải null), kể cả sau khi đã Start Revision quay về Draft. Đổi record thành `CANCELLED`; đây là trạng thái cuối, không Restore trong MVP. Không hard-delete dữ liệu.
- **Kết quả:** Workspace mới, `revision`/`ETag` mới; Audit/Outbox `WORKSPACE_CANCELLED`.

### Việc Bạn 2 phải hoàn thành

1. Rà soát [use case vòng đời](../backend/src/proofprint/application/use_cases/manage_workspace_lifecycle.py), [repository](../backend/src/proofprint/infrastructure/repositories/workspace_lifecycle.py), [router](../backend/src/proofprint/presentation/api/routers/workspace_lifecycle.py) và schema response.
2. Thêm integration test PostgreSQL cho Archive/Restore/Cancel và Audit pagination/filter. Chứng minh Workspace khác không thể đọc/chỉnh sửa; Admin không có quyền.
3. Kiểm tra `If-Match` cũ trả `412`, trạng thái không hợp lệ trả `409`, Restore không đổi workflow, Cancel sau Production Lock bị chặn, và transaction rollback không để trạng thái/Audit/Outbox lệch nhau.
4. Bàn giao một PR chỉ cho phạm vi Mission 2, kèm lệnh chạy test và kết quả.

**Đạt khi:** Các điều kiện trên có test tự động, test PostgreSQL chạy thành công, OpenAPI hiển thị đủ 4 endpoint, Audit có phân trang/lọc đúng và các trạng thái cuối không thể bị sửa trái nghiệp vụ.

## Ranh giới phối hợp và checklist chung

- Bạn 1 sở hữu module `approval_production`/`manage_approvals`; Bạn 2 sở hữu module `workspace_lifecycle`/`manage_workspace_lifecycle`. Các file dùng chung như router trung tâm, model chung và migration cần trao đổi trước khi sửa để tránh xung đột.
- Hai PR đều cần chạy `ruff check src tests alembic`, `pytest -q`, `alembic check` với PostgreSQL đang hoạt động, và nêu rõ kết quả. Hiện unit test toàn repo đạt `73 passed`; con số này chỉ là mốc xuất phát, không thay thế integration test.
- Reviewer đối chiếu với [domain contract](proofprint_domain_contract.md), đặc biệt là quyền actor, exact Version, optimistic concurrency, idempotency và audit/outbox transaction.
- Không đưa Phase 5 AI Summary, frontend hay gửi email/Zalo vào hai mission này.
