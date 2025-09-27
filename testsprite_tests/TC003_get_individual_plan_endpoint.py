import requests

BASE_URL = "http://localhost:3002"
API_KEY = "test_abcdef123456"  # Updated to valid API key format starting with 'test_'
HEADERS = {
    "Authorization": f"ApiKey {API_KEY}",
    "Content-Type": "application/json",
}
TIMEOUT = 30


def test_get_individual_plan_endpoint():
    # First, create a new plan to get a valid ID
    plan_payload = {
        "name": "Test Plan TC003",
        "description": "Plan created for testing GET individual plan endpoint",
        "price": 9.99,
        "currency": "USD",
        "interval": "month"
    }

    created_plan_id = None

    try:
        create_resp = requests.post(
            f"{BASE_URL}/api/v1/plans",
            json=plan_payload,
            headers=HEADERS,
            timeout=TIMEOUT,
        )
        assert create_resp.status_code == 201, f"Failed to create plan for test setup: {create_resp.text}"
        created_plan = create_resp.json()
        created_plan_id = created_plan.get("id")
        assert created_plan_id, "Created plan ID not returned"

        # Test 1: Successful GET of the created plan
        get_resp = requests.get(
            f"{BASE_URL}/api/v1/plans/{created_plan_id}",
            headers=HEADERS,
            timeout=TIMEOUT,
        )
        assert get_resp.status_code == 200, f"GET plan failed: {get_resp.text}"
        plan_data = get_resp.json()
        assert plan_data["id"] == created_plan_id, "Returned plan ID does not match"
        assert plan_data["name"] == plan_payload["name"], "Plan name mismatch"
        assert plan_data["description"] == plan_payload["description"], "Plan description mismatch"
        assert float(plan_data["price"]) == plan_payload["price"], "Plan price mismatch"
        assert plan_data["currency"] == plan_payload["currency"], "Plan currency mismatch"
        assert plan_data["interval"] == plan_payload["interval"], "Plan interval mismatch"

        # Test 2: GET plan with non-existent ID returns 404
        non_existent_id = "nonexistent1234567890"
        not_found_resp = requests.get(
            f"{BASE_URL}/api/v1/plans/{non_existent_id}",
            headers=HEADERS,
            timeout=TIMEOUT,
        )
        assert not_found_resp.status_code == 404, "Expected 404 for non-existent plan ID"

        # Test 3: GET plan with missing or invalid authentication returns 401 or 403
        no_auth_resp = requests.get(
            f"{BASE_URL}/api/v1/plans/{created_plan_id}",
            headers={"Content-Type": "application/json"},
            timeout=TIMEOUT,
        )
        assert no_auth_resp.status_code in (401, 403), f"Expected 401/403 for missing auth, got {no_auth_resp.status_code}"

        invalid_auth_headers = {"Authorization": "ApiKey invalidkey", "Content-Type": "application/json"}
        invalid_auth_resp = requests.get(
            f"{BASE_URL}/api/v1/plans/{created_plan_id}",
            headers=invalid_auth_headers,
            timeout=TIMEOUT,
        )
        assert invalid_auth_resp.status_code in (401, 403), f"Expected 401/403 for invalid auth, got {invalid_auth_resp.status_code}"

    finally:
        if created_plan_id:
            try:
                del_resp = requests.delete(
                    f"{BASE_URL}/api/v1/plans/{created_plan_id}",
                    headers=HEADERS,
                    timeout=TIMEOUT,
                )
                # Accept 200 or 204 on successful delete, ignore otherwise
                assert del_resp.status_code in (200, 204, 404)
            except Exception:
                pass


test_get_individual_plan_endpoint()
