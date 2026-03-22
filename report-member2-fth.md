Member 2: FOO TZIE HUANG

Note: GitHub Copilot (Claude Sonnet 4.6) was used for Milestone 1 unit test generation. CodeMax (Claude Sonnet 4) was used for Milestone 2 integration test generation, UI test generation, and report writing assistance.

Milestone 1

Unit Test Overview

This section summarises my individual unit testing and defect resolution for Milestone 1. I focused on the application's most critical security and financial modules: User Authentication (authController.js) and Payment Gateway Integration (productController.js — Braintree controllers). I also provided coverage for the admin Users page (Users.js) and the Search results page (Search.js). In total, I wrote unit tests across these areas and fixed 3 bugs.

Unit Test Approach

I employed a pragmatic, integration-aware unit testing approach that balances strict isolation with realistic interaction patterns. My strategy was built on four pillars:

1. Mock-Based Isolation with Realistic Contracts
I extensively mocked external dependencies (userModel, orderModel, Braintree gateway) using Jest's mock system. Rather than mocking at an overly granular level, I preserved realistic contract boundaries. For the Braintree flow, I mocked the gateway's callback-based API exactly as it appears in the controller. This catches integration bugs (like incorrect callback parameters) that simplified synchronous mocks would miss.

2. Arrange–Act–Assert (AAA) Pattern
I followed the AAA pattern to improve test readability and ensure that graders can easily identify the test setup versus the outcome verification.
- Arrange: Initializing request/response objects and defining mock return values (e.g., mockResolvedValue for password hashes).
- Act: Invoking the specific controller method.
- Assert: Verifying HTTP status codes, JSON response structures, and database call frequencies.

3. Decision Table and Boundary Value Analysis (BVA)
For controllers with heavy validation logic (e.g., registerController, forgotPasswordController), I used decision tables to systematically map inputs to expected outcomes. I applied BVA specifically for:
- Password Validation: Testing the exact 6-character boundary.
- Payment Amounts: Handling decimal precision (e.g., $10.99) to ensure the total calculation doesn't suffer from floating-point errors.

4. Callback-Based Async Testing
Braintree's SDK uses an older callback architecture rather than modern Promises. To test this accurately, I used a Shared Mock Instance strategy, manually triggering callbacks inside the test. I combined this with Jest's setImmediate() to ensure assertions only ran after the asynchronous callback executed, preventing "false positive" passes.

Frontend Component Testing (Users.js and Search.js)

For the admin Users page and Search results page, I used a component-contract testing approach. I mocked dependencies (Layout, AdminMenu, useSearch context) to isolate the component under test, then verified:
- Correct rendering of headings, structure, and child components.
- Dynamic content rendering based on context state (e.g., "No Products Found" vs "Found X" for different search result counts).
- Product card rendering with correct name, truncated description, price, image src/alt, and button presence.

Test Statistics (Individual — Milestone 1)

| Area                          | Test File                         | Tests |
|-------------------------------|-----------------------------------|-------|
| authController (register, login, forgotPassword, test) | controllers/authController.test.js | ~40   |
| productController (braintreeToken, brainTreePayment)   | controllers/productController.test.js | 13  |
| Admin Users page              | client/src/pages/admin/Users.test.js | 8   |
| Search results page           | client/src/pages/Search.test.js      | 16  |
| **Total MS1 Unit Tests**      |                                   | **~77** |

Defects Found and Fixes Applied (Milestone 1)

- Bug 1: Missing return in Validation (Security Risk)
  - Location: authController.js (forgotPasswordController)
  - Issue: Missing fields returned a 400 status but did not stop code execution, potentially allowing the database update to run anyway.
  - Fix: Added explicit return statements to validation guards to ensure the function short-circuits.

- Bug 2: Incorrect HTTP Status for Login Failure
  - Location: authController.js (loginController)
  - Issue: Invalid passwords returned a 200 OK status with an error message, which prevents standard frontend error-handling from triggering correctly.
  - Fix: Changed response status from 200 to 400 Bad Request.

