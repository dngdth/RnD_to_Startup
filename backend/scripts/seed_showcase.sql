\set ON_ERROR_STOP on

-- Local demo data for exercising the existing API. Stable UUIDs make reruns safe.
-- This script writes no outbox messages, so seeding cannot send Zalo notifications.
BEGIN;

WITH demo(n, name, product, workflow, record) AS (
    VALUES
    (1, 'Xưởng May Sao Mai', 'Áo polo đồng phục', 'DRAFT', 'ACTIVE'),
    (2, 'Cà phê Hương Phố', 'Tạp dề nhân viên', 'IN_REVIEW', 'ACTIVE'),
    (3, 'Trường Hòa Bình', 'Áo thể thao học sinh', 'DRAFT', 'ACTIVE'),
    (4, 'Nhà hàng Biển Xanh', 'Đồng phục phục vụ', 'IN_REVIEW', 'ACTIVE'),
    (5, 'Công ty Mộc Việt', 'Túi vải canvas', 'APPROVED', 'ACTIVE'),
    (6, 'Studio Sắc Màu', 'Áo thun sự kiện', 'LOCKED_FOR_PRODUCTION', 'ACTIVE'),
    (7, 'Cửa hàng Mây Trắng', 'Bao bì giấy', 'DRAFT', 'ARCHIVED'),
    (8, 'Hợp tác xã Hoa Sen', 'Nhãn sản phẩm', 'DRAFT', 'CANCELLED')
)
INSERT INTO customers (id, name, code, status, email, phone, created_by)
SELECT md5('proofprint-showcase-customer-' || n)::uuid, name,
       'SHOWCASE-' || lpad(n::text, 2, '0'), 'ACTIVE',
       'contact' || n || '@example.invalid', '09000000' || lpad(n::text, 2, '0'),
       '22222222-2222-4222-8222-222222222222'::uuid
FROM demo ON CONFLICT DO NOTHING;

WITH demo(n, product, workflow, record) AS (
    VALUES
    (1, 'Áo polo đồng phục', 'DRAFT', 'ACTIVE'),
    (2, 'Tạp dề nhân viên', 'IN_REVIEW', 'ACTIVE'),
    (3, 'Áo thể thao học sinh', 'DRAFT', 'ACTIVE'),
    (4, 'Đồng phục phục vụ', 'IN_REVIEW', 'ACTIVE'),
    (5, 'Túi vải canvas', 'APPROVED', 'ACTIVE'),
    (6, 'Áo thun sự kiện', 'LOCKED_FOR_PRODUCTION', 'ACTIVE'),
    (7, 'Bao bì giấy', 'DRAFT', 'ARCHIVED'),
    (8, 'Nhãn sản phẩm', 'DRAFT', 'CANCELLED')
)
INSERT INTO order_workspaces
    (id, customer_id, product_type, workflow_status, record_status,
     revision, created_by, created_at, updated_at)
SELECT md5('proofprint-showcase-workspace-' || n)::uuid,
       md5('proofprint-showcase-customer-' || n)::uuid,
       product, workflow, record,
       CASE WHEN n = 4 THEN 5 WHEN n BETWEEN 2 AND 6 THEN 3 ELSE 1 END,
       '22222222-2222-4222-8222-222222222222'::uuid,
       now() - (9 - n) * interval '1 day',
       now() - (9 - n) * interval '12 hour'
FROM demo ON CONFLICT DO NOTHING;

INSERT INTO workspace_memberships
    (workspace_id, user_id, role, can_view, can_edit, can_review,
     can_approve, can_lock_production, status)
SELECT md5('proofprint-showcase-workspace-' || n)::uuid,
       '22222222-2222-4222-8222-222222222222'::uuid,
       'DESIGNER', true, true, false, false, true, 'ACTIVE'
FROM generate_series(1, 8) AS n ON CONFLICT DO NOTHING;

INSERT INTO workspace_review_links (id, workspace_id, version, status, created_by)
SELECT md5('proofprint-showcase-link-' || n)::uuid,
       md5('proofprint-showcase-workspace-' || n)::uuid,
       1, 'ACTIVE', '22222222-2222-4222-8222-222222222222'::uuid
FROM generate_series(1, 8) AS n ON CONFLICT DO NOTHING;

INSERT INTO specification_blocks
    (id, workspace_id, block_type, label, content, position, schema_version,
     created_by, updated_by)
