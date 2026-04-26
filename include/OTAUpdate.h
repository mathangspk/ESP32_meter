#pragma once
#include <Arduino.h>

enum class OtaUpdateResult
{
    Success,
    NoUpdate,
    Failed,
    UrlUnavailable,
};

bool checkOtaUrlAvailable(const String &otaUrl);
OtaUpdateResult handleOtaUpdate(const String &binUrl, String &message);
