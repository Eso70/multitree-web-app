import { classifyUpstreamFailure } from "./upstream-failure";

describe("classifyUpstreamFailure", () => {
  it("maps an aborted upstream request to 504", () => {
    expect(classifyUpstreamFailure({ name: "AbortError" })).toEqual({
      message: "Gateway timeout",
      status: 504,
    });
  });

  it("maps an AbortSignal timeout to 504", () => {
    expect(classifyUpstreamFailure({ name: "TimeoutError" })).toEqual({
      message: "Gateway timeout",
      status: 504,
    });
  });

  it("keeps ordinary connection failures as 503", () => {
    expect(classifyUpstreamFailure(new TypeError("fetch failed"))).toEqual({
      message: "Backend unavailable",
      status: 503,
    });
  });
});
