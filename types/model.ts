/**
 * Shared Model Type Definitions & Type Guards
 *
 * This file is the "dictionary" for how data models are described throughout
 * the application. It defines the TypeScript types and interfaces that
 * represent the structure of any model field — whether it is a simple string,
 * a number, a nested object, a list, or a reference to another model.
 *
 * Think of this file as the blueprint language. Just like a blueprint uses
 * standard symbols to mean "door" or "window", this file defines standard
 * types to mean "this field is a string" or "this field is a list of Users".
 *
 * It also exports a set of "type guard" helper functions. A type guard is a
 * function that looks at a value at runtime and tells TypeScript (and the
 * developer) exactly what kind of thing it is — so the rest of the code can
 * handle it correctly.
 *
 * What is exported from this file:
 * ┌─────────────────────┬──────────────────────────────────────────────────┐
 * │ Export              │ Purpose                                          │
 * ├─────────────────────┼──────────────────────────────────────────────────┤
 * │ PrimitiveType       │ Union of all allowed basic value types           │
 * │ PrimitiveField      │ Field that holds a primitive value               │
 * │ ModelField          │ Field that references another named model        │
 * │ ObjectField         │ Field that holds an inline nested object         │
 * │ ListField           │ Field that holds a list of items                 │
 * │ FieldObject         │ Union of all four field types above              │
 * │ FieldDefinition     │ A field written as shorthand string OR FieldObject│
 * │ ModelDefinition     │ A complete named model with all its fields       │
 * │ GenerateOptions     │ Options passed to code-generation commands       │
 * ├─────────────────────┼──────────────────────────────────────────────────┤
 * │ isFieldObject       │ Guard: is this a FieldObject (not a plain string)│
 * │ isPrimitiveField    │ Guard: is this a PrimitiveField                  │
 * │ isModelField        │ Guard: is this a ModelField                      │
 * │ isListField         │ Guard: is this a ListField                       │
 * │ isObjectField       │ Guard: is this an ObjectField                    │
 * │ isPrimitiveType     │ Guard: is this string a valid PrimitiveType      │
 * └─────────────────────┴──────────────────────────────────────────────────┘
 */

// ---------------------------------------------------------------------------
// Primitive Types
// ---------------------------------------------------------------------------

/**
 * PrimitiveType
 *
 * A union type listing every "basic" (primitive) data type that a model field
 * is allowed to hold. These map roughly to the data types you would find in a
 * database or a strongly-typed API schema.
 *
 * | Value       | Meaning                                                  |
 * |-------------|----------------------------------------------------------|
 * | 'string'    | Plain text (e.g. a name, email address, description)     |
 * | 'number'    | Any numeric value, integer or decimal                    |
 * | 'boolean'   | True or false                                            |
 * | 'datetime'  | A date with a time component (e.g. "2024-01-15T10:30Z") |
 * | 'timestamp' | A Unix epoch timestamp (milliseconds since Jan 1 1970)   |
 * | 'image'     | A reference to an image asset (URL or storage path)      |
 * | 'geopoint'  | A geographical coordinate (latitude + longitude pair)    |
 *
 * @example
 * const myType: PrimitiveType = 'string'  // ✅ valid
 * const myType: PrimitiveType = 'object'  // ❌ TypeScript error
 */
export type PrimitiveType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'datetime'
  | 'timestamp'
  | 'image'
  | 'geopoint'

// ---------------------------------------------------------------------------
// Field Interfaces
// ---------------------------------------------------------------------------

/**
 * PrimitiveField
 *
 * Describes a model field whose value is one of the allowed primitive types.
 * This is the most common kind of field you will encounter.
 *
 * @property type     - Which primitive type this field holds.
 * @property optional - When true, this field may be absent or null on a record.
 *                      When false/omitted, the field is required.
 *
 * @example
 * // A required email address field
 * const emailField: PrimitiveField = { type: 'string' }
 *
 * // An optional profile picture field
 * const avatarField: PrimitiveField = { type: 'image', optional: true }
 */
export interface PrimitiveField {
  type:      PrimitiveType
  optional?: boolean
}

/**
 * ModelField
 *
 * Describes a model field that references another named model defined
 * elsewhere in the shared models registry. Think of it like a foreign key
 * in a relational database — it points to another model by name.
 *
 * @property type     - Always the literal string 'model' to identify this kind.
 * @property of       - The name of the model being referenced. This name must
 *                      exist in the shared models registry or code generation
 *                      will fail.
 * @property optional - When true, this relationship is optional (nullable).
 *
 * @example
 * // A field that references a "UserProfile" model
 * const authorField: ModelField = { type: 'model', of: 'UserProfile' }
 */
export interface ModelField {
  type:      'model'
  of:        string   // Name of the referenced model (must exist in shared models)
  optional?: boolean
}

