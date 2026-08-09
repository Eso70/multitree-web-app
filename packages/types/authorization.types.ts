export type AccessMode = "direct" | "approval" | "deny";
export type AuthorizationOutcome = "allow" | "deny" | "approval";
export type AuthorizationReasonCode =
  | "GRANTED"
  | "NO_PERMISSION"
  | "TENANT_MISMATCH"
  | "BUSINESS_SUSPENDED"
  | "SUBSCRIPTION_INACTIVE"
  | "PLATFORM_DENY"
  | "FIELD_DENIED"
  | "APPROVAL_REQUIRED"
  | "RESOURCE_OUT_OF_SCOPE"
  | "FEATURE_NOT_INCLUDED"
  | "QUOTA_EXCEEDED";

export interface AuthorizationResource {
  type: string;
  id?: string;
  ownerBusinessId?: string;
}

export interface AuthorizationRequest {
  principal: {
    id: string;
    type: "business" | "platform-admin";
  };
  businessId?: string;
  permission: string;
  resource?: AuthorizationResource;
  changedFields?: string[];
  context: {
    ipAddress?: string;
    now: string | Date;
    requestId?: string;
  };
}

export interface AuthorizationDecision {
  outcome: AuthorizationOutcome;
  reasonCode: AuthorizationReasonCode;
  deniedFields: string[];
  approvalFields: string[];
  source: "platform-role" | "plan";
  quota?: {
    key: string;
    limit: number;
    used: number;
    remaining: number;
  };
}

export interface EffectivePermission {
  key: string;
  outcome: AuthorizationOutcome;
  accessMode: AccessMode;
  source: "plan";
  fieldModes: Record<string, AccessMode>;
  resourceScope: Record<string, unknown>;
  reason?: string;
}

export interface EffectiveAccessManifest {
  subscription: {
    id: string;
    status: string;
    planId: string;
    planCode: string;
    planName: string;
    currentPeriodEnd: string | null;
  };
  navigation: Record<string, boolean>;
  permissions: Record<string, EffectivePermission>;
  entitlements: Record<string, boolean | number | string>;
  usage: Record<string, { limit: number; used: number; remaining: number }>;
  templateKeys: string[];
  pendingApprovals: Array<{
    id: string;
    permission: string;
    status: string;
    requestedAt: string;
  }>;
}
