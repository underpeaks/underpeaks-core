import { useTranslations } from 'next-intl'

/**
 * @file SchemaPreview.tsx
 * @description
 * A reusable UI component that displays a preview of a database schema
 * as a simple two-column table showing field names and their data types.
 *
 * When is this used?
 * -------------------
 * This component is typically shown during project setup or configuration
 * screens where the user has defined (or is about to define) the fields
 * of a database collection or table. It gives the user a visual summary
 * of the schema they have built before saving or applying it.
 *
 * Example of what it renders:
 * ----------------------------
 *   Schema Preview
 *   ┌───────────┬──────────┐
 *   │ Field     │ Type     │
 *   ├───────────┼──────────┤
 *   │ id        │ uuid     │
 *   │ full_name │ text     │
 *   │ email     │ text     │
 *   │ createdAt │ datetime │
 *   └───────────┴──────────┘
 */

/**
 * @interface Field
 * @description
 * Represents a single field (column) in the schema being previewed.
 *
 * @property {string} name - The field's name as it will appear in the database (e.g. "email", "createdAt").
 * @property {string} type - The field's data type as a string (e.g. "text", "uuid", "boolean").
 */
interface Field {
  name: string
  type: string
}

/**
 * @interface SchemaPreviewProps
 * @description
 * The props accepted by the SchemaPreview component.
 *
 * @property {Field[]} fields
 *   An array of field objects to display in the preview table.
 *   Each object must have a `name` and a `type`.
 *   If the array is empty, an empty table body is rendered.
 */
interface SchemaPreviewProps {
  fields: Field[]
}

/**
 * @component SchemaPreview
 * @description
 * Renders a read-only preview table of a database schema.
 * Each row in the table represents one field with its name and data type.
 *
 * This is a pure presentational component — it receives data via props
 * and renders it. It does not manage any state or make any API calls.
 *
 * @param {SchemaPreviewProps} props
 * @param {Field[]} props.fields - The list of schema fields to display.
 *
 * @returns {JSX.Element} A styled table showing field names and types.
 *
 * @example
 * ```tsx
 * const fields = [
 *   { name: 'id', type: 'uuid' },
 *   { name: 'email', type: 'text' },
 *   { name: 'createdAt', type: 'datetime' },
 * ]
 *
 * <SchemaPreview fields={fields} />
 * ```
 */
export function SchemaPreview({ fields }: SchemaPreviewProps) {
  /**
   * t() is the translation function from next-intl.
   * All keys for this component live under the "schemaPreview" namespace in en.json.
   */
  const t = useTranslations('schemaPreview')

  return (
    <div className="border rounded-md p-4 bg-gray-50">

      {/* Section heading */}
      <h3 className="text-lg font-semibold mb-2">
        {t('title')}
      </h3>

      <table className="w-full text-sm">
        <thead>
          <tr className="text-left border-b">
            {/* Column header: field name */}
            <th className="py-1">{t('columns.field')}</th>
            {/* Column header: field data type */}
            <th className="py-1">{t('columns.type')}</th>
          </tr>
        </thead>
        <tbody>
          {/*
           * Render one row per field in the schema.
           * We use field.name as the key because field names must be
           * unique within a schema — this gives React a stable identifier
           * for each row when the list updates.
           */}
          {fields.map((field) => (
            <tr key={field.name} className="border-b last:border-none">
              {/* Field name cell */}
              <td className="py-1">{field.name}</td>
              {/* Field type cell — muted colour to visually distinguish it from the name */}
              <td className="py-1 text-gray-600">{field.type}</td>
            </tr>
          ))}
        </tbody>
      </table>

    </div>
  )
}