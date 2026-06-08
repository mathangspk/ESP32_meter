import urllib.request
import json

url = "http://127.0.0.1:3005/admin/firmware/releases"
headers = {
    "Content-Type": "application/json",
    "x-internal-key": "b9abcd3923c4082859924c2ec16a7c075a2d86e046c127abc273ae1bdc27767f"
}

# ESP32
esp32_payload = {
    "version": "1.0.9",
    "severity": "recommended",
    "supportStatus": "supported",
    "url": "http://113.161.220.166:8081/esp32-meter-1.0.9.bin",
    "notes": "ESP32 firmware release v1.0.9",
    "chipFamily": "ESP32",
    "boardType": "esp32doit-devkit-v1"
}

# ESP8266
esp8266_payload = {
    "version": "1.0.9",
    "severity": "recommended",
    "supportStatus": "supported",
    "url": "http://113.161.220.166:8081/esp8266-meter-1.0.9.bin",
    "notes": "ESP8266 firmware release v1.0.9",
    "chipFamily": "ESP8266",
    "boardType": "nodemcuv2"
}

for name, payload in [("ESP32", esp32_payload), ("ESP8266", esp8266_payload)]:
    req = urllib.request.Request(
        url, 
        data=json.dumps(payload).encode('utf-8'), 
        headers=headers, 
        method='POST'
    )
    try:
        with urllib.request.urlopen(req) as response:
            print(f"Registered {name} v1.0.9: {response.status} {response.reason}")
    except Exception as e:
        print(f"Failed to register {name} v1.0.9: {e}")