/**
 * ObjectField
 *
 * Describes a field that contains an inline nested object — a sub-structure
 * with its own named fields — defined directly inside the parent model rather
 * than as a separate named model.
 *
 * Use this when the nested structure is small, unique to this parent model,
 * and not reused anywhere else. If the structure IS reused, define it as a
 * separate ModelDefinition and reference it with a ModelField instead.
 *
 * @property type     - Always the literal string 'Object' to identify this kind.
 * @property fields   - A record (plain object) mapping each sub-field name to
 *                      its own FieldDefinition. This allows arbitrarily deep
 *                      nesting.
 * @property optional - When true, the entire nested object may be absent.
 *
 * @example
 * // An inline "address" object nested inside a "Customer" model
 * const addressField: ObjectField = {
 *   type: 'Object',
 *   fields: {
 *     street: 'string',
 *     city:   'string',
 *     zip:    'string',
 *   }
 * }
 */
export interface ObjectField {
  type:      'Object'
  fields:    Record<string, FieldDefinition>
  optional?: boolean
}

/**
 * ListField
 *
 * Describes a field that holds an ordered list (array) of items. Each item
 * in the list can be:
 *   - A named model reference (provide the model name as a string in `of`).
 *   - An inline field object (provide a FieldObject directly in `of`).
 *
 * @property type     - Always the literal string 'List' to identify this kind.
 * @property of       - Either the string name of a model, or an inline
 *                      FieldObject describing the shape of each list item.
 * @property optional - When true, the list itself may be absent (not just empty).
 *
 * @example
 * // A list of "Comment" model references
 * const commentsField: ListField = { type: 'List', of: 'Comment' }
 *
 * // A list of inline primitive string items (e.g. a list of tags)
 * const tagsField: ListField = { type: 'List', of: { type: 'string' } }
 */
export interface ListField {
  type:      'List'
  of:        string | FieldObject   // Model name string, or inline FieldObject
  optional?: boolean
}

// ---------------------------------------------------------------------------
// Unified Field Types
// ---------------------------------------------------------------------------

/**
 * FieldObject
 *
 * A discriminated union that represents ANY of the four possible detailed
 * field types. TypeScript uses the `type` property on each interface as the
 * "discriminant" to automatically narrow which specific interface you are
 * working with inside an if/switch block.
 *
 * @example
 * function describeField(field: FieldObject) {
 *   if (field.type === 'model') {
 *     // TypeScript now knows `field` is a ModelField
 *     console.log(field.of) // safe to access .of here
 *   }
 * }
 */
export type FieldObject = PrimitiveField | ModelField | ListField | ObjectField

/**
 * FieldDefinition
 *
 * The most flexible way to describe a field. It accepts either:
 *
 * 1. A PrimitiveType string as a shorthand — e.g. just `'string'` instead of
 *    the full `{ type: 'string' }`. This keeps model definitions concise for
 *    simple fields.
 *
 * 2. A full FieldObject for anything more complex (optional flag, lists,
 *    nested objects, model references).
 *
 * This is the type you will see most often on the `fields` property of a
 * ModelDefinition.
 *
 * @example
 * // Shorthand primitive
 * const nameField: FieldDefinition = 'string'
 *
 * // Full object for an optional field
 * const bioField: FieldDefinition = { type: 'string', optional: true }
 */
export type FieldDefinition = PrimitiveType | FieldObject

// ---------------------------------------------------------------------------
// Model Definition
// ---------------------------------------------------------------------------

/**
 * ModelDefinition
 *
 * Represents a complete, named data model — the top-level unit in the shared
 * models registry. A model has a unique name and a set of named fields, each
 * described by a FieldDefinition.
 *
 * @property name   - The unique identifier for this model (e.g. 'UserProfile').
 *                    Other models reference it by this exact string.
 * @property fields - A record mapping each field name to its FieldDefinition.
 *
 * @example
 * const UserProfile: ModelDefinition = {
 *   name: 'UserProfile',
 *   fields: {
 *     id:        'string',
 *     email:     'string',
 *     age:       { type: 'number', optional: true },
 *     createdAt: 'timestamp',
 *   }
 * }
 */
export interface ModelDefinition {
  name:   string
  fields: Record<string, FieldDefinition>
}

// ---------------------------------------------------------------------------
// Type Guards
// ---------------------------------------------------------------------------
//
// Type guards are plain functions that return a boolean, but they also carry
// a special TypeScript return type annotation (`field is XxxType`) that tells
// the compiler "if this function returns true, narrow the type of `field` to
// XxxType inside the if-block". This eliminates the need for manual type casts.
//
// Example pattern:
//   if (isModelField(someField)) {
//     someField.of  // ← TypeScript knows `.of` exists here; no cast needed
//   }
// ---------------------------------------------------------------------------

/**
 * isFieldObject
 *
 * Returns true when the given FieldDefinition is a full FieldObject (i.e. an
 * object with a `type` property) rather than a plain PrimitiveType shorthand
 * string like `'string'`.
 *
 * This is the first guard you should call before checking which specific kind
 * of field object it is, because all the more specific guards (isPrimitiveField,
 * isModelField, etc.) rely on accessing `.type`, which only exists on objects.
 *
 * @param field - Any FieldDefinition value to inspect.
 * @returns     `true` if `field` is a FieldObject; `false` if it is a plain string.
 *
 * @example
 * if (isFieldObject(field)) {
 *   console.log(field.type) // safe — we know it's an object now
 * }
 */