- Bug 3: Unhandled Null Results in Payment Gateway
  - Location: productController.js (brainTreePaymentController)
  - Issue: The controller assumed the Braintree result object was always defined, leading to a potential crash if the gateway failed to respond.
  - Fix: Implemented a robust success check and ensured a 500 error is sent if the result is undefined.

Milestone 2

Integration Test Overview

For Milestone 2, I wrote 24 backend integration tests for authentication controllers and 22 backend integration tests for product/payment controllers, totalling 46 new integration tests. I also wrote 17 Playwright end-to-end UI tests covering registration, login, admin, product browsing, search, and cart flows. My total MS2 contribution is 63 new automated tests across 3 test suites.

Approach for Backend Integration Testing

I used a bottom-up integration approach consistent with the team's established conventions. Tests are organized into multiple levels of integration:

- Level 1 — Route → Middleware → Controller (mocked Model/DB): Tests the HTTP request/response pipeline with mocked database operations. This verifies that routes are wired correctly, middleware (e.g., requireSignIn, isAdmin) enforces authorization, and the controller returns correct status codes and response shapes.

- Level 2 — Route → Middleware → Controller → Model → DB (real in-memory MongoDB): Tests the full backend stack using MongoMemoryServer for an isolated in-memory database. This verifies that data is actually persisted, duplicates are prevented, passwords are hashed before storage, and JWT tokens decode correctly.

For the product integration tests (searchProductController), I extended this to 3 levels:

- Level 1 — Controller + Model (no HTTP): Direct controller invocation with real Mongoose operations against in-memory MongoDB.
- Level 2 — Route + Controller (HTTP via minimal Express app): HTTP testing via supertest on a minimal Express router.
- Level 3 — Full App (HTTP via app.js): HTTP testing via supertest on the complete application.

Backend Integration Test Coverage

| Controller                  | Level 1 | Level 2 | Level 3 | Total |
|-----------------------------|---------|---------|---------|-------|
| registerController          | 4       | 3       | —       | 7     |
| loginController             | 4       | 3       | —       | 7     |
| forgotPasswordController    | 3       | 2       | —       | 5     |
| testController              | 3       | 2       | —       | 5     |
| searchProductController     | 7       | 5       | 4       | 16    |
| braintreeTokenController    | —       | 2       | —       | 2     |
| brainTreePaymentController  | —       | 4       | —       | 4     |
| **Total**                   | **21**  | **21**  | **4**   | **46**|

Key integration test scenarios include:
- **registerController**: Successful registration with DB persistence, duplicate email prevention, hashed password verification (plain text never stored), missing field validation.
- **loginController**: Successful login with JWT token generation, token decode verification, correct user fields returned (password excluded), wrong password handling, non-existent email handling.
- **forgotPasswordController**: Password reset with DB persistence, old password replacement verification, wrong email/answer rejection.
- **testController**: Admin access to protected route, non-admin rejection (403), missing token rejection (401) — tests the full requireSignIn → isAdmin middleware chain.
- **searchProductController**: Name matching, description matching, case-insensitive search, empty results, photo field exclusion from results, error handling.
- **braintreeTokenController**: Endpoint accessibility without authentication, successful token generation from Braintree sandbox.
- **brainTreePaymentController**: Unauthenticated request rejection (401), invalid token rejection, authenticated payment processing with valid cart, HTTP method restriction (GET returns 404).

Approach for UI Testing

For UI testing, I used Playwright to develop black-box end-to-end tests based on realistic user scenarios. These tests were designed from the user's perspective and focused on complete flows across multiple pages. To ensure repeatable and isolated tests, I seeded categories, products, and users directly into the test database before each test using the project's shared fixture system, and cleared all collections between tests.

My UI tests covered 6 major flow areas:

1. **Registration and Login** (FTH-1 to FTH-6): 6 tests
   - Successful registration redirects to login page.
   - Duplicate email registration shows error toast.
   - Successful login redirects to home and displays user name.
   - Full Register → Login flow (end-to-end).
   - Wrong password shows "Invalid Password" error.
   - Non-existent email shows error toast (server returns 404 → axios catch → "Something went wrong").

