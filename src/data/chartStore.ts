import { type Account, CHART_OF_ACCOUNTS as DEFAULT_ACCOUNTS } from "./chartOfAccounts";

const CUSTOM_CHART_KEY = "cf-v3-custom-chart";

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

/** Returns custom chart if imported, otherwise the default */
export function getActiveChart(): Account[] {
  return loadCustomChart() || DEFAULT_ACCOUNTS;
}
