// === Classification Memory ===
export interface ClassificationMemory {
  normalizedDesc: string;
  category: string;
  debitAccount: string;
  creditAccount: string;
  clientId: string;
  count: number;
  lastUsed: string;
  clientDescription?: string;
}

const MEMORY_KEY = "cf-v3-memory";

export function loadMemory(): ClassificationMemory[] {
  const raw = localStorage.getItem(MEMORY_KEY);
  return raw ? JSON.parse(raw) : [];
}

export function saveMemory(memory: ClassificationMemory[]) {
  localStorage.setItem(MEMORY_KEY, JSON.stringify(memory));
}

export function normalizeDescription(desc: string): string {
  return desc
    .toUpperCase()
    .replace(/\d{4,}/g, "")           // remove long numbers (refs, dates)
    .replace(/\b(JAN|FEV|MAR|ABR|MAI|JUN|JUL|AGO|SET|OUT|NOV|DEZ)\b/gi, "")
    .replace(/\b\d{1,2}\/\d{4}\b/g, "") // remove month/year patterns
    .replace(/[^\w\s]/g, " ")          // remove punctuation
    .replace(/\s+/g, " ")
    .trim();
}

export function findInMemory(
  desc: string,
  clientId: string
): ClassificationMemory | null {
  const normalized = normalizeDescription(desc);
  const memory = loadMemory();

  // First try exact match for same client
  const clientMatch = memory.find(
    (m) => m.clientId === clientId && m.normalizedDesc === normalized && m.count >= 2
  );
  if (clientMatch) return clientMatch;

  // Then try global match
  const globalMatch = memory.find(
    (m) => m.normalizedDesc === normalized && m.count >= 3
  );
  return globalMatch || null;
}

export function saveToMemory(
  desc: string,
  category: string,
  debitAccount: string,
  creditAccount: string,
  clientId: string
) {
  const normalized = normalizeDescription(desc);
  const memory = loadMemory();
  const existing = memory.find(
    (m) => m.clientId === clientId && m.normalizedDesc === normalized
  );

  if (existing) {
    existing.category = category;
    existing.debitAccount = debitAccount;
    existing.creditAccount = creditAccount;
    existing.count += 1;
    existing.lastUsed = new Date().toISOString();
  } else {
    memory.push({
      normalizedDesc: normalized,
      category,
      debitAccount,
      creditAccount,
      clientId,
      count: 1,
      lastUsed: new Date().toISOString(),
    });
  }

  saveMemory(memory);
}

export function deleteMemoryEntry(normalizedDesc: string, clientId: string) {
  const memory = loadMemory().filter(
    (m) => !(m.normalizedDesc === normalizedDesc && m.clientId === clientId)
  );
  saveMemory(memory);
}
