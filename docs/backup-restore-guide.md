# Hướng Dẫn Vận Hành & Khôi Phục Hệ Thống (Disaster Recovery Guide)

Tài liệu này cung cấp hướng dẫn chi tiết từng bước bằng tiếng Việt để sao lưu (backup) và khôi phục (restore) toàn bộ hệ thống **ESP32/ESP8266 Meter System** khi xảy ra sự cố nghiêm trọng với máy ảo (VPS) hiện tại.

---

## 1. Tổng Quan Kiến Trúc Sao Lưu (Backup Architecture)

Hệ thống sao lưu mới hoạt động tự động theo cơ chế **Local-First & Cloud-Sync**:

1. **Đối tượng sao lưu**:
   - Cơ sở dữ liệu **MongoDB** (toàn bộ telemetry của thiết bị, lịch sử OTA, phân quyền tenant, user, thông tin claimed...).
   - Các tệp tin cấu hình môi trường sản xuất (`.env.prod`, `docker-compose.deploy.yml`, cấu hình và mật khẩu của `mosquitto`).
2. **Quy trình hoạt động**:
   - **Bước 1**: Đóng gói MongoDB dump và cấu hình.
   - **Bước 2**: Mã hóa nén gói sao lưu cục bộ bằng **AES-256-CBC** sử dụng mã khóa bảo mật (`BACKUP_PASSPHRASE` hoặc `JWT_SECRET` trong `.env.prod`). Điều này đảm bảo an toàn tuyệt đối nếu Google Drive bị xâm nhập.
   - **Bước 3**: Đồng bộ hóa gói mã hóa lên Google Drive thông qua công cụ `rclone` (profile `tma-agi-backup:esp32_meter`).
   - **Bước 4**: Tự động dọn dẹp (retention policy) giữ lại các bản sao lưu trong vòng **7 ngày gần nhất** trên cả VPS cục bộ và Google Drive để tối ưu hóa không gian lưu trữ.

---

## 2. Các Kịch Bản Sao Lưu Hằng Ngày (Daily Automation)

Script sao lưu được đặt tại: `scripts/backup-meter.sh` và được cấu hình chạy tự động vào lúc **03:00 AM hàng ngày** thông qua hệ thống `cron` của VPS.

### Cách kiểm tra nhật ký sao lưu:
Để kiểm tra xem việc sao lưu hằng ngày hoạt động ổn định hay không, sử dụng lệnh SSH sau:
```bash
ssh vps-prod "cat /home/tma_agi/mongodb_backups/backup.log"
```

### Cách chạy sao lưu thủ công (Khi chuẩn bị nâng cấp hệ thống):
Nếu bạn muốn thực hiện sao lưu thủ công ngay lập tức trước khi cập nhật mã nguồn hoặc hạ tầng:
```bash
ssh vps-prod "bash /home/tma_agi/esp32_loss_power_deploy/scripts/backup-meter.sh"
```

---

## 3. Quy Trình Khôi Phục Từ A-Z Trên VPS Mới (Disaster Recovery Steps)

Khi VPS cũ gặp sự cố không thể truy cập, hãy làm theo quy trình 6 bước dưới đây để đưa hệ thống hoạt động trở lại bình thường trên một VPS mới hoàn toàn.

### Bước 1: Chuẩn Bị VPS Mới & Mở Cổng Mạng (Ports)
1. Thuê/Khởi tạo một VPS mới (hệ điều hành đề xuất: **Ubuntu 20.04/22.04 LTS**).
2. Đảm bảo cấu hình tường lửa mở các cổng mạng sau:
   - `1883/TCP` (MQTT Broker dành cho ESP32/ESP8266 đẩy telemetry lên công khai).
   - `8080/TCP` (Cổng Web Dashboard dành cho người dùng truy cập).
   - `4422/TCP` hoặc `22/TCP` (Cổng SSH để quản trị máy chủ).

### Bước 2: Cài Đặt Docker & Docker Compose trên VPS mới
Truy cập SSH vào VPS mới và chạy các lệnh cài đặt môi trường cơ bản:
```bash
# Cập nhật hệ thống
sudo apt-get update && sudo apt-get upgrade -y

# Cài đặt Docker
curl -fsSL get.docker.com | bash
sudo usermod -aG docker $USER

# Cài đặt Git
sudo apt-get install -y git

# Khởi động lại terminal hoặc reload group để nhận quyền chạy docker không cần sudo
newgrp docker
```

### Bước 3: Cấu Hình Rclone để tải bản sao lưu từ Google Drive
Hệ thống sử dụng tài khoản Google Drive đã được ủy quyền để tải bản backup. 

1. Cài đặt `rclone` trên VPS mới:
   ```bash
   sudo apt-get install -y rclone
   ```
2. Tạo tệp tin cấu hình rclone tại thư mục `~/.config/rclone/rclone.conf` với nội dung kết nối tài khoản Google Drive của bạn (Sử dụng thông số từ cấu hình cũ):
   ```ini
   [tma-agi-backup]
   type = drive
   client_id = <YOUR_GOOGLE_CLIENT_ID>.apps.googleusercontent.com
   client_secret = <YOUR_GOOGLE_CLIENT_SECRET>
   scope = drive
   token = {"access_token":"<YOUR_ACCESS_TOKEN>","token_type":"Bearer","refresh_token":"<YOUR_REFRESH_TOKEN>","expiry":"2026-03-11T18:00:00Z"}
   ```
