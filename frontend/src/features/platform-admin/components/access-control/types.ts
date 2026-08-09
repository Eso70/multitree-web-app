export type Tab = "profiles" | "permissions" | "simulator";
export type ScopeType = "platform" | "business";

export interface Permission {
  id: string;
  key: string;
  category: string;
  resource: string;
  action: string;
  description: string;
  riskLevel: "standard" | "sensitive" | "critical";
  supportsApproval: boolean;
  fieldSchema: Record<string, string>;
  profiles: string[];
}

export interface PermissionProfile {
  id: string;
  code: string;
  name: string;
  configurationId: string;
  permissionCount: number;
  subscriberCount: number;
  isDefault: boolean;
}

export interface PermissionProfileConfiguration {
  id: string;
  planId: string;
  subscriberCount: number;
  permissions: Record<
    string,
    {
      accessMode: "direct" | "approval" | "deny";
      fieldModes: Record<string, "direct" | "approval" | "deny">;
      resourceScope: { type: string; ids?: string[] };
      conditions: Record<string, unknown>;
    }
  >;
}

export interface Overview {
  permissions: Permission[];
  profiles: PermissionProfile[];
  summary: {
    permissions: number;
    profiles: number;
  };
}
