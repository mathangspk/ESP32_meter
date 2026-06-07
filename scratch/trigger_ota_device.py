import urllib.request
import json
import sys

def trigger_ota(device_id, version, binary_name):
    # Login to get token
    login_url = "http://127.0.0.1:3000/auth/login"
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
        return False
        
    # Trigger OTA
    ota_url = "http://127.0.0.1:3000/ota/jobs"
    ota_data = json.dumps({
        "device_id": device_id,
        "serial_number": device_id,
        "version": version,
        "url": f"http://167.71.207.5:8081/{binary_name}"
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
            print(f"OTA Triggered successfully for {device_id}:")
            print(json.dumps(res_ota_data, indent=2))
            return True
    except Exception as e:
        print(f"OTA trigger failed for {device_id}: {e}")
        if hasattr(e, 'read'):
            print(e.read().decode("utf-8"))
        return False

if __name__ == "__main__":
    if len(sys.argv) < 4:
        print("Usage: python3 trigger_ota_device.py <device_id> <version> <binary_name>")
        sys.exit(1)
    
    device_id = sys.argv[1]
    version = sys.argv[2]
    binary_name = sys.argv[3]
    trigger_ota(device_id, version, binary_name)
