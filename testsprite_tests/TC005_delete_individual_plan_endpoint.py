import requests

BASE_URL = "http://localhost:3002"
API_KEY = "Bearer test_api_key"
HEADERS = {
    "Authorization": API_KEY,
    "Content-Type": "application/json"
}
TIMEOUT = 30


def test_delete_individual_plan_endpoint():
    plan_data = {
        "name": "Test Plan for Deletion",
        "description": "Plan created for delete endpoint test",
        "price": 1000,
        "currency": "USD",
        "interval": "month"
    }

    created_plan_id = None

    try:
        # Create a new plan to be deleted
        create_resp = requests.post(
            f"{BASE_URL}/api/v1/plans",
            headers=HEADERS,
            json=plan_data,
            timeout=TIMEOUT
        )
        assert create_resp.status_code == 201, f"Unexpected status creating plan: {create_resp.status_code}"
        created_plan = create_resp.json()
        created_plan_id = created_plan.get("id") or created_plan.get("_id")
        assert created_plan_id is not None, "Created plan ID is None"

        # Delete the created plan
        delete_resp = requests.delete(
            f"{BASE_URL}/api/v1/plans/{created_plan_id}",
            headers=HEADERS,
            timeout=TIMEOUT
        )
        assert delete_resp.status_code == 204, f"Unexpected delete status code: {delete_resp.status_code}"

        # Verify deletion by attempting to GET the deleted plan
        get_resp = requests.get(
            f"{BASE_URL}/api/v1/plans/{created_plan_id}",
            headers=HEADERS,
            timeout=TIMEOUT
        )
        assert get_resp.status_code == 404, "Deleted plan still accessible, expected 404"

        # Test deletion with non-existent ID
        invalid_id = "nonexistent-id-12345"
        delete_invalid = requests.delete(
            f"{BASE_URL}/api/v1/plans/{invalid_id}",
            headers=HEADERS,
            timeout=TIMEOUT
        )
        assert delete_invalid.status_code == 404, "Deleting non-existent ID should return 404"

        # Test deletion without authentication
        unauth_delete = requests.delete(
            f"{BASE_URL}/api/v1/plans/{created_plan_id}",
            headers={"Content-Type": "application/json"},
            timeout=TIMEOUT
        )
        assert unauth_delete.status_code in (401, 403), "Unauthorized delete should be 401 or 403"

    finally:
        # Cleanup if plan still exists
        if created_plan_id:
            try:
                requests.delete(
                    f"{BASE_URL}/api/v1/plans/{created_plan_id}",
                    headers=HEADERS,
                    timeout=TIMEOUT
                )
            except Exception:
                pass


test_delete_individual_plan_endpoint()
