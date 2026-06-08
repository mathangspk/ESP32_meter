import urllib.request
import json

def main():
    # Login to get token
    login_url = "http://127.0.0.1:3005/auth/login"
    login_data = json.dumps({
        "username": "admin",
        "password": "Admin@2024!Secure"
    }).encode("utf-8")
    
    req = urllib.request.Request(
        login_url,
        data=login_data,
        headers={"Content-Type": "application/json"},
        method="POST"
    )
    
    try:
        with urllib.request.urlopen(req) as res:
            res_data = json.loads(res.read().decode("utf-8"))
            token = res_data["token"]
    except Exception as e:
        print(f"Login failed: {e}")
        return
        
    devices = [
        {"id": "7B34E3EC", "bin": "esp32-meter-1.0.9.bin"},
        {"id": "D534E3EC", "bin": "esp32-meter-1.0.9.bin"},
        {"id": "004A936C", "bin": "esp8266-meter-1.0.9.bin"},
    ]
    
    ota_url = "http://127.0.0.1:3005/ota/jobs"
    
    for d in devices:
        ota_data = json.dumps({
            "device_id": d["id"],
            "serial_number": d["id"],
            "version": "1.0.9",
            "url": f"http://113.161.220.166:8081/{d['bin']}"
        }).encode("utf-8")
        
        req_ota = urllib.request.Request(
            ota_url,
            data=ota_data,
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {token}"
            },
            method="POST"
        )
        
        try:
            with urllib.request.urlopen(req_ota) as res_ota:
                res_ota_data = json.loads(res_ota.read().decode("utf-8"))
                print(f"OTA Triggered for {d['id']} -> 1.0.9: success (Job: {res_ota_data.get('jobId')})")
        except Exception as e:
            print(f"OTA trigger failed for {d['id']}: {e}")
            if hasattr(e, 'read'):
                print(e.read().decode("utf-8"))

if __name__ == "__main__":
    main()
