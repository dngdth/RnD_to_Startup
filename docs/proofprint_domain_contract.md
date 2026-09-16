# ProofPrint Domain Contract

| Thuộc tính | Giá trị |
| --- | --- |
| Phiên bản | 1.0 |
| Trạng thái | Đã chốt 4 quyết định nghiệp vụ cốt lõi; chờ phê duyệt các mục kỹ thuật còn lại |
| Phạm vi áp dụng | ProofPrint MVP |
| Cập nhật lần cuối | 2026-09-16 |

## 0. Quyết định nghiệp vụ đã chốt

Ngày 2026-09-16, chủ dự án đã chốt các quyết định sau cho MVP:

1. Mỗi Specification Version chỉ cần một Customer Approval.
2. Comment và Change Request là hai chức năng riêng.
3. Customer có thể tạo nhiều Change Request trong một Review Round, sau đó mới gửi một quyết định Request Changes cho toàn bộ các CR đang `REQUESTED` trong vòng review đó.
4. Production Lock luôn chỉ định và kiểm tra exact `version_id`; không tự chọn Version mới nhất.

Mọi thay đổi đối với bốn quyết định này phải đi qua quy trình thay đổi tài liệu tại mục 24.

## 1. Mục đích tài liệu

Tài liệu này là nguồn thống nhất cho Product, Backend, Frontend, QA và Designer trước khi mở rộng API ProofPrint. Mọi API, migration, test và giao diện liên quan đến Order Workspace phải tuân theo các quyết định trong tài liệu này.

Khi tài liệu use case, code hiện tại và mô tả trên giao diện khác nhau, thứ tự ưu tiên là:

1. Domain Contract này sau khi team phê duyệt.
2. Acceptance criteria đã được cập nhật theo Domain Contract.
3. OpenAPI contract.
4. Code triển khai.

Không dùng UI, Zalo, AI summary hoặc request body từ client làm nguồn quyết định nghiệp vụ.

## 2. Phạm vi MVP

MVP giải quyết việc thống nhất specification của một sản phẩm làm theo yêu cầu, review theo version, ghi nhận yêu cầu thay đổi, phê duyệt đúng version và khóa version dùng cho sản xuất.

Luồng chính:

```text
Tạo Workspace
    -> Soạn Draft Specification
    -> Release Version
    -> Customer Review
        -> Approve
            -> Production Lock
        -> Request Changes
            -> Sửa Draft
            -> Release Version mới
            -> Review lại
```

Trong phạm vi MVP:

- Quản lý Customer và phạm vi Designer được phân công.
- Quản lý quyền truy cập theo Workspace.
- Specification Block có dữ liệu có cấu trúc.
- Version là snapshot bất biến.
- Customer có thể tạo nhiều Change Request trong một vòng review.
- Customer chọn một trong hai quyết định review: Approve hoặc Request Changes.
- Production Lock luôn tham chiếu một exact Version đã được approve.
- Mọi thay đổi quan trọng được ghi Audit Event.
- File và ảnh được quản lý bằng Asset, không nhúng binary trực tiếp trong JSON block.

Ngoài phạm vi MVP đầu tiên:

- AI tự quyết định nội dung, approve hoặc chỉnh sửa specification.
- Thanh toán, vận chuyển, tồn kho và quản lý tiến độ sản xuất.
- Chat thời gian thực.
- Nhiều cấp phê duyệt phức tạp.
- Tích hợp Zalo hai chiều. Zalo chỉ có thể nhận notification và link về ProofPrint.
- Trạng thái `COMPLETED` của đơn hàng sản xuất.

Workspace vẫn cần `record_status` để vận hành: `ACTIVE`, `ARCHIVED`, `CANCELLED`. Đây không phải trạng thái review.

## 3. Thuật ngữ thống nhất

| Thuật ngữ | Định nghĩa |
| --- | --- |
| Customer | Tổ chức hoặc cá nhân đặt sản phẩm. Một Customer có thể có nhiều tài khoản người dùng. |
| User | Tài khoản đăng nhập, mang system role và danh tính actor. |
| Designer | User phụ trách Customer và chỉnh sửa specification. |
| Admin | User quản lý tài khoản, phân công và có quyền hỗ trợ hệ thống. |
| Order Workspace | Không gian làm việc của một đơn hàng và là nơi giữ workflow hiện tại. |
| Draft Specification | Tập các Specification Block đang được phép chỉnh sửa. |
| Specification Block | Một đơn vị thông tin có cấu trúc như kích thước, màu, số lượng hoặc asset. |
| Specification Version | Snapshot bất biến của toàn bộ Draft Specification tại lúc release. |
| Review Round | Một vòng Customer review cho đúng một Version. |
| Comment | Trao đổi thông tin, không tự động thay đổi workflow. |
| Change Request | Yêu cầu thay đổi có cấu trúc, gắn với Review Round, Version và Block. |
| Approval | Bằng chứng một Customer reviewer đã approve exact Version. |
| Production Snapshot | Version đã được approve và được Production Lock. |
| Audit Event | Bản ghi append-only về actor, hành động, đối tượng và thời điểm. |
| Asset | Metadata của file hoặc ảnh được lưu bên ngoài database hoặc object storage. |

