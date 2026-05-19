/**
 * generateFlutterModel.ts
 *
 * This file is responsible for taking a model definition (from your CMS schema)
 * and automatically generating a complete Dart class that can be used in a Flutter app.
 *
 * What is a "model" in this context?
 * -----------------------------------
 * A model is a blueprint for a piece of data — for example, a "Product" model might
 * have fields like: name (string), price (number), inStock (boolean).
 * This generator reads that blueprint and writes the Dart code so developers
 * don't have to write it by hand.
 *
 * What does the generated Dart class include?
 * --------------------------------------------
 * 1. Class fields       — the properties the model holds
 * 2. Constructor        — how to create a new instance of the model
 * 3. copyWith()         — creates a copy of the object with some fields changed
 * 4. fromJson()         — creates a model instance from a JSON map (e.g. API response)
 * 5. toJson()           — converts the model instance back to a JSON map (e.g. to save to DB)
 */

import { ModelDefinition, FieldDefinition, isFieldObject, GenerateOptions } from '../../types/model'

/**
 * generateFlutterModel
 * ---------------------
 * The main function that generates a complete Dart model class as a string.
 *
 * @param model   - The model definition from your CMS schema. Contains the class name and all its fields.
 * @param options - Optional settings that can control how the code is generated (reserved for future use).
 * @returns         A string containing valid Dart source code for the model class.
 *
 * Example:
 *   generateFlutterModel({ name: 'Product', fields: { name: 'string', price: 'number' } })
 *   → produces the full Dart class for a Product model
 */