2. **Admin Users Page** (FTH-7): 1 test
   - Admin can navigate to Users page and see "All Users" heading.
   - Note: The "Users" NavLink in AdminMenu.js is commented out in the source code, so the test navigates directly via URL.

3. **Home Page → Product Details** (FTH-8 to FTH-9): 2 tests
   - Clicking "More Details" on home page navigates to the product slug URL.
   - Product details page renders correct product info (name, description, price, category) when accessed with a valid product ID.

4. **Category Page → Product Details** (FTH-10 to FTH-11): 2 tests
   - Clicking "More Details" on category page navigates to product slug URL.
   - Category page shows only products belonging to that category (cross-category isolation).

5. **Search** (FTH-12 to FTH-14): 3 tests
   - Search by product name shows matching results.
   - Search results display product cards with correct info and buttons.
   - Search with non-matching keyword shows "No Products Found".

6. **Cart Flow** (FTH-15 to FTH-17): 3 tests
   - Add product to cart from home page → verify in cart.
   - Add product to cart from product details page → verify in cart.
   - Full flow: Register → Login → Search → Add to cart from home → View cart with address.

Known Application Limitations Discovered During UI Testing

During UI testing, I discovered several application-level issues that required test adaptations:

1. **ProductDetails slug vs ObjectId mismatch**: ProductDetails.js passes the slug to `/api/v1/product/get-product/:pid`, but `getSingleProductController` calls `findById(slug)` which fails because a slug is not a valid ObjectId. Tests for product details rendering use direct navigation with the product's ObjectId as a workaround.

2. **Search.js non-functional buttons**: The "More Details" and "ADD TO CART" buttons on the Search results page have no onClick handlers — they are rendered but do not navigate or add to cart. Tests verify button presence but do not rely on click functionality.

3. **AdminMenu.js commented-out Users link**: The NavLink to `/dashboard/admin/users` is commented out in AdminMenu.js, so the admin cannot reach the Users page via the menu. Tests navigate directly via URL.

4. **Login 404 error handling**: The loginController returns HTTP 404 for non-existent emails, which causes axios to throw an exception. The frontend catch block shows the generic "Something went wrong" toast instead of the server's actual error message ("Email is not registerd").

UI Test Statistics

| Flow Area                    | Tests |
|------------------------------|-------|
| Registration & Login         | 6     |
| Admin Users Page             | 1     |
| Home Page → Product Details  | 2     |
| Category → Product Details   | 2     |
| Search                       | 3     |
| Cart Flow                    | 3     |
| **Total MS2 UI Tests**       | **17**|

Overall MS2 Test Summary

| Test Type               | Count |
|--------------------------|-------|
| Backend Integration (auth controllers)    | 24    |
| Backend Integration (product controllers) | 22    |
| Playwright UI Tests                       | 17    |
| **Total MS2 Tests**                       | **63**|

Combined with Milestone 1, my total individual contribution across both milestones is approximately 140 automated tests (77 unit + 63 integration/UI), covering authentication, payment, search, admin, and end-to-end user flows.

Limitations / Future Improvements

- **Search.js navigation**: The "More Details" and "ADD TO CART" buttons on the Search results page are non-functional. Future work should add onClick handlers to enable navigation to product details and cart addition from search results.
- **ProductDetails slug routing**: The frontend passes slugs to the API but the backend expects ObjectIds. A backend fix to support slug-based lookup (e.g., `findOne({slug})` instead of `findById()`) would resolve this mismatch.
- **AdminMenu Users link**: The Users NavLink is commented out, preventing admin navigation to the Users page via the menu. Uncommenting this link would restore the intended admin workflow.
- **Mock Brittleness**: The shared mock for Braintree relies on internal implementation details; refactoring to a more generic stub could improve long-term maintenance.
- **Braintree integration depth**: Integration tests for the payment controllers are limited to auth middleware verification and route accessibility because Braintree is an external service. Future work could use a dedicated Braintree sandbox test account for deeper payment flow testing.
