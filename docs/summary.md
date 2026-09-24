# Tóm tắt thay đổi Workspace

## Luồng chỉnh sửa và phiên bản

- Hồ sơ ở trạng thái chờ duyệt, đã duyệt hoặc đã khóa vẫn cho phép designer chọn **Sửa trong bản mới** hoặc **Thêm hạng mục mới**. Ứng dụng mở bản nháp mới từ hồ sơ hiện tại. Phiên bản đã phát hành (V1, V2…) luôn giữ nguyên.
- Nếu phiên bản đang chờ khách duyệt, thao tác mở bản nháp sẽ kết thúc lượt duyệt đó. Designer sửa/thêm hạng mục rồi chọn **Lưu và phát hành V2** (hoặc số tiếp theo) để phát hành ngay. Có thể chọn **Chỉ lưu bản nháp** để sửa nhiều hạng mục, sau đó nhấn **Phát hành V2**. Lần phát hành này mở lượt duyệt mới cho khách.
- Trong tab **Phiên bản**, chọn thẻ V1/V2 để xem nội dung và thay đổi của từng phiên bản. Khi đang có bản nháp, thẻ **Bản nháp đang chỉnh sửa** xuất hiện trước các phiên bản đã phát hành.
- Nút thêm hạng mục nằm sau hạng mục cuối trong hồ sơ. Cuối hồ sơ có **Link sản phẩm cho khách hàng** để sao chép hoặc mở trang khách xem và góp ý.

## Chênh lệch và ảnh đính kèm

- Thay đổi hiển thị bằng chữ theo hạng mục và thuộc tính, ví dụ **Màu sắc: xanh → đỏ**. Hạng mục thêm/xóa cũng được tóm tắt bằng chữ. Giao diện so sánh không in JSON thô.
- Tab **Ảnh đính kèm** hiển thị ảnh đã gắn vào hạng mục. Trong bản nháp, chọn loại **Ảnh đính kèm**, kéo thả hoặc chọn nhiều ảnh. Ảnh được tải lên database thật rồi xem trước ngay; hạng mục lưu danh sách ảnh và chú thích. Mỗi ảnh tối đa 15 MB, mỗi hạng mục tối đa 20 ảnh. API kiểm tra nội dung tệp thay vì chỉ tin phần mở rộng. Các định dạng hỗ trợ: PNG, JPEG, GIF, WebP, SVG an toàn, BMP, TIFF, ICO, AVIF, HEIC/HEIF. Trình duyệt có thể không giải mã được HEIC/TIFF tùy máy; khi đó ứng dụng báo không xem được ảnh.

## Nội dung chi tiết và thông báo

- Loại hạng mục **Nội dung chi tiết (.md)** cho phép chọn file Markdown hoặc tự nhập. Toàn bộ chữ được lưu trong block của bản nháp và snapshot của từng phiên bản. Hồ sơ designer và khách hàng đều hiển thị tiêu đề, danh sách, bảng, trích dẫn, liên kết và đoạn mã. HTML trong file được hiện như chữ để tránh thực thi mã từ tài liệu.
- Thông báo lỗi và thành công ở Workspace, trang tạo đơn và cổng khách tự ẩn sau 5 giây. Link sản phẩm vẫn nằm ở cuối hồ sơ để sao chép sau khi thông báo ẩn.
- Tên khách được nhớ theo từng review link trên trình duyệt. Nếu cookie phiên khách còn hạn thì mở lại không cần nhập tên; nếu cookie hết hạn nhưng link vẫn còn hiệu lực, ứng dụng dùng tên đã nhớ để tạo phiên mới. Thoát khỏi cổng khách sẽ xóa tên đã nhớ của link đó. Đổi review link tạo danh tính nhớ riêng cho link mới.

## Thay đổi kỹ thuật