SELECT md5('proofprint-showcase-block-' || n || '-' || position)::uuid,
       md5('proofprint-showcase-workspace-' || n)::uuid,
       CASE WHEN position = 0 THEN 'quantity' ELSE 'color' END,
       CASE WHEN position = 0 THEN 'Số lượng đặt hàng' ELSE 'Màu chủ đạo' END,
       CASE WHEN position = 0
            THEN jsonb_build_object('value', 100 + n * 25, 'unit', 'sản phẩm')
            ELSE jsonb_build_object('name', 'Cam đất', 'hex', '#B76E4A') END,
       position, 1,
       '22222222-2222-4222-8222-222222222222'::uuid,
       '22222222-2222-4222-8222-222222222222'::uuid
FROM generate_series(1, 8) AS n CROSS JOIN generate_series(0, 1) AS position
ON CONFLICT DO NOTHING;

-- V1 snapshots exist for the five workspaces that reached review.
INSERT INTO specification_versions
    (id, workspace_id, number, previous_version_id, snapshot, content_hash,
     schema_version, created_by, created_at)
SELECT md5('proofprint-showcase-version-' || n || '-1')::uuid,
       md5('proofprint-showcase-workspace-' || n)::uuid,
       1, NULL,
       jsonb_build_array(
           jsonb_build_object(
               'id', md5('proofprint-showcase-block-' || n || '-0')::uuid,
               'block_type', 'quantity', 'label', 'Số lượng đặt hàng',
               'content', jsonb_build_object('value', 100 + n * 25, 'unit', 'sản phẩm'),
               'position', 0),
           jsonb_build_object(
               'id', md5('proofprint-showcase-block-' || n || '-1')::uuid,
               'block_type', 'color', 'label', 'Màu chủ đạo',
               'content', jsonb_build_object('name', 'Cam đất', 'hex', '#B76E4A'),
               'position', 1)),
       md5('showcase-v1-' || n) || md5('showcase-v1-hash-' || n),
       1, '22222222-2222-4222-8222-222222222222'::uuid,
       now() - (9 - n) * interval '10 hour'
FROM generate_series(2, 6) AS n ON CONFLICT DO NOTHING;

-- One corrected V2 demonstrates a request resolved while retaining the workspace URL.
INSERT INTO specification_versions
    (id, workspace_id, number, previous_version_id, snapshot, content_hash,
     schema_version, created_by, created_at)
VALUES (
    md5('proofprint-showcase-version-4-2')::uuid,
    md5('proofprint-showcase-workspace-4')::uuid,
    2, md5('proofprint-showcase-version-4-1')::uuid,
    jsonb_build_array(
        jsonb_build_object(
            'id', md5('proofprint-showcase-block-4-0')::uuid,
            'block_type', 'quantity', 'label', 'Số lượng đặt hàng',
            'content', jsonb_build_object('value', 240, 'unit', 'sản phẩm'),
            'position', 0),
        jsonb_build_object(
            'id', md5('proofprint-showcase-block-4-1')::uuid,
            'block_type', 'color', 'label', 'Màu chủ đạo',
            'content', jsonb_build_object('name', 'Cam đất', 'hex', '#B76E4A'),
            'position', 1)),
    md5('showcase-v2-4') || md5('showcase-v2-hash-4'),
    1, '22222222-2222-4222-8222-222222222222'::uuid, now() - interval '12 hour'
) ON CONFLICT DO NOTHING;

INSERT INTO review_rounds
    (id, workspace_id, version_id, status, opened_at, closed_at, decision_note)
SELECT md5('proofprint-showcase-round-' || n || '-1')::uuid,
       md5('proofprint-showcase-workspace-' || n)::uuid,
       md5('proofprint-showcase-version-' || n || '-1')::uuid,
       CASE WHEN n IN (3, 4) THEN 'CHANGES_REQUESTED'
            WHEN n IN (5, 6) THEN 'APPROVED' ELSE 'OPEN' END,
       now() - (9 - n) * interval '9 hour',
       CASE WHEN n = 2 THEN NULL ELSE now() - (9 - n) * interval '8 hour' END,
       CASE WHEN n IN (3, 4) THEN 'Khách hàng yêu cầu điều chỉnh số lượng'
            WHEN n IN (5, 6) THEN 'Đã duyệt mẫu' ELSE NULL END
FROM generate_series(2, 6) AS n ON CONFLICT DO NOTHING;

INSERT INTO review_rounds
    (id, workspace_id, version_id, status, opened_at)
VALUES (md5('proofprint-showcase-round-4-2')::uuid,
        md5('proofprint-showcase-workspace-4')::uuid,
        md5('proofprint-showcase-version-4-2')::uuid,
        'OPEN', now() - interval '11 hour')
ON CONFLICT DO NOTHING;

INSERT INTO workspace_guest_sessions
    (id, review_link_id, workspace_id, username, token_hash, status, expires_at)
