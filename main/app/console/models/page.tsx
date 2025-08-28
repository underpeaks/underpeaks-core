'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { FiEdit2, FiTrash2 } from 'react-icons/fi';
import { getAllModels, deleteModel } from '../../../nxf-ui/lib/supabase/model';
import {ConfirmDialog }from '../../components_cus/confirmDialog';

interface Field {
  name: string;
  type: string;
  required?: boolean;
}

interface Model {
  id: string;
  name: string;
  project_id:string;
  fields: Field[];
}

export default function ModelsListPage() {
  const [models, setModels] = useState<Model[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [modelToDelete, setModelToDelete] = useState<Model | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadModels();
  }, []);

  async function loadModels() {
    setLoading(true);
    try {
      const data = await getAllModels();

      const transformed = data?.map((model: any) => ({
        ...model,
        project_id: model.project_id,
        fields: Object.entries(model.schema || {}).map(([name, value]) => {
          if (
            typeof value === 'object' &&
            value !== null &&
            'type' in value
          ) {
            return {
              name,

              type: (value as { type: string }).type,
              required: (value as { required?: boolean }).required === true,
            };
          }
          return {
            name,
            type: typeof value === 'string' ? value : 'unknown',
            required: false,
          };
        }),
      })) || [];

      setModels(transformed);
    } catch (err) {
      console.error('Failed to fetch models:', err);
      setModels([]);
    } finally {
      setLoading(false);
    }
  }

  const onDeleteClick = (model: Model) => {
    setModelToDelete(model);
    setConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
  if (!modelToDelete) return;
  setDeleting(true);
  try {
    await deleteModel(modelToDelete.id, modelToDelete.project_id); // pass both id and project_id
    setModels((prev) => prev.filter((m) => m.id !== modelToDelete.id));
    setConfirmOpen(false);
    setModelToDelete(null);
  } catch (err) {
    console.error('Failed to delete model:', err);
    // Optionally show error to user here
  } finally {
    setDeleting(false);
  }
};


  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Models</h1>
        <Link
          href="/console/models/create"
          className="bg-black text-white px-4 py-2 rounded hover:bg-gray-800 transition"
        >
          Create Model
        </Link>
      </div>

      {loading ? (
        <p className="text-center text-gray-500">Loading models...</p>
      ) : models.length === 0 ? (
        <div className="text-center text-gray-500 col-span-full">
          You have not created any models yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {models.map((model) => (
            <div
              key={model.id}
              className="border border-gray-300 rounded shadow-sm bg-white flex flex-col max-w-sm"
            >
              {/* Header: model name + edit + delete */}
              <div className="flex justify-between items-center px-3 py-2 border-b border-gray-300">
                <h2 className="text-lg font-semibold truncate">{model.name}</h2>
                <div className="flex gap-3 items-center">
                  <Link href={`/console/models/${model.id}`} aria-label={`Edit ${model.name}`}>
                    <FiEdit2 className="text-gray-600 hover:text-blue-600 cursor-pointer" size={18} />
                  </Link>
                  <FiTrash2
                    className="text-gray-600 hover:text-red-600 cursor-pointer"
                    size={18}
                    aria-label={`Delete ${model.name}`}
                    onClick={() => onDeleteClick(model)}
                  />
                </div>
              </div>

              {/* Table inside card */}
              <div className="p-3 overflow-auto">
                <table className="w-full border-collapse border border-gray-300 text-xs">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border border-gray-300 px-2 py-1 text-left min-w-[80px]">Field</th>
                      <th className="border border-gray-300 px-2 py-1 text-left min-w-[70px]">Type</th>
                      <th className="border border-gray-300 px-2 py-1 text-center w-12">Req</th>
                    </tr>
                  </thead>
                  <tbody>
                    {model.fields.map((field, idx) => (
                      <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="border border-gray-300 px-2 py-1 truncate max-w-[120px]">{field.name}</td>
                        <td className="border border-gray-300 px-2 py-1 truncate max-w-[90px]">{field.type}</td>
                        <td className="border border-gray-300 px-2 py-1 text-center">
                          {field.required ? '✔️' : ''}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Confirm Dialog */}
     <ConfirmDialog
  open={confirmOpen}
  onOpenChange={setConfirmOpen}
  title="Delete Model?"
  description={`Are you sure you want to delete the model "${modelToDelete?.name}"? This action cannot be undone.`}
  confirmText="Delete"
  cancelText="Cancel"
  onConfirm={handleConfirmDelete}
  onCancel={() => setConfirmOpen(false)}
/>

    </div>
  );
}
