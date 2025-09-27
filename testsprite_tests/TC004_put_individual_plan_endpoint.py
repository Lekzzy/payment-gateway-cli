import requests

BASE_URL = "http://localhost:3002"
API_KEY = "Bearer test_api_key_valid_format"
HEADERS = {
    "Authorization": API_KEY,
    "Content-Type": "application/json"
}
TIMEOUT = 30


def test_put_individual_plan_endpoint():
    # First, create a new plan to update
    create_payload = {
        "name": "Original Plan",
        "description": "Original description",
        "price": 1000,
        "currency": "USD",
        "interval": "month"
    }
    plan_id = None
    try:
        create_resp = requests.post(
            f"{BASE_URL}/api/v1/plans",
            json=create_payload,
            headers=HEADERS,
            timeout=TIMEOUT
        )
        assert create_resp.status_code == 201, f"Failed to create plan, got {create_resp.status_code}"
        plan = create_resp.json()
        # Try multiple ways to get the plan id
        if isinstance(plan, dict):
            plan_id = plan.get("id") or plan.get("_id")
            if not plan_id:
                # Check nested keys
                if "data" in plan and isinstance(plan["data"], dict):
                    plan_id = plan["data"].get("id") or plan["data"].get("_id")
                if not plan_id and "plan" in plan and isinstance(plan["plan"], dict):
                    plan_id = plan["plan"].get("id") or plan["plan"].get("_id")
        assert plan_id is not None, "Created plan has no id"

        # Test valid update of the plan
        update_payload = {
            "name": "Updated Plan Name",
            "description": "Updated description",
            "price": 1500,
            "currency": "USD",
            "interval": "year"
        }
        update_resp = requests.put(
            f"{BASE_URL}/api/v1/plans/{plan_id}",
            json=update_payload,
            headers=HEADERS,
            timeout=TIMEOUT
        )
        assert update_resp.status_code == 200, f"Expected 200 on valid update, got {update_resp.status_code}"
        updated_plan = update_resp.json()
        for key in update_payload:
            assert updated_plan.get(key) == update_payload[key], f"Field {key} was not updated correctly"

        # Test input validation: empty name should return 400
        invalid_payload = {
            "name": "",
            "description": "Desc",
            "price": 500,
            "currency": "USD",
            "interval": "month"
        }
        invalid_resp = requests.put(
            f"{BASE_URL}/api/v1/plans/{plan_id}",
            json=invalid_payload,
            headers=HEADERS,
            timeout=TIMEOUT
        )
        assert invalid_resp.status_code == 400, f"Expected 400 for invalid input, got {invalid_resp.status_code}"

        # Test authentication: no API key header - expect 401 Unauthorized
        no_auth_resp = requests.put(
            f"{BASE_URL}/api/v1/plans/{plan_id}",
            json=update_payload,
            headers={"Content-Type": "application/json"},
            timeout=TIMEOUT
        )
        assert no_auth_resp.status_code == 401, f"Expected 401 for missing auth, got {no_auth_resp.status_code}"

        # Test update on non-existent plan id returns 404
        nonexistent_id = "nonexistent-plan-id-xyz"
        not_found_resp = requests.put(
            f"{BASE_URL}/api/v1/plans/{nonexistent_id}",
            json=update_payload,
            headers=HEADERS,
            timeout=TIMEOUT
        )
        assert not_found_resp.status_code == 404, f"Expected 404 for non-existent plan, got {not_found_resp.status_code}"

    finally:
        # Cleanup: delete the created plan if exists
        if plan_id:
            requests.delete(
                f"{BASE_URL}/api/v1/plans/{plan_id}",
                headers=HEADERS,
                timeout=TIMEOUT
            )


test_put_individual_plan_endpoint()
