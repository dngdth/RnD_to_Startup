# Thử hiển thị Markdown

File này dùng để kiểm tra cách trình xem Markdown hiển thị các loại block.

## Đoạn văn và nhấn mạnh

Đây là một đoạn văn có **chữ đậm**, *chữ nghiêng* và `mã nội tuyến`.

## Trích dẫn

> Đây là một block trích dẫn.
> Nó có thể kéo dài qua nhiều dòng.

## Danh sách

- Mục thứ nhất
- Mục thứ hai
  - Mục con

1. Bước một
2. Bước hai

## Checklist

- [x] Mục đã hoàn thành
- [ ] Mục chưa hoàn thành

## Bảng

| Thành phần | Trạng thái |
| --- | --- |
| Backend | Đang phát triển |
| Frontend | Đang phát triển |

## Code block

```python
def hello(name: str) -> str:
    return f"Xin chào, {name}!"
```

## Block chứa mã Markdown

Khối dưới đây hiển thị cú pháp Markdown như văn bản để so sánh với bản đã render:

```md
### Tiêu đề cấp 3

**Chữ đậm** và *chữ nghiêng*.

- Một mục trong danh sách
```

---

> [!NOTE]
> Một số trình xem hỗ trợ block ghi chú này; nếu không, nó sẽ hiện như trích dẫn thông thường.
