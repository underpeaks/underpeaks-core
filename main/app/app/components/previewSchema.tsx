'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { SchemaPreview } from './actions/schemaPreview'; // Assuming you created this

interface Field {
  name: string;
  type: string;
  elementType?: string;
  meta?: { required?: boolean };
}

interface PreviewSchemaProps {
  model: {
    name: string;
    fields: Field[];
    // add any other props you need here
  };
  onSave: () => void; // to handle save button
  onFieldChange: (
    index: number,
    key: keyof Field | 'required',
    value: string | boolean
  ) => void;
  onAddField: () => void;
  onRemoveField: (index: number) => void;
}

export default function PreviewSchema({
  model,
  onSave,
  onFieldChange,
  onAddField,
  onRemoveField,
}: PreviewSchemaProps) {
  const [showPreview, setShowPreview] = useState(false);

  return (
    <div className="flex w-full gap-4 transition-all">
      {/* Left Side - Fields Editor */}
      <div className={`transition-all duration-300 ${showPreview ? 'w-1/2' : 'w-full'}`}>
        <h2 className="text-xl font-semibold mb-4">Fields</h2>

        {model.fields.map((field, index) => (
          <div
            key={index}
            className="flex items-center gap-4 mb-4 flex-wrap border border-gray-300 rounded p-3"
          >
            <input
              type="text"
              value={field.name}
              onChange={(e) => onFieldChange(index, 'name', e.target.value)}
              placeholder="Field name"
              className="flex-1 min-w-[150px] border px-2 py-1 rounded"
            />

            <select
              value={field.type}
              onChange={(e) => onFieldChange(index, 'type', e.target.value)}
              className="border px-3 py-1 rounded min-w-[120px]"
            >
              {/* Adjust these options to your field types */}
              <option value="string">string</option>
              <option value="num">num</option>
              <option value="boolean">boolean</option>
              <option value="datetime">datetime</option>
              <option value="array">array</option>
              <option value="map">map</option>
              <option value="null">null</option>
            </select>

            {(field.type === 'array' || field.type === 'map') && (
              <select
                value={field.elementType || 'string'}
                onChange={(e) => onFieldChange(index, 'elementType', e.target.value)}
                className="border px-3 py-1 rounded min-w-[140px]"
              >
                {/* Add your combined element types here */}
                <option value="string">string</option>
                <option value="num">num</option>
                {/* add more options as needed */}
              </select>
            )}

            <label className="flex items-center gap-1 whitespace-nowrap">
              <input
                type="checkbox"
                checked={!!field.meta?.required}
                onChange={(e) => onFieldChange(index, 'required', e.target.checked)}
                className="custom-checkbox"
              />
              Required
            </label>

            <button
              type="button"
              onClick={() => onRemoveField(index)}
              className="text-red-500 hover:underline"
            >
              Remove
            </button>
          </div>
        ))}

        <div className="flex justify-between mt-4">
          <Button onClick={onSave}>Save</Button>
          <Button variant="outline" onClick={() => setShowPreview((prev) => !prev)}>
            {showPreview ? 'Hide Preview' : 'Preview'}
          </Button>
        </div>

        <div className="mt-4">
          <Button variant="secondary" onClick={onAddField}>
            Add Field
          </Button>
        </div>
      </div>

      {/* Right Side - Schema Preview */}
      {showPreview && (
        <div className="w-1/2 border rounded-lg p-4 bg-muted">
          <SchemaPreview fields={model.fields} />
        </div>
      )}
    </div>
  );
}