export function isFieldObject(field: FieldDefinition): field is FieldObject {
  return typeof field !== 'string' && !!field.type
}

/**
 * isPrimitiveField
 *
 * Returns true when the given FieldDefinition is a PrimitiveField object
 * (i.e. a full object whose `type` is one of the allowed PrimitiveType values).
 *
 * Note: This returns false for shorthand primitive strings like `'string'`.
 * Use `isPrimitiveType` if you want to check shorthand strings.
 *
 * @param field - Any FieldDefinition value to inspect.
 * @returns     `true` if `field` is a PrimitiveField object.
 *
 * @example
 * if (isPrimitiveField(field)) {
 *   // field.type is 'string' | 'number' | 'boolean' | ... etc.
 * }
 */
export function isPrimitiveField(field: FieldDefinition): field is PrimitiveField {
  return isFieldObject(field) && isPrimitiveType(field.type)
}

/**
 * isModelField
 *
 * Returns true when the given FieldDefinition is a ModelField — i.e. a full
 * field object whose `type` is exactly the string `'model'`.
 *
 * @param field - Any FieldDefinition value to inspect.
 * @returns     `true` if `field` is a ModelField.
 *
 * @example
 * if (isModelField(field)) {
 *   console.log(field.of) // the referenced model name, e.g. 'UserProfile'
 * }
 */
export function isModelField(field: FieldDefinition): field is ModelField {
  return isFieldObject(field) && field.type === 'model'
}

/**
 * isListField
 *
 * Returns true when the given FieldDefinition is a ListField — i.e. a full
 * field object whose `type` is exactly the string `'List'`.
 *
 * @param field - Any FieldDefinition value to inspect.
 * @returns     `true` if `field` is a ListField.
 *
 * @example
 * if (isListField(field)) {
 *   console.log(field.of) // the item type, e.g. 'Comment' or { type: 'string' }
 * }
 */
export function isListField(field: FieldDefinition): field is ListField {
  return isFieldObject(field) && field.type === 'List'
}

/**
 * isObjectField
 *
 * Returns true when the given FieldDefinition is an ObjectField — i.e. a full
 * field object whose `type` is exactly the string `'Object'`.
 *
 * @param field - Any FieldDefinition value to inspect.
 * @returns     `true` if `field` is an ObjectField.
 *
 * @example
 * if (isObjectField(field)) {
 *   // field.fields is a Record<string, FieldDefinition> — iterate sub-fields
 *   Object.entries(field.fields).forEach(([name, def]) => { ... })
 * }
 */
export function isObjectField(field: FieldDefinition): field is ObjectField {
  return isFieldObject(field) && field.type === 'Object'
}

/**
 * isPrimitiveType
 *
 * Returns true when the given value is one of the seven allowed PrimitiveType
 * strings. This is used internally by `isPrimitiveField` and can also be used
 * anywhere else in the codebase to validate an unknown value before treating
 * it as a PrimitiveType.
 *
 * @param type - Any value to check (typed as `any` so it can safely accept
 *               unknown/unvalidated input without a TypeScript error).
 * @returns    `true` if `type` is a valid PrimitiveType string.
 *
 * @example
 * isPrimitiveType('string')   // true
 * isPrimitiveType('geopoint') // true
 * isPrimitiveType('object')   // false
 * isPrimitiveType(42)         // false
 */
export function isPrimitiveType(type: any): type is PrimitiveType {
  return [
    'string',
    'number',
    'boolean',
    'datetime',
    'timestamp',
    'image',
    'geopoint',
  ].includes(type)
}

// ---------------------------------------------------------------------------
// Code Generation Options
// ---------------------------------------------------------------------------

/**
 * GenerateOptions
 *
 * Describes the set of flags that can be passed to a code-generation command
 * or function to control what output is produced and how.
 *
 * All properties are optional — omitting a flag is equivalent to `false`.
 *
 * @property flutter - When true, generate Flutter/Dart model files.
 * @property next    - When true, generate Next.js / TypeScript model files.
 * @property force   - When true, overwrite existing generated files without
 *                     prompting. Use with caution in CI pipelines.
 * @property format  - When true, run the code formatter (e.g. Prettier / dartfmt)
 *                     on the generated output automatically.
 * @property mocks   - When true, also generate mock/fake data files alongside
 *                     the model files, useful for testing and prototyping.
 *
 * @example
 * const options: GenerateOptions = {
 *   flutter: true,
 *   format:  true,
 *   force:   false,
 * }
 */
export interface GenerateOptions {
  flutter?: boolean
  next?:    boolean
  force?:   boolean
  format?:  boolean
  mocks?:   boolean
}