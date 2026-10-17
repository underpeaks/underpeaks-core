// app/db-adapter/utils/sql-identifiers.ts
//
// Shared, database-independent rules for putting names into SQL text.
// Values always go through placeholders ($1 / ?). Names (tables, columns)
// cannot, so they are checked and quoted here, in one place, for the
// Postgres and MySQL adapters.
//
// Quoting is done by doubling the quote character, which is how both
// databases take a quote inside a name. That makes any name safe to use
// without restricting which names already exist in a database.

const MAX_IDENTIFIER_LENGTH = 128

/** Throws unless the name is a non-empty string that is safe to quote. */
export function assertIdentifier(name: unknown, what = 'identifier'): string {
  if (
    typeof name !== 'string' ||
    name.length === 0 ||
    name.length > MAX_IDENTIFIER_LENGTH ||
    name.includes('\0')
  ) {
    throw new Error(`Invalid ${what}`)
  }
  return name
}

/** PostgreSQL: "name", with any " inside the name doubled. */
export function pgIdent(name: unknown, what = 'identifier'): string {
  return `"${assertIdentifier(name, what).replace(/"/g, '""')}"`
}

/** MySQL / MariaDB: `name`, with any ` inside the name doubled. */
export function myIdent(name: unknown, what = 'identifier'): string {
  return `\`${assertIdentifier(name, what).replace(/`/g, '``')}\``
}

/** A LIMIT / OFFSET value: a whole number >= 0, otherwise undefined. */
export function safeInt(value: unknown): number | undefined {
  const n = Number(value)
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : undefined
}

// A single function call with no argument, a number, or one plain quoted
// string, optionally wrapped in one pair of brackets:
//   now()   gen_random_uuid()   current_timestamp(6)   (UUID())   nextval('seq')
const SAFE_FUNCTION_DEFAULT = /^\(?[A-Za-z_][A-Za-z0-9_]*\(\s*(?:\d+|'[^'\;]*')?\s*\)\)?$/

/**
 * The " DEFAULT ..." part of a column definition, or '' when there is none.
 *  - booleans and numbers are written as they are
 *  - true / false / null, current_timestamp and a single function call such as
 *    now() are written as expressions
 *  - any other string is written as a quoted text value, so a model default
 *    can never add SQL of its own
 * mapExpr lets MySQL translate Postgres expressions (gen_random_uuid() etc.).
 */
export function ddlDefault(
  value:    unknown,
  dialect:  'postgres' | 'mysql',
  mapExpr:  (expr: string) => string = (e) => e,
): string {
  if (value === undefined || value === null) return ''

  if (typeof value === 'boolean') return ` DEFAULT ${value ? 'true' : 'false'}`

  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new Error('Invalid default value')
    return ` DEFAULT ${value}`
  }

  if (typeof value === 'string') {
    const v = value.trim()
    if (
      /^(true|false|null)$/i.test(v) ||
      /^current_timestamp$/i.test(v) ||
      SAFE_FUNCTION_DEFAULT.test(v)
    ) {
      return ` DEFAULT ${mapExpr(v)}`
    }
    let literal = value.replace(/'/g, "''")
    if (dialect === 'mysql') literal = literal.replace(/\\/g, '\\\\')
    return ` DEFAULT '${literal}'`
  }

  return ''
}