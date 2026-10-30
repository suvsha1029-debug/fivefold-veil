// Intentionally empty by default.
// Add Drizzle tables here when the site actually needs a database.
// See examples/d1/db/schema.ts for an opt-in example.
export {};
import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
export const roomDocuments = sqliteTable('room_documents', {
  code:text('code').primaryKey(),
  data:text('data').notNull(),
  version:integer('version').notNull().default(0),
  expiresAt:integer('expires_at').notNull(),
},table=>[index('room_expiry').on(table.expiresAt)]);
