#include "OTAUpdate.h"
#include <WiFiClientSecure.h>
#include <HTTPUpdate.h>
#include <WiFiClient.h>
#include <HTTPClient.h>

bool checkOtaUrlAvailable(const String &otaUrl)
{
    WiFiClientSecure client;
    client.setInsecure();

    HTTPClient http;
    http.setFollowRedirects(HTTPC_STRICT_FOLLOW_REDIRECTS);
    if (!http.begin(client, otaUrl))
    {
        Serial.println("Khong the bat dau ket noi OTA URL.");
        return false;
    }

    int httpCode = http.GET();
    http.end();
    if (httpCode == 200)
    {
        Serial.println("OTA URL khả dụng!");
        return true;
    }
    else
    {
        Serial.printf("OTA URL không khả dụng, HTTP code: %d\n", httpCode);
        return false;
    }
}

OtaUpdateResult handleOtaUpdate(const String &binUrl, String &message)
{
    Serial.println("Bắt đầu OTA từ URL: " + binUrl);
    WiFiClientSecure client;
    client.setInsecure(); // Bỏ qua kiểm tra chứng chỉ SSL
    httpUpdate.rebootOnUpdate(false);

    t_httpUpdate_return ret = httpUpdate.update(client, binUrl);

    switch (ret)
    {
    case HTTP_UPDATE_FAILED:
        message = httpUpdate.getLastErrorString();
        Serial.printf("OTA thất bại. Lỗi (%d): %s\n", httpUpdate.getLastError(), message.c_str());
        return OtaUpdateResult::Failed;
    case HTTP_UPDATE_NO_UPDATES:
        Serial.println("Không có bản cập nhật mới.");
        message = "No updates available";
        return OtaUpdateResult::NoUpdate;
    case HTTP_UPDATE_OK:
        Serial.println("Cập nhật thành công! Đang khởi động lại...");
        message = "Update applied successfully";
        return OtaUpdateResult::Success;
    }

    message = "Unknown OTA result";
    return OtaUpdateResult::Failed;
}
