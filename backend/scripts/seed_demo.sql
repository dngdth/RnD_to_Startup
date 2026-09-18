\set ON_ERROR_STOP on

BEGIN;

-- Stable IDs make this seed safe to run more than once.
INSERT INTO users (id, email, display_name, system_role, status)
VALUES
    ('11111111-1111-4111-8111-111111111111', 'admin@proofprint.local',
     'ProofPrint Admin', 'ADMIN', 'ACTIVE'),
    ('22222222-2222-4222-8222-222222222222', 'designer@proofprint.local',
     'Minh Designer', 'DESIGNER', 'ACTIVE'),
    ('33333333-3333-4333-8333-333333333333', 'customer@proofprint.local',
     'Lan Customer', 'CUSTOMER', 'ACTIVE')
ON CONFLICT DO NOTHING;

INSERT INTO customers (id, name, code, status)
VALUES (
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    'Công ty Ánh Dương',
    'ANH-DUONG',
    'ACTIVE'
)
ON CONFLICT DO NOTHING;

INSERT INTO customer_users (customer_id, user_id, status)
VALUES (
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    '33333333-3333-4333-8333-333333333333',
    'ACTIVE'
)
ON CONFLICT DO NOTHING;

INSERT INTO designer_customer_assignments
    (designer_id, customer_id, assigned_by, status)
VALUES (
    '22222222-2222-4222-8222-222222222222',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    '11111111-1111-4111-8111-111111111111',
    'ACTIVE'
)
ON CONFLICT DO NOTHING;

-- One editable draft workspace.
INSERT INTO order_workspaces
    (id, customer_id, product_type, workflow_status, record_status, revision, created_by)
VALUES (
    'b1111111-1111-4111-8111-111111111111',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    'apparel',
    'DRAFT',
    'ACTIVE',
    0,
    '22222222-2222-4222-8222-222222222222'
)
ON CONFLICT DO NOTHING;

-- One workspace whose V1 is being reviewed by the customer.
INSERT INTO order_workspaces
    (id, customer_id, product_type, workflow_status, record_status, revision, created_by)
VALUES (
    'b2222222-2222-4222-8222-222222222222',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    'apparel',
    'IN_REVIEW',
    'ACTIVE',
    1,
    '22222222-2222-4222-8222-222222222222'
)
ON CONFLICT DO NOTHING;

INSERT INTO workspace_memberships
    (workspace_id, user_id, role, can_view, can_edit, can_review,
     can_approve, can_lock_production, status)
VALUES
    ('b1111111-1111-4111-8111-111111111111',
     '22222222-2222-4222-8222-222222222222',
     'DESIGNER', true, true, false, false, true, 'ACTIVE'),
    ('b1111111-1111-4111-8111-111111111111',
     '33333333-3333-4333-8333-333333333333',
     'CUSTOMER', true, false, true, true, false, 'ACTIVE'),
    ('b2222222-2222-4222-8222-222222222222',
     '22222222-2222-4222-8222-222222222222',
     'DESIGNER', true, true, false, false, true, 'ACTIVE'),
    ('b2222222-2222-4222-8222-222222222222',
     '33333333-3333-4333-8333-333333333333',
     'CUSTOMER', true, false, true, true, false, 'ACTIVE')
ON CONFLICT DO NOTHING;

INSERT INTO specification_blocks
    (id, workspace_id, block_type, label, content, position, schema_version,
     created_by, updated_by)
VALUES
    ('d1111111-1111-4111-8111-111111111111',
     'b1111111-1111-4111-8111-111111111111',
     'quantity', 'Số lượng', '{"value":100,"unit":"áo"}'::jsonb, 0, 1,
     '22222222-2222-4222-8222-222222222222',
     '22222222-2222-4222-8222-222222222222'),
    ('d1111111-1111-4111-8111-111111111112',
     'b1111111-1111-4111-8111-111111111111',
     'color', 'Màu áo', '{"name":"Đen","hex":"#111111"}'::jsonb, 1, 1,
     '22222222-2222-4222-8222-222222222222',
     '22222222-2222-4222-8222-222222222222'),
    ('d2222222-2222-4222-8222-222222222221',
     'b2222222-2222-4222-8222-222222222222',
     'print_area', 'Logo mặt sau',
     '{"surface":"back","width":25,"height":18,"unit":"cm"}'::jsonb, 0, 1,
     '22222222-2222-4222-8222-222222222222',
     '22222222-2222-4222-8222-222222222222'),
    ('d2222222-2222-4222-8222-222222222222',
     'b2222222-2222-4222-8222-222222222222',
     'material', 'Chất liệu',
     '{"name":"Cotton 100%","code":"COTTON-100"}'::jsonb, 1, 1,
     '22222222-2222-4222-8222-222222222222',
     '22222222-2222-4222-8222-222222222222')
ON CONFLICT DO NOTHING;