- API mở bản nháp (`POST /api/v1/workspaces/{workspace_id}/revisions`) chấp nhận Workspace đang `IN_REVIEW`. Backend đóng review round đang mở, đổi trạng thái sang `DRAFT` và ghi audit trong cùng giao dịch. Khi phát hành, API version hiện có tạo số phiên bản kế tiếp.
- Migration `0014_asset_image_data` thêm bảng lưu dữ liệu ảnh. API `POST /api/v1/workspaces/{workspace_id}/images` nhận dữ liệu ảnh, `If-Match` và tên file; trả ID ảnh cùng revision mới. API `GET /api/v1/workspaces/{workspace_id}/images/{asset_id}` trả ảnh cho designer có quyền. Khách chỉ xem được ảnh đã gắn vào bản nháp đang mở cho khách hoặc một phiên bản đã phát hành; ảnh mới tải lên nhưng chưa gắn vào hạng mục không thể truy cập từ phiên khách. Mỗi lần tải ảnh tăng revision, vì vậy nhiều ảnh được tải lên tuần tự để tránh lỗi `If-Match`.
- Màu nền, màu nhấn cam và xanh của ứng dụng được giữ nguyên. Các thay đổi tập trung vào điều hướng, nút hành động và cách trình bày nội dung.

## Rà soát lỗi, bảo mật và kiến trúc

- **Phiên khách:** nút Đăng xuất gọi `DELETE /api/v1/guest/sessions/current`. Backend thu hồi phiên trong database và xóa cookie HttpOnly. Nếu API không kết nối được, giao diện báo lỗi để khách thử lại, tránh hiển thị trạng thái đã đăng xuất trong khi phiên vẫn còn hiệu lực.
- **Quyền xem ảnh:** endpoint ảnh kiểm tra ảnh đang được tham chiếu bởi block trong bản nháp khách đang thấy hoặc snapshot của một phiên bản đã phát hành. Workspace đã hủy không cho khách đọc ảnh. SVG có khai báo DTD, entity hoặc stylesheet bị từ chối trước khi phân tích.
- **Kiểm tra dữ liệu hạng mục:** kích thước và vùng in từ chối `NaN`, vô cực và số vượt phạm vi; số lượng từ chối giá trị quá lớn; nội dung chữ được giới hạn. Block ảnh không chấp nhận đồng thời `asset_id` và `asset_ids` để tránh tham chiếu nhập nhằng. SVG từ chối tham chiếu URL bên ngoài và các thẻ animation; truy vấn quyền xem ảnh trong phiên bản chạy trực tiếp trên JSONB thay vì tải toàn bộ lịch sử vào bộ nhớ.
- **Tải nhiều ảnh:** dù bước tải lại Workspace thất bại, giao diện vẫn thoát trạng thái bận và giữ ID của ảnh đã tải thành công. Lỗi được báo cùng kết quả tải từng phần. Trình xem ảnh xóa URL cũ khi đổi ảnh; bước tải ảnh xử lý HTTP 401 giống các API khác. File `.md` vượt 100 KB bị chặn ngay ở giao diện.
- **Clean Architecture:** router chỉ dùng use case qua `presentation/api/dependencies.py`; việc tạo repository và unit of work nằm trong `infrastructure/di/providers.py`. Kiểm thử kiến trúc mới ngăn router nhập trực tiếp `infrastructure` hoặc SQLAlchemy.
- **Cấu hình production:** đặt `DEPLOYMENT_MODE=production` để backend bắt buộc khóa bí mật riêng, URL database được cấu hình, URL review và CORS dùng HTTPS, cookie phiên khách có cờ `Secure`. Cấu hình phát triển hiện tại giữ `DEPLOYMENT_MODE=development` để chạy tại localhost.

Đã chạy `pytest -q -p no:cacheprovider`: **106 passed, 6 skipped**; các bài bị bỏ qua cần `PROOFPRINT_TEST_DATABASE_URL`. Ruff, kiểm tra TypeScript và bản build frontend đều đạt. Tắt cache provider vì cache của `pytest` trên máy này không tạo được thư mục tạm. Mã backend mới đã chạy và trả `/health` thành công trên cổng 8001 để kiểm tra. Cổng 8000 vẫn có một listener ProofPrint giữ, nhưng Windows không thấy PID của listener đó trong danh sách tiến trình để dừng; chưa xác nhận cổng 8000 đã nạp mã mới. Khởi động lại API đang phục vụ cổng 8000 trong môi trường chạy ứng dụng để giao diện nhận thay đổi mới.

Giới hạn của lần rà soát: chưa chạy các bài tích hợp trên database thử nghiệm riêng và chưa kiểm thử tải hoặc thâm nhập. Khi đưa hệ thống ra Internet, cần thêm giới hạn tần suất đăng nhập và dung lượng lưu ảnh tại gateway hoặc tầng hạ tầng.