Không dùng lẫn `Order`, `Workspace`, `Specification` và `Version` như cùng một đối tượng.

## 4. Actor và mô hình quyền

### 4.1 System role

Mỗi User có một system role chính:

- `ADMIN`
- `DESIGNER`
- `CUSTOMER`

System role không tự cấp quyền vào mọi Workspace. Quyền truy cập tài nguyên phải dựa thêm vào membership hoặc assignment.

### 4.2 Quan hệ dữ liệu quyền

- Customer user phải thuộc một Customer thông qua `customer_users`.
- Designer chỉ quản lý Customer nằm trong `designer_customer_assignments`.
- User chỉ truy cập Workspace khi có `workspace_membership` đang active, trừ Admin có quyền hỗ trợ hệ thống.
- Khi Designer tạo Workspace cho Customer được phân công, hệ thống tự tạo membership cho Designer.
- Customer reviewer phải được mời vào Workspace và có `can_review=true`.
- Chỉ Customer reviewer có `can_approve=true` mới được approve.
- Chỉ Designer member có `can_edit=true` mới được sửa Draft.
- Designer hoặc Admin có `can_lock_production=true` mới được Production Lock.

### 4.3 Nguồn actor

Actor luôn được lấy từ access token hoặc session đã xác thực.

Không nhận các trường sau từ request body để quyết định actor:

- `approver_id`
- `created_by`
- `updated_by`
- `designer_id` của hành động hiện tại
- `locked_by`

Nếu API cần gán một User khác vào Workspace, đó phải là use case quản trị riêng và phải kiểm tra permission.

### 4.4 Quy tắc che giấu tài nguyên

- Chưa đăng nhập hoặc token không hợp lệ: `401`.
- User đăng nhập nhưng tài nguyên không nằm trong scope truy cập: trả `404` để tránh dò ID.
- User thấy Workspace nhưng role không cho phép hành động: `403`.

## 5. Aggregate và transaction boundary

### 5.1 Aggregate chính

`OrderWorkspace` là aggregate root của workflow. Nó sở hữu hoặc kiểm soát:

- Workflow status hiện tại.
- Record status.
- Draft Specification hiện tại.
- Latest released version reference.
- Approved version reference.
- Production version reference.
- Optimistic concurrency revision.

`SpecificationVersion`, `Approval` và `AuditEvent` là append-only. Nội dung đã phát hành không được cập nhật hoặc xóa qua API thông thường.

### 5.2 Review và Change Request

`ReviewRound` quản lý một lần review exact Version. Change Request thuộc Review Round và tham chiếu block trong snapshot của Version đó.

Application use case có thể phải thay đổi OrderWorkspace, ReviewRound, ChangeRequest và AuditEvent cùng lúc. Vì vậy repository không được tự `commit()` trong từng hàm `save()`.

Quyết định bắt buộc trước khi thêm Change Request:

- Repository chỉ đọc và ghi entity.
- `UnitOfWork` quản lý transaction.
- Application service commit đúng một lần sau khi toàn bộ business rule thành công.
- Nếu một bước lỗi, toàn bộ transaction rollback.
- Notification được ghi vào Outbox trong cùng transaction và gửi sau khi commit.

## 6. State machine của Workspace

### 6.1 Workflow status

Workspace chỉ có bốn trạng thái review cốt lõi:

- `DRAFT`
- `IN_REVIEW`
- `APPROVED`
- `LOCKED_FOR_PRODUCTION`

`CHANGES_REQUESTED` không phải Workspace status. Đây là outcome của Review Round; Workspace quay về `DRAFT`.

`COMPLETED`, `ARCHIVED` và `CANCELLED` không được thêm vào workflow status. `ARCHIVED` và `CANCELLED` thuộc `record_status`.

### 6.2 Transition hợp lệ

| Từ | Hành động | Actor | Điều kiện | Sang |
| --- | --- | --- | --- | --- |
| Không có | Create Workspace | Designer hoặc Admin | Customer hợp lệ và actor có quyền | `DRAFT` |
| `DRAFT` | Update Draft | Designer | Có quyền edit và record đang active | `DRAFT` |
| `DRAFT` | Release Version | Designer | Draft hợp lệ và khác version gần nhất | `IN_REVIEW` |
| `IN_REVIEW` | Approve Review | Customer reviewer | Review Round đang open và không có quyết định trước đó | `APPROVED` |
| `IN_REVIEW` | Request Changes | Customer reviewer | Có ít nhất một Change Request hợp lệ trong Review Round | `DRAFT` |
| `APPROVED` | Production Lock | Designer hoặc Admin | Approval khớp exact Version | `LOCKED_FOR_PRODUCTION` |
| `APPROVED` | Start Revision | Designer hoặc Admin | Có lý do; Approval cũ được giữ lịch sử | `DRAFT` |
| `LOCKED_FOR_PRODUCTION` | Start Revision | Designer hoặc Admin | Có lý do; Production Snapshot cũ được giữ | `DRAFT` |

Mọi transition khác bị từ chối với lỗi `INVALID_STATE_TRANSITION`.

### 6.3 Quy tắc chỉnh sửa Draft

