import requests
import hmac
import hashlib
import json

BASE_URL = "http://localhost:3002"
WEBHOOK_ENDPOINT = f"{BASE_URL}/api/v1/webhooks"
API_KEY = "test_api_key"  # Replace with valid API key for auth if required
SECRET = b"test-webhook-secret"  # Shared secret for HMAC signature (must match server config)

def generate_signature(payload: bytes, secret: bytes) -> str:
    return hmac.new(secret, payload, hashlib.sha256).hexdigest()

def test_post_webhooks_endpoint():
    # Sample webhook event payload
    webhook_payload = {
        "event": "invoice.paid",
        "data": {
            "invoice_id": "inv_123456789",
            "amount": 1999,
            "currency": "USD",
            "status": "paid",
            "customer_id": "cust_987654321",
            "discord_user_id": "123456789012345678",
            "roles_assigned": ["subscriber", "premium"]
        },
        "timestamp": "2025-09-26T12:34:56Z"
    }
    payload_bytes = json.dumps(webhook_payload).encode('utf-8')
    signature = generate_signature(payload_bytes, SECRET)

    headers = {
        "Content-Type": "application/json",
        "X-Webhook-Signature": signature,
        "X-Webhook-Timestamp": webhook_payload["timestamp"],
        "Authorization": f"Bearer {API_KEY}"
    }

    timeout = 30
    try:
        response = requests.post(WEBHOOK_ENDPOINT, headers=headers, data=payload_bytes, timeout=timeout)
    except requests.RequestException as e:
        assert False, f"Request failed: {e}"

    # Assert response status code 200 OK or 202 Accepted for webhook reception
    assert response.status_code in (200, 202), f"Unexpected status code: {response.status_code}, response: {response.text}"

    # Validate response content-type is JSON
    content_type = response.headers.get("Content-Type", "")
    assert "application/json" in content_type, f"Unexpected content-type: {content_type}"

    # Validate response body JSON structure
    try:
        resp_json = response.json()
    except json.JSONDecodeError:
        assert False, "Response is not valid JSON"

    # Expected response fields (assuming server returns success message and event id)
    assert "success" in resp_json and resp_json["success"] is True, f"Unexpected response body: {resp_json}"
    assert "event_processed" in resp_json, "Response missing 'event_processed' field"

    # Additional checks could include event_processed details matching webhook event
    event_processed = resp_json["event_processed"]
    assert event_processed.get("event") == webhook_payload["event"], "Event type mismatch in response"
    assert event_processed.get("invoice_id") == webhook_payload["data"]["invoice_id"], "Invoice ID mismatch in response"

test_post_webhooks_endpoint()
