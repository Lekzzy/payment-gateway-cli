import requests
import hashlib
import hmac
import time
import json

BASE_URL = "http://localhost:3002"
WEBHOOK_PATH = "/api/v1/webhooks"
WEBHOOK_SECRET = "test_webhook_secret_key"
API_KEY = "test_12345"

def generate_signature(secret: str, payload: bytes, timestamp: str) -> str:
    """Generate HMAC SHA256 signature for webhook verification"""
    message = timestamp.encode() + b"." + payload
    signature = hmac.new(secret.encode(), message, hashlib.sha256).hexdigest()
    return signature

# Create test payload
timestamp = str(int(time.time()))
payload_dict = {
    "event": "invoice.paid",
    "data": {
        "invoice_id": "inv_test_12345",
        "status": "paid",
        "amount": 1999,
        "currency": "USD",
        "customer_id": "cus_98765"
    },
    "timestamp": int(timestamp)
}

payload_bytes = json.dumps(payload_dict, separators=(',', ':')).encode('utf-8')
signature = generate_signature(WEBHOOK_SECRET, payload_bytes, timestamp)

print(f"Timestamp: {timestamp}")
print(f"Payload: {payload_bytes.decode()}")
print(f"Signature: {signature}")

headers = {
    "Content-Type": "application/json",
    "X-Webhook-Timestamp": timestamp,
    "X-Webhook-Signature": signature,
    "X-API-Key": API_KEY
}

print(f"Headers: {headers}")

# POST the webhook event
response = requests.post(
    f"{BASE_URL}{WEBHOOK_PATH}",
    headers=headers,
    data=payload_bytes,
    timeout=30
)

print(f"Status Code: {response.status_code}")
print(f"Response: {response.text}")

try:
    resp_json = response.json()
    print(f"Response JSON: {resp_json}")
except:
    print("Could not parse response as JSON")