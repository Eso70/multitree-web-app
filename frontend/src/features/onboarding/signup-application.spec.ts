import { describe, expect, it } from "vitest";
import {
  buildSignupApplicationPayload,
  validateSignupApplication,
  type SignupApplicationForm,
} from "./signup-application";

const validForm: SignupApplicationForm = {
  businessName: "Acme Studio",
  phone: "7501234567",
  requestedSubdomain: "acme-studio",
};

describe("signup application", () => {
  it("accepts the compact business application", () => {
    expect(validateSignupApplication(validForm, true)).toEqual({});
  });

  it("sends only the three required application fields", () => {
    expect(
      buildSignupApplicationPayload({
        ...validForm,
        businessName: "  Acme Studio  ",
      }),
    ).toEqual({
      businessName: "Acme Studio",
      phone: "7501234567",
      requestedSubdomain: "acme-studio",
    });
  });

  it("returns a field-specific error for an invalid subdomain", () => {
    expect(
      validateSignupApplication(
        { ...validForm, requestedSubdomain: "bad domain" },
        null,
      ),
    ).toEqual({
      requestedSubdomain: "ساب‌دۆمەینێکی دروست بنووسە",
    });
  });

  it("requires a completed availability check", () => {
    expect(validateSignupApplication(validForm, null)).toEqual({
      subdomainAvailability: "چاوەڕێی پشکنینی ساب‌دۆمەین بکە",
    });
  });
});
