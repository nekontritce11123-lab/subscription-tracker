import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { Database } from '../types.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dbFile = join(__dirname, '../../data/db.json');

const defaultData: Database = {
  users: [],
  subscriptions: [],
};

const adapter = new JSONFile<Database>(dbFile);
export const db = new Low<Database>(adapter, defaultData);

export async function initDatabase(): Promise<void> {
  await db.read();

  // Ensure default structure
  db.data ||= defaultData;
  db.data.users ||= [];
  db.data.subscriptions ||= [];

  await db.write();
  console.log('[Database] Initialized successfully');
}