3. Kiểm tra xem kết nối Google Drive hoạt động ổn định và có nhìn thấy các bản backup hay không:
   ```bash
   rclone lsf tma-agi-backup:esp32_meter
   ```

### Bước 4: Clone Mã Nguồn Dự Án & Chuẩn Bị Thư Mục Deploy
Tải mã nguồn từ GitHub về đúng vị trí thư mục deploy:
```bash
# Clone repository
git clone git@github.com:mathangspk/ESP32_meter.git /home/tma_agi/esp32_loss_power_deploy

# Di chuyển vào thư mục deploy
cd /home/tma_agi/esp32_loss_power_deploy
```

### Bước 5: Thực Hiện Chạy Restore Tự Động
Mọi hành vi tải xuống, giải nén cấu hình, khởi tạo Docker và phục hồi dữ liệu sẽ do script `restore-meter.sh` đảm nhiệm.

1. Phân quyền và thực thi script restore:
   ```bash
   chmod +x scripts/restore-meter.sh
   ```
2. Chạy lệnh khôi phục bản sao lưu mới nhất trên Google Drive:
   ```bash
   ./scripts/restore-meter.sh --latest
   ```
   > [!IMPORTANT]
   > **Yêu cầu nhập khóa giải mã (Passphrase):** 
   > - Trình khôi phục sẽ tìm mã khóa giải mã trong tệp tin `.env.prod` đang có sẵn. 
   > - Nếu đây là VPS mới tinh chưa có tệp `.env.prod`, script sẽ hiển thị thông báo yêu cầu bạn nhập khóa giải mã bằng tay: `Enter decryption passphrase:`. 
   > - Hãy nhập chuỗi ký tự mật khẩu mã hóa tương ứng (là chuỗi `BACKUP_PASSPHRASE` hoặc `JWT_SECRET` của VPS cũ mà bạn đã lưu trữ an toàn).

3. Sau khi nhập đúng mật khẩu, hệ thống sẽ:
   - Tải bản backup từ Drive.
   - Giải mã và khôi phục lại các tệp cấu hình sản xuất (`.env.prod`, `docker-compose.deploy.yml`, v.v.).
   - Khởi chạy các Docker Container ứng dụng (`mosquitto`, `mongodb`, `backend`, `frontend`, `assistant-bot`).
   - Tự động chuyển đổi dữ liệu và khôi phục vào MongoDB.

### Bước 6: Kích Hoạt Lại Backup Tự Động Trên VPS Mới
Đừng quên kích hoạt lại tính năng backup định kỳ 03:00 sáng trên VPS mới để đảm bảo an toàn cho các ngày tiếp theo:
```bash
cd /home/tma_agi/esp32_loss_power_deploy
chmod +x scripts/setup-backup-cron.sh
./scripts/setup-backup-cron.sh
```

---

## 4. Kiểm Tra Sau Phục Hồi (Verification Checks)

Sau khi khôi phục xong, hãy đảm bảo hệ thống đã hoạt động chính xác bằng cách chạy các lệnh kiểm tra nhanh sau:

1. **Kiểm tra trạng thái các container**:
   ```bash
   docker ps
   ```
   *Yêu cầu*: Cả 5 dịch vụ (`mosquitto`, `mongodb`, `backend`, `frontend`, `assistant-bot`) đều ở trạng thái `Up`.

2. **Kiểm tra Health Endpoint của Backend**:
   ```bash
   curl -sS http://127.0.0.1:3000/healthz
   ```
   *Yêu cầu kết quả*: `{"status":"ok","mqttConnected":true,"mongodbConnected":true}`.

3. **Kiểm tra truy cập Dashboard**:
   Mở trình duyệt truy cập `http://<IP_VPS_MOI>:8080`.
   Đăng nhập bằng tài khoản quản trị cũ để kiểm tra xem danh sách thiết bị và biểu đồ số liệu đo đạc đã hiển thị đầy đủ hay chưa.

---

## 5. Khắc Phục Sự Cố Sao Lưu (Troubleshooting)

- **Lỗi: Decryption failed! Please check your passphrase**: Bạn đã nhập sai mật khẩu giải mã. Vui lòng chạy lại lệnh restore và cung cấp đúng khóa giải mã (`BACKUP_PASSPHRASE` hoặc `JWT_SECRET` đã được dùng khi sao lưu).
- **Lỗi: rclone remote not found**: Hãy kiểm tra lại đường dẫn tệp tin cấu hình `~/.config/rclone/rclone.conf` và đảm bảo tên remote trùng khớp với `tma-agi-backup`.
- **Lỗi: MongoDB container is not running**: Hãy chạy lệnh `docker logs esp32losspowerdeploy_mongodb_1` để xem nhật ký lỗi của database. Thông thường có thể do phân quyền thư mục lưu trữ `/data/db` bị sai lệch.
