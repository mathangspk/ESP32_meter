#ifndef WEB_CONFIG_HTML_STATUS_H
#define WEB_CONFIG_HTML_STATUS_H

#include <Arduino.h>

inline String getStatusHTML(const String &ssid, const String &ip, const String &mqtt_server, int mqtt_port, const String &device_id, const String &serial_number, int reading_interval, uint32_t uptime_sec, uint32_t free_heap) {
    String html = "<!DOCTYPE html><html><head><title>Device Status</title>";
    html += "<meta charset='UTF-8'><meta name='viewport' content='width=device-width, initial-scale=1.0'>";
    html += "<style>body{font-family:Arial,sans-serif;margin:20px;background:#f5f5f5}";
    html += ".container{max-width:600px;margin:0 auto;background:white;padding:20px;border-radius:10px;box-shadow:0 2px 10px rgba(0,0,0,0.1)}";
    html += "h1{color:#333;text-align:center}.status-item{margin:15px 0;padding:10px;border:1px solid #ddd;border-radius:5px}";
    html += ".status-label{font-weight:bold;color:#666}.status-value{color:#333}";
    html += ".nav{text-align:center;margin:20px 0}.nav a{display:inline-block;margin:0 10px;padding:10px 20px;background:#007bff;color:white;text-decoration:none;border-radius:5px}";
    html += ".online{color:#28a745}.offline{color:#dc3545}</style></head>";
    html += "<body><div class='container'><h1>Device Status</h1>";
    html += "<div class='nav'><a href='/'>Home</a><a href='/config'>Configuration</a></div>";
    html += "<div class='status-item'><div class='status-label'>WiFi Status:</div><div class='status-value online'>Connected to " + ssid + "</div></div>";
    html += "<div class='status-item'><div class='status-label'>IP Address:</div><div class='status-value'>" + ip + "</div></div>";
    html += "<div class='status-item'><div class='status-label'>MQTT Server:</div><div class='status-value'>" + mqtt_server + ":" + String(mqtt_port) + "</div></div>";
    html += "<div class='status-item'><div class='status-label'>Device ID:</div><div class='status-value'>" + device_id + "</div></div>";
    html += "<div class='status-item'><div class='status-label'>Serial Number:</div><div class='status-value'>" + serial_number + "</div></div>";
    html += "<div class='status-item'><div class='status-label'>Reading Interval:</div><div class='status-value'>" + String(reading_interval) + " ms</div></div>";
    html += "<div class='status-item'><div class='status-label'>Uptime:</div><div class='status-value'>" + String(uptime_sec) + " seconds</div></div>";
    html += "<div class='status-item'><div class='status-label'>Free Memory:</div><div class='status-value'>" + String(free_heap) + " bytes</div></div>";
    html += "</div></body></html>";
    return html;
}

inline String getRebootHTML() {
    String html = "<!DOCTYPE html><html><head><title>Rebooting...</title>";
    html += "<meta charset='UTF-8'><meta name='viewport' content='width=device-width, initial-scale=1.0'>";
    html += "<style>body{font-family:Arial,sans-serif;margin:20px;background:#f5f5f5}";
    html += ".container{max-width:600px;margin:0 auto;background:white;padding:20px;border-radius:10px;box-shadow:0 2px 10px rgba(0,0,0,0.1)}";
    html += ".info{background:#d1ecf1;color:#0c5460;padding:15px;border-radius:5px;margin:20px 0}</style></head>";
    html += "<body><div class='container'><div class='info'>Device is rebooting...</div>";
    html += "<p>The device will restart in a few seconds. Please wait before trying to reconnect.</p>";
    html += "</div></body></html>";
    return html;
}

inline String getIPHTML(const String &ip, const String &ssid, const String &gateway, const String &subnet, const String &dns, const String &mac) {
    String html = "<!DOCTYPE html><html><head><title>ESP8266 IP Info</title>";
    html += "<meta charset='UTF-8'><meta name='viewport' content='width=device-width, initial-scale=1.0'>";
    html += "<style>body{font-family:Arial,sans-serif;margin:20px;background:#f5f5f5}";
    html += ".container{max-width:600px;margin:0 auto;background:white;padding:20px;border-radius:10px;box-shadow:0 2px 10px rgba(0,0,0,0.1)}";
    html += "h1{color:#333;text-align:center}.info-box{background:#e7f3ff;border:1px solid #b3d9ff;border-radius:5px;padding:15px;margin:15px 0}";
    html += ".ip-address{font-size:24px;font-weight:bold;color:#007bff;text-align:center;margin:20px 0}";
    html += ".btn{display:inline-block;padding:10px 20px;background:#007bff;color:white;text-decoration:none;border-radius:5px;margin:5px}</style></head>";
    html += "<body><div class='container'><h1>ESP8266 Connection Info</h1><div class='ip-address'>" + ip + "</div>";
    html += "<div class='info-box'><h3>Network Information:</h3>";
    html += "<p><strong>WiFi SSID:</strong> " + ssid + "</p>";
    html += "<p><strong>IP Address:</strong> " + ip + "</p>";
    html += "<p><strong>Gateway:</strong> " + gateway + "</p>";
    html += "<p><strong>Subnet Mask:</strong> " + subnet + "</p>";
    html += "<p><strong>DNS Server:</strong> " + dns + "</p>";
    html += "<p><strong>MAC Address:</strong> " + mac + "</p></div>";
    html += "<div style='text-align:center;margin:20px 0'>";
    html += "<a href='http://" + ip + "' class='btn'>Open Web Config</a>";
    html += "<a href='http://" + ip + "/config' class='btn'>Configuration</a>";
    html += "<a href='http://" + ip + "/status' class='btn'>Status</a></div>";
    html += "<p style='text-align:center;color:#666'>Bookmark this page for easy access!</p></div></body></html>";
    return html;
}

#endif
