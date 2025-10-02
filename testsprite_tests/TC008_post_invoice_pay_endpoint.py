import requests

BASE_URL = "http://localhost:3002"
API_KEY = "your-valid-api-key"
HEADERS = {
    "Authorization": f"ApiKey {API_KEY}",
    "Content-Type": "application/json"
}
TIMEOUT = 30


def test_post_invoice_pay_endpoint():
    invoice_id = None

    # Helper function to create an invoice
    def create_invoice():
        invoice_data = {
            # Minimal required fields for invoice creation,
            # adjust as per actual API schema if more required
            "customer_name": "Test Customer",
            "amount": 100.00,
            "currency": "USD",
            "description": "Test invoice for payment"
        }
        response = requests.post(f"{BASE_URL}/api/v1/invoices", json=invoice_data, headers=HEADERS, timeout=TIMEOUT)
        response.raise_for_status()
        return response.json()["id"]

    # Helper function to delete an invoice
    def delete_invoice(inv_id):
        # The PRD does not list DELETE for invoices,
        # so skipping deletion (if unsupported).
        # If delete supported, implement here.
        pass

    invoice_id = create_invoice()

    try:
        # 1. Successful payment marking
        pay_response = requests.post(
            f"{BASE_URL}/api/v1/invoices/{invoice_id}/pay",
            headers=HEADERS,
            timeout=TIMEOUT
        )
        assert pay_response.status_code == 200, f"Expected 200 OK, got {pay_response.status_code}"
        pay_json = pay_response.json()
        assert "status" in pay_json, "Response JSON missing 'status'"
        assert pay_json["status"].lower() == "paid", f"Invoice status expected 'paid', got '{pay_json['status']}'"

        # 2. Verify that the invoice status has been updated by retrieving the invoice
        get_response = requests.get(
            f"{BASE_URL}/api/v1/invoices/{invoice_id}",
            headers=HEADERS,
            timeout=TIMEOUT
        )
        assert get_response.status_code == 200, f"Expected 200 OK on get invoice, got {get_response.status_code}"
        invoice_data = get_response.json()
        assert invoice_data.get("status", "").lower() == "paid", f"Invoice status expected 'paid', got '{invoice_data.get('status')}'"

        # 3. Error handling for invalid invoice IDs
        invalid_id = "invalid-invoice-id-12345"
        error_response = requests.post(
            f"{BASE_URL}/api/v1/invoices/{invalid_id}/pay",
            headers=HEADERS,
            timeout=TIMEOUT
        )
        assert error_response.status_code in (400, 404), f"Expected 400 or 404 for invalid invoice ID, got {error_response.status_code}"

        error_json = error_response.json()
        assert "error" in error_json or "message" in error_json, "Error response should contain 'error' or 'message'"

        # 4. Authentication enforcement - no API key
        no_auth_response = requests.post(
            f"{BASE_URL}/api/v1/invoices/{invoice_id}/pay",
            headers={"Content-Type": "application/json"},
            timeout=TIMEOUT
        )
        assert no_auth_response.status_code == 401 or no_auth_response.status_code == 403, f"Expected 401 or 403 without auth, got {no_auth_response.status_code}"

    finally:
        # Cleanup: delete the created invoice if deletion endpoint is available
        delete_invoice(invoice_id)


test_post_invoice_pay_endpoint()
