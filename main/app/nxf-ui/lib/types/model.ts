// model.ts
export interface SharedModel{
  id?: string; // UUID
  project_id: string; // UUID
  name: string;
  schema: Record<string, any>; // JSONB stored as a JS object
  created_at?: string; // timestamp with time zone (ISO string)
  updated_at?: string; // timestamp with time zone (ISO string)

}
