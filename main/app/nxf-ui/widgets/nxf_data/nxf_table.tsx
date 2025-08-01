import React from 'react';

interface Column {
  label: string;
  key: string;
}

interface NxfTableProps {
  columns: Column[];
  data: Record<string, any>[];
}

export const NxfTable: React.FC<NxfTableProps> = ({ columns, data }) => (
  <table className="w-full table-auto border-collapse border border-gray-300">
    <thead>
      <tr>
        {columns.map((col) => (
          <th key={col.key} className="border px-4 py-2 text-left bg-gray-100">
            {col.label}
          </th>
        ))}
      </tr>
    </thead>
    <tbody>
      {data.map((row, i) => (
        <tr key={i} className="hover:bg-gray-50">
          {columns.map((col) => (
            <td key={col.key} className="border px-4 py-2">
              {row[col.key]}
            </td>
          ))}
        </tr>
      ))}
    </tbody>
  </table>
);
