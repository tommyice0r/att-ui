/**
 * ============================================================
 * BACKEND C# — Endpoint activo
 * POST {VITE_ACCESS_API_URL}{VITE_ACCESS_ACTIVATE_ENDPOINT}
 * Ejemplo: http://localhost:37018/Api/ClientAccess/secure/activate
 *
 * Request:  { accessKey: string, appCode: string }
 * Response: ActivateAccessResponse (ver authTypes.ts)
 *
 * Estados permitidos para guardar sesión:
 *   ACTIVE    → acceso normal
 *   GRACE     → pago vencido, período de gracia activo
 *   EXCEPTION → excepción manual habilitada por administrador
 *
 * Estados que rechazan sesión (van a pantalla de bloqueo):
 *   BLOCKED   → bloqueado por atraso de pago
 *   INVALID   → clave inválida o revocada
 * ============================================================
 *
 * FUTURO — Validar sesión activa:
 * GET {VITE_ACCESS_API_URL}/Api/ClientAccess/secure/session
 * Headers: Authorization: Bearer TOKEN
 * Response: { valid: boolean, accessStatus: AccessStatus, ... }
 * ============================================================
 */

import type { ActivateAccessRequest, ActivateAccessResponse, AuthSession } from "./authTypes";

import { getApiBaseUrl, getEnv } from "@/utils/env";

const SESSION_KEY = "attbot_session";

function getActivateUrl(): string {
  const base = getApiBaseUrl();
  const endpoint = getEnv("VITE_ACCESS_ACTIVATE_ENDPOINT", "/Api/ClientAccess/secure/activate");

  return `${base}${endpoint}`;
}

export async function activateAccess(req: ActivateAccessRequest): Promise<ActivateAccessResponse> {
  const url = getActivateUrl();
  const appCode = getEnv("VITE_APP_CODE", "att-bot");

  let data: ActivateAccessResponse;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accessKey: req.accessKey, appCode }),
    });
    data = await res.json() as ActivateAccessResponse;
  } catch {
    throw new Error("No se pudo conectar con el servidor de acceso.");
  }

  if (!data.success) {
    throw new Error(data.message || "Clave de acceso inválida.");
  }

  return data;
}

// TODO: Implementar cuando el backend tenga el endpoint de validación de sesión:
// export async function validateSession(token: string): Promise<boolean> {
//   try {
//     const base = import.meta.env["VITE_ACCESS_API_URL"];
//     const res  = await fetch(`${base}/Api/ClientAccess/secure/session`, {
//       headers: { Authorization: `Bearer ${token}` },
//     });
//     const data = await res.json();
//     return data.valid === true;
//   } catch { return false; }
// }

export function saveSession(resp: ActivateAccessResponse): AuthSession {
  const session: AuthSession = {
    token:         resp.token ?? "",
    accessId:      resp.accessId,
    clientName:    resp.clientName,
    accessKey:     resp.accessKey,
    appCode:       resp.appCode,
    accessStatus:  resp.accessStatus,
    expiresAt:     resp.expiresAt,
    overdueDays:   resp.overdueDays,
    lateFeePerDay: resp.lateFeePerDay,
    lateFeeAmount: resp.lateFeeAmount,
    currency:      resp.currency,
    message:       resp.message,
    verifiedAt:    new Date().toISOString(),
  };

  // Campos opcionales de excepción manual, días y licencia maestra
  if (resp.isMaster          !== undefined) session.isMaster          = resp.isMaster;
  if (resp.daysLeft          !== undefined) session.daysLeft          = resp.daysLeft;
  if (resp.lastPaymentAt     !== undefined) session.lastPaymentAt     = resp.lastPaymentAt;
  if (resp.canRun            !== undefined) session.canRun            = resp.canRun;
  if (resp.isManualException !== undefined) session.isManualException = resp.isManualException;
  if (resp.manualAllowUntil  !== undefined) session.manualAllowUntil  = resp.manualAllowUntil;
  if (resp.manualAllowReason !== undefined) session.manualAllowReason = resp.manualAllowReason;

  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  return session;
}

export function loadSession(): AuthSession | null {
  const raw = localStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthSession;
  } catch {
    return null;
  }
}

export function clearSession(): void {
  localStorage.removeItem(SESSION_KEY);
}
