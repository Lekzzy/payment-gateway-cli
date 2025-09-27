
# TestSprite AI Testing Report(MCP)

---

## 1️⃣ Document Metadata
- **Project Name:** payment-gateway-cli
- **Date:** 2025-09-28
- **Prepared by:** TestSprite AI Team

---

## 2️⃣ Requirement Validation Summary

#### Test TC001
- **Test Name:** get plans endpoint
- **Test Code:** [TC001_get_plans_endpoint.py](./TC001_get_plans_endpoint.py)
- **Test Error:** Traceback (most recent call last):
  File "/var/task/handler.py", line 258, in run_with_retry
    exec(code, exec_env)
  File "<string>", line 55, in <module>
  File "<string>", line 25, in test_get_plans_endpoint
AssertionError: Expected 200 OK with API key, got 401

- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/75f0f67b-27dd-4c25-acf6-278fe0d8e1b4/97b3249e-69f8-4060-b8bd-406bccf0852f
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC002
- **Test Name:** post plans endpoint
- **Test Code:** [TC002_post_plans_endpoint.py](./TC002_post_plans_endpoint.py)
- **Test Error:** Traceback (most recent call last):
  File "/var/task/handler.py", line 258, in run_with_retry
    exec(code, exec_env)
  File "<string>", line 83, in <module>
  File "<string>", line 35, in test_post_plans_endpoint
AssertionError: Expected status 201, got 400

- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/75f0f67b-27dd-4c25-acf6-278fe0d8e1b4/88a23cee-6423-4eba-b7e7-aab60d88a728
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC003
- **Test Name:** get individual plan endpoint
- **Test Code:** [TC003_get_individual_plan_endpoint.py](./TC003_get_individual_plan_endpoint.py)
- **Test Error:** Traceback (most recent call last):
  File "/var/task/handler.py", line 258, in run_with_retry
    exec(code, exec_env)
  File "<string>", line 90, in <module>
  File "<string>", line 31, in test_get_individual_plan_endpoint
AssertionError: Failed to create plan for test setup: {"success":false,"error":"Invalid API key","message":"API key must start with test_ or live_"}

- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/75f0f67b-27dd-4c25-acf6-278fe0d8e1b4/d6e0f901-ff21-40db-9520-6a850b6a2a16
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC004
- **Test Name:** put individual plan endpoint
- **Test Code:** [TC004_put_individual_plan_endpoint.py](./TC004_put_individual_plan_endpoint.py)
- **Test Error:** Traceback (most recent call last):
  File "/var/task/handler.py", line 258, in run_with_retry
    exec(code, exec_env)
  File "<string>", line 106, in <module>
  File "<string>", line 59, in test_put_individual_plan_endpoint
AssertionError: Field name was not updated correctly

- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/75f0f67b-27dd-4c25-acf6-278fe0d8e1b4/e602a247-720f-4bd8-bc51-4c086e3e27fd
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC005
- **Test Name:** delete individual plan endpoint
- **Test Code:** [TC005_delete_individual_plan_endpoint.py](./TC005_delete_individual_plan_endpoint.py)
- **Test Error:** Traceback (most recent call last):
  File "/var/task/handler.py", line 258, in run_with_retry
    exec(code, exec_env)
  File "<string>", line 82, in <module>
  File "<string>", line 34, in test_delete_individual_plan_endpoint
AssertionError: Created plan ID is None

- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/75f0f67b-27dd-4c25-acf6-278fe0d8e1b4/0241f275-ce1e-4838-853b-5a03ec70dafc
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC006
- **Test Name:** get invoices endpoint
- **Test Code:** [TC006_get_invoices_endpoint.py](./TC006_get_invoices_endpoint.py)
- **Test Error:** Traceback (most recent call last):
  File "<string>", line 19, in test_get_invoices_endpoint
  File "/var/task/requests/models.py", line 1024, in raise_for_status
    raise HTTPError(http_error_msg, response=self)
