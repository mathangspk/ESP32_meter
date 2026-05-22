#include "WebConfig.h"

WebConfig::WebConfig(ConfigManager &configManager)
    : server(80), configManager(configManager), configPortalActive(false)
{
}

void WebConfig::begin()
{
    // Setup routes
    server.on("/", HTTP_GET, [this]()
              { handleRoot(); });
    server.on("/config", HTTP_GET, [this]()
              { handleConfig(); });
    server.on("/config", HTTP_POST, [this]()
              { handleSaveConfig(); });
    server.on("/reset", HTTP_POST, [this]()
              { handleReset(); });
    server.on("/status", HTTP_GET, [this]()
              { handleStatus(); });
    server.on("/reboot", HTTP_POST, [this]()
              { handleReboot(); });
    server.on("/ip", HTTP_GET, [this]()
              { handleIP(); });

    server.begin();
    Serial.println("Web config server started on port 80");
}

void WebConfig::handle()
{
    server.handleClient();
}

void WebConfig::startConfigPortal()
{
    configPortalActive = true;
    Serial.println("Config portal activated");
}

void WebConfig::stopConfigPortal()
{
    configPortalActive = false;
    Serial.println("Config portal deactivated");
}

bool WebConfig::isConfigPortalActive()
{
    return configPortalActive;
}

void WebConfig::handleRoot()
{
    String html = "<!DOCTYPE html><html><head><title>ESP8266 Meter Config</title>";
    html += "<meta charset='UTF-8'><meta name='viewport' content='width=device-width, initial-scale=1.0'>";
    html += "<style>body{font-family:Arial,sans-serif;margin:20px;background:#f5f5f5}";
    html += ".container{max-width:600px;margin:0 auto;background:white;padding:20px;border-radius:10px;box-shadow:0 2px 10px rgba(0,0,0,0.1)}";
    html += "h1{color:#333;text-align:center}.nav{text-align:center;margin:20px 0}";
    html += ".nav a{display:inline-block;margin:0 10px;padding:10px 20px;background:#007bff;color:white;text-decoration:none;border-radius:5px}";
    html += ".status{padding:10px;margin:10px 0;border-radius:5px}.status.online{background:#d4edda;color:#155724;border:1px solid #c3e6cb}</style></head>";
    html += "<body><div class='container'>";
    html += "<h1>ESP8266 Meter Configuration</h1>";
    html += "<div class='nav'><a href='/config'>Configuration</a><a href='/status'>Status</a></div>";
    html += "<div class='status online'>System is running</div>";
    html += "<p>Welcome to the ESP8266 Meter configuration portal. Use the links above to configure your device or check its status.</p>";

    // Hiển thị thông tin kết nối
    html += "<div style='background:#e7f3ff;border:1px solid #b3d9ff;border-radius:5px;padding:15px;margin:15px 0'>";
    html += "<h3>Connection Info:</h3>";
    html += "<p><strong>WiFi SSID:</strong> " + WiFi.SSID() + "</p>";
    html += "<p><strong>IP Address:</strong> " + WiFi.localIP().toString() + "</p>";
    html += "<p><strong>MAC Address:</strong> " + WiFi.macAddress() + "</p>";
    html += "</div>";

    html += "</div></body></html>";
    server.send(200, "text/html", html);
}

