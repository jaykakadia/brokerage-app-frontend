export interface RoleLimit {
  role: string;
  max_listings: number;
}

export type RoleLimitsMap = Record<string, number>;
