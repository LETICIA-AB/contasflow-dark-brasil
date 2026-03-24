import { type Account, CHART_OF_ACCOUNTS as DEFAULT_ACCOUNTS } from "./chartOfAccounts";

const CUSTOM_CHART_KEY = "cf-v3-custom-chart";
const CLIENT_CHARTS_KEY = "cf-v3-client-charts";

// === Global custom chart (legacy) ===
export function loadCustomChart(): Account[] | null {
  const raw = localStorage.getItem(CUSTOM_CHART_KEY);
  return raw ? JSON.parse(raw) : null;
}

export function saveCustomChart(accounts: Account[]) {
  localStorage.setItem(CUSTOM_CHART_KEY, JSON.stringify(accounts));
}

export function clearCustomChart() {
  localStorage.removeItem(CUSTOM_CHART_KEY);
}

export function getActiveChart(): Account[] {
  return loadCustomChart() || DEFAULT_ACCOUNTS;
}

// === Per-client charts ===
interface ClientChartsMap {
  [clientId: string]: Account[];
}

function loadAllClientCharts(): ClientChartsMap {
  const raw = localStorage.getItem(CLIENT_CHARTS_KEY);
  return raw ? JSON.parse(raw) : {};
}

function saveAllClientCharts(map: ClientChartsMap) {
  localStorage.setItem(CLIENT_CHARTS_KEY, JSON.stringify(map));
}

export function saveClientChart(clientId: string, accounts: Account[]) {
  const map = loadAllClientCharts();
  map[clientId] = accounts;
  saveAllClientCharts(map);
}

export function loadClientChart(clientId: string): Account[] | null {
  const map = loadAllClientCharts();
  return map[clientId] || null;
}

export function removeClientChart(clientId: string) {
  const map = loadAllClientCharts();
  delete map[clientId];
  saveAllClientCharts(map);
}

/** Returns the best chart for a client: client-specific → global custom → default */
export function getActiveChartForClient(clientId: string): Account[] {
  return loadClientChart(clientId) || loadCustomChart() || DEFAULT_ACCOUNTS;
}

/** Simple hash based on sorted codes for duplicate detection */
export function hashChart(accounts: Account[]): string {
  return accounts.map((a) => a.code).sort().join(",");
}

/** List all client charts with metadata */
export function listAllClientCharts(): { clientId: string; hash: string; accountCount: number }[] {
  const map = loadAllClientCharts();
  return Object.entries(map).map(([clientId, accounts]) => ({
    clientId,
    hash: hashChart(accounts),
    accountCount: accounts.length,
  }));
}

/** Find clients that have the same chart (by hash) */
export function findDuplicateChart(accounts: Account[]): string[] {
  const targetHash = hashChart(accounts);
  const all = listAllClientCharts();
  return all.filter((c) => c.hash === targetHash).map((c) => c.clientId);
}
