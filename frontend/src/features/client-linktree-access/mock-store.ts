export const CLIENT_ACCESS_DEMO_STORAGE_KEY =
  "multitree:client-linktree-access-demo:v1";
export const CLIENT_ACCESS_DEMO_EVENT = "multitree:client-access-demo-updated";

export type ClientAccessDemoStatus =
  "active" | "submitted" | "published" | "revoked";

export interface ClientAccessDemoLink {
  id: string;
  label: string;
  url: string;
}

export interface ClientAccessDemoDraft {
  pageName: string;
  description: string;
  backgroundColor: string;
  profileImageDataUrl: string | null;
  links: ClientAccessDemoLink[];
}

export interface ClientAccessDemoInvitation {
  id: string;
  token: string;
  resultsToken: string;
  pin: string | null;
  campaignLabel: string;
  templateName: string;
  allowedTemplateNames: string[];
  allowedTemplateKeys: TemplateKey[];
  maxLinks: number;
  allowImageUploads: boolean;
  allowDraftSaving: boolean;
  resultAccessDays: number;
  createdAt: string;
  expiresAt: string;
  status: ClientAccessDemoStatus;
  submittedAt: string | null;
  publishedAt: string | null;
  revokedAt: string | null;
  draft: ClientAccessDemoDraft;
  editorData: LinktreeEditorSubmitData | null;
}

export interface CreateClientAccessDemoInput {
  campaignLabel: string;
  templateName: string;
  allowedTemplateNames?: string[];
  allowedTemplateKeys?: readonly TemplateKey[];
  creationAccessDays: number;
  resultAccessDays: number;
  maxLinks: number;
  requirePin: boolean;
  allowImageUploads: boolean;
  allowDraftSaving: boolean;
}

interface ClientAccessDemoStore {
  version: 1;
  invitations: ClientAccessDemoInvitation[];
}

const LEGACY_TEMPLATE_NAMES: Record<string, string> = {
  "Campaign — Purple": "کەمپین — مۆر",
  "Simple — Light": "سادە — ڕووناک",
  "Bold — Dark": "تۆخ — تاریک",
};

function randomId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function randomPin(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const values = Array.from({ length: 8 }, () =>
    alphabet.charAt(Math.floor(Math.random() * alphabet.length)),
  );
  return `${values.slice(0, 4).join("")}-${values.slice(4).join("")}`;
}

function addDays(date: Date, days: number): string {
  return new Date(date.getTime() + days * 86_400_000).toISOString();
}

export function createClientAccessDemoInvitation(
  input: CreateClientAccessDemoInput,
  now = new Date(),
): ClientAccessDemoInvitation {
  const allowedTemplateKeys = Array.from(
    new Set(
      (input.allowedTemplateKeys?.length
        ? input.allowedTemplateKeys
        : TEMPLATE_OPTIONS.filter((template) =>
            input.allowedTemplateNames?.includes(template.name),
          ).map((template) => template.id)
      ).filter(isTemplateKey),
    ),
  );
  if (allowedTemplateKeys.length === 0) {
    allowedTemplateKeys.push(TEMPLATE_DEFAULT_ID);
  }
  const allowedTemplateNames = Array.from(
    new Set(
      (input.allowedTemplateNames?.length
        ? input.allowedTemplateNames
        : [input.templateName]
      )
        .map((name) => name.trim())
        .filter(Boolean),
    ),
  );
  const selectedTemplateName = allowedTemplateNames.includes(input.templateName)
    ? input.templateName
    : (allowedTemplateNames[0] ?? input.templateName);

  return {
    id: randomId(),
    token: randomId().replaceAll("-", ""),
    resultsToken: randomId().replaceAll("-", ""),
    pin: input.requirePin ? randomPin() : null,
    campaignLabel: input.campaignLabel.trim(),
    templateName: selectedTemplateName,
    allowedTemplateNames,
    allowedTemplateKeys,
    maxLinks: Math.min(20, Math.max(1, input.maxLinks)),
    allowImageUploads: input.allowImageUploads,
    allowDraftSaving: input.allowDraftSaving,
    resultAccessDays: input.resultAccessDays,
    createdAt: now.toISOString(),
    expiresAt: addDays(now, input.creationAccessDays),
    status: "active",
    submittedAt: null,
    publishedAt: null,
    revokedAt: null,
    draft: {
      pageName: "",
      description: "",
      backgroundColor: "#6657d9",
      profileImageDataUrl: null,
      links: [{ id: randomId(), label: "", url: "" }],
    },
    editorData: null,
  };
}

export function isClientAccessDemoExpired(
  invitation: ClientAccessDemoInvitation,
  now = new Date(),
): boolean {
  return (
    invitation.status === "active" && now >= new Date(invitation.expiresAt)
  );
}