- Chỉ được thêm, sửa, xóa hoặc reorder block khi Workspace là `DRAFT`.
- Không tự động chuyển từ `IN_REVIEW`, `APPROVED` hoặc `LOCKED_FOR_PRODUCTION` về `DRAFT` khi gọi API sửa block.
- Muốn sửa sau approve hoặc production lock phải gọi use case `Start Revision` trước.
- Production Snapshot cũ vẫn giữ nguyên khi Workspace bước vào revision mới.
- `approved_version_id` và `production_version_id` không bị xóa khỏi lịch sử.

### 6.4 Record status

- `ACTIVE`: cho phép thao tác theo workflow và permission.
- `ARCHIVED`: chỉ đọc; Admin có thể Restore về `ACTIVE`.
- `CANCELLED`: trạng thái vận hành cuối, chỉ đọc và không Restore trong MVP.
- Archive được phép ở mọi workflow status và bắt buộc có lý do.
- Cancel chỉ được phép trước `LOCKED_FOR_PRODUCTION`. Việc hủy sau Production Lock thuộc quy trình sản xuất và nằm ngoài MVP.
- Khi record không `ACTIVE`, các command nghiệp vụ bị từ chối, ngoại trừ Read, Audit và Restore hợp lệ.
- Archive, Restore và Cancel đều phải ghi Audit Event.

## 7. State machine của Review Round

Review Round có trạng thái:

- `OPEN`
- `APPROVED`
- `CHANGES_REQUESTED`
- `CANCELLED`

Release Version tạo đúng một Review Round `OPEN` cho Version mới. Mỗi Workspace chỉ có tối đa một Review Round `OPEN`.

### 7.1 Quyết định thống nhất cho UC Comment và Change Request

Comment và Change Request là hai chức năng khác nhau:

- Tạo Comment không thay đổi Workspace status.
- Tạo Change Request cũng chưa đóng Review Round, để Customer có thể tạo nhiều yêu cầu cho nhiều block.
- Customer chọn `Request Changes` sau khi hoàn tất danh sách yêu cầu.
- `Request Changes` yêu cầu có ít nhất một Change Request ở trạng thái `REQUESTED` và làm Workspace chuyển `IN_REVIEW -> DRAFT`.
- `Approve` và `Request Changes` loại trừ lẫn nhau trong cùng Review Round.

Quyết định này thay thế cách hiểu “mỗi lần tạo một Change Request lập tức chuyển Workspace về DRAFT”, vì cách đó ngăn Customer ghi nhiều yêu cầu trong cùng vòng review.

## 8. State machine của Change Request

Trạng thái:

- `REQUESTED`
- `ACKNOWLEDGED`
- `UPDATED`
- `CONFIRMED`
- `REOPENED`
- `REJECTED`
- `CANCELLED`

Transition:

| Từ | Hành động | Actor | Sang |
| --- | --- | --- | --- |
| Không có | Create Change Request | Customer reviewer | `REQUESTED` |
| `REQUESTED` | Acknowledge | Designer | `ACKNOWLEDGED` |
| `REQUESTED` | Cancel | Customer tạo yêu cầu hoặc Admin | `CANCELLED` |
| `REQUESTED` | Reject | Designer hoặc Admin | `REJECTED` |
| `ACKNOWLEDGED` | Mark Updated | Designer | `UPDATED` |
| `ACKNOWLEDGED` | Reject | Designer hoặc Admin | `REJECTED` |
| `ACKNOWLEDGED` | Cancel | Customer tạo yêu cầu hoặc Admin | `CANCELLED` |
| `UPDATED` | Confirm | Customer reviewer | `CONFIRMED` |
| `UPDATED` | Reopen | Customer reviewer | `REOPENED` và tạo CR mới `REQUESTED` |

Quy tắc:

- Change Request bắt buộc tham chiếu `workspace_id`, `review_round_id`, `version_id` và `block_id`.
- `block_id` phải tồn tại trong snapshot của exact Version, không chỉ tồn tại trong Draft hiện tại.
- `field_path` là tùy chọn để chỉ rõ trường con như `content.width_cm`.
- Không sửa nội dung Change Request sau khi Designer acknowledge. Trao đổi thêm dùng Comment.
- Mark Updated chỉ được thực hiện sau khi Version chứa thay đổi đã release.
- Mark Updated bắt buộc nhận `resolved_in_version_id`; Version này phải thuộc cùng Workspace, mới hơn Version gốc và chứa block liên quan.
- `UPDATED` luôn phải có `resolved_in_version_id`.
- Chỉ được `CONFIRMED` sau khi Customer xem Version chứa thay đổi.
- Reopen không tái sử dụng record cũ trong Review Round đã đóng. Hệ thống chuyển CR cũ thành `REOPENED` và atomically tạo CR mới `REQUESTED` trong Review Round đang open, với `parent_change_request_id` trỏ về CR cũ.
- Reject bắt buộc có `resolution_note`.

## 9. Version, Approval và Production Lock

### 9.1 Specification Version

Mỗi Version có:

- `id`
- `workspace_id`
- `number`, tăng tuần tự trong Workspace
- `previous_version_id`, null với V1
- `snapshot`
- `content_hash`
- `schema_version`
- `created_by`
- `created_at`

