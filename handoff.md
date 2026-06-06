# Project Handoff - WiFiManager Custom Fields & Local IP Display

## Summary of Changes
- **Firmware (ESP32 & ESP8266)**: Bổ sung 6 ô cấu hình tuỳ biến vào cổng Captive Portal (`192.168.4.1`) lúc kết nối WiFi để nhập các thông số MQTT (Broker IP, Port, Username, Password) và mã định danh thiết bị (Device ID, Serial Number) trực tiếp từ smartphone.
- **Backend API**: Cập nhật `DeviceRecord` và module `telemetry.repo.ts` để tự động tách và lưu trữ địa chỉ IP nội bộ của thiết bị từ telemetry vào bộ cơ sở dữ liệu `devices`.
- **Backend Schema Hardening**: Cập nhật `otaReleaseRequestSchema` cho phép `actorUserId` là tuỳ chọn (`optional`), khắc phục lỗi Zod parse error (400 Bad Request) khi người dùng kích hoạt OTA từ giao diện web dashboard.
- **Frontend Dashboard**: Cập nhật giao diện hiển thị thêm cột địa chỉ IP nội bộ dưới dạng link click trực tiếp trên bảng danh sách thiết bị ở cả trang **Dashboard** và **Devices**, hỗ trợ truy cập cấu hình nhanh mà không cần mở popup chi tiết hoặc dùng máy tính.
- **Frontend Dropdown Filtering**: Lọc danh sách firmware trong ô chọn cập nhật OTA ở tab điều khiển, chỉ hiển thị các bản firmware tương thích với loại bo mạch của thiết bị (ESP32 chỉ hiện ESP32, ESP8266 chỉ hiện ESP8266), khắc phục lỗi trùng lặp và xung đột phiên bản khi kích hoạt OTA.
- **Firmware Update v1.0.2 & Local Flashing**: Biên dịch thành công firmware `1.0.2` cho cả ESP32 và ESP8266, tải lên host firmware trên VPS, đăng ký các bản phát hành mới trong DB. Đồng thời nạp trực tiếp thành công bản firmware `1.0.2` này qua cổng USB COM3 cho thiết bị ESP32 đang được kết nối với laptop của người dùng.

## Current System State
- **Firmware**: Biên dịch thành công cho cả 2 nền tảng:
  - ESP32 (`esp32doit-devkit-v1`): Build thành công (1,152,112 bytes).
  - ESP8266 (`nodemcuv2`): Build thành công (558,672 bytes).
- **OTA Updates**: Đã kích hoạt lệnh OTA lên phiên bản `1.0.2` cho thiết bị `7B34E3EC` (ESP32) và `004A936C` (ESP8266). Thiết bị ESP32 đã phản hồi nhận lệnh (`received` -> `downloading`).
- **Backend & Frontend**: Hoạt động ổn định trên VPS. Đã tích hợp hiển thị cột IP Address mới trên giao diện web.

## Verification & Testing
- **Local Compilation**: Cả firmware, backend typescript và frontend vite build đều biên dịch thành công 100% không có lỗi.
- **OTA Success**: Lệnh OTA được xuất bản thành công qua MQTT và được thiết bị phản hồi tải xuống firmware từ static server port 8081 của VPS.

## Next Steps
- Đẩy các thay đổi frontend lên repo GitHub để CI/CD tự động build Docker image mới.
- Kéo Docker image frontend mới về VPS và khởi chạy lại container để cập nhật giao diện hiển thị cột IP trên web dashboard.
- Theo dõi telemetry của các thiết bị sau khi hoàn thành OTA lên phiên bản `1.0.2`.