INSERT INTO specification_versions
    (id, workspace_id, number, previous_version_id, snapshot, content_hash,
     schema_version, created_by, created_at)
VALUES (
    'c2222222-2222-4222-8222-222222222222',
    'b2222222-2222-4222-8222-222222222222',
    1,
    NULL,
    '[{"id":"d2222222-2222-4222-8222-222222222221","block_type":"print_area","label":"Logo mặt sau","content":{"surface":"back","width":25,"height":18,"unit":"cm"},"position":0},{"id":"d2222222-2222-4222-8222-222222222222","block_type":"material","label":"Chất liệu","content":{"name":"Cotton 100%","code":"COTTON-100"},"position":1}]'::jsonb,
    encode(sha256(convert_to('[{"id":"d2222222-2222-4222-8222-222222222221","block_type":"print_area","label":"Logo mặt sau","content":{"surface":"back","width":25,"height":18,"unit":"cm"},"position":0},{"id":"d2222222-2222-4222-8222-222222222222","block_type":"material","label":"Chất liệu","content":{"name":"Cotton 100%","code":"COTTON-100"},"position":1}]', 'UTF8')), 'hex'),
    1,
    '22222222-2222-4222-8222-222222222222',
    now() - interval '1 day'
)
ON CONFLICT DO NOTHING;

INSERT INTO review_rounds
    (id, workspace_id, version_id, status, opened_at)
VALUES (
    'e2222222-2222-4222-8222-222222222222',
    'b2222222-2222-4222-8222-222222222222',
    'c2222222-2222-4222-8222-222222222222',
    'OPEN',
    now() - interval '1 day'
)
ON CONFLICT DO NOTHING;

INSERT INTO change_requests
    (id, workspace_id, review_round_id, version_id, block_id, field_path,
     message, status, requested_by)
VALUES (
    'f2222222-2222-4222-8222-222222222222',
    'b2222222-2222-4222-8222-222222222222',
    'e2222222-2222-4222-8222-222222222222',
    'c2222222-2222-4222-8222-222222222222',
    'd2222222-2222-4222-8222-222222222221',
    'content.width',
    'Vui lòng giảm chiều rộng vùng in từ 25 cm xuống 20 cm.',
    'REQUESTED',
    '33333333-3333-4333-8333-333333333333'
)
ON CONFLICT DO NOTHING;

INSERT INTO comments
    (id, workspace_id, version_id, block_id, change_request_id, body, author_id)
VALUES (
    'f3333333-3333-4333-8333-333333333333',
    'b2222222-2222-4222-8222-222222222222',
    'c2222222-2222-4222-8222-222222222222',
    'd2222222-2222-4222-8222-222222222221',
    'f2222222-2222-4222-8222-222222222222',
    'Kích thước 20 cm sẽ cân đối hơn với mẫu áo.',
    '33333333-3333-4333-8333-333333333333'
)
ON CONFLICT DO NOTHING;

INSERT INTO audit_events
    (id, workspace_id, actor_id, event_type, entity_type, entity_id, version_id, metadata)
VALUES
    ('a1111111-1111-4111-8111-111111111111',
     'b1111111-1111-4111-8111-111111111111',
     '22222222-2222-4222-8222-222222222222',
     'WORKSPACE_CREATED', 'OrderWorkspace',
     'b1111111-1111-4111-8111-111111111111', NULL,
     '{"source":"demo_seed"}'::jsonb),
    ('a2222222-2222-4222-8222-222222222222',
     'b2222222-2222-4222-8222-222222222222',
     '22222222-2222-4222-8222-222222222222',
     'VERSION_RELEASED', 'SpecificationVersion',
     'c2222222-2222-4222-8222-222222222222',
     'c2222222-2222-4222-8222-222222222222',
     '{"source":"demo_seed","version_number":1}'::jsonb)
ON CONFLICT DO NOTHING;

INSERT INTO outbox_messages (id, event_type, payload, status)
VALUES (
    'a3333333-3333-4333-8333-333333333333',
    'CHANGE_REQUEST_CREATED',
    '{"workspace_id":"b2222222-2222-4222-8222-222222222222","change_request_id":"f2222222-2222-4222-8222-222222222222"}'::jsonb,
    'PENDING'
)
ON CONFLICT DO NOTHING;

UPDATE order_workspaces
SET latest_version_id = 'c2222222-2222-4222-8222-222222222222'
WHERE id = 'b2222222-2222-4222-8222-222222222222'
  AND latest_version_id IS NULL;

COMMIT;

SELECT id, email, system_role, status
FROM users
WHERE email LIKE '%@proofprint.local'
ORDER BY system_role, email;

SELECT id, product_type, workflow_status, record_status, latest_version_id
FROM order_workspaces
WHERE id IN (
    'b1111111-1111-4111-8111-111111111111',
    'b2222222-2222-4222-8222-222222222222'
)
ORDER BY id;
