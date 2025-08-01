'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  NxfTextField,
  NxfElevatedButton,
  NxfSnackbar,
  NxfForm,
} from '../../../../nxf-ui/widgets';
import { getModelById, updateModel } from '../../../../nxf-ui/lib/supabase/model';
import { useUser } from '@supabase/auth-helpers-react';
import { getProjectIdForUser } from '../../../../nxf-ui/lib/supabase/utils';
import { FiSave, FiEye } from 'react-icons/fi';

import { ConfirmDialog } from '../../../components/confirmDialog';

interface Field {
  name: string;
  type: string;
  elementType?: string;
  meta?: { required?: boolean };
}

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

export default function EditModelPage() {
  const { id } = useParams();
  const router = useRouter();
  const user = useUser();

  const [modelName, setModelName] = useState('');
  const [fields, setFields] = useState<Field[]>([]);
  const [loading, setLoading] = useState(true);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [showSnackbar, setShowSnackbar] = useState(false);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [existingModels, setExistingModels] = useState<string[]>([]);
  const [originalModelName, setOriginalModelName] = useState('');
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // Confirmation dialog states for delete
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [fieldToDeleteIndex, setFieldToDeleteIndex] = useState<number | null>(null);

  // Preview toggle
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    async function fetchModels() {
      try {
        const models = await import('../../../../nxf-ui/lib/supabase/model').then(
          (mod) => mod.getAllModels()
        );
        const modelNames = models?.map((m: any) => m.name) || [];
        setExistingModels(modelNames);
      } catch (error) {
        console.error('Failed to fetch models:', error);
      }
    }
    fetchModels();
  }, []);

  useEffect(() => {
    async function loadProject() {
      if (!user) return;
      try {
        const projId = await getProjectIdForUser(user.id);
        setProjectId(projId);
      } catch (error) {
        console.error('Failed to load project:', error);
        setSnackbarMessage('Error loading project information');
        setShowSnackbar(true);
      }
    }
    loadProject();
  }, [user]);

  function parseFieldType(typeStr: string): { type: string; elementType?: string } {
    const arrayMatch = typeStr.match(/^array<(.+)>$/);
    if (arrayMatch) {
      return { type: 'array', elementType: arrayMatch[1] };
    }
    const mapMatch = typeStr.match(/^map<string,\s*(.+)>$/);
    if (mapMatch) {
      return { type: 'map', elementType: mapMatch[1] };
    }
    return { type: typeStr };
  }

  useEffect(() => {
    async function loadModel() {
      if (!id || !projectId) return;

      try {
        const model = await getModelById(id as string, projectId);

        if (!model) {
          setSnackbarMessage('Model not found');
          setShowSnackbar(true);
          router.push('/console/models');
          return;
        }

        setModelName(model.name);
        setOriginalModelName(model.name);

        const fieldList = Object.entries(model.schema).map(([name, value]) => {
          if (typeof value === 'object' && value !== null && 'type' in value) {
            const { type, elementType } = parseFieldType((value as any).type);
            return {
              name,
              type,
              elementType,
              meta: { required: (value as any).required === true },
            };
          } else if (typeof value === 'string') {
            const { type, elementType } = parseFieldType(value);
            return { name, type, elementType, meta: { required: false } };
          }
          return { name, type: 'unknown', meta: { required: false } };
        });

        setFields(fieldList);
      } catch (error) {
        console.error('Failed to load model:', error);
        setSnackbarMessage('Error loading model');
        setShowSnackbar(true);
      } finally {
        setLoading(false);
      }
    }
    loadModel();
  }, [id, projectId, router]);

  const validateForm = () => {
    const errors: Record<string, string> = {};

    if (!modelName.trim()) {
      errors.modelName = 'Model name is required';
    } else if (
  modelName.trim().toLowerCase() !== originalModelName.trim().toLowerCase() &&
  existingModels.some(name => name.toLowerCase() === modelName.trim().toLowerCase())
) {
  errors.modelName = 'Model name already exists';
}
 {
      errors.modelName = 'Model name already exists';
    }

    const fieldNames = new Set<string>();
    fields.forEach((field, index) => {
      if (!field.name.trim()) {
        errors[`field-${index}-name`] = 'Field name is required';
      } else if (fieldNames.has(field.name.toLowerCase())) {
        errors[`field-${index}-name`] = 'Field name must be unique';
      } else {
        fieldNames.add(field.name.toLowerCase());
      }
    });

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleFieldChange = (
    index: number,
    key: keyof Field | 'required',
    value: string | boolean
  ) => {
    const updated = [...fields];

    if (key === 'required') {
      if (!updated[index].meta) updated[index].meta = {};
      updated[index].meta.required = value === true;
    } else {
      updated[index][key as keyof Field] = value as any;
      if (key === 'type' && value !== 'array' && value !== 'map') {
        delete updated[index].elementType;
      }
    }

    setFields(updated);

    if (key === 'name' && validationErrors[`field-${index}-name`]) {
      const newErrors = { ...validationErrors };
      delete newErrors[`field-${index}-name`];
      setValidationErrors(newErrors);
    }
  };

  const handleAddField = () => {
    setFields([...fields, { name: '', type: 'string', meta: { required: false } }]);
  };

  const requestFieldDelete = (index: number) => {
    setFieldToDeleteIndex(index);
    setShowConfirmDialog(true);
  };

  const confirmDeleteField = () => {
    if (fieldToDeleteIndex === null) return;
    const updated = [...fields];
    updated.splice(fieldToDeleteIndex, 1);
    setFields(updated);

    const newErrors = { ...validationErrors };
    delete newErrors[`field-${fieldToDeleteIndex}-name`];
    setValidationErrors(newErrors);

    setFieldToDeleteIndex(null);
  };

  const handleSubmit = async () => {
    if (!projectId) {
      setSnackbarMessage('No project ID found. Cannot update model.');
      setShowSnackbar(true);
      return;
    }

    if (!validateForm()) {
      setSnackbarMessage('Please fix validation errors');
      setShowSnackbar(true);
      return;
    }

    const schema = fields.reduce((acc, field) => {
      let typeString = field.type;
      if (field.type === 'array' && field.elementType) {
        typeString = `array<${field.elementType}>`;
      } else if (field.type === 'map' && field.elementType) {
        typeString = `map<string, ${field.elementType}>`;
      }
      acc[field.name] = { type: typeString };
      if (field.meta?.required) {
        acc[field.name].required = true;
      }
      return acc;
    }, {} as Record<string, { type: string; required?: boolean }>);

    try {
      await updateModel(id as string, projectId, {
        name: modelName,
        schema,
      });

      setSnackbarMessage('Model updated successfully.');
      setShowSnackbar(true);

      setTimeout(() => {
        router.push('/console/models');
      }, 1500);
    } catch (error) {
      console.error('Error updating model:', error);
      setSnackbarMessage('Error updating model');
      setShowSnackbar(true);
    }
  };

  if (!user) {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <div className="flex justify-center items-center h-64">
          <p>You must be signed in to edit models</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  const combinedElementTypes: string[] = [...primitiveTypes, ...existingModels];

  // Prepare JSON preview string with subtypes preserved
  const jsonSchemaPreview = JSON.stringify(
    fields.reduce((acc, field) => {
      let typeString = field.type;
      if (field.type === 'array' && field.elementType) {
        typeString = `array<${field.elementType}>`;
      } else if (field.type === 'map' && field.elementType) {
        typeString = `map<string, ${field.elementType}>`;
      }
      acc[field.name] = { type: typeString };
      if (field.meta?.required) {
        acc[field.name].required = true;
      }
      return acc;
    }, {} as Record<string, { type: string; required?: boolean }>),
    null,
    2
  );

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <NxfForm
        onSubmit={(e) => {
          e.preventDefault();
          handleSubmit();
        }}
      >
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold mb-4">Edit Model</h1>
          <div className="flex gap-2">
            <NxfElevatedButton
              type="submit"
              className="flex items-center gap-2 px-4 py-2 !bg-black text-white"
              aria-label="Save model"
            >
              <FiSave size={18} />
              Save
            </NxfElevatedButton>

            <NxfElevatedButton
              type="button"
              //variant="black"
              className="flex items-center gap-2 px-4 py-2 !bg-black text-white"
              onClick={() => setShowPreview((prev) => !prev)}
              aria-label="Toggle schema preview"
            >
              <FiEye size={18} />
              {showPreview ? 'Hide Preview' : 'Preview'}
            </NxfElevatedButton>
          </div>
        </div>

        <div className="flex gap-6">
          {/* Left side: Form Fields */}
          <div className={`${showPreview ? 'w-1/2' : 'w-full'}`}>
            <div className="mb-6">
              <label className="block font-medium mb-2">Model Name</label>
              <NxfTextField
                value={modelName}
                onChange={(e) => {
                  setModelName(e.target.value);
                  if (validationErrors.modelName) {
                    const newErrors = { ...validationErrors };
                    delete newErrors.modelName;
                    setValidationErrors(newErrors);
                  }
                }}
                placeholder="Model name"
              />
              {validationErrors.modelName && (
                <p className="text-red-500 text-sm mt-1">{validationErrors.modelName}</p>
              )}
            </div>

            <h2 className="text-lg font-semibold mb-4">Fields</h2>
            {fields.map((field, index) => (
              <div
                key={index}
                className="flex items-center gap-4 mb-4 flex-wrap border border-gray-300 rounded p-3"
              >
                <div className="flex-1 min-w-[150px]">
                  <NxfTextField
                    value={field.name}
                    onChange={(e) => handleFieldChange(index, 'name', e.target.value)}
                    placeholder="Field name"
                  />
                  {validationErrors[`field-${index}-name`] && (
                    <p className="text-red-500 text-sm mt-1">{validationErrors[`field-${index}-name`]}</p>
                  )}
                </div>

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
                    type="checkbox"
                    checked={!!field.meta?.required}
                    onChange={(e) => handleFieldChange(index, 'required', e.target.checked)}
                    className="custom-checkbox"
                  />
                  Required
                </label>

                <button
                  type="button"
                  onClick={() => requestFieldDelete(index)}
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
          </div>

          {/* Right side: JSON Schema Preview */}
          {showPreview && (
            <div
              className="w-1/2 border rounded-lg p-4 bg-gray-100 overflow-auto"
              style={{ maxHeight: 'calc(100vh - 200px)', whiteSpace: 'pre-wrap', fontFamily: 'monospace', fontSize: 14 }}
            >
              <pre>{jsonSchemaPreview}</pre>
            </div>
          )}
        </div>
      </NxfForm>

      {showSnackbar && (
        <NxfSnackbar
          show={showSnackbar}
          message={snackbarMessage}
          onClose={() => setShowSnackbar(false)}
        />
      )}

      <ConfirmDialog
        open={showConfirmDialog}
        onOpenChange={setShowConfirmDialog}
        title="Delete Field?"
        description="Are you sure you want to delete this field? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={confirmDeleteField}
        onCancel={() => {
          setShowConfirmDialog(false);
        }}
      />
    </div>
  );
}
