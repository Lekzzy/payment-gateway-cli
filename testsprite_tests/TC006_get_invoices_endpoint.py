import requests

BASE_URL = "http://localhost:3002"
API_KEY = "API_KEY_VALUE"  # Replace with a valid API key

def test_get_invoices_endpoint():
    url = f"{BASE_URL}/api/v1/invoices"
    headers = {
        "Authorization": f"Api-Key {API_KEY}",
        "Accept": "application/json"
    }
    params = {
        "page": 1,
        "limit": 10
    }

    try:
        response = requests.get(url, headers=headers, params=params, timeout=30)
        response.raise_for_status()
    except requests.exceptions.RequestException as e:
        assert False, f"Request to GET /api/v1/invoices failed: {e}"

    # Validate response code
    assert response.status_code == 200, f"Expected status code 200, got {response.status_code}"

    # Validate response JSON structure
    try:
        data = response.json()
    except ValueError:
        assert False, "Response is not valid JSON"

    # Expected response structure includes pagination metadata and list of invoices
    # Typical structure could be { "invoices": [...], "pagination": {...} }
    assert isinstance(data, dict), "Response JSON root should be a dictionary"

    # Validate invoices list
    assert "invoices" in data, "'invoices' key not found in response"
    assert isinstance(data["invoices"], list), "'invoices' should be a list"

    # Validate pagination info
    assert "pagination" in data, "'pagination' key not found in response"
    pagination = data["pagination"]
    assert isinstance(pagination, dict), "'pagination' should be a dictionary"
    assert "page" in pagination, "'page' key missing in pagination"
    assert "limit" in pagination, "'limit' key missing in pagination"
    assert "total" in pagination, "'total' key missing in pagination"

    # Check page and limit values match request
    assert pagination["page"] == params["page"], f"Expected page {params['page']}, got {pagination['page']}"
    assert pagination["limit"] == params["limit"], f"Expected limit {params['limit']}, got {pagination['limit']}"

    # Validate each invoice object for minimum fields and types (assuming typical fields)
    for invoice in data["invoices"]:
        assert isinstance(invoice, dict), "Each invoice should be a dictionary"
        # Basic mandatory fields for invoice; adjust as necessary
        mandatory_fields = ["id", "amount", "currency", "status", "created_at", "due_date"]
        for field in mandatory_fields:
            assert field in invoice, f"Invoice missing mandatory field: {field}"
        assert isinstance(invoice["id"], str), "Invoice id should be a string"
        assert isinstance(invoice["amount"], (int, float)), "Invoice amount should be a number"
        assert isinstance(invoice["currency"], str), "Invoice currency should be a string"
        assert isinstance(invoice["status"], str), "Invoice status should be a string"
        assert isinstance(invoice["created_at"], str), "Invoice created_at should be a string"
        assert isinstance(invoice["due_date"], str), "Invoice due_date should be a string"

    # Test filter parameter: filter by status if applicable
    # If API supports filtering by status, test with a valid status filter
    filter_params = {
        "status": "pending",
        "page": 1,
        "limit": 5
    }
    try:
        response_filtered = requests.get(url, headers=headers, params=filter_params, timeout=30)
        response_filtered.raise_for_status()
    except requests.exceptions.RequestException as e:
        assert False, f"Request to GET /api/v1/invoices with filter failed: {e}"

    assert response_filtered.status_code == 200, f"Expected status code 200 for filtered request, got {response_filtered.status_code}"

    try:
        filtered_data = response_filtered.json()
    except ValueError:
        assert False, "Filtered response is not valid JSON"

    invoices_filtered = filtered_data.get("invoices", [])
    for invoice in invoices_filtered:
        assert invoice.get("status", None) == "pending", f"Filtered invoice status expected 'pending', got {invoice.get('status')}"

test_get_invoices_endpoint()