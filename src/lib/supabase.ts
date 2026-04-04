/**
 * Supabase REST client — no npm package required.
 * Uses the Supabase PostgREST HTTP API directly with fetch().
 *
 * Set the following in your .env.local:
 *   VITE_SUPABASE_URL=https://SEU-PROJETO.supabase.co
 *   VITE_SUPABASE_ANON_KEY=sua-anon-key-aqui
 */

const BASE = (import.meta.env.VITE_SUPABASE_URL as string | undefined) ?? "";
const KEY  = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ?? "";

export const supabaseConfigured = Boolean(BASE && KEY);

function headers(extra?: Record<string, string>): Record<string, string> {
  return {
    "apikey": KEY,
    "Authorization": `Bearer ${KEY}`,
    "Content-Type": "application/json",
    ...extra,
  };
}

/** SELECT — returns all rows matching optional query string (PostgREST syntax). */
export async function sbSelect<T>(table: string, qs = ""): Promise<T[]> {
  const url = `${BASE}/rest/v1/${table}${qs ? `?${qs}` : ""}`;
  const r = await fetch(url, { headers: headers() });
  if (!r.ok) throw new Error(`Supabase SELECT ${table}: ${await r.text()}`);
  return r.json() as Promise<T[]>;
}

/**
 * UPSERT — inserts or updates rows by primary key.
 * `rows` can be a single object or an array.
 */
export async function sbUpsert(table: string, rows: unknown): Promise<void> {
  const r = await fetch(`${BASE}/rest/v1/${table}`, {
    method: "POST",
    headers: headers({ "Prefer": "resolution=merge-duplicates,return=minimal" }),
    body: JSON.stringify(rows),
  });
  if (!r.ok) throw new Error(`Supabase UPSERT ${table}: ${await r.text()}`);
}

/** DELETE — deletes the row with the given id. */
export async function sbDelete(table: string, id: string): Promise<void> {
  const r = await fetch(`${BASE}/rest/v1/${table}?id=eq.${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: headers(),
  });
  if (!r.ok) throw new Error(`Supabase DELETE ${table}/${id}: ${await r.text()}`);
}

/** DELETE ALL — removes every row from the table. */
export async function sbDeleteAll(table: string): Promise<void> {
  const r = await fetch(`${BASE}/rest/v1/${table}?id=not.is.null`, {
    method: "DELETE",
    headers: headers(),
  });
  if (!r.ok) throw new Error(`Supabase DELETE ALL ${table}: ${await r.text()}`);
}
