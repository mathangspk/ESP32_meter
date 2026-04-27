#include "OTAUpdate.h"
#include <WiFiClientSecure.h>
#include <HTTPUpdate.h>
#include <WiFiClient.h>
#include <HTTPClient.h>

namespace
{
    constexpr uint32_t OTA_CLIENT_TIMEOUT_MS = 15000;

    bool isHttpsUrl(const String &url)
    {
        return url.startsWith("https://");
    }

    bool beginHttpClient(HTTPClient &http, const String &url, WiFiClient &client)
    {
        if (isHttpsUrl(url))
        {
            WiFiClientSecure &secureClient = static_cast<WiFiClientSecure &>(client);
            secureClient.setInsecure();
        }

        http.setFollowRedirects(HTTPC_STRICT_FOLLOW_REDIRECTS);
        return http.begin(client, url);
    }
}

bool checkOtaUrlAvailable(const String &otaUrl)
{
    HTTPClient http;

    if (isHttpsUrl(otaUrl))
    {
        WiFiClientSecure client;
        client.setTimeout(OTA_CLIENT_TIMEOUT_MS);
        if (!beginHttpClient(http, otaUrl, client))
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

        Serial.printf("OTA URL không khả dụng, HTTP code: %d\n", httpCode);
        return false;
    }

    WiFiClient client;
    client.setTimeout(OTA_CLIENT_TIMEOUT_MS);
    if (!beginHttpClient(http, otaUrl, client))
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
    httpUpdate.rebootOnUpdate(false);

    t_httpUpdate_return ret;
    if (isHttpsUrl(binUrl))
    {
        WiFiClientSecure client;
        client.setInsecure();
        client.setTimeout(OTA_CLIENT_TIMEOUT_MS);
        ret = httpUpdate.update(client, binUrl);
    }
    else
    {
        WiFiClient client;
        client.setTimeout(OTA_CLIENT_TIMEOUT_MS);
        ret = httpUpdate.update(client, binUrl);
    }

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
