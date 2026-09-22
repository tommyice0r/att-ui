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
  createdAt: string;
}

import { getApiBaseUrl } from "@/utils/env";

export async function fetchAllLicenses(): Promise<LicenseItem[]> {
  const url = `${getApiBaseUrl()}/Api/ClientAccess/admin/list`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" }
  });
  const data = await res.json();
  if (!data.success) {
    throw new Error(data.message || "Error al obtener licencias.");
  }
  return data.data;
}

export async function addLicenseDays(accessKey: string, days: number): Promise<{ success: boolean; message: string; expiresAt: string }> {
  const url = `${getApiBaseUrl()}/Api/ClientAccess/admin/add-days`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ accessKey, days })
  });
  const data = await res.json();
  if (!data.success) {
    throw new Error(data.message || "Error al agregar días.");
  }
  return data;
}

export async function createNewLicense(clientName: string, daysActive = 30): Promise<LicenseItem> {
  const url = `${getApiBaseUrl()}/Api/ClientAccess/admin/create`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ clientName, daysActive })
  });
  const data = await res.json();
  if (!data.success) {
    throw new Error(data.message || "Error al crear licencia.");
  }
  return data.data;
}
