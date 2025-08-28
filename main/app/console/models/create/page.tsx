'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import {
  NxfTextField,
  NxfElevatedButton,
  NxfSnackbar,
  NxfForm,
} from '../../../../nxf-ui/widgets';
import { createModel, getAllModels } from '../../../../nxf-ui/lib/supabase/model';
import { getProjectIdForUser } from '../../../../nxf-ui/lib/supabase/utils';
import { FiSave } from 'react-icons/fi';
import { v4 as uuidv4 } from 'uuid';
import { useUser } from '@supabase/auth-helpers-react';

import {ConfirmDialog }from '../../../components_cus/confirmDialog'
const baseFieldTypes = [
  'string',
  'num',
  'boolean',
  'datetime',
  'array',
  'map',
  'null',
];

const primitiveTypes = ['string', 'num', 'boolean', 'datetime'];

interface FieldMeta {
  required?: boolean;
}

interface Field {
  name: string;
  type: string;
  elementType?: string;
  meta?: FieldMeta;
}

export default function CreateModelPage() {
  const router = useRouter();
  const user = useUser();

  const [modelName, setModelName] = useState('');
  const [fields, setFields] = useState<Field[]>([
    { name: '', type: 'string', meta: { required: false } },
  ]);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [showSnackbar, setShowSnackbar] = useState(false);
  const [existingModels, setExistingModels] = useState<string[]>([]);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [loadingProject, setLoadingProject] = useState(true);

  // Confirm dialog states
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [fieldToDeleteIndex, setFieldToDeleteIndex] = useState<number | null>(null);

  const combinedElementTypes = [...primitiveTypes, ...existingModels];

  useEffect(() => {
    async function fetchModels() {
      try {
        const models = await getAllModels();
        const modelNames = models?.map((m: any) => m.name) || [];
        setExistingModels(modelNames);
      } catch (error) {
        console.error('Failed to fetch models:', error);
      }
    }
    fetchModels();
  }, []);

  useEffect(() => {
    async function fetchProjectId() {
      try {
        setLoadingProject(true);

        if (!user) {
          setSnackbarMessage('You must be logged in to create a model.');
          setShowSnackbar(true);
          setProjectId(null);
          return;
        }

        const projId = await getProjectIdForUser(user.id);

        if (!projId) {
          setSnackbarMessage('No project found for your account. Create a project first.');
          setShowSnackbar(true);
          setProjectId(null);
          return;
        }

        setProjectId(projId);
      } catch (err) {
        console.error('Unexpected error fetching project:', err);
        setSnackbarMessage('Failed to load project info.' + err);
        setShowSnackbar(true);
        setProjectId(null);
      } finally {
        setLoadingProject(false);
      }
    }

    if (user) {
      fetchProjectId();
    } else {
      setLoadingProject(false);
    }
  }, [user]);

  const handleFieldChange = (
    index: number,
    key: keyof Field | keyof FieldMeta,
    value: string | boolean
  ) => {
    const updatedFields = [...fields];

    if (key === 'required') {
      updatedFields[index].meta = {
        ...updatedFields[index].meta,
        [key]: value === true,
      };
    } else {
      updatedFields[index][key as keyof Field] = value as any;
    }

    if (key === 'type' && value !== 'array' && value !== 'map') {
      delete updatedFields[index].elementType;
    }

    setFields(updatedFields);
  };

  const handleAddField = () => {
    setFields([...fields, { name: '', type: 'string', meta: { required: false } }]);
  };

  // Instead of removing field directly, open confirm dialog
  const requestFieldDelete = (index: number) => {
    setFieldToDeleteIndex(index);
    setShowConfirmDialog(true);
  };

  const confirmDeleteField = () => {
    if (fieldToDeleteIndex === null) return;
    const updatedFields = [...fields];
    updatedFields.splice(fieldToDeleteIndex, 1);
    setFields(updatedFields);
    setFieldToDeleteIndex(null);
    setShowConfirmDialog(false);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!modelName.trim()) {
      setSnackbarMessage('Model name is required.');
      setShowSnackbar(true);
      return;
    }

    if (
    existingModels.some(
      (existing) => existing.toLowerCase() === modelName.trim().toLowerCase()
    )
  ) {
    setSnackbarMessage(`A model named "${modelName.trim()}" already exists. Choose a different name.`);
    setShowSnackbar(true);
    return;
  }

    const isValid = fields.every(
      (field) => field.name.trim() && field.type.trim()
    );
    if (!isValid) {
      setSnackbarMessage('All fields must have a name and type.');
      setShowSnackbar(true);
      return;
    }

    if (!projectId) {
      setSnackbarMessage('No project ID found. Cannot create model.');
      setShowSnackbar(true);
      return;
    }

    // Format fields including meta (only 'required' for now)
    const formattedFields = fields.reduce((acc, field) => {
      if (field.name.trim()) {
        let typeString = field.type;
        if (field.type === 'array' && field.elementType) {
          typeString = `array<${field.elementType}>`;
        } else if (field.type === 'map' && field.elementType) {
          typeString = `map<string, ${field.elementType}>`;
        }
        acc[field.name] = {
          type: typeString,
          ...(field.meta?.required ? { required: true } : {}),
        };
      }
      return acc;
    }, {} as Record<string, { type: string; required?: boolean }>);

    const modelToCreate = {
      id: uuidv4(),
      project_id: projectId,
      name: modelName,
      schema: formattedFields,
    };

    try {
      await createModel(modelToCreate);
      setSnackbarMessage('Model created successfully!');
      setShowSnackbar(true);

      setTimeout(() => {
        router.push('/console/models');
      }, 1500);
    } catch (err) {
      console.error(err);
      setSnackbarMessage('Failed to create model.');
      setShowSnackbar(true);
    }
  };

  if (!user || loadingProject) {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <NxfForm onSubmit={handleSubmit}>
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Create New Model</h1>
          <NxfElevatedButton
            type="submit"
            className="flex items-center gap-2 px-4 py-2 !bg-black text-white"
            aria-label="Save model"
            disabled={loadingProject || !projectId}
          >
            <FiSave size={18} />
            Save
          </NxfElevatedButton>
        </div>

        <div className="mb-6">
          <NxfTextField
            value={modelName}
            onChange={(e) => setModelName(e.target.value)}
            placeholder="e.g., Product"
          />
        </div>

        <h2 className="text-lg font-semibold mb-4">Fields</h2>
        {fields.map((field, index) => (
          <div
            key={index}
            className="flex items-center gap-4 mb-4 flex-wrap border border-gray-300 rounded p-3"
          >
            <NxfTextField
              value={field.name}
              onChange={(e) => handleFieldChange(index, 'name', e.target.value)}
              className="flex-1 min-w-[150px]"
            />

            <select
              value={field.type}
              onChange={(e) => handleFieldChange(index, 'type', e.target.value)}
              className="border px-3 py-2 rounded-md min-w-[120px]"
            >
              {baseFieldTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>

            {(field.type === 'array' || field.type === 'map') && (
              <select
                value={field.elementType || 'string'}
                onChange={(e) => handleFieldChange(index, 'elementType', e.target.value)}
                className="border px-3 py-2 rounded-md min-w-[140px]"
              >
                {combinedElementTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            )}

            <label className="flex items-center gap-1 whitespace-nowrap">
              <input
                className="custom-checkbox"
                type="checkbox"
                checked={!!field.meta?.required}
                onChange={(e) => handleFieldChange(index, 'required', e.target.checked)}
              />
              Required
            </label>

            <button
              type="button"
              onClick={() => requestFieldDelete(index)} // show confirm dialog
              className="text-red-500 hover:underline"
            >
              Remove
            </button>
          </div>
        ))}

        <NxfElevatedButton
          type="button"
          onClick={handleAddField}
          className="mb-4 !bg-black text-white"
        >
          Add Field
        </NxfElevatedButton>
      </NxfForm>

      {showSnackbar && (
        <NxfSnackbar
          show={showSnackbar}
          message={snackbarMessage}
          onClose={() => setShowSnackbar(false)}
        />
      )}

      {/* Confirm delete dialog */}
      <ConfirmDialog
        open={showConfirmDialog}
        onOpenChange={setShowConfirmDialog}
        title="Delete Field?"
        description="Are you sure you want to delete this field? This action cannot be undone."
        onConfirm={confirmDeleteField}
      />
    </div>
  );
}
