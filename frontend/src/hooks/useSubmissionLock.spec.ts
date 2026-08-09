import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useSubmissionLock } from "@/hooks/useSubmissionLock";

describe("useSubmissionLock", () => {
  it("prevents duplicate submissions until reset", () => {
    const { result } = renderHook(() => useSubmissionLock());

    act(() => {
      expect(result.current.beginSubmission()).toBe(true);
      expect(result.current.beginSubmission()).toBe(false);
    });
    expect(result.current.isSubmitting).toBe(true);

    act(() => result.current.resetSubmission());
    expect(result.current.isSubmitting).toBe(false);
    act(() => expect(result.current.beginSubmission()).toBe(true));
  });
});
