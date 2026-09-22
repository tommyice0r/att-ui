import { getApiBaseUrl } from "@/utils/env";

const getLeadsEndpoint = () => `${getApiBaseUrl()}/Api/Leads/secure`;
const getHitsEndpoint = () => `${getApiBaseUrl()}/Api/Hits/secure`;
const getSequencesEndpoint = () => `${getApiBaseUrl()}/Api/Sequences/secure`;
const getConfigEndpoint = () => `${getApiBaseUrl()}/Api/Config/secure`;
const getDashboardEndpoint = () => `${getApiBaseUrl()}/Api/Dashboard/secure`;

function getAccessKey(): string {
  const raw = localStorage.getItem("attbot_session");
  if (!raw) return "";
  try {
    const session = JSON.parse(raw);
    return session.accessKey ?? "";
  } catch {
    return "";
  }
}

export async function fetchDashboardStats(): Promise<{
  totalLeads: number;
  pendingLeads: number;
  hits: number;
  totalSequences: number;
}> {
  const res = await fetch(`${getDashboardEndpoint()}/stats`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ accessKey: getAccessKey() }),
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.message);
  return data.data;
}

export async function uploadLeads(leadsText: string, source = "upload"): Promise<{ imported: number }> {
  const res = await fetch(`${getLeadsEndpoint()}/upload`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ accessKey: getAccessKey(), leadsText, source }),
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.message);
  return { imported: data.imported };
}

export async function getLeadCounts(): Promise<{ total: number; pending: number }> {
  const res = await fetch(`${getLeadsEndpoint()}/count`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ accessKey: getAccessKey() }),
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.message);
  return { total: data.total, pending: data.pending };
}

export async function getNextLead(): Promise<{
  leadId: number;
  phoneNumber: string;
  fullName: string | null;
  address: string | null;
  zipCode: string | null;
} | null> {
  const res = await fetch(`${getLeadsEndpoint()}/next`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ accessKey: getAccessKey() }),
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.message);
  return data.data;
}

export async function getHits(): Promise<
  Array<{
    id: number;
    phoneNumber: string;
    fullName: string | null;
    address: string | null;
    zipCode: string | null;
    deviceMessage: string | null;
    hitType: string | null;
    createdAt: string;
  }>
> {
  const res = await fetch(`${getHitsEndpoint()}/list`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ accessKey: getAccessKey() }),
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.message);
  return data.data;
}

export async function getHitCount(): Promise<number> {
  const res = await fetch(`${getHitsEndpoint()}/count`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ accessKey: getAccessKey() }),
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.message);
  return data.count;
}

export async function getSequences(): Promise<
  Array<{
    id: number;
    sequence: string;
    stateCode: string | null;
    stateName: string | null;
    totalLeads: number;
    status: string;
    createdAt: string;
    completedAt: string | null;
  }>
> {
  const res = await fetch(`${getSequencesEndpoint()}/list`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ accessKey: getAccessKey() }),
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.message);
  return data.data;
}

export async function createSequence(sequence: string): Promise<number> {
  const res = await fetch(`${getSequencesEndpoint()}/create`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ accessKey: getAccessKey(), sequence }),
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.message);
  return data.sequenceId;
}

export async function getConfig(): Promise<Record<string, string>> {
  const res = await fetch(`${getConfigEndpoint()}/get`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });
  const data = await res.json();
  if (!data.success) throw new Error("Error fetching config");
  return data.data;
}

export async function saveConfig(key: string, value: string): Promise<void> {
  const res = await fetch(`${getConfigEndpoint()}/save`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key, value }),
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.message);
}