export function submitClientAccessDemoInvitation(
  invitation: ClientAccessDemoInvitation,
  now = new Date(),
): ClientAccessDemoInvitation {
  if (
    invitation.status !== "active" ||
    isClientAccessDemoExpired(invitation, now)
  ) {
    return invitation;
  }
  return {
    ...invitation,
    status: "submitted",
    submittedAt: now.toISOString(),
  };
}

export function publishClientAccessDemoInvitation(
  invitation: ClientAccessDemoInvitation,
  now = new Date(),
): ClientAccessDemoInvitation {
  if (invitation.status !== "submitted") return invitation;
  return {
    ...invitation,
    status: "published",
    publishedAt: now.toISOString(),
  };
}

export function revokeClientAccessDemoInvitation(
  invitation: ClientAccessDemoInvitation,
  now = new Date(),
): ClientAccessDemoInvitation {
  if (invitation.status === "revoked") return invitation;
  return {
    ...invitation,
    status: "revoked",
    revokedAt: now.toISOString(),
  };
}

function isInvitation(value: unknown): value is ClientAccessDemoInvitation {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<ClientAccessDemoInvitation>;
  return (
    typeof candidate.id === "string" &&
    typeof candidate.token === "string" &&
    typeof candidate.campaignLabel === "string" &&
    typeof candidate.status === "string" &&
    Boolean(candidate.draft) &&
    Array.isArray(candidate.draft?.links)
  );
}

function normalizeAllowedTemplateKeys(
  invitation: ClientAccessDemoInvitation,
): TemplateKey[] {
  const persistedKeys = Array.isArray(invitation.allowedTemplateKeys)
    ? invitation.allowedTemplateKeys.filter(isTemplateKey)
    : [];
  if (persistedKeys.length > 0) return Array.from(new Set(persistedKeys));

  const names = Array.isArray(invitation.allowedTemplateNames)
    ? invitation.allowedTemplateNames
    : [invitation.templateName];
  const keysFromNames = TEMPLATE_OPTIONS.filter((template) =>
    names.includes(template.name),
  ).map((template) => template.id);
  return keysFromNames.length > 0 ? keysFromNames : [TEMPLATE_DEFAULT_ID];
}

export function readClientAccessDemoInvitations(): ClientAccessDemoInvitation[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(CLIENT_ACCESS_DEMO_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Partial<ClientAccessDemoStore>;
    return Array.isArray(parsed.invitations)
      ? parsed.invitations.filter(isInvitation).map((invitation) => ({
          ...invitation,
          templateName:
            LEGACY_TEMPLATE_NAMES[invitation.templateName] ??
            invitation.templateName,
          allowedTemplateNames: (Array.isArray(
            invitation.allowedTemplateNames,
          ) && invitation.allowedTemplateNames.length > 0
            ? invitation.allowedTemplateNames
            : [invitation.templateName]
          ).map((name) => LEGACY_TEMPLATE_NAMES[name] ?? name),
          allowedTemplateKeys: normalizeAllowedTemplateKeys(invitation),
          editorData: invitation.editorData ?? null,
        }))
      : [];
  } catch {
    return [];
  }
}

function writeClientAccessDemoInvitations(
  invitations: ClientAccessDemoInvitation[],
): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    CLIENT_ACCESS_DEMO_STORAGE_KEY,
    JSON.stringify({ version: 1, invitations } satisfies ClientAccessDemoStore),
  );
  window.dispatchEvent(new Event(CLIENT_ACCESS_DEMO_EVENT));
}

export function addClientAccessDemoInvitation(
  invitation: ClientAccessDemoInvitation,
): void {
  writeClientAccessDemoInvitations([
    invitation,
    ...readClientAccessDemoInvitations(),
  ]);
}

export function findClientAccessDemoInvitation(
  token: string,
): ClientAccessDemoInvitation | null {
  return (
    readClientAccessDemoInvitations().find(
      (invitation) =>
        invitation.token === token || invitation.resultsToken === token,
    ) ?? null
  );
}

export function updateClientAccessDemoInvitation(
  token: string,
  update: (
    invitation: ClientAccessDemoInvitation,
  ) => ClientAccessDemoInvitation,
): ClientAccessDemoInvitation | null {
  let updated: ClientAccessDemoInvitation | null = null;
  const invitations = readClientAccessDemoInvitations().map((invitation) => {
    if (invitation.token !== token && invitation.resultsToken !== token) {
      return invitation;
    }
    updated = update(invitation);
    return updated;
  });
  if (updated) writeClientAccessDemoInvitations(invitations);
  return updated;
}

export function clearClientAccessDemoInvitations(): void {
  writeClientAccessDemoInvitations([]);
}
import type { LinktreeEditorSubmitData } from "@/features/link-editor/editor-types";
import {
  TEMPLATE_DEFAULT_ID,
  TEMPLATE_OPTIONS,
  isTemplateKey,
  type TemplateKey,
} from "@/lib/templates/config";