export function generateFlutterModel(model: ModelDefinition, options?: GenerateOptions) {
  // The name of the Dart class — taken directly from the model name in your CMS schema
  const className = model.name

  // The collection of fields this model has (e.g. { title: 'string', price: 'number' })
  const fields = model.fields

  // Informational log so developers can see which model is being generated in the console
  console.log(`🚀 Generating Flutter model for ${className}`)

  // We'll build up the Dart code as one big string, starting with the class declaration
  let dartCode = `class ${className} {\n`

  // ─────────────────────────────────────────────
  // SECTION 1: Class Fields
  // ─────────────────────────────────────────────
  // For each field in the model, we declare a Dart property.
  // Example output:  final String name;
  //                  final double? price;  (the ? means it can be null/optional)
  for (const [fieldName, fieldDef] of Object.entries(fields)) {
    // Check if this field is marked as optional in the schema
    const isOptional = isFieldObject(fieldDef) ? !!fieldDef.optional : false

    // Convert the CMS field type (e.g. 'string') to the equivalent Dart type (e.g. 'String')
    const dartType = getDartType(fieldDef)

    // Add the field declaration — optional fields get a '?' after the type
    dartCode += `  final ${dartType}${isOptional ? '?' : ''} ${fieldName};\n`
  }

  // ─────────────────────────────────────────────
  // SECTION 2: Constructor
  // ─────────────────────────────────────────────
  // The constructor defines how to create a new instance of this class.
  // Required fields use 'required this.fieldName', optional fields just use 'this.fieldName'.
  // Example output:
  //   Product({ required this.name, this.price });
  dartCode += `\n  ${className}({\n`
  for (const [fieldName, fieldDef] of Object.entries(fields)) {
    const isOptional = isFieldObject(fieldDef) ? !!fieldDef.optional : false
    dartCode += isOptional
      ? `    this.${fieldName},\n`          // Optional — no 'required' keyword
      : `    required this.${fieldName},\n` // Required — must be provided when creating the object
  }
  dartCode += `  });\n`

  // ─────────────────────────────────────────────
  // SECTION 3: copyWith Method
  // ─────────────────────────────────────────────
  // copyWith() lets you create a new copy of the object with only some fields changed.
  // This is a common Flutter pattern used with state management (e.g. with BLoC or Provider).
  // Example usage in Flutter:  product.copyWith(price: 19.99)
  // All parameters are nullable here so you only pass in the fields you want to change.
  dartCode += `\n  ${className} copyWith({\n`
  for (const [fieldName, fieldDef] of Object.entries(fields)) {
    const dartType = getDartType(fieldDef)
    // All params are optional (marked with ?) so you only pass what you want to change
    dartCode += `    ${dartType}? ${fieldName},\n`
  }
  dartCode += `  }) {\n    return ${className}(\n`
  for (const fieldName of Object.keys(fields)) {
    // If a new value was passed in, use it — otherwise keep the existing value (using ??)
    dartCode += `      ${fieldName}: ${fieldName} ?? this.${fieldName},\n`
  }
  dartCode += `    );\n  }\n`

  // ─────────────────────────────────────────────
  // SECTION 4: fromJson Factory Constructor
  // ─────────────────────────────────────────────
  // fromJson() is a special constructor (called a "factory") that creates a model instance
  // from a JSON map — typically the raw data returned by an API or database.
  // Example usage:  Product.fromJson({ 'name': 'Shoes', 'price': 49.99 })
  dartCode += `\n  factory ${className}.fromJson(Map<String, dynamic> json) {\n`
  dartCode += `    return ${className}(\n`
  for (const [fieldName, fieldDef] of Object.entries(fields)) {
    const isOptional = isFieldObject(fieldDef) ? !!fieldDef.optional : false
    const dartType = getDartType(fieldDef)

    if (dartType === 'double') {
      // Numbers need special handling — JSON can return them as int, double, or even string.
      // We convert whatever comes in to a double using double.parse().
      // If the value is missing: return null for optional fields, or 0.0 for required fields.
      dartCode += `      ${fieldName}: json['${fieldName}'] != null ? double.parse(json['${fieldName}'].toString()) : ${isOptional ? 'null' : '0.0'},\n`

    } else if (isFieldObject(fieldDef) && fieldDef.type === 'model' && typeof fieldDef.of === 'string') {
      // This field is a nested model (e.g. a Product that contains an Address model).
      // We recursively call fromJson() on the nested object.
      // If the value is missing and the field is required, we throw a clear error.
      dartCode += `      ${fieldName}: json['${fieldName}'] != null ? ${fieldDef.of}.fromJson(json['${fieldName}']) : ${isOptional ? 'null' : `throw Exception('Missing required field: ${fieldName}')`},\n`

    } else if (isFieldObject(fieldDef) && fieldDef.type === 'List' && typeof fieldDef.of === 'string') {
      // This field is a List of a specific type (e.g. List<String> or List<Tag>).
      // We use List.from() to convert the raw JSON array to a typed Dart list.
      // If the value is missing: return null for optional, or an empty list [] for required.
      dartCode += `      ${fieldName}: json['${fieldName}'] != null ? List<${fieldDef.of}>.from(json['${fieldName}']) : ${isOptional ? 'null' : '[]'},\n`

    } else if (dartType === 'String' || dartType === 'bool' || dartType === 'GeoPoint' || dartType === 'Map<String, dynamic>') {
      // For simple known types, we cast the JSON value directly to the expected Dart type.
      // The '?' at the end of the type cast is added for optional fields.
      dartCode += `      ${fieldName}: json['${fieldName}'] as ${dartType}${isOptional ? '?' : ''},\n`

    } else {
      // For any other types (e.g. 'dynamic'), we just assign the raw JSON value directly.
      dartCode += `      ${fieldName}: json['${fieldName}'],\n`
    }
  }
  dartCode += `    );\n  }\n`

  // ─────────────────────────────────────────────
  // SECTION 5: toJson Method
  // ─────────────────────────────────────────────
  // toJson() converts the model instance back into a plain JSON map.
  // This is used when saving data to a database or sending it to an API.
  // Example usage:  product.toJson() → { 'name': 'Shoes', 'price': 49.99 }
  dartCode += `\n  Map<String, dynamic> toJson() {\n`
  dartCode += `    return {\n`
  for (const [fieldName, fieldDef] of Object.entries(fields)) {
    if (isFieldObject(fieldDef) && fieldDef.type === 'model') {
      // Nested model fields need to be converted to JSON too — we call .toJson() on them.
      // The '?' handles the case where the nested model field is optional (could be null).
      dartCode += `      '${fieldName}': ${fieldName}${fieldDef.optional ? '?' : ''}.toJson(),\n`

    } else if (isFieldObject(fieldDef) && fieldDef.type === 'List' && typeof fieldDef.of === 'string') {
      // For List fields, we map over each item.
      // Currently items are passed through as-is — this works for primitive types.
      // For lists of nested models, you'd extend this to call item.toJson() instead.
      dartCode += `      '${fieldName}': ${fieldName}${fieldDef.optional ? '?' : ''}.map((item) => item).toList(),\n`

    } else {
      // For all other field types, we just include the value directly in the map.
      dartCode += `      '${fieldName}': ${fieldName},\n`
    }
  }
  dartCode += `    };\n  }\n`

  // Close the Dart class
  dartCode += `}\n`

  // NOTE: We intentionally do NOT log the generated dartCode here.
  // Printing the full generated source code to the console could expose your
  // schema structure in production logs. Return the value instead.
  return dartCode
}

