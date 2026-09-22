export type AccessStatus = "ACTIVE" | "GRACE" | "BLOCKED" | "INVALID" | "EXCEPTION";

export interface AuthSession {
  token: string;
  accessId: number;
  clientName: string;
  accessKey: string;
  appCode: string;
  accessStatus: AccessStatus;
  expiresAt: string;
  daysLeft?: number;
  lastPaymentAt?: string | null;
  canRun?: boolean;
  overdueDays: number;
  lateFeePerDay: number;
  lateFeeAmount: number;
  currency: string;
  message: string;
  verifiedAt: string;
  isMaster?: boolean;
  isManualException?: boolean;
  manualAllowUntil?: string | null;
  manualAllowReason?: string;
}

export interface ActivateAccessRequest {
  accessKey: string;
  appCode?: string;
}

export interface ActivateAccessResponse {
  success: boolean;
  canRun?: boolean;
  hasPermission?: boolean;
  token?: string;
  accessId: number;
  clientName: string;
  accessKey: string;
  appCode: string;
  accessStatus: AccessStatus;
  isMaster?: boolean;
  expiresAt: string;
  daysLeft?: number;
  lastPaymentAt?: string | null;
  overdueDays: number;
  lateFeePerDay: number;
  lateFeeAmount: number;
  currency: string;
  message: string;
  isManualException?: boolean;
  manualAllowUntil?: string | null;
  manualAllowReason?: string;
}
