import { beforeEach, describe, expect, it, vi } from "vitest";

const { authorizedRequest } = vi.hoisted(() => ({
  authorizedRequest: vi.fn(),
}));

vi.mock("@/lib/session", () => ({ authorizedRequest }));
vi.mock("@/lib/api", () => ({
  apiErrorResponse: vi.fn(() =>
    Response.json({ success: false, error: "Erro" }, { status: 500 }),
  ),
}));

import { GET } from "@/app/api/institutions/route";

beforeEach(() => {
  authorizedRequest.mockReset();
});

describe("BFF de instituições", () => {
  it("encaminha a consulta de instituições ativas", async () => {
    authorizedRequest.mockResolvedValue([{ id: 1, name: "IFCE" }]);

    const response = await GET(
      new Request("http://localhost/api/institutions?active=true"),
    );

    expect(response.status).toBe(200);
    expect(authorizedRequest).toHaveBeenCalledWith("/institutions?active=true");
    await expect(response.json()).resolves.toEqual({
      success: true,
      data: [{ id: 1, name: "IFCE" }],
    });
  });
});