requests.exceptions.HTTPError: 401 Client Error: Unauthorized for url: http://localhost:3002/api/v1/invoices?page=1&limit=10

During handling of the above exception, another exception occurred:

Traceback (most recent call last):
  File "/var/task/handler.py", line 258, in run_with_retry
    exec(code, exec_env)
  File "<string>", line 90, in <module>
  File "<string>", line 21, in test_get_invoices_endpoint
AssertionError: Request to GET /api/v1/invoices failed: 401 Client Error: Unauthorized for url: http://localhost:3002/api/v1/invoices?page=1&limit=10

- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/75f0f67b-27dd-4c25-acf6-278fe0d8e1b4/11adafcb-45ae-4da6-9650-acbc6d0ef5cc
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC007
- **Test Name:** post invoices endpoint
- **Test Code:** [TC007_post_invoices_endpoint.py](./TC007_post_invoices_endpoint.py)
- **Test Error:** Traceback (most recent call last):
  File "/var/task/handler.py", line 258, in run_with_retry
    exec(code, exec_env)
  File "<string>", line 90, in <module>
  File "<string>", line 38, in test_post_invoices_endpoint
AssertionError: Unexpected status code: 400

- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/75f0f67b-27dd-4c25-acf6-278fe0d8e1b4/a39b46b4-a426-42cb-86f1-2091f666daa9
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC008
- **Test Name:** post invoice pay endpoint
- **Test Code:** [TC008_post_invoice_pay_endpoint.py](./TC008_post_invoice_pay_endpoint.py)
- **Test Error:** Traceback (most recent call last):
  File "/var/task/handler.py", line 258, in run_with_retry
    exec(code, exec_env)
  File "<string>", line 85, in <module>
  File "<string>", line 36, in test_post_invoice_pay_endpoint
  File "<string>", line 26, in create_invoice
  File "/var/task/requests/models.py", line 1024, in raise_for_status
    raise HTTPError(http_error_msg, response=self)
requests.exceptions.HTTPError: 401 Client Error: Unauthorized for url: http://localhost:3002/api/v1/invoices

- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/75f0f67b-27dd-4c25-acf6-278fe0d8e1b4/77a70b37-e29e-42c5-a292-e00a30d29b84
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC009
- **Test Name:** post invoice cancel endpoint
- **Test Code:** [TC009_post_invoice_cancel_endpoint.py](./TC009_post_invoice_cancel_endpoint.py)
- **Test Error:** Traceback (most recent call last):
  File "/var/task/handler.py", line 258, in run_with_retry
    exec(code, exec_env)
  File "<string>", line 130, in <module>
  File "<string>", line 31, in test_post_invoice_cancel_endpoint
AssertionError: Failed to create invoice: {"success":false,"error":"Invalid API key","message":"API key must start with test_ or live_"}

- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/75f0f67b-27dd-4c25-acf6-278fe0d8e1b4/8d62b40c-8f84-4037-988d-2e1c817f3980
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC010
- **Test Name:** post webhooks endpoint
- **Test Code:** [TC010_post_webhooks_endpoint.py](./TC010_post_webhooks_endpoint.py)
- **Test Error:** Traceback (most recent call last):
  File "/var/task/handler.py", line 258, in run_with_retry
    exec(code, exec_env)
  File "<string>", line 67, in <module>
  File "<string>", line 46, in test_post_webhooks_endpoint
AssertionError: Unexpected status code: 401, response: {"success":false,"error":"Invalid signature","message":"Webhook timestamp is too old or too far in the future"}

- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/75f0f67b-27dd-4c25-acf6-278fe0d8e1b4/723b98bf-9e68-466f-84b3-f9de9ebcd9f5
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---


## 3️⃣ Coverage & Matching Metrics

- **0.00** of tests passed

| Requirement        | Total Tests | ✅ Passed | ❌ Failed  |
|--------------------|-------------|-----------|------------|
| ...                | ...         | ...       | ...        |
---


## 4️⃣ Key Gaps / Risks
{AI_GNERATED_KET_GAPS_AND_RISKS}
---