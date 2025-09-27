import requests
import uuid

BASE_URL = "http://localhost:3002"
API_KEY = "test_api_key_correct_format"  # Replace with valid API key
TIMEOUT = 30

headers = {
    "Content-Type": "application/json",
    "x-api-key": API_KEY
}

def test_post_plans_endpoint():
    plan_data = {
        "name": f"Test Plan {uuid.uuid4()}",
        "description": "This is a test billing plan created during automated testing.",
        "price_cents": 999,  # Assuming price in cents as integer
        "currency": "USD",
        "interval": "monthly",
        "features": [
            "Feature 1",
            "Feature 2"
        ]
    }

    # Try posting valid plan data
    response = requests.post(
        f"{BASE_URL}/api/v1/plans",
        json=plan_data,
        headers=headers,
        timeout=TIMEOUT
    )

    try:
        assert response.status_code == 201, f"Expected status 201, got {response.status_code}"
        created_plan = response.json()
        assert "id" in created_plan and isinstance(created_plan["id"], str), "Response missing 'id' field or not a string"
        assert created_plan["name"] == plan_data["name"], "Plan name does not match"
        assert created_plan["description"] == plan_data["description"], "Plan description does not match"
        assert created_plan["price_cents"] == plan_data["price_cents"], "Plan price_cents does not match"
        assert created_plan["currency"] == plan_data["currency"], "Plan currency does not match"
        assert created_plan["interval"] == plan_data["interval"], "Plan interval does not match"
        assert isinstance(created_plan.get("features", []), list), "Plan features is not a list"
        assert created_plan.get("features", []) == plan_data["features"], "Plan features do not match"
    finally:
        # Clean up created plan
        if response.status_code == 201:
            plan_id = created_plan["id"]
            delete_resp = requests.delete(
                f"{BASE_URL}/api/v1/plans/{plan_id}",
                headers=headers,
                timeout=TIMEOUT
            )
            assert delete_resp.status_code == 204 or delete_resp.status_code == 200, "Failed to delete the created plan after test"

    # Test validation: missing required field 'name'
    invalid_plan_data = {
        "description": "Missing name field",
        "price_cents": 500,
        "currency": "USD",
        "interval": "monthly",
        "features": []
    }

    invalid_response = requests.post(
        f"{BASE_URL}/api/v1/plans",
        json=invalid_plan_data,
        headers=headers,
        timeout=TIMEOUT
    )
    assert invalid_response.status_code == 400 or invalid_response.status_code == 422, f"Expected validation error status, got {invalid_response.status_code}"

    # Test authentication failure
    response_no_auth = requests.post(
        f"{BASE_URL}/api/v1/plans",
        json=plan_data,
        headers={"Content-Type": "application/json"},
        timeout=TIMEOUT
    )
    assert response_no_auth.status_code == 401 or response_no_auth.status_code == 403, f"Expected auth error status, got {response_no_auth.status_code}"


test_post_plans_endpoint()
