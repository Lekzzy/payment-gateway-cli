import requests
import uuid

BASE_URL = "http://localhost:3002"
API_KEY = "test_api_key_correct_format"  # Replace with a valid API key

HEADERS = {
    "Authorization": f"Bearer {API_KEY}",
    "Content-Type": "application/json",
    "Accept": "application/json"
}

def test_post_invoices_endpoint():
    invoice_data_valid = {
        "customer_id": str(uuid.uuid4()),
        "amount": 1500,
        "currency": "USD",
        "description": "Test invoice creation"
    }

    invoice_data_invalid = {
        "customer_id": "",  # invalid empty
        "amount": -100,    # invalid negative amount
        "currency": "INVALID",
        "description": ""
    }

    created_invoice_id = None

    # Test successful creation with valid data and authentication
    try:
        response = requests.post(
            f"{BASE_URL}/api/v1/invoices",
            json=invoice_data_valid,
            headers=HEADERS,
            timeout=30
        )
        assert response.status_code == 201, f"Unexpected status code: {response.status_code}"
        json_response = response.json()
        assert "id" in json_response, "Response missing invoice id"
        assert json_response["amount"] == invoice_data_valid["amount"], "Amount mismatch"
        assert json_response["currency"] == invoice_data_valid["currency"], "Currency mismatch"
        assert json_response["description"] == invoice_data_valid["description"], "Description mismatch"
        created_invoice_id = json_response["id"]
    except requests.RequestException as e:
        assert False, f"Request failed: {e}"

    # Test creation failure with invalid input data
    try:
        response = requests.post(
            f"{BASE_URL}/api/v1/invoices",
            json=invoice_data_invalid,
            headers=HEADERS,
            timeout=30
        )
        assert response.status_code == 400, f"Expected 400 for invalid data, got {response.status_code}"
        error_response = response.json()
        assert "error" in error_response or "message" in error_response, "Error message missing for invalid input"
    except requests.RequestException as e:
        assert False, f"Request failed: {e}"

    # Test authentication failure with missing API key
    try:
        response = requests.post(
            f"{BASE_URL}/api/v1/invoices",
            json=invoice_data_valid,
            headers={"Content-Type": "application/json"},
            timeout=30
        )
        assert response.status_code == 401 or response.status_code == 403, \
            f"Expected 401/403 for missing auth, got {response.status_code}"
        auth_resp = response.json()
        assert "error" in auth_resp or "message" in auth_resp, "Error message missing for auth failure"
    except requests.RequestException as e:
        assert False, f"Request failed: {e}"

    # Clean up created invoice if any
    if created_invoice_id:
        try:
            del_resp = requests.delete(
                f"{BASE_URL}/api/v1/invoices/{created_invoice_id}",
                headers=HEADERS,
                timeout=30
            )
            # Allow 200 or 204 for successful deletion
            assert del_resp.status_code in (200, 204), f"Failed to delete invoice with id {created_invoice_id}"
        except requests.RequestException:
            pass

test_post_invoices_endpoint()