Version không có API update hoặc delete.

Trạng thái hiển thị của Version được suy ra, không lưu trùng:

- `IN_REVIEW` nếu Review Round hiện tại của Version đang `OPEN`.
- `APPROVED` nếu `workspace.approved_version_id == version.id`.
- `LOCKED_FOR_PRODUCTION` nếu `workspace.production_version_id == version.id`.
- `HISTORICAL` trong các trường hợp còn lại.

### 9.2 Release Version

Release chỉ thành công khi:

- Workspace đang `DRAFT` và `ACTIVE`.
- Actor là Designer có quyền edit.
- Draft có ít nhất một block.
- Tất cả block hợp lệ theo schema.
- Mọi Asset được tham chiếu tồn tại và sẵn sàng.
- `content_hash` khác latest Version.
- Không có Review Round `OPEN` khác.

Release phải thực hiện atomically:

1. Khóa Workspace hoặc kiểm tra optimistic revision.
2. Chụp snapshot đã canonicalize.
3. Tạo Version mới.
4. Tạo Review Round `OPEN`.
5. Chuyển Workspace sang `IN_REVIEW`.
6. Ghi Audit Event.
7. Ghi notification vào Outbox.

Nếu bất kỳ bước nào lỗi thì không được có Version dở dang.

### 9.3 Approval

MVP dùng một approval bắt buộc cho mỗi Version.

Quy tắc:

- Chỉ Customer reviewer có `can_approve=true` được approve.
- Approval lấy `approver_id` từ Current Actor.
- Approval chỉ áp dụng cho Version của Review Round `OPEN` hiện tại.
- Approval là append-only.
- Database có `UNIQUE(version_id)` trong MVP.
- Approve lại cùng Version trả kết quả idempotent, không tạo record thứ hai.
- Không được approve nếu Workspace còn CR `REQUESTED` hoặc `ACKNOWLEDGED` từ bất kỳ vòng thay đổi trước đó.
- CR `REOPENED` cũ không chặn approve nếu CR con đã được xử lý; CR con `REQUESTED` hoặc `ACKNOWLEDGED` vẫn chặn.
- CR `UPDATED` chỉ sẵn sàng xác nhận nếu `resolved_in_version_id` đúng bằng Version đang approve. Nếu trỏ Version khác thì phải đánh giá lại và cập nhật liên kết trước khi approve.
- Khi approve, các CR `UPDATED` có `resolved_in_version_id` đúng bằng Version đang approve được tự động chuyển thành `CONFIRMED` trong cùng transaction.
- Approve đóng Review Round thành `APPROVED` và chuyển Workspace sang `APPROVED`.

Nếu sau này cần nhiều cấp duyệt, phải tạo `approval_policy` và migration mới; không nới lỏng unique constraint âm thầm.

### 9.4 Production Lock

Production Lock luôn nhận exact `version_id`.

Điều kiện:

- Workspace đang `APPROVED`.
- `approved_version_id == version_id`.
- Có Approval của exact Version.
- Actor có `can_lock_production=true`.
- Version chưa phải Production Snapshot.

Kết quả:

- `production_version_id = version_id`.
- Workspace chuyển `LOCKED_FOR_PRODUCTION`.
- Ghi actor, Version, Approval và timestamp trong Audit Event.
- Retry cùng exact Version là idempotent.
- Lock Version khác trả `409 APPROVAL_VERSION_MISMATCH`.

## 10. Specification Block contract

### 10.1 Quy tắc chung

Mỗi block có:

- `id`: UUID do client tạo để PUT có thể retry.
- `workspace_id`.
- `block_type`.
- `label`.
- `content`.
- `position` không âm.
- `schema_version`.
- `created_by`, `updated_by`, `created_at`, `updated_at`.

`PUT /blocks/{block_id}` là upsert trong Draft:

- Chưa có block thì tạo.
- Đã có block thì thay toàn bộ `label`, `content`, `position` và `block_type` sau validation.
- Không dùng PUT để partial update.
- Partial update nếu thực sự cần sẽ dùng PATCH và contract riêng.

### 10.2 Block type MVP

| block_type | content bắt buộc |
| --- | --- |
| `text` | `{ "value": string }` |
| `quantity` | `{ "value": integer > 0, "unit": string }` |
| `color` | `{ "name": string, "hex"?: string, "pantone"?: string }` |
| `dimension` | `{ "width": number > 0, "height": number > 0, "unit": "mm" | "cm" | "inch" }` |
| `material` | `{ "name": string, "code"?: string, "details"?: string }` |
| `image` | `{ "asset_id": UUID, "caption"?: string }` |
| `file` | `{ "asset_id": UUID, "description"?: string }` |
| `note` | `{ "text": string }` |
| `print_area` | `{ "surface": string, "width": number > 0, "height": number > 0, "unit": "mm" | "cm" | "inch", "asset_id"?: UUID }` |

Unknown `block_type` bị từ chối trong MVP. Khi thêm loại mới phải thêm schema và test tương ứng.

Giá trị số phải dùng số và unit riêng, không lưu chuỗi như `25cm`. Màu, kích thước, số lượng, vật liệu và Asset phải có cấu trúc để diff ổn định.