void WebConfig::handleConfig()
{
    MeterConfig config = configManager.getConfig();

    String html = "<!DOCTYPE html><html><head><title>Configuration</title>";
    html += "<meta charset='UTF-8'><meta name='viewport' content='width=device-width, initial-scale=1.0'>";
    html += "<style>body{font-family:Arial,sans-serif;margin:20px;background:#f5f5f5}";
    html += ".container{max-width:600px;margin:0 auto;background:white;padding:20px;border-radius:10px;box-shadow:0 2px 10px rgba(0,0,0,0.1)}";
    html += "h1{color:#333;text-align:center}.form-group{margin:15px 0}";
    html += "label{display:block;margin-bottom:5px;font-weight:bold}";
    html += "input[type='text'],input[type='number']{width:100%;padding:10px;border:1px solid #ddd;border-radius:5px;box-sizing:border-box}";
    html += ".btn{padding:10px 20px;border:none;border-radius:5px;cursor:pointer;margin:5px}";
    html += ".btn-primary{background:#007bff;color:white}.btn-warning{background:#ffc107;color:#212529}.btn-danger{background:#dc3545;color:white}";
    html += ".actions{text-align:center;margin:20px 0}.nav{text-align:center;margin:20px 0}";
    html += ".nav a{display:inline-block;margin:0 10px;padding:10px 20px;background:#007bff;color:white;text-decoration:none;border-radius:5px}</style></head>";
    html += "<body><div class='container'>";
    html += "<h1>Device Configuration</h1>";
    html += "<div class='nav'><a href='/'>Home</a><a href='/status'>Status</a></div>";
    html += "<form method='POST' action='/config'>";
    html += "<div class='form-group'><label for='mqtt_server'>MQTT Server IP:</label>";
    html += "<input type='text' id='mqtt_server' name='mqtt_server' value='" + config.mqtt_server + "' required></div>";
    html += "<div class='form-group'><label for='mqtt_port'>MQTT Port:</label>";
    html += "<input type='number' id='mqtt_port' name='mqtt_port' value='" + String(config.mqtt_port) + "' required></div>";
    html += "<div class='form-group'><label for='device_id'>Device ID:</label>";
    html += "<input type='text' id='device_id' name='device_id' value='" + config.device_id + "' required></div>";
    html += "<div class='form-group'><label for='serial_number'>Serial Number:</label>";
    html += "<input type='text' id='serial_number' name='serial_number' value='" + config.serial_number + "' required></div>";
    html += "<div class='form-group'><label for='mqtt_user'>MQTT User:</label>";
    html += "<input type='text' id='mqtt_user' name='mqtt_user' value='" + config.mqtt_username + "' required></div>";
    html += "<div class='form-group'><label for='mqtt_password'>MQTT Password:</label>";
    html += "<input type='text' id='mqtt_password' name='mqtt_password' value='" + config.mqtt_password + "' required></div>";
    html += "<div class='form-group'><label for='reading_interval'>Reading Interval (ms):</label>";
    html += "<input type='number' id='reading_interval' name='reading_interval' value='" + String(config.reading_interval) + "' required></div>";
    html += "<div class='actions'><button type='submit' class='btn btn-primary'>Save Configuration</button></div>";
    html += "</form>";
    html += "<div class='actions'>";
    html += "<form method='POST' action='/reset' style='display:inline;'>";
    html += "<button type='submit' class='btn btn-warning' onclick='return confirm(\"Are you sure you want to reset to defaults?\")'>Reset to Defaults</button>";
    html += "</form>";
    html += "<form method='POST' action='/reboot' style='display:inline;'>";
    html += "<button type='submit' class='btn btn-danger' onclick='return confirm(\"Are you sure you want to reboot?\")'>Reboot Device</button>";
    html += "</form></div></div></body></html>";

    server.send(200, "text/html", html);
}

void WebConfig::handleSaveConfig()
{
    if (server.hasArg("mqtt_server"))
    {
        configManager.updateConfig("mqtt_server", server.arg("mqtt_server"));
    }
    if (server.hasArg("mqtt_port"))
    {
        configManager.updateConfig("mqtt_port", server.arg("mqtt_port").toInt());
    }
    if (server.hasArg("device_id"))
    {
        configManager.updateConfig("device_id", server.arg("device_id"));
    }
    if (server.hasArg("serial_number"))
    {
        configManager.updateConfig("serial_number", server.arg("serial_number"));
    }
    if (server.hasArg("mqtt_user"))
    {
        configManager.updateConfig("mqtt_username", server.arg("mqtt_user"));
    }
    if (server.hasArg("mqtt_password"))
    {
        configManager.updateConfig("mqtt_password", server.arg("mqtt_password"));
    }

    if (server.hasArg("reading_interval"))
    {
        configManager.updateConfig("reading_interval", server.arg("reading_interval").toInt());
    }

    String html = "<!DOCTYPE html><html><head><title>Configuration Saved</title>";
    html += "<meta charset='UTF-8'><meta name='viewport' content='width=device-width, initial-scale=1.0'>";
    html += "<style>body{font-family:Arial,sans-serif;margin:20px;background:#f5f5f5}";
    html += ".container{max-width:600px;margin:0 auto;background:white;padding:20px;border-radius:10px;box-shadow:0 2px 10px rgba(0,0,0,0.1)}";
    html += ".success{background:#d4edda;color:#155724;padding:15px;border-radius:5px;margin:20px 0}";
    html += ".btn{display:inline-block;padding:10px 20px;background:#007bff;color:white;text-decoration:none;border-radius:5px}</style></head>";
    html += "<body><div class='container'>";
    html += "<div class='success'>Configuration saved successfully!</div>";
    html += "<p>Your configuration has been updated. The device will reconnect to the new MQTT server.</p>";
    html += "<a href='/config' class='btn'>Back to Configuration</a>";
    html += "</div></body></html>";

    server.send(200, "text/html", html);
}

