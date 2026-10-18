export interface LicenseItem {
  accessId: number;
  clientName: string;
  accessKey: string;
  appCode: string;
  accessStatus: string;
  realAccessStatus: string;
  isMaster: boolean;
  expiresAt: string;
  daysLeft: number;
  lastPaymentAt?: string | null;
  overdueDays: number;
  graceDays: number;
  lateFeePerDay: number;
  lateFeeAmount: number;
  manualAllowUntil?: string | null;
  manualAllowReason?: string | null;
  createdAt: string;
}

export interface AccessLogItem {
  logId: number;
  accessKey: string;
  clientName: string;
  machineName: string;
  ipAddress: string;
  endpoint: string;
  actionStatus: string;
  canRun: boolean;
  workerId: number;
  message: string;
  createdAt: string;
}

import { getApiBaseUrl } from "@/utils/env";
import { loadSession } from "../auth/authApi";

function getAdminHeaders(): HeadersInit {
  const session = loadSession();
  const key = session?.accessKey || "";
  return {
    "Content-Type": "application/json",
    "X-Admin-Key": key,
    "Authorization": `Bearer ${key}`
  };
}

export async function fetchAllLicenses(): Promise<LicenseItem[]> {
  const session = loadSession();
  const url = `${getApiBaseUrl()}/Api/ClientAccess/admin/list`;
  const res = await fetch(url, {
    method: "POST",
    headers: getAdminHeaders(),
    body: JSON.stringify({ adminKey: session?.accessKey || "" })
  });
  const data = await res.json();
  if (!data.success) {
    throw new Error(data.message || "Error al obtener licencias.");
  }
  return data.data;
}

export async function addLicenseDays(accessKey: string, days: number): Promise<{ success: boolean; message: string; expiresAt: string; daysLeft?: number }> {
  const session = loadSession();
  const url = `${getApiBaseUrl()}/Api/ClientAccess/admin/add-days`;
  const res = await fetch(url, {
    method: "POST",
    headers: getAdminHeaders(),
    body: JSON.stringify({ accessKey, days, adminKey: session?.accessKey || "" })
  });
  const data = await res.json();
  if (!data.success) {
    throw new Error(data.message || "Error al ajustar días.");
  }
  return data;
}

export async function createNewLicense(
  clientName: string,
  daysActive = 30,
  graceDays = 3,
  lateFeePerDay = 500
): Promise<LicenseItem> {
  const session = loadSession();
  const url = `${getApiBaseUrl()}/Api/ClientAccess/admin/create`;
  const res = await fetch(url, {
    method: "POST",
    headers: getAdminHeaders(),
    body: JSON.stringify({
      clientName,
      daysActive,
      graceDays,
      lateFeePerDay,
      adminKey: session?.accessKey || ""
    })
  });
  const data = await res.json();
  if (!data.success) {
    throw new Error(data.message || "Error al crear licencia.");
  }
  return data.data;
}

export async function deleteLicense(accessKey: string): Promise<{ success: boolean; message: string }> {
  const session = loadSession();
  const url = `${getApiBaseUrl()}/Api/ClientAccess/admin/delete`;
  const res = await fetch(url, {
    method: "POST",
    headers: getAdminHeaders(),
    body: JSON.stringify({ accessKey, adminKey: session?.accessKey || "" })
  });
  const data = await res.json();
  if (!data.success) {
    throw new Error(data.message || "Error al eliminar usuario.");
  }
  return data;
}

export async function toggleLicenseStatus(
  accessKey: string,
  status: "BLOCKED" | "ACTIVE" | "GRACE" | "EXCEPTION",
  reason?: string | undefined,
  overdueDays?: number | undefined
): Promise<{ success: boolean; message: string }> {
  const session = loadSession();
  const url = `${getApiBaseUrl()}/Api/ClientAccess/admin/toggle-status`;
  const res = await fetch(url, {
    method: "POST",
    headers: getAdminHeaders(),
    body: JSON.stringify({
      accessKey,
      status,
      overdueDays,
      reason,
      adminKey: session?.accessKey || ""
    })
  });
  const data = await res.json();
  if (!data.success) {
    throw new Error(data.message || "Error al cambiar estado del usuario.");
  }
  return data;
}

export async function updateLicenseMora(params: {
  accessKey: string;
  graceDays: number;
  lateFeePerDay: number;
  overdueDays?: number | undefined;
  status?: "ACTIVE" | "GRACE" | "BLOCKED" | "EXCEPTION" | undefined;
  exceptionHours?: number | undefined;
  manualAllowReason?: string | undefined;
}): Promise<{ success: boolean; message: string }> {
  const session = loadSession();
  const url = `${getApiBaseUrl()}/Api/ClientAccess/admin/update-mora`;
  const res = await fetch(url, {
    method: "POST",
    headers: getAdminHeaders(),
    body: JSON.stringify({
      ...params,
      adminKey: session?.accessKey || ""
    })
  });
  const data = await res.json();
  if (!data.success) {
    throw new Error(data.message || "Error al actualizar configuración de mora.");
  }
  return data;
}

export async function fetchAccessLogs(search = "", limit = 100): Promise<AccessLogItem[]> {
  const session = loadSession();
  const url = `${getApiBaseUrl()}/Api/ClientAccess/admin/logs`;
  const res = await fetch(url, {
    method: "POST",
    headers: getAdminHeaders(),
    body: JSON.stringify({ adminKey: session?.accessKey || "", search, limit })
  });
  const data = await res.json();
  if (!data.success) {
    throw new Error(data.message || "Error al obtener logs de acceso.");
  }
  return data.data;
}