## 11. Asset contract

Asset metadata gồm:

- `id`
- `workspace_id`
- `storage_key`
- `original_filename`
- `content_type`
- `size_bytes`
- `checksum`
- `status`: `UPLOADING`, `READY`, `REJECTED`
- `uploaded_by`
- `created_at`

Quy tắc:

- Block chỉ tham chiếu Asset `READY` thuộc cùng Workspace.
- Không ghi binary hoặc base64 vào JSONB của block.
- Version snapshot phải lưu `asset_id` và `checksum` để truy vết đúng file.
- Thay file nghĩa là upload Asset mới; không ghi đè nội dung Asset đã xuất hiện trong Version.
- Download Asset phải kiểm tra Workspace access.
- Virus scanning và giới hạn content type được thực hiện trước khi Asset thành `READY`.

## 12. Data model tối thiểu

### 12.1 Bảng danh tính và quyền

```text
users
  id, email, display_name, system_role, status, created_at

customers
  id, name, code, status, created_at, updated_at

customer_users
  customer_id, user_id, status
  UNIQUE(customer_id, user_id)

designer_customer_assignments
  designer_id, customer_id, assigned_by, status, created_at
  UNIQUE(designer_id, customer_id)

workspace_memberships
  workspace_id, user_id, role, can_view, can_edit,
  can_review, can_approve, can_lock_production, status
  UNIQUE(workspace_id, user_id)
```

### 12.2 Bảng nghiệp vụ

```text
order_workspaces
  id, customer_id, product_type, workflow_status, record_status,
  latest_version_id, approved_version_id, production_version_id,
  revision, created_by, created_at, updated_at

specification_blocks
  id, workspace_id, block_type, label, content, position,
  schema_version, created_by, updated_by, created_at, updated_at

specification_versions
  id, workspace_id, number, previous_version_id, snapshot,
  content_hash, schema_version, created_by, created_at
  UNIQUE(workspace_id, number)

review_rounds
  id, workspace_id, version_id, status, opened_at, closed_at,
  decided_by, decision_note

approvals
  id, workspace_id, review_round_id, version_id, approver_id, created_at
  UNIQUE(version_id)

change_requests
  id, workspace_id, review_round_id, version_id, block_id,
  field_path, message, status, requested_by, acknowledged_by,
  resolved_in_version_id, parent_change_request_id, resolution_note,
  created_at, updated_at

comments
  id, workspace_id, version_id?, block_id?, change_request_id?,
  body, author_id, created_at

assets
  id, workspace_id, storage_key, original_filename, content_type,
  size_bytes, checksum, status, uploaded_by, created_at

audit_events
  id, workspace_id, actor_id, event_type, entity_type, entity_id,
  version_id?, metadata, created_at

outbox_messages
  id, event_type, payload, status, created_at, processed_at
```

### 12.3 Ràng buộc database

- Tất cả reference ID có foreign key phù hợp.
- `approved_version_id`, `production_version_id` và `latest_version_id` phải tham chiếu Version thuộc đúng Workspace; application kiểm tra và database bảo vệ tối đa có thể.
- Version, Approval và Audit Event không có code path update nội dung lịch sử.
- `content_hash` được tính từ canonical JSON.
- Số Version tăng trong transaction có row lock hoặc cơ chế chống race.
- Một Workspace chỉ có tối đa một Review Round `OPEN` bằng partial unique index.
- Không hard delete Workspace đã có Version; dùng `record_status`.

Migration tiếp theo phải là migration mới, không sửa lịch sử migration đã được dùng ở môi trường khác.

## 13. Structured Diff và AI Summary

Structured Diff được tính từ hai snapshot đã canonicalize. Kết quả tối thiểu:

```json
{
  "base_version_id": "uuid",
  "target_version_id": "uuid",
  "added": [],
  "removed": [],
  "changed": [
    {
      "block_id": "uuid",
      "field_path": "content.width",
      "before": 25,
      "after": 20
    }
  ]
}
```

Quy tắc:

- Diff là deterministic và không phụ thuộc AI.
- V1 diff với empty snapshot.
- Reorder block được biểu diễn riêng, không giả thành thay đổi nội dung.
- Asset diff hiển thị asset ID, filename và checksum phù hợp quyền truy cập.
- AI Summary chỉ nhận Structured Diff làm input.
- AI Summary không được tạo thay đổi mới, approve hoặc Production Lock.
- API vẫn hoạt động khi AI unavailable.

AI Summary triển khai sau khi Structured Diff và test đã ổn định.

## 14. Audit và notification

Các event bắt buộc:

- `WORKSPACE_CREATED`
- `MEMBER_ADDED`
- `MEMBER_REMOVED`
- `DRAFT_BLOCK_UPSERTED`
- `DRAFT_BLOCK_DELETED`
- `REVISION_STARTED`
- `VERSION_RELEASED`
- `COMMENT_CREATED`
- `CHANGE_REQUEST_CREATED`
- `REVIEW_CHANGES_REQUESTED`
- `CHANGE_REQUEST_ACKNOWLEDGED`
- `CHANGE_REQUEST_UPDATED`
- `CHANGE_REQUEST_CONFIRMED`
- `CHANGE_REQUEST_REOPENED`
- `CHANGE_REQUEST_REJECTED`
- `CHANGE_REQUEST_CANCELLED`
- `VERSION_APPROVED`
- `PRODUCTION_LOCKED`
- `WORKSPACE_ARCHIVED`
- `WORKSPACE_RESTORED`
- `WORKSPACE_CANCELLED`

