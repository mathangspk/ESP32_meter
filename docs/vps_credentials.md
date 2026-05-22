# Báo cáo Thông tin Đăng nhập & Cấu hình Hệ thống VPS

Tài liệu này tổng hợp toàn bộ thông tin đăng nhập, địa chỉ truy cập SSH, cấu hình dịch vụ mạng và các tài khoản quản trị hệ thống sản xuất của dự án **ESP32/ESP8266 Meter System**.

---

## 1. Thông tin Kết nối SSH truy cập máy chủ (VPS SSH Login)

Để truy cập vào hệ điều hành máy chủ VPS qua terminal, sử dụng các thông số kỹ thuật sau:

| Thông số | Giá trị | Ghi chú |
| :--- | :--- | :--- |
| **SSH Host / IP** | `100.77.157.70` | Địa chỉ IP nội bộ trong mạng **Tailscale** |
| **SSH User** | `tma_agi` | Người dùng có quyền chạy Docker / Docker-compose |
| **SSH Port** | `4422` | Cổng SSH bảo mật đã được thay đổi (không phải cổng 22 mặc định) |
| **Private Key Path** | `~/.ssh/opencode_vps` | Khóa SSH private key cục bộ trên máy tính của bạn |
| **SSH Alias** | `vps-prod` | Cấu hình SSH config tiện lợi (`ssh vps-prod`) |

> [!TIP]
> **Lệnh kết nối SSH nhanh:**
> ```bash
> ssh tma_agi@100.77.157.70 -p 4422 -i ~/.ssh/opencode_vps
> ```
> Hoặc nếu bạn đã thêm cấu hình vào tệp tin `~/.ssh/config` trên máy cục bộ:
> ```bash
> ssh vps-prod
> ```

---

## 2. Thông tin Dịch vụ & Tài khoản Quản trị (Services & Credentials)

Các container dịch vụ đang chạy trên VPS được cấu hình bảo mật phân lớp:

### 2.1. Web Dashboard (Frontend React + Nginx)
*   **Địa chỉ URL công khai:** `http://113.161.220.166:8080` (hoặc qua Tailscale `http://100.77.157.70:8080`)
*   **Tài khoản quản trị Web:**
    *   **Username:** `admin`
    *   **Password:** `Admin@2024!Secure` *(Lưu cấu hình trong tệp tin `.env.prod` tại thư mục deploy trên VPS)*

### 2.2. Mosquitto MQTT Broker
*   **Địa chỉ kết nối:** `113.161.220.166` (hoặc `100.77.157.70`)
*   **Cổng MQTT:** `1883` *(Cổng công khai dành cho thiết bị ngoại vi)*
*   **Tài khoản MQTT kết nối thiết bị:**
    *   **Username:** `meterMQTT`
    *   **Password:** `meterMQTT`
*   **File mật khẩu trên host:** `/home/tma_agi/esp32_loss_power_deploy/infra/mosquitto/passwd.user`

### 2.3. Backend API Server (Express.js)
*   **Cổng Host Local:** `127.0.0.1:3000` *(Chỉ cho phép truy cập cục bộ từ chính VPS để đảm bảo an toàn thông tin)*
*   **Health Endpoint:** `http://127.0.0.1:3000/healthz`
*   **Cách kiểm tra API trực tiếp qua SSH:**
    ```bash
    ssh vps-prod "curl -sS http://127.0.0.1:3000/healthz"
    ```

### 2.4. Cơ sở dữ liệu MongoDB
*   **Phạm vi:** Chạy độc lập hoàn toàn trong mạng Docker nội bộ (`Internal network`), không export cổng ra ngoài hệ điều hành máy chủ VPS.

---

## 3. Cấu trúc Thư mục Deploy & Lệnh Vận hành trên VPS

*   **Thư mục deploy chính:** `/home/tma_agi/esp32_loss_power_deploy`
*   **File Docker Compose hoạt động:** `docker-compose.deploy.yml`

### Lệnh Quản trị Phổ biến (Chạy từ xa qua SSH):

*   **Xem trạng thái các Service:**
    ```bash
    ssh vps-prod "cd /home/tma_agi/esp32_loss_power_deploy && docker-compose -f docker-compose.deploy.yml ps"
    ```
*   **Kiểm tra Logs Backend hoạt động:**
    ```bash
    ssh vps-prod "docker logs esp32losspowerdeploy_backend_1 --tail 50"
    ```
*   **Khởi động lại toàn bộ hệ thống:**
    ```bash
    ssh vps-prod "cd /home/tma_agi/esp32_loss_power_deploy && docker-compose -f docker-compose.deploy.yml restart"
    ```

> [!WARNING]
> **Lưu ý Bảo mật:** Không chia sẻ tệp tin SSH Private Key `opencode_vps` và mật khẩu Dashboard admin một cách công khai. Mọi thao tác cập nhật cấu hình hệ thống nên được thực hiện thông qua quy trình Git và CI/CD tự động của dự án.
