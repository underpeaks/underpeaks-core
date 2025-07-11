import { ModelDefinition, FieldDefinition, isFieldObject, GenerateOptions } from '../../types/model'

export function generateFlutterModel(model: ModelDefinition, options?: GenerateOptions) {
  const className = model.name
  const fields = model.fields

  console.log(`🚀 Generating Flutter model for ${className}`)

  let dartCode = `class ${className} {\n`

  // Class fields
  for (const [fieldName, fieldDef] of Object.entries(fields)) {
    const isOptional = isFieldObject(fieldDef) ? !!fieldDef.optional : false
    const dartType = getDartType(fieldDef)
    dartCode += `  final ${dartType}${isOptional ? '?' : ''} ${fieldName};\n`
  }

  // Constructor
  dartCode += `\n  ${className}({\n`
  for (const [fieldName, fieldDef] of Object.entries(fields)) {
    const isOptional = isFieldObject(fieldDef) ? !!fieldDef.optional : false
    dartCode += isOptional
      ? `    this.${fieldName},\n`
      : `    required this.${fieldName},\n`
  }
  dartCode += `  });\n`

  // copyWith
  dartCode += `\n  ${className} copyWith({\n`
  for (const [fieldName, fieldDef] of Object.entries(fields)) {
    const dartType = getDartType(fieldDef)
    dartCode += `    ${dartType}? ${fieldName},\n`
  }
  dartCode += `  }) {\n    return ${className}(\n`
  for (const fieldName of Object.keys(fields)) {
    dartCode += `      ${fieldName}: ${fieldName} ?? this.${fieldName},\n`
  }
  dartCode += `    );\n  }\n`

  // fromJson
  dartCode += `\n  factory ${className}.fromJson(Map<String, dynamic> json) {\n`
  dartCode += `    return ${className}(\n`
  for (const [fieldName, fieldDef] of Object.entries(fields)) {
    const isOptional = isFieldObject(fieldDef) ? !!fieldDef.optional : false
    const dartType = getDartType(fieldDef)

    if (dartType === 'double') {
      dartCode += `      ${fieldName}: json['${fieldName}'] != null ? double.parse(json['${fieldName}'].toString()) : ${isOptional ? 'null' : '0.0'},\n`
    } else if (isFieldObject(fieldDef) && fieldDef.type === 'model' && typeof fieldDef.of === 'string') {
      dartCode += `      ${fieldName}: json['${fieldName}'] != null ? ${fieldDef.of}.fromJson(json['${fieldName}']) : ${isOptional ? 'null' : `throw Exception('Missing required field ${fieldName}')`},\n`
    } else if (isFieldObject(fieldDef) && fieldDef.type === 'List' && typeof fieldDef.of === 'string') {
      // <-- FIX: cast fieldDef.of to string and make sure we do NOT pass undefined to List<>
      dartCode += `      ${fieldName}: json['${fieldName}'] != null ? List<${fieldDef.of}>.from(json['${fieldName}']) : ${isOptional ? 'null' : '[]'},\n`
    } else if (dartType === 'String' || dartType === 'bool' || dartType === 'GeoPoint' || dartType === 'Map<String, dynamic>') {
      dartCode += `      ${fieldName}: json['${fieldName}'] as ${dartType}${isOptional ? '?' : ''},\n`
    } else {
      dartCode += `      ${fieldName}: json['${fieldName}'],\n`
    }
  }
  dartCode += `    );\n  }\n`

  // toJson
  dartCode += `\n  Map<String, dynamic> toJson() {\n`
  dartCode += `    return {\n`
  for (const [fieldName, fieldDef] of Object.entries(fields)) {
    if (isFieldObject(fieldDef) && fieldDef.type === 'model') {
      dartCode += `      '${fieldName}': ${fieldName}${fieldDef.optional ? '?' : ''}.toJson(),\n`
    } else if (isFieldObject(fieldDef) && fieldDef.type === 'List' && typeof fieldDef.of === 'string') {
      dartCode += `      '${fieldName}': ${fieldName}${fieldDef.optional ? '?' : ''}.map((item) => item).toList(),\n`
    } else {
      dartCode += `      '${fieldName}': ${fieldName},\n`
    }
  }
  dartCode += `    };\n  }\n`

  dartCode += `}\n`

  console.log(dartCode)
}

// Utility to map types to Dart
function getDartType(field: FieldDefinition): string {
  if (!isFieldObject(field)) {
    return mapToDartType(field)
  }

  switch (field.type) {
    case 'string':
    case 'image':
    case 'datetime':
    case 'timestamp':
      return 'String'

    case 'number':
      return 'double'

    case 'boolean':
      return 'bool'

    case 'geopoint':
      return 'GeoPoint'

    case 'model':
      if (typeof field.of === 'string') {
        return field.of
      }
      return 'dynamic'

    case 'List':
      if (typeof field.of === 'string') {
        return `List<${field.of}>`
      }
      return 'List<dynamic>'

    case 'Object':
      return 'Map<String, dynamic>'

    default:
      return 'dynamic'
  }
}

function mapToDartType(type: string): string {
  switch (type) {
    case 'string':
    case 'image':
    case 'datetime':
    case 'timestamp':
      return 'String'
    case 'number':
      return 'double'
    case 'boolean':
      return 'bool'
    case 'geopoint':
      return 'GeoPoint'
    default:
      return 'dynamic'
  }
}