Audit Event là append-only và được ghi trong cùng transaction với hành động nghiệp vụ.

Notification là side effect bất đồng bộ:

- Notification lỗi không rollback nghiệp vụ đã commit.
- Outbox đảm bảo event không bị mất.
- Email, Zalo hoặc push chỉ chứa thông báo và link.
- Quyết định chính thức phải tồn tại trong ProofPrint.

## 15. Concurrency và idempotency

### 15.1 Optimistic concurrency

Workspace có `revision` tăng sau mỗi mutation.

- Response Workspace trả header `ETag: W/"<revision>"`.
- API mutate Workspace yêu cầu `If-Match`.
- Revision không khớp trả `412 WORKSPACE_REVISION_MISMATCH`.
- Frontend phải reload trước khi retry thủ công.

Các transition Release, Approve, Request Changes và Production Lock vẫn dùng database transaction và row lock để bảo vệ invariant.

### 15.2 Idempotency

Các POST tạo quyết định hoặc transition yêu cầu `Idempotency-Key`:

- Create Workspace.
- Release Version.
- Create Change Request.
- Approve.
- Request Changes.
- Production Lock.
- Start Revision.

Cùng actor, endpoint, resource và key phải trả lại cùng kết quả. Dùng lại key với payload khác trả `409 IDEMPOTENCY_KEY_REUSED`.

PUT block đã idempotent theo `block_id` và payload.

## 16. Error contract

Response lỗi dùng một cấu trúc thống nhất:

```json
{
  "code": "INVALID_STATE_TRANSITION",
  "message": "Workspace must be in DRAFT before releasing a version",
  "details": {},
  "trace_id": "uuid"
}
```

| HTTP | Trường hợp |
| --- | --- |
| `400` | Request có ý nghĩa không hợp lệ nhưng không thuộc validation schema cụ thể |
| `401` | Chưa xác thực hoặc token không hợp lệ |
| `403` | Có quyền xem Workspace nhưng không được thực hiện hành động |
| `404` | Resource không tồn tại hoặc nằm ngoài access scope |
| `409` | Sai workflow state, stale version, duplicate hoặc idempotency conflict |
| `412` | `If-Match` revision không khớp |
| `422` | Field hoặc block content không đúng schema |

Mã lỗi nghiệp vụ tối thiểu:

- `WORKSPACE_NOT_FOUND`
- `VERSION_NOT_FOUND`
- `CHANGE_REQUEST_NOT_FOUND`
- `ASSET_NOT_FOUND`
- `ACCESS_DENIED`
- `INVALID_STATE_TRANSITION`
- `STALE_VERSION`
- `SPECIFICATION_UNCHANGED`
- `SPECIFICATION_INVALID`
- `REVIEW_ALREADY_DECIDED`
- `CHANGE_REQUEST_REQUIRED`
- `APPROVAL_VERSION_MISMATCH`
- `WORKSPACE_REVISION_MISMATCH`
- `IDEMPOTENCY_KEY_REUSED`

Không trả stack trace, SQL hoặc thông tin nội bộ cho client.

## 17. API resource contract và thứ tự triển khai

Đây là danh sách resource và command đã thống nhất, không thay thế OpenAPI chi tiết.

### Phase 0 Identity và access

```text
GET    /api/v1/me
POST   /api/v1/admin/user-invitations
GET    /api/v1/admin/users
PATCH  /api/v1/admin/users/{user_id}/status
POST   /api/v1/customers
GET    /api/v1/customers
GET    /api/v1/customers/{customer_id}
POST   /api/v1/customers/{customer_id}/designer-assignments
DELETE /api/v1/customers/{customer_id}/designer-assignments/{designer_id}
POST   /api/v1/orders/{order_id}/members
DELETE /api/v1/orders/{order_id}/members/{user_id}
```

### Phase 1 Workspace và Draft

```text
POST   /api/v1/orders
GET    /api/v1/orders
GET    /api/v1/orders/{order_id}
POST   /api/v1/orders/{order_id}/revisions
PUT    /api/v1/orders/{order_id}/blocks/{block_id}
DELETE /api/v1/orders/{order_id}/blocks/{block_id}
PATCH  /api/v1/orders/{order_id}/blocks/order
POST   /api/v1/orders/{order_id}/assets
GET    /api/v1/orders/{order_id}/assets/{asset_id}
```

### Phase 2 Version và review

```text
POST /api/v1/orders/{order_id}/versions
GET  /api/v1/orders/{order_id}/versions
GET  /api/v1/orders/{order_id}/versions/{version_id}
GET  /api/v1/orders/{order_id}/versions/{version_id}/diff
GET  /api/v1/orders/{order_id}/review-rounds/{review_round_id}
```

### Phase 3 Comment và Change Request

