#pragma once
#include <Arduino.h>

bool checkOtaUrlAvailable(const String &otaUrl);
void handleOtaUpdate(const String &binUrl);