export interface PlanLimits {
  maxMembers: number | null;
  maxItems: number | null;
  ssoEnabled: boolean;
  apiAccess: boolean;
}

export const PLAN_LIMITS: Record<string, PlanLimits> = {
  pro: {
    maxMembers: 25,
    maxItems: 100,
    ssoEnabled: false,
    apiAccess: false,
  },
  enterprise: {
    maxMembers: null,
    maxItems: null,
    ssoEnabled: true,
    apiAccess: true,
  },
};

export function getPlanLimits(plan: string): PlanLimits {
  return PLAN_LIMITS[plan] ?? PLAN_LIMITS.pro;
}

export function getPlanDisplayName(plan: string): string {
  switch (plan) {
    case "enterprise":
      return "Enterprise";
    case "pro":
    default:
      return "Pro";
  }
}