```text
POST /api/v1/orders/{order_id}/comments
GET  /api/v1/orders/{order_id}/comments
POST /api/v1/orders/{order_id}/versions/{version_id}/change-requests
GET  /api/v1/orders/{order_id}/change-requests
GET  /api/v1/change-requests/{change_request_id}
POST /api/v1/change-requests/{change_request_id}/acknowledge
POST /api/v1/change-requests/{change_request_id}/mark-updated
POST /api/v1/change-requests/{change_request_id}/confirm
POST /api/v1/change-requests/{change_request_id}/reopen
POST /api/v1/change-requests/{change_request_id}/reject
POST /api/v1/change-requests/{change_request_id}/cancel
POST /api/v1/orders/{order_id}/versions/{version_id}/request-changes
```

### Phase 4 Approval, Production Lock và Audit

```text
POST /api/v1/orders/{order_id}/versions/{version_id}/approvals
POST /api/v1/orders/{order_id}/versions/{version_id}/production-lock
GET  /api/v1/orders/{order_id}/production-snapshot
GET  /api/v1/orders/{order_id}/audit-events
POST /api/v1/orders/{order_id}/archive
POST /api/v1/orders/{order_id}/restore
POST /api/v1/orders/{order_id}/cancel
```

### Phase 5 Enhancement

```text
GET /api/v1/orders/{order_id}/versions/{version_id}/ai-summary
```

Nguyên tắc URL:

- Exact Version luôn xuất hiện trên URL của approve, request changes và production lock.
- Không truyền actor ID trong body.
- Command có business meaning dùng endpoint động từ rõ ràng.
- Không cho client PATCH trực tiếp `workflow_status`, Review Round status hoặc Change Request status.
- List endpoint có pagination, filter và stable sort.

## 18. Phân quyền theo hành động

| Hành động | Customer reviewer | Designer | Admin |
| --- | --- | --- | --- |
| Xem Workspace được cấp quyền | Có | Có | Có |
| Tạo Workspace | Không | Có, trong Customer được phân công | Có |
| Sửa Draft | Không | Có quyền edit | Có khi hỗ trợ được audit |
| Release Version | Không | Có | Có khi hỗ trợ được audit |
| Comment | Có | Có | Có |
| Tạo Change Request | Có khi Review Round open | Không | Không mặc định |
| Request Changes | Có `can_review` | Không | Không mặc định |
| Acknowledge/Update CR | Không | Có | Có khi hỗ trợ |
| Confirm/Reopen CR | Có `can_review` | Không | Không mặc định |
| Approve Version | Có `can_approve` | Không | Không được approve thay Customer |
| Production Lock | Không | Có `can_lock_production` | Có |
| Quản lý User/Assignment | Không | Chỉ xem phạm vi của mình | Có |

Admin không được approve thay Customer trong MVP. Nếu cần emergency override phải là use case riêng, bắt buộc lý do và audit rõ ràng.

## 19. Use case chính thức của MVP

### Customer

- UC-C01 Xem Workspace được cấp quyền.
- UC-C02 Xem exact Version và Structured Diff.
- UC-C03 Tạo Comment.
- UC-C04 Tạo Change Request cho Version và Block.
- UC-C05 Gửi quyết định Request Changes.
- UC-C06 Approve exact Version.
- UC-C07 Confirm hoặc Reopen Change Request sau khi xem Version sửa đổi.
- UC-C08 Xem Production Snapshot.

### Designer

- UC-D01 Xem và tìm Customer được phân công.
- UC-D02 Tạo Workspace cho Customer.
- UC-D03 Mời Customer reviewer vào Workspace.
- UC-D04 Tạo, sửa, xóa và reorder Specification Block trong Draft.
- UC-D05 Upload và gắn Asset.
- UC-D06 Release Version.
- UC-D07 Xem và xử lý Change Request.
- UC-D08 Start Revision sau approve hoặc production lock.
- UC-D09 Production Lock exact Version đã approve.
- UC-D10 Xem Audit History.

### Admin

- UC-A01 Tạo, khóa và quản lý tài khoản.
- UC-A02 Gán Designer cho Customer.
- UC-A03 Quản lý Workspace membership.
- UC-A04 Hỗ trợ Production Lock khi được phép.
- UC-A05 Archive hoặc Cancel Workspace.
- UC-A06 Xem Audit History toàn hệ thống theo quyền.

## 20. Acceptance test bắt buộc trước khi mở API

### Access control

- User ngoài Workspace không đọc được Order, Version, Asset hoặc CR.
- Customer không sửa Draft hoặc Production Lock.
- Designer không approve thay Customer.
- Designer chỉ thấy Customer được phân công.
- Thu hồi membership chặn request tiếp theo.

### Workflow

- Không release khi Workspace không ở `DRAFT`.
- Không sửa block khi Workspace không ở `DRAFT`.
- Release không thay đổi Version cũ.
- Không tạo Version khi content hash không đổi.
- Approve và Request Changes không thể cùng thành công trong một Review Round.
- Request Changes cần ít nhất một CR.
- Production Lock chỉ nhận exact approved Version.
- Start Revision giữ nguyên Production Snapshot trước đó.
- Workspace `ARCHIVED` chỉ đọc và Restore được; Workspace `CANCELLED` không Restore trong MVP.
- Không Cancel Workspace đã Production Lock bằng workflow MVP.

