/**
 * generateNextModel.ts
 *
 * This file generates a complete TypeScript interface and class for a given CMS model,
 * ready to use in a Next.js application.
 *
 * What does "generating a model" mean?
 * --------------------------------------
 * When you define a model in your CMS (e.g. a "BlogPost" with fields like title, body, author),
 * this generator automatically writes the TypeScript code you'd need in a Next.js app to
 * represent that data — so developers don't have to write it manually.
 *
 * What gets generated for each model?
 * -------------------------------------
 * 1. A TypeScript Interface  — defines the shape of the data (like a contract)
 * 2. A TypeScript Class      — a concrete implementation of that interface, with methods:
 *    - constructor()   — creates a new instance from a plain data object
 *    - copyWith()      — returns a new instance with some fields changed
 *    - fromJSON()      — creates an instance from raw JSON (e.g. from an API response)
 *    - toJSON()        — converts an instance back to a plain JSON object (e.g. to save to DB)
 * 3. Nested interfaces/classes — if a field is of type 'Object', a separate interface
 *    and class is also generated for that nested structure
 *
 * Why both an interface AND a class?
 * ------------------------------------
 * - The interface ensures any object that "implements" it has the right shape
 * - The class adds useful methods like fromJSON() and copyWith() that plain objects can't have
 */

import {
  ModelDefinition,
  FieldDefinition,
  isFieldObject,
  isListField,
  isModelField,
  GenerateOptions,
} from '../../types/model'

/**
 * generateNextModel
 * -----------------
 * The main function that generates a complete TypeScript interface + class for a CMS model.
 *
 * @param model   - The model definition from your CMS schema. Contains the name and all fields.
 * @param options - Optional settings. Currently supports `options.mocks` to include a mock
 *                  data placeholder comment in the output.
 * @returns         A string of valid TypeScript source code representing the model.
 *
 * Example:
 *   generateNextModel({ name: 'BlogPost', fields: { title: 'string', published: 'boolean' } })
 *   → produces a full TypeScript interface and class for BlogPost
 */
