import {
  ModelDefinition,
  FieldDefinition,
  isFieldObject,
  isListField,
  isModelField,
  GenerateOptions,
} from '../../types/model'

export async function generateNextModel(model: ModelDefinition, options?: GenerateOptions) {
  const interfaceName = model.name
  const fields = model.fields

  console.log(`🧩 Generating Next.js TS model for ${interfaceName}`)

  // Generate interface
  let tsCode = `export interface ${interfaceName} {\n`

  for (const [fieldName, fieldDef] of Object.entries(fields)) {
    const optionalMark = isFieldObject(fieldDef) && fieldDef.optional ? '?' : ''
    const tsType = getTypeScriptType(fieldDef, interfaceName, fieldName)
    tsCode += `  ${fieldName}${optionalMark}: ${tsType};\n`
  }

  tsCode += `}\n\n`

  // Generate nested object interfaces & models
  for (const [fieldName, fieldDef] of Object.entries(fields)) {
    if (isFieldObject(fieldDef) && fieldDef.type === 'Object') {
      const nestedInterfaceName = `${interfaceName}_${capitalize(fieldName)}`
      tsCode += generateNestedObjectInterfaceAndClass(nestedInterfaceName, fieldDef.fields)
    }
  }

  // Generate main class
  tsCode += `export class ${interfaceName}Model implements ${interfaceName} {\n`

  for (const [fieldName, fieldDef] of Object.entries(fields)) {
    const tsType = getTypeScriptClassType(fieldDef, interfaceName, fieldName)
    tsCode += `  readonly ${fieldName}: ${tsType};\n`
  }

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

  // copyWith
  tsCode += `  copyWith(update: Partial<${interfaceName}>): ${interfaceName}Model {\n`
  tsCode += `    return new ${interfaceName}Model({\n`
  for (const fieldName of Object.keys(fields)) {
    tsCode += `      ${fieldName}: update.${fieldName} !== undefined ? update.${fieldName} : this.${fieldName},\n`
  }
  tsCode += `    });\n  }\n\n`

  // fromJSON
  tsCode += `  static fromJSON(json: any): ${interfaceName}Model {\n`
  tsCode += `    if (!json) throw new Error('Invalid JSON object for ${interfaceName}Model')\n`
  tsCode += `    return new ${interfaceName}Model({\n`
  for (const [fieldName, fieldDef] of Object.entries(fields)) {
    if (isModelField(fieldDef)) {
      tsCode += `      ${fieldName}: json.${fieldName} ? ${fieldDef.of}Model.fromJSON(json.${fieldName}) : (() => { throw new Error('Missing required field ${fieldName}') })(),\n`
    } else if (isListField(fieldDef)) {
      if (typeof fieldDef.of === 'string' && isPrimitiveType(fieldDef.of)) {
        tsCode += `      ${fieldName}: Array.isArray(json.${fieldName}) ? json.${fieldName} : [],\n`
      } else {
        tsCode += `      ${fieldName}: Array.isArray(json.${fieldName}) ? json.${fieldName}.map((item: any) => ${fieldDef.of}Model.fromJSON(item)) : [],\n`
      }
    } else if (isFieldObject(fieldDef) && fieldDef.type === 'Object') {
      const nestedName = `${interfaceName}_${capitalize(fieldName)}Model`
      tsCode += `      ${fieldName}: json.${fieldName} ? ${nestedName}.fromJSON(json.${fieldName}) : (() => { throw new Error('Missing required field ${fieldName}') })(),\n`
    } else {
      tsCode += `      ${fieldName}: json.${fieldName},\n`
    }
  }
  tsCode += `    });\n  }\n\n`

  // toJSON
  tsCode += `  toJSON(): any {\n`
  tsCode += `    return {\n`
  for (const [fieldName, fieldDef] of Object.entries(fields)) {
    if (isModelField(fieldDef)) {
      tsCode += `      ${fieldName}: this.${fieldName} ? this.${fieldName}.toJSON() : null,\n`
    } else if (isListField(fieldDef)) {
      if (typeof fieldDef.of === 'string' && isPrimitiveType(fieldDef.of)) {
        tsCode += `      ${fieldName}: this.${fieldName},\n`
      } else {
        tsCode += `      ${fieldName}: this.${fieldName}.map(item => item.toJSON()),\n`
      }
    } else if (isFieldObject(fieldDef) && fieldDef.type === 'Object') {
      tsCode += `      ${fieldName}: this.${fieldName} ? this.${fieldName}.toJSON() : null,\n`
    } else {
      tsCode += `      ${fieldName}: this.${fieldName},\n`
    }
  }
  tsCode += `    };\n  }\n`

  tsCode += `}\n`

  if (options?.mocks) {
    tsCode += `\n// MOCK DATA GENERATION PLACEHOLDER\n`
  }

  console.log(tsCode)
}
function mapPrimitiveType(type: string): string {
  switch (type) {
    case 'string':
    case 'image':
    case 'datetime':
    case 'timestamp':
      return 'string'
    case 'number':
      return 'number'
    case 'boolean':
      return 'boolean'
    case 'geopoint':
      return '{ lat: number; lng: number }'
    default:
      return 'any'
  }
}
function generateNestedObjectInterfaceAndClass(
  interfaceName: string,
  fields: Record<string, FieldDefinition>
): string {
  let code = `export interface ${interfaceName} {\n`
  for (const [fieldName, fieldDef] of Object.entries(fields)) {
    const optionalMark = isFieldObject(fieldDef) && fieldDef.optional ? '?' : ''
    const tsType = getTypeScriptType(fieldDef, interfaceName, fieldName)
    code += `  ${fieldName}${optionalMark}: ${tsType};\n`
  }
  code += `}\n\n`

  code += `export class ${interfaceName}Model implements ${interfaceName} {\n`
  for (const [fieldName, fieldDef] of Object.entries(fields)) {
    const tsType = getTypeScriptClassType(fieldDef, interfaceName, fieldName)
    code += `  readonly ${fieldName}: ${tsType};\n`
  }

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

  code += `  copyWith(update: Partial<${interfaceName}>): ${interfaceName}Model {\n`
  code += `    return new ${interfaceName}Model({\n`
  for (const fieldName of Object.keys(fields)) {
    code += `      ${fieldName}: update.${fieldName} !== undefined ? update.${fieldName} : this.${fieldName},\n`
  }
  code += `    });\n  }\n\n`

  code += `  static fromJSON(json: any): ${interfaceName}Model {\n`
  code += `    if (!json) throw new Error('Invalid JSON object for ${interfaceName}Model')\n`
  code += `    return new ${interfaceName}Model({\n`
  for (const [fieldName, fieldDef] of Object.entries(fields)) {
    if (isModelField(fieldDef)) {
      code += `      ${fieldName}: json.${fieldName} ? ${fieldDef.of}Model.fromJSON(json.${fieldName}) : (() => { throw new Error('Missing required field ${fieldName}') })(),\n`
    } else if (isListField(fieldDef)) {
      if (typeof fieldDef.of === 'string' && isPrimitiveType(fieldDef.of)) {
        code += `      ${fieldName}: Array.isArray(json.${fieldName}) ? json.${fieldName} : [],\n`
      } else {
        code += `      ${fieldName}: Array.isArray(json.${fieldName}) ? json.${fieldName}.map((item: any) => ${fieldDef.of}Model.fromJSON(item)) : [],\n`
      }
    } else if (isFieldObject(fieldDef) && fieldDef.type === 'Object') {
      const nestedInterfaceName = `${interfaceName}_${capitalize(fieldName)}Model`
      code += `      ${fieldName}: json.${fieldName} ? ${nestedInterfaceName}.fromJSON(json.${fieldName}) : (() => { throw new Error('Missing required field ${fieldName}') })(),\n`
    } else {
      code += `      ${fieldName}: json.${fieldName},\n`
    }
  }
  code += `    });\n  }\n\n`

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


function getTypeScriptType(field: FieldDefinition, parentModel: string, fieldName: string): string {
  if (!isFieldObject(field)) return mapPrimitiveType(field)

  switch (field.type) {
    case 'model':
      return `${field.of}Model`
    case 'List':
      return typeof field.of === 'string' && isPrimitiveType(field.of)
        ? `${mapPrimitiveType(field.of)}[]`
        : `${field.of}Model[]`
    case 'Object':
      return `{ ${Object.entries(field.fields)
        .map(([key, val]) => {
          const optional = isFieldObject(val) && val.optional ? '?' : ''
          return `${key}${optional}: ${getTypeScriptType(val, parentModel, key)}`
        })
        .join('; ')} }`
    default:
      return mapPrimitiveType(field.type)
  }
}

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
      return `${parentModel}_${capitalize(fieldName)}Model`
    default:
      return mapPrimitiveType(field.type)
  }
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

function isPrimitiveType(type: string): boolean {
  return ['string', 'number', 'boolean', 'image', 'datetime', 'timestamp', 'geopoint'].includes(type)
}