void WebConfig::handleReset()
{
    configManager.resetToDefaults();

    String html = "<!DOCTYPE html><html><head><title>Configuration Reset</title>";
    html += "<meta charset='UTF-8'><meta name='viewport' content='width=device-width, initial-scale=1.0'>";
    html += "<style>body{font-family:Arial,sans-serif;margin:20px;background:#f5f5f5}";
    html += ".container{max-width:600px;margin:0 auto;background:white;padding:20px;border-radius:10px;box-shadow:0 2px 10px rgba(0,0,0,0.1)}";
    html += ".warning{background:#fff3cd;color:#856404;padding:15px;border-radius:5px;margin:20px 0}";
    html += ".btn{display:inline-block;padding:10px 20px;background:#007bff;color:white;text-decoration:none;border-radius:5px}</style></head>";
    html += "<body><div class='container'>";
    html += "<div class='warning'>Configuration reset to defaults!</div>";
    html += "<p>All configuration has been reset to default values.</p>";
    html += "<a href='/config' class='btn'>Back to Configuration</a>";
    html += "</div></body></html>";

    server.send(200, "text/html", html);
}

void WebConfig::handleStatus()
{
    MeterConfig config = configManager.getConfig();

    String html = "<!DOCTYPE html><html><head><title>Device Status</title>";
    html += "<meta charset='UTF-8'><meta name='viewport' content='width=device-width, initial-scale=1.0'>";
    html += "<style>body{font-family:Arial,sans-serif;margin:20px;background:#f5f5f5}";
    html += ".container{max-width:600px;margin:0 auto;background:white;padding:20px;border-radius:10px;box-shadow:0 2px 10px rgba(0,0,0,0.1)}";
    html += "h1{color:#333;text-align:center}.status-item{margin:15px 0;padding:10px;border:1px solid #ddd;border-radius:5px}";
    html += ".status-label{font-weight:bold;color:#666}.status-value{color:#333}";
    html += ".nav{text-align:center;margin:20px 0}.nav a{display:inline-block;margin:0 10px;padding:10px 20px;background:#007bff;color:white;text-decoration:none;border-radius:5px}";
    html += ".online{color:#28a745}.offline{color:#dc3545}</style></head>";
    html += "<body><div class='container'>";
    html += "<h1>Device Status</h1>";
    html += "<div class='nav'><a href='/'>Home</a><a href='/config'>Configuration</a></div>";
    html += "<div class='status-item'><div class='status-label'>WiFi Status:</div><div class='status-value online'>Connected to " + WiFi.SSID() + "</div></div>";
    html += "<div class='status-item'><div class='status-label'>IP Address:</div><div class='status-value'>" + WiFi.localIP().toString() + "</div></div>";
    html += "<div class='status-item'><div class='status-label'>MQTT Server:</div><div class='status-value'>" + config.mqtt_server + ":" + String(config.mqtt_port) + "</div></div>";
    html += "<div class='status-item'><div class='status-label'>Device ID:</div><div class='status-value'>" + config.device_id + "</div></div>";
    html += "<div class='status-item'><div class='status-label'>Serial Number:</div><div class='status-value'>" + config.serial_number + "</div></div>";
    html += "<div class='status-item'><div class='status-label'>Reading Interval:</div><div class='status-value'>" + String(config.reading_interval) + " ms</div></div>";
    html += "<div class='status-item'><div class='status-label'>Uptime:</div><div class='status-value'>" + String(millis() / 1000) + " seconds</div></div>";
    html += "<div class='status-item'><div class='status-label'>Free Memory:</div><div class='status-value'>" + String(ESP.getFreeHeap()) + " bytes</div></div>";
    html += "</div></body></html>";

    server.send(200, "text/html", html);
}

