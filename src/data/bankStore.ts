// === Bank Registry ===
export interface BankEntry {
  id: string;
  name: string;
  code: string;
  active: boolean;
}

const BANKS_KEY = "cf-v3-banks";

const SEED_BANKS: BankEntry[] = [
  { id: "b1", name: "Banco do Brasil", code: "001", active: true },
  { id: "b2", name: "Bradesco", code: "237", active: true },
  { id: "b3", name: "Caixa Econômica Federal", code: "104", active: true },
  { id: "b4", name: "Itaú Unibanco", code: "341", active: true },
  { id: "b5", name: "Santander", code: "033", active: true },
  { id: "b6", name: "Sicoob", code: "756", active: true },
  { id: "b7", name: "Sicredi", code: "748", active: true },
  { id: "b8", name: "Nubank PJ", code: "260", active: true },
  { id: "b9", name: "Banco Inter", code: "077", active: true },
  { id: "b10", name: "Safra", code: "422", active: true },
];

export function loadBanks(): BankEntry[] {
  const raw = localStorage.getItem(BANKS_KEY);
  if (raw) return JSON.parse(raw);
  localStorage.setItem(BANKS_KEY, JSON.stringify(SEED_BANKS));
  return SEED_BANKS;
}

export function saveBanks(banks: BankEntry[]) {
  localStorage.setItem(BANKS_KEY, JSON.stringify(banks));
}

export function addBank(name: string, code: string): BankEntry {
  const banks = loadBanks();
  const entry: BankEntry = {
    id: `b-${Date.now()}`,
    name,
    code,
    active: true,
  };
  banks.push(entry);
  saveBanks(banks);
  return entry;
}
