import requests

BASE_URL = "http://localhost:3002"
API_KEY = "test_12345"  # Use a valid API key starting with 'test_'
HEADERS = {
    "Authorization": f"ApiKey {API_KEY}",
    "Content-Type": "application/json"
}
TIMEOUT = 30


def test_post_invoice_cancel_endpoint():
    invoice_id = None
    created_invoice_paid_id = None

    try:
        # Step 1: Create a new invoice to be cancelled later
        invoice_payload = {
            "customer_id": "customer-test-123",
            "plan_id": "plan-test-123",
            "amount": 1000,
            "currency": "USD",
            "description": "Test invoice for cancellation"
        }
        create_resp = requests.post(
            f"{BASE_URL}/api/v1/invoices",
            json=invoice_payload,
            headers=HEADERS,
            timeout=TIMEOUT
        )
        assert create_resp.status_code == 201, f"Failed to create invoice: {create_resp.text}"
        invoice = create_resp.json()
        invoice_id = invoice.get("id")
        assert invoice_id, "Created invoice response missing 'id'"

        # Step 2: Attempt to cancel the created invoice (valid case)
        cancel_resp = requests.post(
            f"{BASE_URL}/api/v1/invoices/{invoice_id}/cancel",
            headers=HEADERS,
            timeout=TIMEOUT
        )
        assert cancel_resp.status_code == 200, f"Failed to cancel invoice: {cancel_resp.text}"
        cancel_data = cancel_resp.json()
        assert cancel_data.get("status") == "cancelled", "Invoice status should be 'cancelled' after cancellation"

        # Step 3: Attempt to cancel invoice again (already cancelled)
        cancel_again_resp = requests.post(
            f"{BASE_URL}/api/v1/invoices/{invoice_id}/cancel",
            headers=HEADERS,
            timeout=TIMEOUT
        )
        # Expecting error (4xx) because invoice already cancelled
        assert cancel_again_resp.status_code in (400, 409), "Cancelling an already cancelled invoice should fail"

        # Step 4: Create another invoice, pay it, then try to cancel (should fail)
        invoice_payload_paid = {
            "customer_id": "customer-test-456",
            "plan_id": "plan-test-456",
            "amount": 2000,
            "currency": "USD",
            "description": "Test invoice to pay before cancel"
        }
        create_paid_resp = requests.post(
            f"{BASE_URL}/api/v1/invoices",
            json=invoice_payload_paid,
            headers=HEADERS,
            timeout=TIMEOUT
        )
        assert create_paid_resp.status_code == 201, f"Failed to create invoice for pay test: {create_paid_resp.text}"
        paid_invoice = create_paid_resp.json()
        created_invoice_paid_id = paid_invoice.get("id")
        assert created_invoice_paid_id, "Created paid invoice response missing 'id'"

        # Pay the invoice
        pay_resp = requests.post(
            f"{BASE_URL}/api/v1/invoices/{created_invoice_paid_id}/pay",
            headers=HEADERS,
            timeout=TIMEOUT
        )
        assert pay_resp.status_code == 200, f"Failed to pay invoice: {pay_resp.text}"
        pay_data = pay_resp.json()
        assert pay_data.get("status") == "paid", "Invoice status should be 'paid' after payment"

        # Try to cancel paid invoice (should fail)
        cancel_paid_resp = requests.post(
            f"{BASE_URL}/api/v1/invoices/{created_invoice_paid_id}/cancel",
            headers=HEADERS,
            timeout=TIMEOUT
        )
        assert cancel_paid_resp.status_code in (400, 409), "Cancelling a paid invoice should fail"

        # Step 5: Try to cancel an invoice with invalid ID (non-existent)
        invalid_id = "non-existent-invoice-id"
        cancel_invalid_resp = requests.post(
            f"{BASE_URL}/api/v1/invoices/{invalid_id}/cancel",
            headers=HEADERS,
            timeout=TIMEOUT
        )
        assert cancel_invalid_resp.status_code == 404, "Cancelling a non-existent invoice should return 404"

        # Step 6: Try to cancel an invoice without authorization header (unauthenticated)
        unauth_resp = requests.post(
            f"{BASE_URL}/api/v1/invoices/{invoice_id}/cancel",
            timeout=TIMEOUT
        )
        assert unauth_resp.status_code == 401, "Cancelling invoice without auth should return 401 Unauthorized"

    finally:
        # Cleanup: Delete created invoices if API supports it
        if invoice_id:
            try:
                requests.delete(
                    f"{BASE_URL}/api/v1/invoices/{invoice_id}",
                    headers=HEADERS,
                    timeout=TIMEOUT
                )
            except Exception:
                pass
        if created_invoice_paid_id:
            try:
                requests.delete(
                    f"{BASE_URL}/api/v1/invoices/{created_invoice_paid_id}",
                    headers=HEADERS,
                    timeout=TIMEOUT
                )
            except Exception:
                pass


test_post_invoice_cancel_endpoint()