SELECT md5('proofprint-showcase-guest-' || n)::uuid,
       md5('proofprint-showcase-link-' || n)::uuid,
       md5('proofprint-showcase-workspace-' || n)::uuid,
       'Khách hàng demo ' || n,
       encode(sha256(convert_to('showcase-guest-token-' || n, 'UTF8')), 'hex'),
       'ACTIVE', now() + interval '30 days'
FROM generate_series(2, 6) AS n ON CONFLICT DO NOTHING;

INSERT INTO change_requests
    (id, workspace_id, review_round_id, version_id, block_id, field_path,
     message, status, requested_by_guest_session_id,
     requester_username_snapshot, acknowledged_by, resolved_in_version_id)
SELECT md5('proofprint-showcase-change-' || n)::uuid,
       md5('proofprint-showcase-workspace-' || n)::uuid,
       md5('proofprint-showcase-round-' || n || '-1')::uuid,
       md5('proofprint-showcase-version-' || n || '-1')::uuid,
       md5('proofprint-showcase-block-' || n || '-0')::uuid,
       'content.value', 'Vui lòng tăng số lượng lên 240 sản phẩm.',
       CASE WHEN n = 3 THEN 'REQUESTED' ELSE 'UPDATED' END,
       md5('proofprint-showcase-guest-' || n)::uuid,
       'Khách hàng demo ' || n,
       CASE WHEN n = 4 THEN '22222222-2222-4222-8222-222222222222'::uuid ELSE NULL END,
       CASE WHEN n = 4 THEN md5('proofprint-showcase-version-4-2')::uuid ELSE NULL END
FROM generate_series(3, 4) AS n ON CONFLICT DO NOTHING;

INSERT INTO approvals
    (id, workspace_id, review_round_id, version_id, guest_session_id,
     reviewer_username_snapshot, review_link_version, created_at)
SELECT md5('proofprint-showcase-approval-' || n)::uuid,
       md5('proofprint-showcase-workspace-' || n)::uuid,
       md5('proofprint-showcase-round-' || n || '-1')::uuid,
       md5('proofprint-showcase-version-' || n || '-1')::uuid,
       md5('proofprint-showcase-guest-' || n)::uuid,
       'Khách hàng demo ' || n, 1, now() - interval '4 hour'
FROM generate_series(5, 6) AS n ON CONFLICT DO NOTHING;

INSERT INTO comments
    (id, workspace_id, version_id, block_id, body, author_id,
     author_username_snapshot)
SELECT md5('proofprint-showcase-comment-' || n)::uuid,
       md5('proofprint-showcase-workspace-' || n)::uuid,
       md5('proofprint-showcase-version-' || n || '-1')::uuid,
       md5('proofprint-showcase-block-' || n || '-0')::uuid,
       'Thông số và hình ảnh đã được kiểm tra theo yêu cầu.',
       '22222222-2222-4222-8222-222222222222'::uuid, 'Minh Designer'
FROM generate_series(2, 6) AS n ON CONFLICT DO NOTHING;

INSERT INTO audit_events
    (id, workspace_id, actor_id, event_type, entity_type, entity_id, metadata)
SELECT md5('proofprint-showcase-audit-' || n)::uuid,
       md5('proofprint-showcase-workspace-' || n)::uuid,
       '22222222-2222-4222-8222-222222222222'::uuid,
       'WORKSPACE_CREATED', 'OrderWorkspace',
       md5('proofprint-showcase-workspace-' || n)::uuid,
       jsonb_build_object('source', 'showcase_seed')
FROM generate_series(1, 8) AS n ON CONFLICT DO NOTHING;

UPDATE order_workspaces SET
    latest_version_id = CASE WHEN n = 4
        THEN md5('proofprint-showcase-version-4-2')::uuid
        ELSE md5('proofprint-showcase-version-' || n || '-1')::uuid END,
    approved_version_id = CASE WHEN n IN (5, 6)
        THEN md5('proofprint-showcase-version-' || n || '-1')::uuid ELSE NULL END,
    production_version_id = CASE WHEN n = 6
        THEN md5('proofprint-showcase-version-6-1')::uuid ELSE NULL END
FROM generate_series(2, 6) AS n
WHERE order_workspaces.id = md5('proofprint-showcase-workspace-' || n)::uuid
  AND order_workspaces.latest_version_id IS NULL;

COMMIT;

SELECT workflow_status, record_status, count(*)
FROM order_workspaces
WHERE id IN (SELECT md5('proofprint-showcase-workspace-' || n)::uuid
             FROM generate_series(1, 8) AS n)
GROUP BY workflow_status, record_status ORDER BY workflow_status, record_status;
