/**
 * Tests for the data API. Mocking the db layer so no real PostgreSQL is required.
 * @jest-environment node
 */

import { GET, POST } from "@/app/api/data/route";

const mockLoadData = jest.fn();
const mockSaveData = jest.fn();
jest.mock("../../../lib/db", () => ({
  loadData: (...args: unknown[]) => mockLoadData(...args),
  saveData: (...args: unknown[]) => mockSaveData(...args),
}));

describe("GET /api/data", () => {
  it("returns datasets, graders, results from loadData", async () => {
    const fixture = {
      datasets: [{ id: "d1", name: "Test", testCases: [] }],
      graders: [{ id: "g1", name: "G1", description: "", rubric: "" }],
      results: [],
    };
    mockLoadData.mockResolvedValueOnce(fixture);

    const res = await GET();
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toEqual(fixture);
    expect(mockLoadData).toHaveBeenCalled();
  });

  it("returns 500 when loadData throws", async () => {
    mockLoadData.mockRejectedValueOnce(new Error("DB error"));

    const res = await GET();
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toBe("Failed to load data");
  });
});

describe("POST /api/data", () => {
  it("saves body and returns ok", async () => {
    mockSaveData.mockResolvedValueOnce(undefined);

    const body = {
      datasets: [],
      graders: [],
      results: [],
    };
    const req = new Request("http://localhost/api/data", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(mockSaveData).toHaveBeenCalledWith(body);
  });

  it("defaults missing fields to empty arrays", async () => {
    mockSaveData.mockResolvedValueOnce(undefined);

    const req = new Request("http://localhost/api/data", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });

    await POST(req);
    expect(mockSaveData).toHaveBeenCalledWith({
      datasets: [],
      graders: [],
      results: [],
    });
  });

  it("returns 500 when saveData throws", async () => {
    mockSaveData.mockRejectedValueOnce(new Error("DB error"));

    const req = new Request("http://localhost/api/data", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ datasets: [], graders: [], results: [] }),
    });

    const res = await POST(req);
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toBe("Failed to save data");
  });
});
