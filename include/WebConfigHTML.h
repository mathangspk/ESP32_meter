#ifndef WEB_CONFIG_HTML_H
#define WEB_CONFIG_HTML_H

#include <Arduino.h>

inline String getRootHTML(const String &ssid, const String &ip, const String &mac) {
    String html = "<!DOCTYPE html><html><head><title>ESP8266 Meter Config</title>";
    html += "<meta charset='UTF-8'><meta name='viewport' content='width=device-width, initial-scale=1.0'>";
    html += "<style>body{font-family:Arial,sans-serif;margin:20px;background:#f5f5f5}";
    html += ".container{max-width:600px;margin:0 auto;background:white;padding:20px;border-radius:10px;box-shadow:0 2px 10px rgba(0,0,0,0.1)}";
    html += "h1{color:#333;text-align:center}.nav{text-align:center;margin:20px 0}";
    html += ".nav a{display:inline-block;margin:0 10px;padding:10px 20px;background:#007bff;color:white;text-decoration:none;border-radius:5px}";
    html += ".status{padding:10px;margin:10px 0;border-radius:5px}.status.online{background:#d4edda;color:#155724;border:1px solid #c3e6cb}</style></head>";
    html += "<body><div class='container'><h1>ESP8266 Meter Configuration</h1>";
    html += "<div class='nav'><a href='/config'>Configuration</a><a href='/status'>Status</a></div>";
    html += "<div class='status online'>System is running</div><p>Welcome to the ESP8266 Meter configuration portal. Use the links above to configure your device or check its status.</p>";
    html += "<div style='background:#e7f3ff;border:1px solid #b3d9ff;border-radius:5px;padding:15px;margin:15px 0'><h3>Connection Info:</h3>";
    html += "<p><strong>WiFi SSID:</strong> " + ssid + "</p><p><strong>IP Address:</strong> " + ip + "</p><p><strong>MAC Address:</strong> " + mac + "</p></div></div></body></html>";
    return html;
}

inline String getConfigHTML(const String &mqtt_server, int mqtt_port, const String &device_id, const String &serial_number, const String &mqtt_user, const String &mqtt_password, int reading_interval) {
    String html = "<!DOCTYPE html><html><head><title>Configuration</title>";
    html += "<meta charset='UTF-8'><meta name='viewport' content='width=device-width, initial-scale=1.0'>";
    html += "<style>body{font-family:Arial,sans-serif;margin:20px;background:#f5f5f5}";
    html += ".container{max-width:600px;margin:0 auto;background:white;padding:20px;border-radius:10px;box-shadow:0 2px 10px rgba(0,0,0,0.1)}";
    html += "h1{color:#333;text-align:center}.form-group{margin:15px 0}label{display:block;margin-bottom:5px;font-weight:bold}";
    html += "input[type='text'],input[type='number']{width:100%;padding:10px;border:1px solid #ddd;border-radius:5px;box-sizing:border-box}";
    html += ".btn{padding:10px 20px;border:none;border-radius:5px;cursor:pointer;margin:5px}";
    html += ".btn-primary{background:#007bff;color:white}.btn-warning{background:#ffc107;color:#212529}.btn-danger{background:#dc3545;color:white}";
    html += ".actions{text-align:center;margin:20px 0}.nav{text-align:center;margin:20px 0}";
    html += ".nav a{display:inline-block;margin:0 10px;padding:10px 20px;background:#007bff;color:white;text-decoration:none;border-radius:5px}</style></head>";
    html += "<body><div class='container'><h1>Device Configuration</h1><div class='nav'><a href='/'>Home</a><a href='/status'>Status</a></div>";
    html += "<form method='POST' action='/config'><div class='form-group'><label for='mqtt_server'>MQTT Server IP:</label>";
    html += "<input type='text' id='mqtt_server' name='mqtt_server' value='" + mqtt_server + "' required></div>";
    html += "<div class='form-group'><label for='mqtt_port'>MQTT Port:</label><input type='number' id='mqtt_port' name='mqtt_port' value='" + String(mqtt_port) + "' required></div>";
    html += "<div class='form-group'><label for='device_id'>Device ID:</label><input type='text' id='device_id' name='device_id' value='" + device_id + "' required></div>";
    html += "<div class='form-group'><label for='serial_number'>Serial Number:</label><input type='text' id='serial_number' name='serial_number' value='" + serial_number + "' required></div>";
    html += "<div class='form-group'><label for='mqtt_user'>MQTT User:</label><input type='text' id='mqtt_user' name='mqtt_user' value='" + mqtt_user + "' required></div>";
    html += "<div class='form-group'><label for='mqtt_password'>MQTT Password:</label><input type='text' id='mqtt_password' name='mqtt_password' value='" + mqtt_password + "' required></div>";
    html += "<div class='form-group'><label for='reading_interval'>Reading Interval (ms):</label><input type='number' id='reading_interval' name='reading_interval' value='" + String(reading_interval) + "' required></div>";
    html += "<div class='actions'><button type='submit' class='btn btn-primary'>Save Configuration</button></div></form>";
    html += "<div class='actions'><form method='POST' action='/reset' style='display:inline;'><button type='submit' class='btn btn-warning' onclick='return confirm(\"Are you sure?\")'>Reset to Defaults</button></form>";
    html += "<form method='POST' action='/reboot' style='display:inline;'><button type='submit' class='btn btn-danger' onclick='return confirm(\"Are you sure?\")'>Reboot Device</button></form></div></div></body></html>";
    return html;
}

inline String getSaveConfigHTML() {
    String html = "<!DOCTYPE html><html><head><title>Saved</title>";
    html += "<meta charset='UTF-8'><meta name='viewport' content='width=device-width, initial-scale=1.0'>";
    html += "<style>body{font-family:Arial,sans-serif;margin:20px;background:#f5f5f5}";
    html += ".container{max-width:600px;margin:0 auto;background:white;padding:20px;border-radius:10px;box-shadow:0 2px 10px rgba(0,0,0,0.1)}";
    html += ".success{background:#d4edda;color:#155724;padding:15px;border-radius:5px;margin:20px 0}";
    html += ".btn{display:inline-block;padding:10px 20px;background:#007bff;color:white;text-decoration:none;border-radius:5px}</style></head>";
    html += "<body><div class='container'><div class='success'>Configuration saved successfully!</div>";
    html += "<p>Your configuration has been updated. The device will reconnect to the new MQTT server.</p>";
    html += "<a href='/config' class='btn'>Back to Configuration</a></div></body></html>";
    return html;
}

inline String getResetHTML() {
    String html = "<!DOCTYPE html><html><head><title>Reset</title>";
    html += "<meta charset='UTF-8'><meta name='viewport' content='width=device-width, initial-scale=1.0'>";
    html += "<style>body{font-family:Arial,sans-serif;margin:20px;background:#f5f5f5}";
    html += ".container{max-width:600px;margin:0 auto;background:white;padding:20px;border-radius:10px;box-shadow:0 2px 10px rgba(0,0,0,0.1)}";
    html += ".warning{background:#fff3cd;color:#856404;padding:15px;border-radius:5px;margin:20px 0}";
    html += ".btn{display:inline-block;padding:10px 20px;background:#007bff;color:white;text-decoration:none;border-radius:5px}</style></head>";
    html += "<body><div class='container'><div class='warning'>Configuration reset to defaults!</div>";
    html += "<p>All configuration has been reset to default values.</p><a href='/config' class='btn'>Back to Configuration</a></div></body></html>";
    return html;
}

#endif
