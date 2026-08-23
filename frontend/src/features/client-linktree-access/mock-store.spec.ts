import { describe, expect, it } from "vitest";
import {
  createClientAccessDemoInvitation,
  isClientAccessDemoExpired,
  publishClientAccessDemoInvitation,
  revokeClientAccessDemoInvitation,
  submitClientAccessDemoInvitation,
} from "./mock-store";

const input = {
  campaignLabel: "August campaign",
  templateName: "Campaign",
  allowedTemplateNames: ["Campaign", "Frost", "Aurora"],
  allowedTemplateKeys: ["spectrum", "frost", "aurora"] as const,
  creationAccessDays: 3,
  resultAccessDays: 14,
  maxLinks: 8,
  requirePin: true,
  allowImageUploads: true,
  allowDraftSaving: true,
};

describe("client access frontend demo state", () => {
  it("creates a bounded active invitation", () => {
    const now = new Date("2026-08-23T00:00:00.000Z");
    const invitation = createClientAccessDemoInvitation(
      { ...input, maxLinks: 99 },
      now,
    );

    expect(invitation.status).toBe("active");
    expect(invitation.maxLinks).toBe(20);
    expect(invitation.allowedTemplateNames).toEqual([
      "Campaign",
      "Frost",
      "Aurora",
    ]);
    expect(invitation.allowedTemplateKeys).toEqual([
      "spectrum",
      "frost",
      "aurora",
    ]);
    expect(invitation.pin).toMatch(/^[A-Z2-9]{4}-[A-Z2-9]{4}$/);
    expect(invitation.expiresAt).toBe("2026-08-26T00:00:00.000Z");
  });

  it("locks editing on submission and requires submission before publication", () => {
    const now = new Date("2026-08-23T00:00:00.000Z");
    const invitation = createClientAccessDemoInvitation(input, now);

    expect(publishClientAccessDemoInvitation(invitation, now)).toBe(invitation);
    const submitted = submitClientAccessDemoInvitation(invitation, now);
    expect(submitted.status).toBe("submitted");
    expect(publishClientAccessDemoInvitation(submitted, now).status).toBe(
      "published",
    );
  });

  it("does not submit expired or revoked invitations", () => {
    const createdAt = new Date("2026-08-20T00:00:00.000Z");
    const later = new Date("2026-08-24T00:00:00.000Z");
    const invitation = createClientAccessDemoInvitation(input, createdAt);

    expect(isClientAccessDemoExpired(invitation, later)).toBe(true);
    expect(submitClientAccessDemoInvitation(invitation, later)).toBe(
      invitation,
    );

    const revoked = revokeClientAccessDemoInvitation(invitation, createdAt);
    expect(revoked.status).toBe("revoked");
    expect(submitClientAccessDemoInvitation(revoked, createdAt)).toBe(revoked);
  });
});