void WebConfig::handleReboot()
{
    String html = "<!DOCTYPE html><html><head><title>Rebooting...</title>";
    html += "<meta charset='UTF-8'><meta name='viewport' content='width=device-width, initial-scale=1.0'>";
    html += "<style>body{font-family:Arial,sans-serif;margin:20px;background:#f5f5f5}";
    html += ".container{max-width:600px;margin:0 auto;background:white;padding:20px;border-radius:10px;box-shadow:0 2px 10px rgba(0,0,0,0.1)}";
    html += ".info{background:#d1ecf1;color:#0c5460;padding:15px;border-radius:5px;margin:20px 0}</style></head>";
    html += "<body><div class='container'>";
    html += "<div class='info'>Device is rebooting...</div>";
    html += "<p>The device will restart in a few seconds. Please wait before trying to reconnect.</p>";
    html += "</div></body></html>";

    server.send(200, "text/html", html);

    // Reboot after sending response
    delay(1000);
    ESP.restart();
}

void WebConfig::handleIP()
{
    String html = "<!DOCTYPE html><html><head><title>ESP8266 IP Info</title>";
    html += "<meta charset='UTF-8'><meta name='viewport' content='width=device-width, initial-scale=1.0'>";
    html += "<style>body{font-family:Arial,sans-serif;margin:20px;background:#f5f5f5}";
    html += ".container{max-width:600px;margin:0 auto;background:white;padding:20px;border-radius:10px;box-shadow:0 2px 10px rgba(0,0,0,0.1)}";
    html += "h1{color:#333;text-align:center}.info-box{background:#e7f3ff;border:1px solid #b3d9ff;border-radius:5px;padding:15px;margin:15px 0}";
    html += ".ip-address{font-size:24px;font-weight:bold;color:#007bff;text-align:center;margin:20px 0}";
    html += ".btn{display:inline-block;padding:10px 20px;background:#007bff;color:white;text-decoration:none;border-radius:5px;margin:5px}</style></head>";
    html += "<body><div class='container'>";
    html += "<h1>ESP8266 Connection Info</h1>";
    html += "<div class='ip-address'>" + WiFi.localIP().toString() + "</div>";
    html += "<div class='info-box'>";
    html += "<h3>Network Information:</h3>";
    html += "<p><strong>WiFi SSID:</strong> " + WiFi.SSID() + "</p>";
    html += "<p><strong>IP Address:</strong> " + WiFi.localIP().toString() + "</p>";
    html += "<p><strong>Gateway:</strong> " + WiFi.gatewayIP().toString() + "</p>";
    html += "<p><strong>Subnet Mask:</strong> " + WiFi.subnetMask().toString() + "</p>";
    html += "<p><strong>DNS Server:</strong> " + WiFi.dnsIP().toString() + "</p>";
    html += "<p><strong>MAC Address:</strong> " + WiFi.macAddress() + "</p>";
    html += "</div>";
    html += "<div style='text-align:center;margin:20px 0'>";
    html += "<a href='http://" + WiFi.localIP().toString() + "' class='btn'>Open Web Config</a>";
    html += "<a href='http://" + WiFi.localIP().toString() + "/config' class='btn'>Configuration</a>";
    html += "<a href='http://" + WiFi.localIP().toString() + "/status' class='btn'>Status</a>";
    html += "</div>";
    html += "<p style='text-align:center;color:#666'>Bookmark this page for easy access!</p>";
    html += "</div></body></html>";

    server.send(200, "text/html", html);
}