export async function generateNextModel(model: ModelDefinition, options?: GenerateOptions): Promise<string> {
  // The name used for the TypeScript interface and class (e.g. 'BlogPost')
  const interfaceName = model.name

  // All the fields defined for this model in the CMS schema
  const fields = model.fields

  // Informational log so developers can track which model is being generated
  console.log(`🧩 Generating Next.js TypeScript model for: ${interfaceName}`)

  // We'll build the TypeScript code as one big string
  let tsCode = ''

  // ─────────────────────────────────────────────
  // SECTION 1: TypeScript Interface
  // ─────────────────────────────────────────────
  // An interface in TypeScript is like a blueprint — it defines what fields an object must have.
  // This is the "contract" that any class implementing this model must follow.
  // Example output:
  //   export interface BlogPost {
  //     title: string;
  //     published?: boolean;
  //   }
  tsCode += `export interface ${interfaceName} {\n`

  for (const [fieldName, fieldDef] of Object.entries(fields)) {
    // Optional fields get a '?' after the field name (means the field can be undefined)
    const optionalMark = isFieldObject(fieldDef) && fieldDef.optional ? '?' : ''

    // Convert the CMS field type to the correct TypeScript type
    const tsType = getTypeScriptType(fieldDef, interfaceName, fieldName)

    tsCode += `  ${fieldName}${optionalMark}: ${tsType};\n`
  }

  tsCode += `}\n\n`

  // ─────────────────────────────────────────────
  // SECTION 2: Nested Object Interfaces & Classes
  // ─────────────────────────────────────────────
  // If any field is of type 'Object' (a free-form nested object), we generate a
  // separate interface and class for it so it also gets full type safety and methods.
  // Example: a 'BlogPost' with a field 'metadata' of type Object would produce
  // a 'BlogPost_MetadataModel' interface and class.
  for (const [fieldName, fieldDef] of Object.entries(fields)) {
    if (isFieldObject(fieldDef) && fieldDef.type === 'Object') {
      // Build the nested interface name by combining parent + field name
      // e.g. 'BlogPost' + 'metadata' → 'BlogPost_Metadata'
      const nestedInterfaceName = `${interfaceName}_${capitalize(fieldName)}`
      tsCode += generateNestedObjectInterfaceAndClass(nestedInterfaceName, fieldDef.fields)
    }
  }

  // ─────────────────────────────────────────────
  // SECTION 3: Main Model Class
  // ─────────────────────────────────────────────
  // The class is a full implementation of the interface above.
  // It adds a constructor, copyWith, fromJSON, and toJSON methods.
  // The class name always ends in 'Model' to distinguish it from the interface.
  // Example: interface 'BlogPost' → class 'BlogPostModel'
  tsCode += `export class ${interfaceName}Model implements ${interfaceName} {\n`

  // Declare all fields as readonly class properties
  // 'readonly' means once the object is created, its fields cannot be changed directly
  // (you'd use copyWith() instead to get a new instance with updated values)
  for (const [fieldName, fieldDef] of Object.entries(fields)) {
    const tsType = getTypeScriptClassType(fieldDef, interfaceName, fieldName)
    tsCode += `  readonly ${fieldName}: ${tsType};\n`
  }

  // ── Constructor ──
  // The constructor takes a plain data object and assigns each field to the class instance.
  // Using a single 'data' object parameter (instead of individual params) makes it easier
  // to pass named arguments and skip optional ones.
  tsCode += `\n  constructor(data: {\n`
  for (const [fieldName, fieldDef] of Object.entries(fields)) {
    const optionalMark = isFieldObject(fieldDef) && fieldDef.optional ? '?' : ''
    const tsType = getTypeScriptClassType(fieldDef, interfaceName, fieldName)
    tsCode += `    ${fieldName}${optionalMark}: ${tsType};\n`
  }
  tsCode += `  }) {\n`
  for (const fieldName of Object.keys(fields)) {
    tsCode += `    this.${fieldName} = data.${fieldName};\n`
  }
  tsCode += `  }\n\n`

  // ── copyWith ──
  // Returns a new instance of the model with some fields replaced.
  // This is a common immutability pattern — instead of mutating the original object,
  // you get a fresh copy with your changes applied.
  // 'Partial<InterfaceName>' means every field in the update object is optional.
  // Example usage:  blogPost.copyWith({ title: 'New Title' })
  tsCode += `  copyWith(update: Partial<${interfaceName}>): ${interfaceName}Model {\n`
  tsCode += `    return new ${interfaceName}Model({\n`
  for (const fieldName of Object.keys(fields)) {
    // If the update object has this field (even if it's undefined), use the updated value.
    // Otherwise, keep the current value from 'this'.
    tsCode += `      ${fieldName}: update.${fieldName} !== undefined ? update.${fieldName} : this.${fieldName},\n`
  }
  tsCode += `    });\n  }\n\n`

  // ── fromJSON (static factory method) ──
  // Creates a new model instance from a raw JSON object — typically data from an API or database.
  // This is a 'static' method, meaning you call it on the class itself, not on an instance:
  //   BlogPostModel.fromJSON({ title: 'Hello', published: true })
  // We use 'any' for the json parameter type because we don't know the shape of raw API responses.
  tsCode += `  static fromJSON(json: any): ${interfaceName}Model {\n`

  // Guard: if the json object is null or undefined, throw a clear error immediately
  tsCode += `    if (!json) throw new Error('Cannot create ${interfaceName}Model: received null or undefined JSON')\n`
  tsCode += `    return new ${interfaceName}Model({\n`

  for (const [fieldName, fieldDef] of Object.entries(fields)) {
    if (isModelField(fieldDef)) {
      // Nested model field: recursively call fromJSON() on the nested model class
      // If the value is missing and the field is required, throw a descriptive error
      tsCode += `      ${fieldName}: json.${fieldName} ? ${fieldDef.of}Model.fromJSON(json.${fieldName}) : (() => { throw new Error('Missing required field: ${fieldName} in ${interfaceName}') })(),\n`

    } else if (isListField(fieldDef)) {
      if (typeof fieldDef.of === 'string' && isPrimitiveType(fieldDef.of)) {
        // List of primitive values (strings, numbers, etc.) — just assign the array directly.
        // Fall back to an empty array if the field is missing or not an array.
        tsCode += `      ${fieldName}: Array.isArray(json.${fieldName}) ? json.${fieldName} : [],\n`
      } else {
        // List of nested models — map over each item and call fromJSON() on it
        tsCode += `      ${fieldName}: Array.isArray(json.${fieldName}) ? json.${fieldName}.map((item: any) => ${fieldDef.of}Model.fromJSON(item)) : [],\n`
      }

    } else if (isFieldObject(fieldDef) && fieldDef.type === 'Object') {
      // Nested object field: use the generated nested class to parse it
      const nestedName = `${interfaceName}_${capitalize(fieldName)}Model`
      tsCode += `      ${fieldName}: json.${fieldName} ? ${nestedName}.fromJSON(json.${fieldName}) : (() => { throw new Error('Missing required field: ${fieldName} in ${interfaceName}') })(),\n`

    } else {
      // Primitive field: assign the JSON value directly
      tsCode += `      ${fieldName}: json.${fieldName},\n`
    }
  }
  tsCode += `    });\n  }\n\n`

  // ── toJSON ──
  // Converts the model instance back to a plain JSON object.
  // Used when saving data to a database or sending it to an API.
  // Example usage:  blogPost.toJSON() → { title: 'Hello', published: true }
  tsCode += `  toJSON(): any {\n`
  tsCode += `    return {\n`

  for (const [fieldName, fieldDef] of Object.entries(fields)) {
    if (isModelField(fieldDef)) {
      // Nested model: call toJSON() on it, or return null if it's undefined
      tsCode += `      ${fieldName}: this.${fieldName} ? this.${fieldName}.toJSON() : null,\n`

    } else if (isListField(fieldDef)) {
      if (typeof fieldDef.of === 'string' && isPrimitiveType(fieldDef.of)) {
        // List of primitives — assign directly, no conversion needed
        tsCode += `      ${fieldName}: this.${fieldName},\n`
      } else {
        // List of nested models — convert each item to JSON
        tsCode += `      ${fieldName}: this.${fieldName}.map(item => item.toJSON()),\n`
      }

    } else if (isFieldObject(fieldDef) && fieldDef.type === 'Object') {
      // Nested object: call toJSON() on it, or return null if it's undefined
      tsCode += `      ${fieldName}: this.${fieldName} ? this.${fieldName}.toJSON() : null,\n`

    } else {
      // Primitive field — include the value directly
      tsCode += `      ${fieldName}: this.${fieldName},\n`
    }
  }
  tsCode += `    };\n  }\n`

  // Close the class
  tsCode += `}\n`

  // ── Optional: Mock Data Placeholder ──
  // If the caller asked for mocks (via options.mocks), we add a comment block as a placeholder.
  // In the future, this could be replaced with actual generated mock data for testing.
  if (options?.mocks) {
    tsCode += `\n// TODO: Replace this with generated mock data for ${interfaceName} — used in unit tests and Storybook stories\n`
  }

  // NOTE: We intentionally do NOT log the generated tsCode here.
  // Printing the full generated TypeScript source to the console could expose
  // your entire schema structure in production logs. We return it instead.
  return tsCode
}

