"""Create the nine-section hoodie example from the supplied management UI ZIP.

Only runs against the local proofprint database. Existing example data is left intact.
"""

from __future__ import annotations

import hashlib
import json
from copy import deepcopy
from datetime import UTC, datetime, timedelta
from urllib.parse import urlsplit
from uuid import UUID

import psycopg
from psycopg.types.json import Jsonb

from proofprint.infrastructure.database import Settings


def stable_id(name: str) -> UUID:
    return UUID(hashlib.md5(f"proofprint-hoodie-{name}".encode()).hexdigest())


DESIGNER = UUID("22222222-2222-4222-8222-222222222222")
CUSTOMER = stable_id("customer")
WORKSPACE = stable_id("workspace")
LINK = stable_id("link")
GUEST = stable_id("guest")
NOW = datetime.now(UTC)

# Titles and details reproduce the nine specification groups in proofprint (1).zip.
BLOCKS = [
    ("text", "Sản phẩm", {"value": "Áo Hoodie chui đầu vai trễ nỉ dày cao cấp", "Form dáng": "Boxy unisex oversized streetwear", "Thiết kế vai": "Thả vai (Drop-shoulder) tự nhiên", "File thiết kế": "TechPack_Hoodie_NorthPeak_v04.pdf"}),
    ("material", "Chất liệu vải", {"value": "420 GSM · 100% Cotton · French Terry", "Định lượng": "420 GSM ±10", "Loại sợi": "32/2 · Combed Ring-Spun", "Mặt vải": "French Terry · Vảy cá"}),
    ("color", "Màu sắc", {"value": "Màu chỉ định Pantone 19-4052 TCX (Xanh Navy cổ điển)", "Độ bền màu": "Cấp 4-5 · Chuẩn Oeko-Tex Standard 100", "Công nghệ nhuộm": "Nhuộm hoạt tính Eco-Reactive", "Mã HEX tham chiếu": "#1F2937"}),
    ("quantity", "Số lượng", {"value": 60, "unit": "sản phẩm", "Size S": "10 cái", "Size M": "25 cái", "Size L": "20 cái", "Size XL": "5 cái", "Tổng đơn hàng": "60 cái"}),
    ("dimension", "Kích thước & Bản rập", {"value": "Bản rập Japanese Streetwear Pattern #NP-HW04", "Rộng ngực 1/2": "64 cm (Size M) / 67 cm (Size L)", "Dài áo (HPS)": "72 cm (Size M) / 74 cm (Size L)", "Độ hạ vai": "22 cm dáng xuôi mềm", "Dài tay áo": "62 cm có ly xếp nách cử động"}),
    ("print_area", "Logo & Hình in", {"Logo ngực trước": "Mini Wordmark (10 × 2.5 cm) in silicone cao thành 3D puff", "Logo lưng sau": "Emblem chính: 20 × 15 cm (thu gọn để không bị nón áo che)", "Công thức mực": "Plastisol bổ sung phụ gia soft-hand mịn tay, sấy khô mờ", "Màu sắc in": "Warm Off-White (Pantone 11-0601 TCX)"}),
    ("print_area", "Vị trí in ấn", {"Vị trí in ngực": "Cách cổ áo 7.5 cm, căn tim chính giữa thân trước", "Vị trí in lưng": "Cách bo viền cổ sau 14.0 cm (hạ thấp thêm 2 cm để nón không đè lên)", "Dung sai định vị": "± 0.5 cm căn chỉnh bằng tia laser công nghiệp"}),
    ("file", "Tệp thiết kế", {"value": "design_v4.png", "Bản in chuẩn": "hoodie_back_vector_final_v4.pdf", "Định dạng": "Vector CMYK"}),
    ("note", "Ghi chú sản xuất", {"Kỹ thuật may": "Trần đè 2 kim gia cố chịu lực vòng nách, cầu vai và gấu áo", "Dây rút nón": "100% Cotton dệt dẹp bản 15 mm có đầu bọc kim loại khắc logo", "Nhãn mác": "Nhãn dệt satin chính cổ áo + nhãn giặt hướng dẫn sườn trái", "Quy cách bao gói": "Túi zip mờ sinh học tự phân hủy có dán nhãn mã vạch"}),
]


def snapshot(number: int) -> list[dict]:
    result = []
    for position, (block_type, label, final_content) in enumerate(BLOCKS):
        content = deepcopy(final_content)
        if number < 4:
            if position == 3:
                content.update({"value": 50, "Size M": "20 cái", "Size L": "15 cái", "Tổng đơn hàng": "50 cái"})
            elif position == 5:
                content["Logo lưng sau"] = "Emblem chính: 25 × 18 cm"
            elif position == 6:
                content["Vị trí in lưng"] = "Cách bo viền cổ sau 12.0 cm"
            elif position == 7:
                content.update({"value": "design_v3.png", "Bản in chuẩn": "hoodie_back_v3.png", "Định dạng": "Raster"})
        result.append({"id": str(stable_id(f"block-{position}")), "block_type": block_type, "label": label, "content": content, "position": position})
    return result


