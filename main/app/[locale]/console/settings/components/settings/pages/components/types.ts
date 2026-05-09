export interface ApiKey {
  api_id:        string
  name:          string
  key_prefix:    string
  status:        string
  last_used_at:  string | null
  created_at:    string
  revealedKey?:  string   // populated after user clicks reveal
}

export interface NewKeyResult {
  api_id: string
  prefix: string
  name:   string
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', {
    day:   '2-digit',
    month: 'short',
    year:  'numeric',
  })
}