import requests

BASE_URL = "http://localhost:3002"
API_KEY = "test-api-key"  # Replace with a valid API key for authentication
TIMEOUT = 30

def test_get_plans_endpoint():
    headers_auth = {
        "Authorization": f"ApiKey {API_KEY}",
        "Accept": "application/json",
    }
    headers_no_auth = {
        "Accept": "application/json",
    }
    
    url = f"{BASE_URL}/api/v1/plans"
    
    # 1. Test without API key - should be unauthorized
    response_no_auth = requests.get(url, headers=headers_no_auth, timeout=TIMEOUT)
    assert response_no_auth.status_code == 401 or response_no_auth.status_code == 403, \
        f"Expected 401 or 403 without API key, got {response_no_auth.status_code}"
    
    # 2. Test with API key - expect 200 OK and list of plans
    response_auth = requests.get(url, headers=headers_auth, timeout=TIMEOUT)
    assert response_auth.status_code == 200, f"Expected 200 OK with API key, got {response_auth.status_code}"
    
    data = response_auth.json()
    # Expecting data to be a list (array) of plans
    assert isinstance(data, list), "Response data should be a list"
    
    # Validate structure of each plan (if any plans returned)
    for plan in data:
        assert isinstance(plan, dict), "Each plan should be an object/dict"
        # Check typical fields expected in a billing plan
        expected_keys = {"id", "name", "description", "price", "currency", "createdAt", "updatedAt"}
        assert expected_keys.issubset(plan.keys()), f"Plan keys missing. Expected keys: {expected_keys}, got: {plan.keys()}"
        assert isinstance(plan["id"], str) and plan["id"], "Plan 'id' should be a non-empty string"
        assert isinstance(plan["name"], str) and plan["name"], "Plan 'name' should be a non-empty string"
        assert isinstance(plan["price"], (int, float)), "Plan 'price' should be a number"
        assert isinstance(plan["currency"], str) and len(plan["currency"]) == 3, "Plan 'currency' should be a 3-letter string"
    
    # 3. Test rate limiting by sending multiple requests rapidly
    # We'll send 10 quick requests and expect either all succeed or some get 429 Too Many Requests
    rate_limit_hits = 0
    for _ in range(10):
        r = requests.get(url, headers=headers_auth, timeout=TIMEOUT)
        if r.status_code == 429:
            rate_limit_hits += 1
        else:
            assert r.status_code == 200, f"Expected 200 or 429 for rate limit, got {r.status_code}"
    
    # Assert that rate limiting is enforced (some 429 responses expected)
    assert rate_limit_hits > 0, "Expected some 429 Too Many Requests responses to enforce rate limiting"

test_get_plans_endpoint()