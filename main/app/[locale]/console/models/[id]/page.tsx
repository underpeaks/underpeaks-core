'use client';

/**
 * EditModelPage
 * Edit an existing data model: rename it, add/edit/remove fields,
 * mark fields required, preview the JSON schema.
 *
 * Translation keys live under the "editModel" namespace.
 * NOTE: the load/save calls are still commented out (service integration pending).
 */

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';

import { useUser } from '@supabase/auth-helpers-react';
import { FiSave, FiEye } from 'react-icons/fi';

import { ConfirmDialog } from '../../../components_cus/confirmDialog';
import Loader from '../../Loading';

// ---------------------------------------------------------------------------
// TYPES
// ---------------------------------------------------------------------------

interface Field {
  name: string;
  type: string;
  elementType?: string;
  meta?: { required?: boolean };
}

// ---------------------------------------------------------------------------
// CONSTANTS
// ---------------------------------------------------------------------------

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

const buttonClass =
  'flex items-center gap-2 px-4 py-2 bg-black text-white rounded-md hover:bg-gray-800';

const inputClass =
  'w-full border border-gray-300 px-3 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-300';

// ---------------------------------------------------------------------------
// COMPONENT
// ---------------------------------------------------------------------------

export default function EditModelPage() {
  const { id } = useParams();
  const router = useRouter();
  const user = useUser();
  const t = useTranslations();

  const [modelName, setModelName] = useState('');
  const [fields, setFields] = useState<Field[]>([]);
  const [loading, setLoading] = useState(true);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [showSnackbar, setShowSnackbar] = useState(false);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [existingModels, setExistingModels] = useState<string[]>([]);
  const [originalModelName, setOriginalModelName] = useState('');
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [fieldToDeleteIndex, setFieldToDeleteIndex] = useState<number | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  // ── Effects ──────────────────────────────────────────────────────────────

  useEffect(() => {
    async function fetchModels() {
      try {
        // const models = await getAllModels();
        // const modelNames = models?.map((m: any) => m.name) || [];
        // setExistingModels(modelNames);
      } catch (error) {
        console.error(t('editModel.errors.fetchModelsFailed'), error);
      }
    }
    fetchModels();
  }, []);

  useEffect(() => {
    async function loadProject() {
      if (!user) return;
      try {
        // const projId = await getProjectIdForUser(user.id);
        // setProjectId(projId);
      } catch (error) {
        console.error(t('editModel.errors.loadProjectFailed'), error);
        setSnackbarMessage(t('editModel.errors.loadProjectSnackbar'));
        setShowSnackbar(true);
      }
    }
    loadProject();
  }, [user]);

  /**
   * Parses a raw type string from the schema:
   *  "array<string>"    -> { type: 'array', elementType: 'string' }
   *  "map<string, num>" -> { type: 'map',   elementType: 'num'    }
   *  "string"           -> { type: 'string' }
   */
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
        // const model = await getModelById(id as string, projectId);
        // if (!model) {
        //   setSnackbarMessage(t('editModel.errors.modelNotFound'));
        //   setShowSnackbar(true);
        //   router.push('/console/models');
        //   return;
        // }
        // setModelName(model.name);
        // setOriginalModelName(model.name);
        // const fieldList = Object.entries(model.schema).map(([name, value]) => {
        //   if (typeof value === 'object' && value !== null && 'type' in value) {
        //     const { type, elementType } = parseFieldType((value as any).type);
        //     return { name, type, elementType, meta: { required: (value as any).required === true } };
        //   } else if (typeof value === 'string') {
        //     const { type, elementType } = parseFieldType(value);
        //     return { name, type, elementType, meta: { required: false } };
        //   }
        //   return { name, type: 'unknown', meta: { required: false } };
        // });
        // setFields(fieldList);
      } catch (error) {
        console.error(t('editModel.errors.loadModelFailed'), error);
        setSnackbarMessage(t('editModel.errors.loadModelSnackbar'));
        setShowSnackbar(true);
      } finally {
        setLoading(false);
      }
    }
    loadModel();
  }, [id, projectId, router]);

  // ── Validation ───────────────────────────────────────────────────────────

  const validateForm = () => {
    const errors: Record<string, string> = {};

    if (!modelName.trim()) {
      errors.modelName = t('editModel.validation.modelNameRequired');
    } else if (
      modelName.trim().toLowerCase() !== originalModelName.trim().toLowerCase() &&
      existingModels.some(name => name.toLowerCase() === modelName.trim().toLowerCase())
    ) {
      errors.modelName = t('editModel.validation.modelNameExists');
    }

    const fieldNames = new Set<string>();
    fields.forEach((field, index) => {
      if (!field.name.trim()) {
        errors[`field-${index}-name`] = t('editModel.validation.fieldNameRequired');
      } else if (fieldNames.has(field.name.toLowerCase())) {
        errors[`field-${index}-name`] = t('editModel.validation.fieldNameUnique');
      } else {
        fieldNames.add(field.name.toLowerCase());
      }
    });

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleFieldChange = (
    index: number,
    key: keyof Field | 'required',
    value: string | boolean
  ) => {
    const updated = [...fields];

    if (key === 'required') {
      if (!updated[index].meta) updated[index].meta = {};
      updated[index].meta!.required = value === true;
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
      setSnackbarMessage(t('editModel.errors.noProjectId'));
      setShowSnackbar(true);
      return;
    }

    if (!validateForm()) {
      setSnackbarMessage(t('editModel.errors.validationFailed'));
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
      // await updateModel(id as string, projectId, { name: modelName, schema });

      setSnackbarMessage(t('editModel.success.modelUpdated'));
      setShowSnackbar(true);

      setTimeout(() => {
        router.push('/console/models');
      }, 1500);
    } catch (error) {
      console.error(t('editModel.errors.updateModelFailed'), error);
      setSnackbarMessage(t('editModel.errors.updateModelSnackbar'));
      setShowSnackbar(true);
    }
  };

  // ── Derived Values ───────────────────────────────────────────────────────

  const combinedElementTypes: string[] = [...primitiveTypes, ...existingModels];

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

  // ── Early Returns ────────────────────────────────────────────────────────

  if (!user) {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <div className="flex justify-center items-center h-64">
          <p>{t('editModel.auth.signInRequired')}</p>
        </div>
      </div>
    );
  }

  if (loading) return <Loader />

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <form
        onSubmit={(e: React.FormEvent<HTMLFormElement>) => {
          e.preventDefault();
          handleSubmit();
        }}
      >
        {/* Page Header */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold mb-4">{t('editModel.title')}</h1>
          <div className="flex gap-2">

            <button
              type="submit"
              className={buttonClass}
              aria-label={t('editModel.actions.saveAriaLabel')}
            >
              <FiSave size={18} />
              {t('editModel.actions.save')}
            </button>

            <button
              type="button"
              className={buttonClass}
              onClick={() => setShowPreview((prev) => !prev)}
              aria-label={t('editModel.actions.togglePreviewAriaLabel')}
            >
              <FiEye size={18} />
              {showPreview
                ? t('editModel.actions.hidePreview')
                : t('editModel.actions.preview')}
            </button>
          </div>
        </div>

        <div className="flex gap-6">

          {/* Left Panel: Form Fields */}
          <div className={`${showPreview ? 'w-1/2' : 'w-full'}`}>

            {/* Model Name Input */}
            <div className="mb-6">
              <label className="block font-medium mb-2">
                {t('editModel.form.modelNameLabel')}
              </label>
              <input
                type="text"
                className={inputClass}
                value={modelName}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  setModelName(e.target.value);
                  if (validationErrors.modelName) {
                    const newErrors = { ...validationErrors };
                    delete newErrors.modelName;
                    setValidationErrors(newErrors);
                  }
                }}
                placeholder={t('editModel.form.modelNamePlaceholder')}
              />
              {validationErrors.modelName && (
                <p className="text-red-500 text-sm mt-1">{validationErrors.modelName}</p>
              )}
            </div>

            <h2 className="text-lg font-semibold mb-4">{t('editModel.form.fieldsHeading')}</h2>

            {/* Field Rows */}
            {fields.map((field, index) => (
              <div
                key={index}
                className="flex items-center gap-4 mb-4 flex-wrap border border-gray-300 rounded p-3"
              >
                {/* Field Name Input */}
                <div className="flex-1 min-w-[150px]">
                  <input
                    type="text"
                    className={inputClass}
                    value={field.name}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      handleFieldChange(index, 'name', e.target.value)
                    }
                    placeholder={t('editModel.form.fieldNamePlaceholder')}
                  />
                  {validationErrors[`field-${index}-name`] && (
                    <p className="text-red-500 text-sm mt-1">
                      {validationErrors[`field-${index}-name`]}
                    </p>
                  )}
                </div>

                {/* Base Type Dropdown */}
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

                {/* Element Type Dropdown (array / map only) */}
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

                {/* Required Checkbox */}
                <label className="flex items-center gap-1 whitespace-nowrap">
                  <input
                    type="checkbox"
                    checked={!!field.meta?.required}
                    onChange={(e) => handleFieldChange(index, 'required', e.target.checked)}
                    className="custom-checkbox"
                  />
                  {t('editModel.form.requiredLabel')}
                </label>

                {/* Remove Field Button */}
                <button
                  type="button"
                  onClick={() => requestFieldDelete(index)}
                  className="text-red-500 hover:underline"
                >
                  {t('editModel.form.removeField')}
                </button>
              </div>
            ))}

            {/* Add Field Button */}
            <button
              type="button"
              onClick={handleAddField}
              className={`${buttonClass} mb-4`}
            >
              {t('editModel.form.addField')}
            </button>
          </div>

          {/* Right Panel: JSON Schema Preview */}
          {showPreview && (
            <div
              className="w-1/2 border rounded-lg p-4 bg-gray-100 overflow-auto"
              style={{
                maxHeight: 'calc(100vh - 200px)',
                whiteSpace: 'pre-wrap',
                fontFamily: 'monospace',
                fontSize: 14,
              }}
            >
              <pre>{jsonSchemaPreview}</pre>
            </div>
          )}
        </div>
      </form>

      {/* Snackbar Notification */}
      {showSnackbar && (
        <div
          role="status"
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-4 px-4 py-3 bg-gray-900 text-white text-sm rounded-md shadow-lg"
        >
          <span>{snackbarMessage}</span>
          <button
            type="button"
            onClick={() => setShowSnackbar(false)}
            className="text-gray-300 hover:text-white"
            aria-label="Close"
          >
            x
          </button>
        </div>
      )}

      {/* Delete Field Confirmation Dialog */}
      <ConfirmDialog
        open={showConfirmDialog}
        onOpenChange={setShowConfirmDialog}
        title={t('editModel.confirmDelete.title')}
        description={t('editModel.confirmDelete.description')}
        confirmText={t('editModel.confirmDelete.confirm')}
        cancelText={t('editModel.confirmDelete.cancel')}
        onConfirm={confirmDeleteField}
        onCancel={() => setShowConfirmDialog(false)}
      />
    </div>
  );
}