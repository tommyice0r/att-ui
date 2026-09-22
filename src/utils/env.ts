/**
 * Utilidad unificada para resolver variables de entorno en el Frontend.
 * Soporta tanto inyección en tiempo de ejecución (Dokploy window.__ENV__)
 * como variables compiladas en tiempo de construcción (Vite import.meta.env).
 */

declare global {
  interface Window {
    __ENV__?: Record<string, string>;
  }
}

export function getEnv(key: string, fallback = ""): string {
  // 1. Prioridad: Runtime inyectado por Docker/Dokploy en window.__ENV__
  if (typeof window !== "undefined" && window.__ENV__ && window.__ENV__[key]) {
    const val = window.__ENV__[key];
    if (val && val.trim() !== "" && !val.startsWith("$")) {
      return val.trim();
    }
  }

  // 2. Build-time env compilado por Vite
  const metaVal = (import.meta as unknown as { env: Record<string, string> }).env?.[key];
  if (metaVal && metaVal.trim() !== "") {
    return metaVal.trim();
  }

  return fallback;
}

export function getApiBaseUrl(): string {
  // Acepta indistintamente VITE_API_URL o VITE_ACCESS_API_URL
  const raw = getEnv("VITE_API_URL") || getEnv("VITE_ACCESS_API_URL") || "";
  return raw.replace(/\/+$/, ""); // Normaliza sin barra final
}

export function getHelperApiUrl(): string {
  const raw = getEnv("VITE_HELPER_API_URL") || "http://localhost:7080";
  return raw.replace(/\/+$/, "");
}
