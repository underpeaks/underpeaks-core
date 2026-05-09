interface Field {
  name: string;
  type: string;
}

interface SchemaPreviewProps {
  fields: Field[];
}

export function SchemaPreview({ fields }: SchemaPreviewProps) {
  return (
    <div className="border rounded-md p-4 bg-gray-50">
      <h3 className="text-lg font-semibold mb-2">Schema Preview</h3>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left border-b">
            <th className="py-1">Field</th>
            <th className="py-1">Type</th>
          </tr>
        </thead>
        <tbody>
          {fields.map((field) => (
            <tr key={field.name} className="border-b last:border-none">
              <td className="py-1">{field.name}</td>
              <td className="py-1 text-gray-600">{field.type}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
