import { describe, it, expect, vi, afterEach } from "vitest";
import { onboardingApi, OnboardingApiError } from "../onboarding-api";

describe("onboardingApi client", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("1. يرسل ترويسة المستأجر X-Bayan-Tenant-ID مع طلبات المؤسسة", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: "org-123", name: "جامعة البيان", status: "pending" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const org = await onboardingApi.getOrganization("org-123");
    expect(org.id).toBe("org-123");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toContain("/api/v1/onboarding/organizations/org-123");
    expect(init.headers["X-Bayan-Tenant-ID"]).toBe("org-123");
  });

  it("2. يرفع OnboardingApiError منظم عند رفض الخادم بصلاحية مفقودة", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 403,
        json: async () => ({ detail: { code: "permission_denied", message: "الصلاحية مفقودة" } }),
      })
    );

    await expect(onboardingApi.getOrganization("org-999")).rejects.toBeInstanceOf(OnboardingApiError);
  });
});
