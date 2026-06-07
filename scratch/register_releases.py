import urllib.request
import json

url = "http://127.0.0.1:3000/admin/firmware/releases"
headers = {
    "Content-Type": "application/json",
    "x-internal-key": "b9abcd3923c4082859924c2ec16a7c075a2d86e046c127abc273ae1bdc27767f"
}

versions = ["1.0.2", "1.0.3", "1.0.4", "1.0.6", "1.0.7", "1.0.8"]

for v in versions:
    # ESP32
    esp32_payload = {
        "version": v,
        "severity": "recommended",
        "supportStatus": "supported",
        "url": f"http://167.71.207.5:8081/esp32-meter-{v}.bin",
        "notes": f"ESP32 firmware release v{v}",
        "chipFamily": "ESP32",
        "boardType": "esp32doit-devkit-v1"
    }
    
    # ESP8266
    esp8266_payload = {
        "version": v,
        "severity": "recommended",
        "supportStatus": "supported",
        "url": f"http://167.71.207.5:8081/esp8266-meter-{v}.bin",
        "notes": f"ESP8266 firmware release v{v}",
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
                print(f"Registered {name} v{v}: {response.status} {response.reason}")
        except Exception as e:
            print(f"Failed to register {name} v{v}: {e}")