### Change Request

- CR không được tham chiếu block ngoài snapshot của Version.
- Designer acknowledge và update theo đúng transition.
- Reject cần lý do.
- `UPDATED` liên kết Version đã sửa.
- Customer có thể confirm hoặc reopen sau khi xem Version mới.
- Reopen giữ CR cũ ở lịch sử và tạo CR mới trong Review Round hiện tại.

### Concurrency và idempotency

- Hai Release đồng thời không tạo cùng số Version.
- Approve và Request Changes đồng thời chỉ có một quyết định thành công.
- Retry với cùng Idempotency-Key không tạo record trùng.
- Mutation với ETag cũ trả `412`.

### Persistence

- Foreign key chặn reference sai.
- Rollback không để Version, Review Round hoặc Audit Event dở dang.
- PostgreSQL integration test xác nhận immutable history.
- Outbox giữ notification event ngay cả khi kênh gửi tạm lỗi.

## 21. Ví dụ workflow chuẩn

Ví dụ Customer yêu cầu đổi chiều rộng vùng in từ 25 cm xuống 20 cm:

1. Designer tạo Workspace. Workspace ở `DRAFT`.
2. Designer PUT block `print_area` với chiều rộng 25 cm.
3. Designer release V1. Hệ thống tạo Review Round R1 `OPEN`; Workspace chuyển `IN_REVIEW`.
4. Customer tạo CR1 gắn V1 và block `print_area`, yêu cầu đổi chiều rộng thành 20 cm. Workspace vẫn `IN_REVIEW` để Customer có thể thêm yêu cầu khác.
5. Customer chọn Request Changes cho V1. R1 chuyển `CHANGES_REQUESTED`; Workspace chuyển `DRAFT`.
6. Designer acknowledge CR1 và sửa Draft thành 20 cm.
7. Designer release V2. Hệ thống tạo R2 `OPEN`; V1 không thay đổi.
8. Designer Mark Updated CR1 với `resolved_in_version_id = V2`.
9. Customer xem Structured Diff V1 -> V2.
10. Nếu đúng, Customer confirm CR1 hoặc approve V2. Approve V2 tự confirm CR1 nếu CR1 vẫn `UPDATED`.
11. Approval tham chiếu exact V2; Workspace chuyển `APPROVED`.
12. Designer hoặc Admin Production Lock exact V2. V2 trở thành Production Snapshot; Workspace chuyển `LOCKED_FOR_PRODUCTION`.
13. Nếu cần sửa tiếp, Designer phải Start Revision. V2 vẫn là Production Snapshot cho đến khi một Version mới hoàn tất review, approval và production lock.

## 22. Thứ tự thay đổi code hiện tại

Trước khi thêm route mới:

1. Thêm Current Actor abstraction và authorization policy.
2. Thêm Unit of Work; bỏ `commit()` khỏi repository `save()`.
3. Sửa `put_block()` để chỉ cho phép khi `DRAFT`, không tự đổi trạng thái.
4. Sửa `publish_version()` để kiểm tra `DRAFT`, actor, content hash và transaction.
5. Bỏ `approver_id` khỏi request body; lấy từ Current Actor.
6. Đổi Production Lock thành command chứa exact `version_id`.
7. Thêm foreign key và unique constraint còn thiếu bằng migration mới.
8. Thêm test state transition và authorization trước route mới.
9. Triển khai resource theo Phase 0 đến Phase 4.
10. Chỉ triển khai AI Summary sau Structured Diff.

## 23. Definition of Ready cho API

Chỉ bắt đầu triển khai API mới khi tất cả mục sau được xác nhận:

- [ ] Product và Backend thống nhất phạm vi MVP.
- [ ] Bốn Workspace workflow status được giữ nguyên.
- [x] Comment và Change Request được tách riêng.
- [x] Customer được tạo nhiều CR trong một Review Round; Request Changes gửi toàn bộ CR `REQUESTED` và sau đó Workspace mới chuyển về `DRAFT`.
- [ ] Actor luôn lấy từ authentication context.
- [ ] Permission matrix được phê duyệt.
- [ ] ERD và migration plan phù hợp data model trong tài liệu.
- [ ] Block schema MVP được chấp thuận.
- [x] Approval policy một Customer Approval cho mỗi Version được chấp thuận.
- [x] Production Lock bắt buộc chỉ định exact `version_id` và phải khớp Version đã approve.
- [ ] Concurrency và Idempotency contract được chấp thuận.
- [ ] Error contract được chấp thuận.
- [ ] Acceptance test được chuyển thành test backlog.
- [ ] OpenAPI contract dùng đúng resource và command đã thống nhất.

## 24. Quy trình thay đổi tài liệu

Mọi thay đổi business rule phải:

1. Cập nhật Domain Contract này.
2. Ghi lý do và ảnh hưởng đến state, data, API và migration.
3. Cập nhật acceptance criteria.
4. Cập nhật OpenAPI.
5. Cập nhật domain test trước hoặc cùng lúc với code.

Không thay đổi workflow chỉ bằng cách thêm điều kiện trong route hoặc UI.
