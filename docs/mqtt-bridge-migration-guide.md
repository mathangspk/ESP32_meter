# Hướng dẫn Đồng bộ & Cấu hình Dự phòng MQTT (Redundancy & Migration Guide)

Tài liệu này hướng dẫn cách di chuyển (migrate) các thiết bị đang chạy phiên bản cũ kết nối với Server cũ sang hệ thống mới, đồng thời cấu hình Cầu nối MQTT (MQTT Bridge) để đảm bảo đồng bộ dữ liệu thời gian thực giữa hai Server chính và dự phòng.

---

## 1. Nâng cấp OTA cho Thiết bị chạy Firmware cũ

Để đồng bộ các thiết bị cũ lên phiên bản firmware mới (chứa cơ chế failover dự phòng), bạn cần gửi lệnh OTA qua Broker cũ (`113.161.220.166`).

### Các bước thực hiện:

1. **Chuẩn bị file firmware mới**: Đảm bảo file `.bin` biên dịch mới nhất đã được đẩy lên file server của VPS mới (mặc định chạy trên cổng `8081` của Server chính `167.71.207.5`).
   - URL cho ESP32: `http://167.71.207.5:8081/esp32-meter-1.0.3.bin`
   - URL cho ESP8266: `http://167.71.207.5:8081/esp8266-meter-1.0.3.bin`

2. **Gửi lệnh OTA qua MQTT**: Sử dụng công cụ `mosquitto_pub` trên server hoặc máy cá nhân để gửi bản tin lệnh nâng cấp tới Broker cũ:

   ```bash
   # Thay đổi <device_serial> và <device_id> tương ứng với thiết bị của bạn
   mosquitto_pub -h 113.161.220.166 -p 1883 \
     -u "meterMQTT" -P "meterMQTT" \
     -t "firmwareUpdateOTA/device/<device_serial>" \
     -m '{"job_id":"migration-ota-103","device_id":"<device_id>","serial_number":"<device_serial>","version":"1.0.3","url":"http://167.71.207.5:8081/esp8266-meter-1.0.3.bin"}'
   ```

3. **Xác nhận**: Thiết bị cũ nhận lệnh, tải xuống firmware từ Server chính mới, nâng cấp và khởi động lại. Khi khởi động lại, thiết bị chạy phiên bản mới sẽ tự động kết nối với Server chính (`167.71.207.5`) trước tiên.

---

## 2. Cấu hình Cầu nối MQTT hai chiều (Bidirectional MQTT Bridge)

Khi thiết bị gửi dữ liệu đến Server dự phòng (trong lúc Server chính bị rớt), dữ liệu cần được tự động đẩy về Server chính khi Server chính hoạt động trở lại. Cơ chế **MQTT Bridge** sẽ đảm nhận việc này bằng cách xếp hàng dữ liệu tại chỗ và gửi đi khi khôi phục kết nối.

Cấu hình này sẽ được thiết lập trên Mosquitto của **Server phụ (`113.161.220.166`)**.

### Cấu hình `mosquitto.conf` trên Server phụ:

Mở cấu hình Mosquitto của Server phụ và thêm đoạn cấu hình sau:

```ini
# Thiết lập kết nối cầu tới Server chính
connection bridge-to-primary
address 167.71.207.5:1883

# Thông tin đăng nhập vào Broker chính
remote_username meterMQTT
remote_password meterMQTT

# --- Định nghĩa luồng dữ liệu ---

# 1. Đẩy dữ liệu Telemetry từ phụ sang chính (out)
# Định dạng: topic [pattern] [direction] [local-prefix] [remote-prefix]
topic meter/+/telemetry out 0

# 2. Nhận các lệnh điều khiển (Control) từ chính về phụ (in)
topic meter/+/control in 0

# 3. Nhận các lệnh nâng cấp OTA từ chính về phụ (in)
topic firmwareUpdateOTA/device/+ in 0

# --- Cấu hình độ tin cậy ---
# Giữ hàng đợi tin nhắn khi Server chính bị offline
cleansession false
# Lưu trữ dữ liệu xếp hàng vào ổ đĩa khi Broker restart
persistence true
persistence_location /mosquitto/data/
# Trạng thái kết nối cầu
notifications true
restart_timeout 10
```

### Cách thức hoạt động:
- **Khi cả hai Server đều online**: Telemetry gửi vào Server nào cũng sẽ hiển thị ở cả hai nơi. Bạn có thể gửi lệnh điều khiển từ Server chính, lệnh sẽ tự động cầu về Server phụ nếu thiết bị đang kết nối ở đó.
- **Khi Server chính sập**: Thiết bị tự chuyển sang gửi cho Server phụ. Broker phụ lưu trữ tất cả tin nhắn telemetry vào ổ đĩa (persistence) nhờ cấu hình `cleansession false`.
- **Khi Server chính online trở lại**: Cầu nối tự động kết nối lại và "xả" toàn bộ hàng đợi dữ liệu tích lũy về Server chính. Backend chính sẽ lưu trữ đầy đủ vào MongoDB chính mà không mất mát điểm dữ liệu nào.

---

## 3. Khôi phục Thảm họa (Disaster Recovery)

Nếu Server chính gặp sự cố vật lý không thể khôi phục (chết hoàn toàn):

1. **Khôi phục cấu hình hệ thống**: Sử dụng kịch bản khôi phục đã cấu hình sẵn để khôi phục các thông tin người dùng và liên kết thiết bị mới nhất từ bản sao lưu Google Drive lên Server phụ:
   ```bash
   ./restore-meter.sh --latest
   ```
2. **Promote Server phụ**: Chuyển cấu hình DNS hoặc đổi vai trò của Server phụ làm Server chính. Lúc này Server phụ đã có đầy đủ 100% dữ liệu lịch sử đo đạc nhờ cơ chế cầu nối chạy trước đó.