// ─────────────────────────────────────────────────────────────────
// HELPER FUNCTIONS
// ─────────────────────────────────────────────────────────────────

/**
 * mapPrimitiveType
 * ----------------
 * Converts a CMS primitive type string into the equivalent TypeScript type string.
 *
 * @param type - A plain CMS type string like 'string', 'number', 'boolean', etc.
 * @returns      The TypeScript equivalent type as a string.
 *
 * Examples:
 *   mapPrimitiveType('string')   → 'string'
 *   mapPrimitiveType('number')   → 'number'
 *   mapPrimitiveType('geopoint') → '{ lat: number; lng: number }'
 *   mapPrimitiveType('unknown')  → 'any'
 */
function mapPrimitiveType(type: string): string {
  switch (type) {
    case 'string':
    case 'image':      // Images are stored as URL strings
    case 'datetime':   // Dates stored as ISO 8601 string format
    case 'timestamp':  // Timestamps also stored as strings
      return 'string'

    case 'number':
      return 'number'

    case 'boolean':
      return 'boolean'

    case 'geopoint':
      // GeoPoint is represented as an inline object type with lat and lng coordinates
      return '{ lat: number; lng: number }'

    default:
      // Unknown type — fall back to TypeScript's 'any' (equivalent to opting out of type checking)
      return 'any'
  }
}

/**
 * generateNestedObjectInterfaceAndClass
 * ---------------------------------------
 * Generates a complete TypeScript interface AND class for a nested 'Object' type field.
 *
 * When a model field is of type 'Object' (a free-form sub-object), we can't just use
 * a generic type — we generate a dedicated interface and class for it so it gets the
 * same full type safety and helper methods (fromJSON, toJSON, copyWith) as the parent model.
 *
 * @param interfaceName - The name for the generated interface/class (e.g. 'BlogPost_Metadata')
 * @param fields        - The fields of the nested object
 * @returns               A string of TypeScript code for the interface and class
 */