def main() -> None:
    database_url = Settings().database_url
    target = urlsplit(database_url)
    if target.hostname not in {"127.0.0.1", "localhost"} or target.path != "/proofprint":
        raise SystemExit("Hoodie seed is restricted to a local proofprint database")
    psycopg_url = database_url.replace("postgresql+psycopg://", "postgresql://", 1)
    with psycopg.connect(psycopg_url) as conn, conn.cursor() as cur:
        if cur.execute("SELECT 1 FROM order_workspaces WHERE id = %s", (WORKSPACE,)).fetchone():
            print(f"Hoodie Workspace already exists: {WORKSPACE}")
            return
        cur.execute("INSERT INTO customers (id, name, code, status, email, phone, created_by) VALUES (%s, %s, %s, 'ACTIVE', %s, %s, %s) ON CONFLICT DO NOTHING", (CUSTOMER, "NorthPeak Apparel", "HOODIE-DEMO", "emma@example.invalid", "09000001024", DESIGNER))
        cur.execute("INSERT INTO order_workspaces (id, customer_id, product_type, workflow_status, record_status, revision, created_by) VALUES (%s, %s, %s, 'IN_REVIEW', 'ACTIVE', 4, %s)", (WORKSPACE, CUSTOMER, "Áo Hoodie dáng rộng vải nỉ dày cao cấp", DESIGNER))
        cur.execute("INSERT INTO workspace_memberships (workspace_id, user_id, role, can_view, can_edit, can_review, can_approve, can_lock_production, status) VALUES (%s, %s, 'DESIGNER', true, true, false, false, true, 'ACTIVE')", (WORKSPACE, DESIGNER))
        cur.execute("INSERT INTO workspace_review_links (id, workspace_id, version, status, created_by) VALUES (%s, %s, 1, 'ACTIVE', %s)", (LINK, WORKSPACE, DESIGNER))
        cur.execute("INSERT INTO workspace_guest_sessions (id, review_link_id, workspace_id, username, token_hash, status, expires_at) VALUES (%s, %s, %s, 'Emma Watson', %s, 'ACTIVE', %s)", (GUEST, LINK, WORKSPACE, hashlib.sha256(b"proofprint-hoodie-seed-guest-token").hexdigest(), NOW + timedelta(days=30)))
        latest = snapshot(4)
        for block in latest:
            cur.execute("INSERT INTO specification_blocks (id, workspace_id, block_type, label, content, position, schema_version, created_by, updated_by) VALUES (%s, %s, %s, %s, %s, %s, 1, %s, %s)", (UUID(block["id"]), WORKSPACE, block["block_type"], block["label"], Jsonb(block["content"]), block["position"], DESIGNER, DESIGNER))
        for number in range(1, 5):
            data = snapshot(number)
            canonical = json.dumps(data, ensure_ascii=False, sort_keys=True)
            cur.execute("INSERT INTO specification_versions (id, workspace_id, number, previous_version_id, snapshot, content_hash, schema_version, created_by, created_at) VALUES (%s, %s, %s, %s, %s, %s, 1, %s, %s)", (stable_id(f"version-{number}"), WORKSPACE, number, stable_id(f"version-{number - 1}") if number > 1 else None, Jsonb(data), hashlib.sha256(canonical.encode()).hexdigest(), DESIGNER, NOW - timedelta(days=4 - number)))
        for number in range(1, 5):
            status = "OPEN" if number == 4 else "CHANGES_REQUESTED"
            cur.execute("INSERT INTO review_rounds (id, workspace_id, version_id, status, opened_at, closed_at) VALUES (%s, %s, %s, %s, %s, %s)", (stable_id(f"round-{number}"), WORKSPACE, stable_id(f"version-{number}"), status, NOW - timedelta(days=4 - number, hours=3), None if number == 4 else NOW - timedelta(days=4 - number, hours=2)))
        cur.execute("UPDATE order_workspaces SET latest_version_id = %s WHERE id = %s", (stable_id("version-4"), WORKSPACE))
        requests = [
            ("quantity", 3, 3, "content.value", "Vui lòng tăng tổng số lượng từ 50 lên 60 sản phẩm, thêm 5 size M và 5 size L.", "UPDATED", 4),
            ("product", 0, 4, None, "Form áo boxy drop-shoulder rất chuẩn. Nhờ xưởng may nón 2 lớp lót bằng chính vải chính nhé.", "REQUESTED", None),
        ]
        for key, position, number, field, message, status, resolved in requests:
            cur.execute("INSERT INTO change_requests (id, workspace_id, review_round_id, version_id, block_id, field_path, message, status, requested_by_guest_session_id, requester_username_snapshot, acknowledged_by, resolved_in_version_id) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, 'Emma Watson', %s, %s)", (stable_id(f"request-{key}"), WORKSPACE, stable_id(f"round-{number}"), stable_id(f"version-{number}"), stable_id(f"block-{position}"), field, message, status, GUEST, DESIGNER if resolved else None, stable_id(f"version-{resolved}") if resolved else None))
        cur.execute("INSERT INTO comments (id, workspace_id, version_id, block_id, body, guest_session_id, author_username_snapshot) VALUES (%s, %s, %s, %s, %s, %s, 'Emma Watson')", (stable_id("comment-logo"), WORKSPACE, stable_id("version-4"), stable_id("block-5"), "Ở bản v03 logo 25 cm bị nón áo che một phần. Kích thước 20 × 15 cm này nhìn thoáng hơn nhiều!", GUEST))
        cur.execute("INSERT INTO comments (id, workspace_id, version_id, block_id, body, author_id, author_username_snapshot) VALUES (%s, %s, %s, %s, %s, %s, 'Minh Designer')", (stable_id("comment-quantity"), WORKSPACE, stable_id("version-4"), stable_id("block-3"), "Đã cập nhật tổng số lượng lên 60 cái theo yêu cầu của Emma.", DESIGNER))
    print(f"Created hoodie Workspace with {len(BLOCKS)} sections and 4 versions: {WORKSPACE}")


if __name__ == "__main__":
    main()
