import postgres from "postgres";

let client: ReturnType<typeof postgres> | undefined;

function getClient() {
  const connectionString = process.env.POSTGRES_URL;
  if (!connectionString) throw new Error("POSTGRES_URL est manquant");
  client ??= postgres(connectionString, { max: 5 });
  return client;
}

type QueryResult = { rows: Record<string, unknown>[] };
type SqlTag = ((strings: TemplateStringsArray, ...values: any[]) => Promise<QueryResult>) & {
  query: (query: string) => Promise<QueryResult>;
};

async function taggedQuery(strings: TemplateStringsArray, ...values: any[]): Promise<QueryResult> {
  const rows = await getClient()(strings, ...values);
  return { rows: Array.from(rows) };
}

export const sql = Object.assign(taggedQuery, {
  async query(query: string): Promise<QueryResult> {
    const rows = await getClient().unsafe(query);
    return { rows: Array.from(rows) };
  }
}) as SqlTag;

export async function closeDb() {
  if (client) await client.end({ timeout: 5 });
  client = undefined;
}
