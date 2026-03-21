// Ho Jin Han, A0266275W
// AI Assistance: Advanced Agentic Coding Assistant
//
// UI Test for Profile and Auth Flow across multiple pages.

import { test, expect } from "./fixtures";
import type { Page } from "@playwright/test";

test.describe("Profile and Authentication Cross-Page Flows", () => {
  test.describe.configure({ mode: "serial" });
  test.setTimeout(60_000);

  test.beforeEach(async ({ page, db }) => {
    await db.collection("users").deleteMany({
      email: { $in: ["jinhan@test.com", "logout@test.com", "mock@test.com"] },
    });

    await page.goto("/");
    await page.evaluate(() => localStorage.clear());
  });

  async function fillDobIfPresent(page: Page): Promise<void> {
    const dobInput = page.locator('input[type="date"]');
    if (await dobInput.count() > 0) {
      await dobInput.fill("2000-01-01");
    }
  }

  async function waitForAuthToken(page: Page): Promise<void> {
    await page.waitForFunction(() => {
      const raw = localStorage.getItem("auth");
      if (!raw) return false;
      try {
        const parsed = JSON.parse(raw);
        return Boolean(parsed?.token);
      } catch {
        return false;
      }
    }, { timeout: 15_000 });
  }

  async function waitForAuthUser(
    page: Page,
    expected: { name?: string; address?: string; phone?: string | number }
  ): Promise<void> {
    await page.waitForFunction(
      (exp) => {
        const raw = localStorage.getItem("auth");
        if (!raw) return false;

        try {
          const parsed = JSON.parse(raw);
          const u = parsed?.user || {};

          const norm = (v: unknown) => (v === null || v === undefined ? "" : String(v)).trim();

          if (exp.name && norm(u.name) !== norm(exp.name)) return false;
          if (exp.address && norm(u.address) !== norm(exp.address)) return false;
          if (exp.phone && norm(u.phone) !== norm(exp.phone)) return false;

          return true;
        } catch {
          return false;
        }
      },
      expected,
      { timeout: 15_000 }
    );
  }


  async function waitForLoggedOut(page: Page): Promise<void> {
    await page.waitForFunction(() => {
      const raw = localStorage.getItem("auth");
      if (!raw) return true;
      try {
        const parsed = JSON.parse(raw);
        return !parsed?.token;
      } catch {
        return true;
      }
    }, { timeout: 15_000 });
  }

  async function registerUser(
    page: Page,
    user: {
      name: string;
      email: string;
      password: string;
      phone: string;
      address: string;
      answer: string;
    }
  ): Promise<void> {
    await page.goto("/register");
    await expect(page.locator("h4.title", { hasText: "REGISTER FORM" })).toBeVisible();

    await page.fill('input[placeholder="Enter Your Name"]', user.name);
    await page.fill('input[placeholder="Enter Your Email "]', user.email);
    await page.fill('input[placeholder="Enter Your Password"]', user.password);
    await page.fill('input[placeholder="Enter Your Phone"]', user.phone);
    await page.fill('input[placeholder="Enter Your Address"]', user.address);
    await page.fill('input[placeholder="What is Your Favorite sports"]', user.answer);

    await fillDobIfPresent(page);

    await page.locator("button", { hasText: "REGISTER" }).click();

    // Don’t assert toast (DOM/classes vary). Assert redirect + login form instead.
    await page.waitForURL(/\/login/, { timeout: 15_000 });
    await expect(page.locator("h4.title", { hasText: "LOGIN FORM" })).toBeVisible();
  }

  async function loginUser(page: Page, creds: { email: string; password: string }): Promise<void> {
    await expect(page.locator("h4.title", { hasText: "LOGIN FORM" })).toBeVisible();

    await page.fill('input[placeholder="Enter Your Email "]', creds.email);
    await page.fill('input[placeholder="Enter Your Password"]', creds.password);
    await page.locator("button", { hasText: "LOGIN" }).click();

    // Reliable “logged in” signal
    await waitForAuthToken(page);
  }

  async function gotoProfileAndWait(page: Page): Promise<void> {
    await page.goto("/dashboard/user/profile");
    await expect(page).toHaveURL(/\/dashboard\/user\/profile/, { timeout: 15_000 });
    await expect(page.locator("h4.title", { hasText: "USER PROFILE" })).toBeVisible({ timeout: 15_000 });
  }

  // Jin Han, A0266275W
  test("User registers, logs in, updates profile, and verifies on dashboard", async ({ page }) => {
    const user = {
      name: "Jin Han",
      email: "jinhan@test.com",
      password: "password123",
      phone: "12345678",
      address: "123 Initial Ave",
      answer: "Coding",
    };

    // 1) Register -> login page
    await registerUser(page, user);

    // 2) Login
    await loginUser(page, { email: user.email, password: user.password });

    // 3) Go profile
    await gotoProfileAndWait(page);

    // Verify initial values in form
    await expect(page.locator('input[placeholder="Enter Your Name"]')).toHaveValue("Jin Han");

    // Update fields
    await page.fill('input[placeholder="Enter Your Name"]', "Jin Han Updated");
    await page.fill('input[placeholder="Enter Your Password"]', "password123");
    await page.fill('input[placeholder="Enter Your Phone"]', "87654321");
    await page.fill('input[placeholder="Enter Your Address"]', "456 Updated Blvd");

    // Click update
    await page.locator("button", { hasText: "UPDATE" }).click();

    // IMPORTANT: wait for the update request + persistence before going to dashboard
    await page.waitForResponse(
      (res) => res.url().includes("/api/v1/auth/profile") && res.status() === 200,
      { timeout: 15_000 }
    );

    // Wait until localStorage has the updated user (AuthProvider/Context depends on this)
    await waitForAuthUser(page, {
      name: "Jin Han Updated",
      phone: "87654321",
      address: "456 Updated Blvd",
    });

    // 4) Now go dashboard and assert it displays from auth context
    await page.goto("/dashboard/user");
    await expect(page).toHaveURL(/\/dashboard\/user/, { timeout: 15_000 });

    await expect(page.locator("h3").filter({ hasText: "Jin Han Updated" })).toBeVisible({ timeout: 15_000 });
    await expect(page.locator("h3").filter({ hasText: "456 Updated Blvd" })).toBeVisible({ timeout: 15_000 });
  });

  // Jin Han, A0266275W
  test("Expired JWT redirects to login instead of dashboard (session-expired behavior)", async ({ page, db }) => {
    await db.collection("users").insertOne({
      name: "Mock User",
      email: "mock@test.com",
      phone: "12345678",
      address: "Mock Addr",
      password: "hashedpassword",
      answer: "Coding",
      role: 0,
    });

    await page.goto("/");
    await page.evaluate(() => {
      localStorage.setItem(
        "auth",
        JSON.stringify({
          user: {
            name: "Mock User",
            email: "mock@test.com",
            phone: "12345678",
            address: "Mock Addr",
            role: 0,
          },
          token: "invalidAndExpiredToken12345",
        })
      );
    });

    await page.goto("/dashboard/user");

    await expect(page.locator("h1", { hasText: "redirecting to you in" })).toBeVisible({ timeout: 15_000 });
    await expect(page).toHaveURL(/\/login/, { timeout: 15_000 });
    await expect(page.locator("h4.title", { hasText: "LOGIN FORM" })).toBeVisible({ timeout: 15_000 });
  });

  // Jin Han, A0266275W
  test("Update profile -> Logout -> Access Profile -> Forced Login -> Redirect back to Profile", async ({ page }) => {
    const user = {
      name: "Jin Han Logout Test",
      email: "logout@test.com",
      password: "password123",
      phone: "12345678",
      address: "123 Initial Ave",
      answer: "Coding",
    };

    await registerUser(page, user);
    await loginUser(page, { email: user.email, password: user.password });

    await gotoProfileAndWait(page);

    await page.locator('input[placeholder="Enter Your Phone"]').fill("99999999");
    await page.locator("button", { hasText: "UPDATE" }).click();

    await page.waitForResponse(
      (res) => res.url().includes("/api/v1/auth/profile") && res.status() === 200,
      { timeout: 15_000 }
    );
    await waitForAuthUser(page, { phone: "99999999" });

    // Logout
    await page.locator(".nav-link", { hasText: "Jin Han Logout Test" }).click();
    // Click the actual logout menu item
    await page.getByRole("link", { name: /logout/i }).click();
    await waitForLoggedOut(page);

    // Access profile again -> should redirect to login
    await page.goto("/dashboard/user/profile");
    await expect(page).toHaveURL(/\/login/, { timeout: 15_000 });
    await expect(page.locator("h4.title", { hasText: "LOGIN FORM" })).toBeVisible({ timeout: 15_000 });

    // Login again -> should redirect back to profile
    await loginUser(page, { email: user.email, password: user.password });

    await expect(page).toHaveURL(/\/dashboard\/user\/profile/, { timeout: 15_000 });
    await expect(page.locator("h4.title", { hasText: "USER PROFILE" })).toBeVisible({ timeout: 15_000 });
    await expect(page.locator('input[placeholder="Enter Your Phone"]')).toHaveValue("99999999");
  });

  // Jin Han, A0266275W
  test("Profile update with short password is rejected and does not persist changes", async ({ page }) => {
    const user = {
      name: "Jin Han ShortPw Test",
      email: "jinhan@test.com",
      password: "password123",
      phone: "12345678",
      address: "123 Initial Ave",
      answer: "Coding",
    };

    // Register + login
    await registerUser(page, user);
    await loginUser(page, { email: user.email, password: user.password });

    // Go to profile
    await gotoProfileAndWait(page);

    // Capture current auth snapshot (to verify persistence does NOT change)
    const before = await page.evaluate(() => localStorage.getItem("auth"));

    // Enter invalid password (< 6) and submit update
    await page.fill('input[placeholder="Enter Your Password"]', "123");
    await page.locator("button", { hasText: "UPDATE" }).click();

    // Wait for profile update response; backend should reject (likely 400)
    const resp = await page.waitForResponse(
      (res) => res.url().includes("/api/v1/auth/profile"),
      { timeout: 15_000 }
    );

    // Expect a rejection status (commonly 400)
    expect(resp.status()).toBe(400);

    // Ensure localStorage auth was NOT overwritten on failed update
    const after = await page.evaluate(() => localStorage.getItem("auth"));
    expect(after).toBe(before);

    // Optional (only if you want): assert the generic toast text is visible somewhere
    // This can be flaky depending on toast timing, so keep it optional.
    // await expect(page.getByText(/something went wrong/i)).toBeVisible({ timeout: 5000 });
  });

});