// ─────────────────────────────────────────────────────────────────
// HELPER FUNCTIONS
// ─────────────────────────────────────────────────────────────────

/**
 * getDartType
 * -----------
 * Converts a CMS field definition into the correct Dart type as a string.
 *
 * This handles two cases:
 *  1. Simple shorthand fields — where the field is just a type string like 'string' or 'number'
 *  2. Complex field objects  — where the field has extra config like { type: 'List', of: 'Tag' }
 *
 * @param field - A FieldDefinition, either a plain type string or a full field config object.
 * @returns       The equivalent Dart type as a string (e.g. 'String', 'double', 'List<Tag>').
 *
 * Examples:
 *   getDartType('string')                          → 'String'
 *   getDartType({ type: 'number' })                → 'double'
 *   getDartType({ type: 'List', of: 'Tag' })       → 'List<Tag>'
 *   getDartType({ type: 'model', of: 'Address' })  → 'Address'
 */
function getDartType(field: FieldDefinition): string {
  // If the field is not a full config object, it's a plain type string — use the simple mapper
  if (!isFieldObject(field)) {
    return mapToDartType(field)
  }

  // For full field config objects, we check the 'type' property and return the correct Dart type
  switch (field.type) {
    case 'string':
    case 'image':      // Images are stored as URL strings in Dart
    case 'datetime':   // Dates are stored as ISO string format
    case 'timestamp':  // Timestamps are also stored as strings
      return 'String'

    case 'number':
      // All numbers are represented as Dart 'double' (supports decimals)
      return 'double'

    case 'boolean':
      return 'bool'

    case 'geopoint':
      // GeoPoint is a special type used for geographic coordinates (lat/lng)
      return 'GeoPoint'

    case 'model':
      // A nested model uses the model's own class name as the type
      // e.g. { type: 'model', of: 'Address' } → 'Address'
      if (typeof field.of === 'string') {
        return field.of
      }
      return 'dynamic' // Fallback if the nested model name is not specified

    case 'List':
      // A typed list, e.g. { type: 'List', of: 'String' } → 'List<String>'
      if (typeof field.of === 'string') {
        return `List<${field.of}>`
      }
      return 'List<dynamic>' // Fallback if the list item type is not specified

    case 'Object':
      // A free-form JSON object — represented as a Map in Dart
      return 'Map<String, dynamic>'

    default:
      // Unknown or unsupported type — fall back to dynamic (Dart's equivalent of 'any')
      return 'dynamic'
  }
}

/**
 * mapToDartType
 * -------------
 * A simpler version of getDartType — used when a field is defined as just a plain type string
 * (the shorthand form), rather than a full field config object.
 *
 * @param type - A plain type string such as 'string', 'number', 'boolean', etc.
 * @returns      The equivalent Dart type as a string.
 *
 * Examples:
 *   mapToDartType('string')   → 'String'
 *   mapToDartType('number')   → 'double'
 *   mapToDartType('boolean')  → 'bool'
 *   mapToDartType('unknown')  → 'dynamic'
 */
function mapToDartType(type: string): string {
  switch (type) {
    case 'string':
    case 'image':      // Images are stored as URL strings
    case 'datetime':   // Dates stored as ISO 8601 string format
    case 'timestamp':  // Timestamps also stored as strings
      return 'String'

    case 'number':
      return 'double'

    case 'boolean':
      return 'bool'

    case 'geopoint':
      return 'GeoPoint'

    default:
      // Any type we don't recognise falls back to Dart's 'dynamic' type
      return 'dynamic'
  }
}