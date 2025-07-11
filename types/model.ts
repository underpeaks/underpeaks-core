/**
 * Primitive types allowed in shared models
 */
export type PrimitiveType = 'string' | 'number' | 'boolean' | 'datetime' | 'timestamp' | 'image' | 'geopoint'

/**
 * Field describing a primitive type
 */
export interface PrimitiveField {
  type: PrimitiveType
  optional?: boolean
}

/**
 * Field describing a nested model (e.g., another defined shared model)
 */
export interface ModelField {
  type: 'model'
  of: string           // Name of the referenced model (must exist in shared models)
  optional?: boolean
}

/**
 * Field describing a nested object structure with inline fields
 */
export interface ObjectField {
  type: 'Object'
  fields: Record<string, FieldDefinition>
  optional?: boolean
}

/**
 * Field describing a list of primitives, models, or nested objects
 */
export interface ListField {
  type: 'List'
  of: string | FieldObject // Model name string, or inline FieldObject
  optional?: boolean
}

/**
 * Unified field object type for discriminated unions
 */
export type FieldObject = PrimitiveField | ModelField | ListField | ObjectField

/**
 * Field definition can be:
 * - A primitive type as string (shorthand for { type: "string" })
 * - A detailed FieldObject
 */
export type FieldDefinition = PrimitiveType | FieldObject

/**
 * Shared model definition
 */
export interface ModelDefinition {
  name: string
  fields: Record<string, FieldDefinition>
}

/* --------------------------
    Type Guards (Helpers)
-------------------------- */

/**
 * Returns true if field is a full object (not primitive string)
 */
export function isFieldObject(field: FieldDefinition): field is FieldObject {
  return typeof field !== 'string' && !!field.type
}

/**
 * Returns true if field is a primitive field object
 */
export function isPrimitiveField(field: FieldDefinition): field is PrimitiveField {
  return isFieldObject(field) && isPrimitiveType(field.type)
}

/**
 * Returns true if field is a model field (referencing another model)
 */
export function isModelField(field: FieldDefinition): field is ModelField {
  return isFieldObject(field) && field.type === 'model'
}

/**
 * Returns true if field is a list field
 */
export function isListField(field: FieldDefinition): field is ListField {
  return isFieldObject(field) && field.type === 'List'
}

/**
 * Returns true if field is a nested object field
 */
export function isObjectField(field: FieldDefinition): field is ObjectField {
  return isFieldObject(field) && field.type === 'Object'
}

/**
 * Helper to check if value is a valid primitive type
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

export interface GenerateOptions {
  flutter?: boolean
  next?: boolean
  force?: boolean
  format?: boolean
  mocks?: boolean
}