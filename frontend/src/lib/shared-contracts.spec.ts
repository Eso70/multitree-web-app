import { describe, expectTypeOf, it } from "vitest";
import type {
  LinktreeLink,
  PlatformBusinessSummary,
  PublicLinktreePayload,
} from "@linktree/types";

describe("shared transport contracts", () => {
  it("keeps public Linktree payload consumers aligned with canonical links", () => {
    expectTypeOf<PublicLinktreePayload["links"]>().toEqualTypeOf<
      LinktreeLink[]
    >();
  });

  it("allows subscription plans supplied dynamically by the backend", () => {
    expectTypeOf<PlatformBusinessSummary["plan"]>().toEqualTypeOf<string>();
  });
});