function generateNestedObjectInterfaceAndClass(
  interfaceName: string,
  fields: Record<string, FieldDefinition>
): string {
  let code = ''

  // ── Nested Interface ──
  code += `export interface ${interfaceName} {\n`
  for (const [fieldName, fieldDef] of Object.entries(fields)) {
    const optionalMark = isFieldObject(fieldDef) && fieldDef.optional ? '?' : ''
    const tsType = getTypeScriptType(fieldDef, interfaceName, fieldName)
    code += `  ${fieldName}${optionalMark}: ${tsType};\n`
  }
  code += `}\n\n`

  // ── Nested Class ──
  code += `export class ${interfaceName}Model implements ${interfaceName} {\n`
  for (const [fieldName, fieldDef] of Object.entries(fields)) {
    const tsType = getTypeScriptClassType(fieldDef, interfaceName, fieldName)
    code += `  readonly ${fieldName}: ${tsType};\n`
  }

  // Constructor
  code += `\n  constructor(data: {\n`
  for (const [fieldName, fieldDef] of Object.entries(fields)) {
    const optionalMark = isFieldObject(fieldDef) && fieldDef.optional ? '?' : ''
    const tsType = getTypeScriptClassType(fieldDef, interfaceName, fieldName)
    code += `    ${fieldName}${optionalMark}: ${tsType};\n`
  }
  code += `  }) {\n`
  for (const fieldName of Object.keys(fields)) {
    code += `    this.${fieldName} = data.${fieldName};\n`
  }
  code += `  }\n\n`

  // copyWith
  code += `  copyWith(update: Partial<${interfaceName}>): ${interfaceName}Model {\n`
  code += `    return new ${interfaceName}Model({\n`
  for (const fieldName of Object.keys(fields)) {
    code += `      ${fieldName}: update.${fieldName} !== undefined ? update.${fieldName} : this.${fieldName},\n`
  }
  code += `    });\n  }\n\n`

  // fromJSON
  code += `  static fromJSON(json: any): ${interfaceName}Model {\n`
  code += `    if (!json) throw new Error('Cannot create ${interfaceName}Model: received null or undefined JSON')\n`
  code += `    return new ${interfaceName}Model({\n`
  for (const [fieldName, fieldDef] of Object.entries(fields)) {
    if (isModelField(fieldDef)) {
      code += `      ${fieldName}: json.${fieldName} ? ${fieldDef.of}Model.fromJSON(json.${fieldName}) : (() => { throw new Error('Missing required field: ${fieldName} in ${interfaceName}') })(),\n`
    } else if (isListField(fieldDef)) {
      if (typeof fieldDef.of === 'string' && isPrimitiveType(fieldDef.of)) {
        code += `      ${fieldName}: Array.isArray(json.${fieldName}) ? json.${fieldName} : [],\n`
      } else {
        code += `      ${fieldName}: Array.isArray(json.${fieldName}) ? json.${fieldName}.map((item: any) => ${fieldDef.of}Model.fromJSON(item)) : [],\n`
      }
    } else if (isFieldObject(fieldDef) && fieldDef.type === 'Object') {
      const nestedInterfaceName = `${interfaceName}_${capitalize(fieldName)}Model`
      code += `      ${fieldName}: json.${fieldName} ? ${nestedInterfaceName}.fromJSON(json.${fieldName}) : (() => { throw new Error('Missing required field: ${fieldName} in ${interfaceName}') })(),\n`
    } else {
      code += `      ${fieldName}: json.${fieldName},\n`
    }
  }
  code += `    });\n  }\n\n`

  // toJSON
  code += `  toJSON(): any {\n`
  code += `    return {\n`
  for (const [fieldName, fieldDef] of Object.entries(fields)) {
    if (isModelField(fieldDef)) {
      code += `      ${fieldName}: this.${fieldName} ? this.${fieldName}.toJSON() : null,\n`
    } else if (isListField(fieldDef)) {
      if (typeof fieldDef.of === 'string' && isPrimitiveType(fieldDef.of)) {
        code += `      ${fieldName}: this.${fieldName},\n`
      } else {
        code += `      ${fieldName}: this.${fieldName}.map(item => item.toJSON()),\n`
      }
    } else if (isFieldObject(fieldDef) && fieldDef.type === 'Object') {
      code += `      ${fieldName}: this.${fieldName} ? this.${fieldName}.toJSON() : null,\n`
    } else {
      code += `      ${fieldName}: this.${fieldName},\n`
    }
  }
  code += `    };\n  }\n`
  code += `}\n\n`

  return code
}

