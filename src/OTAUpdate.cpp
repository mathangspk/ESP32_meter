#include "OTAUpdate.h"
#include <WiFiClientSecure.h>
#include <HTTPUpdate.h>
#include <WiFiClient.h>
#include <HTTPClient.h>

bool checkOtaUrlAvailable(const String &otaUrl)
{
    HTTPClient http;
    http.begin(otaUrl);
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

void handleOtaUpdate(const String &binUrl)
{
    Serial.println("Bắt đầu kiểm tra OTA URL: " + binUrl);
    if (!checkOtaUrlAvailable(binUrl))
    {
        Serial.println("Không thể tiến hành OTA do link không khả dụng.");
        return;
    }
    Serial.println("Bắt đầu OTA từ URL: " + binUrl);
    WiFiClientSecure client;
    client.setInsecure(); // Bỏ qua kiểm tra chứng chỉ SSL

    t_httpUpdate_return ret = httpUpdate.update(client, binUrl);

    switch (ret)
    {
    case HTTP_UPDATE_FAILED:
        Serial.printf("OTA thất bại. Lỗi (%d): %s\n", httpUpdate.getLastError(), httpUpdate.getLastErrorString().c_str());
        break;
    case HTTP_UPDATE_NO_UPDATES:
        Serial.println("Không có bản cập nhật mới.");
        break;
    case HTTP_UPDATE_OK:
        Serial.println("Cập nhật thành công! Đang khởi động lại...");
        break;
    }
}