/**
 * getTypeScriptType
 * -----------------
 * Resolves the TypeScript type for a field, used inside the INTERFACE declaration.
 *
 * For 'Object' type fields, this returns an inline object type literal.
 * For 'model' and 'List' fields, this returns the named model class type.
 * For everything else, it falls back to mapPrimitiveType().
 *
 * @param field       - The field definition (either a plain type string or a full config object)
 * @param parentModel - The name of the parent model (used for naming nested object types)
 * @param fieldName   - The name of the field (used for naming nested object types)
 * @returns             A TypeScript type string suitable for use in an interface
 */
function getTypeScriptType(field: FieldDefinition, parentModel: string, fieldName: string): string {
  // Plain shorthand field (just a type string like 'string') — use the primitive mapper
  if (!isFieldObject(field)) return mapPrimitiveType(field)

  switch (field.type) {
    case 'model':
      // Reference to another model — use the model's class type (e.g. 'AuthorModel')
      return `${field.of}Model`

    case 'List':
      // Array of either a primitive type or a model type
      return typeof field.of === 'string' && isPrimitiveType(field.of)
        ? `${mapPrimitiveType(field.of)}[]`   // e.g. 'string[]'
        : `${field.of}Model[]`                 // e.g. 'TagModel[]'

    case 'Object':
      // Inline anonymous object type — lists all sub-fields inline
      // Example: { title?: string; count: number }
      return `{ ${Object.entries(field.fields)
        .map(([key, val]) => {
          const optional = isFieldObject(val) && val.optional ? '?' : ''
          return `${key}${optional}: ${getTypeScriptType(val, parentModel, key)}`
        })
        .join('; ')} }`

    default:
      // Fall back to primitive type mapping for all other field types
      return mapPrimitiveType(field.type)
  }
}

/**
 * getTypeScriptClassType
 * ----------------------
 * Resolves the TypeScript type for a field, used inside the CLASS declaration.
 *
 * This differs from getTypeScriptType() in one key way:
 * - For 'Object' type fields, instead of returning an inline type literal,
 *   it returns the name of the generated nested class (e.g. 'BlogPost_MetadataModel').
 *   This is because classes can't use inline object types for their properties —
 *   they need a concrete class or type reference.
 *
 * @param field       - The field definition
 * @param parentModel - The parent model name (used to build the nested class name)
 * @param fieldName   - The field name (used to build the nested class name)
 * @returns             A TypeScript type string suitable for use in a class property
 */
function getTypeScriptClassType(field: FieldDefinition, parentModel: string, fieldName: string): string {
  if (!isFieldObject(field)) return mapPrimitiveType(field)

  switch (field.type) {
    case 'model':
      return `${field.of}Model`

    case 'List':
      return typeof field.of === 'string' && isPrimitiveType(field.of)
        ? `${mapPrimitiveType(field.of)}[]`
        : `${field.of}Model[]`

    case 'Object':
      // For class properties, we use the generated nested class name instead of an inline type
      // e.g. field 'metadata' in 'BlogPost' → 'BlogPost_MetadataModel'
      return `${parentModel}_${capitalize(fieldName)}Model`

    default:
      return mapPrimitiveType(field.type)
  }
}

/**
 * capitalize
 * ----------
 * Capitalizes the first letter of a string. Used when building nested type names.
 *
 * @param str - Any string
 * @returns     The same string with its first character uppercased
 *
 * Example:  capitalize('metadata') → 'Metadata'
 */
function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

/**
 * isPrimitiveType
 * ---------------
 * Checks whether a given type string is one of the known primitive CMS types.
 *
 * This is used to decide whether a List field contains simple values (like strings)
 * or complex model objects. Lists of primitives are handled differently from
 * lists of nested models in both fromJSON() and toJSON().
 *
 * @param type - A CMS type string to check
 * @returns      true if it's a primitive type, false if it's a model/complex type
 *
 * Examples:
 *   isPrimitiveType('string')  → true
 *   isPrimitiveType('number')  → true
 *   isPrimitiveType('Author')  → false  (this would be a model reference)
 */
function isPrimitiveType(type: string): boolean {
  return ['string', 'number', 'boolean', 'image', 'datetime', 'timestamp', 'geopoint'].includes(type)
}