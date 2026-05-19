'use client';

/**
 * @file EditModelPage.tsx
 * @description Page component for editing an existing data model.
 *
 * This page allows an authenticated user to:
 *  - Change the name of an existing model
 *  - Add, edit, or remove fields from the model's schema
 *  - Set each field's type (e.g. string, number, array, map)
 *  - Mark fields as required
 *  - Preview the resulting JSON schema in real time
 *  - Save the updated model back to the database
 *
 * Route: /console/models/[id]/edit
 *
 * INTERNATIONALIZATION (i18n):
 * All user-visible text uses the t() function. Keys live under
 * the "editModel" namespace in en.json.
 */

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  NxfTextField,
  NxfElevatedButton,
  NxfSnackbar,
  NxfForm,
} from '@nxf/widgets';
import { useUser } from '@supabase/auth-helpers-react';
import { FiSave, FiEye } from 'react-icons/fi';


import { ConfirmDialog } from '../../../components_cus/confirmDialog';
import Loader from '../../Loading';

// ---------------------------------------------------------------------------
// TYPES
// ---------------------------------------------------------------------------

/**
 * Represents a single field in a model's schema.
 *
 * @property name        - The field identifier (e.g. "firstName")
 * @property type        - The base type (e.g. "string", "array")
 * @property elementType - Only for "array" or "map" types. Defines the item/value type.
 * @property meta        - Optional metadata, e.g. whether the field is required.
 */
interface Field {
  name: string;
  type: string;
  elementType?: string;
  meta?: { required?: boolean };
}

// ---------------------------------------------------------------------------
// CONSTANTS
// ---------------------------------------------------------------------------

/**
 * All selectable base types for a field.
 * Shown in the Type dropdown on each field row.
 */
const baseFieldTypes = [
  'string',
  'num',
  'boolean',
  'datetime',
  'array',
  'map',
  'null',
];

/**
 * Scalar (non-collection) types.
 * Used as valid element types inside array<> and map<string, > fields.
 * Existing model names from the project are also appended at runtime.
 */
const primitiveTypes = ['string', 'num', 'boolean', 'datetime'];

// ---------------------------------------------------------------------------
// COMPONENT
// ---------------------------------------------------------------------------

/**
 * EditModelPage
 *
 * Fetches an existing model by ID, populates the edit form,
 * and lets the user update the schema and save changes.
 */
export default function EditModelPage() {
  const { id } = useParams();
  const router = useRouter();
  const user = useUser();
  const { t } = useTranslation();

  // ── State ────────────────────────────────────────────────────────────────

  /** Current value of the model name input. */
  const [modelName, setModelName] = useState('');

  /** List of fields currently in the model's schema. */
  const [fields, setFields] = useState<Field[]>([]);

  /**
   * True while model data is being fetched from the server.
   * The form is hidden and a spinner is shown during this time.
   */
  const [loading, setLoading] = useState(true);

  /** Text shown in the snackbar notification. */
  const [snackbarMessage, setSnackbarMessage] = useState('');

  /** Controls snackbar visibility. */
  const [showSnackbar, setShowSnackbar] = useState(false);

  /**
   * The project ID that owns this model.
   * Must be loaded before any model read/write operations.
   */
  const [projectId, setProjectId] = useState<string | null>(null);

  /**
   * All existing model names in the project.
   * Used to prevent duplicate model names during validation.
   */
  const [existingModels, setExistingModels] = useState<string[]>([]);

  /**
   * The model name as it was when the page first loaded.
   * Allows the user to save without renaming (original name is always valid).
   */
  const [originalModelName, setOriginalModelName] = useState('');

  /**
   * Validation error messages keyed by field identifier.
   * - "modelName"      → error on the model name input
   * - "field-{i}-name" → error on the name input of the field at index i
   */
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  /** Whether the delete-field confirmation dialog is open. */
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  /** Index of the field pending deletion. Null when no deletion is in progress. */
  const [fieldToDeleteIndex, setFieldToDeleteIndex] = useState<number | null>(null);

  /** Whether the JSON schema preview panel is visible. */
  const [showPreview, setShowPreview] = useState(false);

  // ── Effects ──────────────────────────────────────────────────────────────

  /**
   * Fetches all existing model names for the project on mount.
   * These names are used during validation to detect duplicates.
   *
   * NOTE: The actual fetch call is currently commented out pending
   * the model service integration. Uncomment and wire up when ready.
   */
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

  /**
   * Loads the project ID associated with the signed-in user.
   * The project ID is required before the model can be fetched or saved.
   * Runs whenever the user object changes (e.g. after sign-in).
   */
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
   * Parses a raw type string from the database schema into a structured object.
   *
   * The database stores complex types as strings like:
   *  - "array<string>"        → { type: 'array', elementType: 'string' }
   *  - "map<string, num>"     → { type: 'map',   elementType: 'num'    }
   *  - "string"               → { type: 'string'                       }
   *
   * @param typeStr - The raw type string from the schema.
   * @returns An object with `type` and an optional `elementType`.
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

  /**
   * Loads the model by ID and populates the form.
   * Runs when both `id` and `projectId` are available.
   *
   * If the model is not found, the user is redirected to /console/models.
   *
   * NOTE: The actual fetch is currently commented out pending service integration.
   */
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

  /**
   * Validates the entire form before submission.
   *
   * Rules enforced:
   *  1. Model name must not be empty.
   *  2. Model name must not duplicate another existing model (case-insensitive),
   *     unless it matches the original name (i.e. the user didn't rename it).
   *  3. Every field must have a non-empty name.
   *  4. Field names must be unique across the form (case-insensitive).
   *
   * Populates `validationErrors` with any violations found.
   *
   * @returns true if the form is valid and can be submitted; false otherwise.
   */
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

  /**
   * Updates a single property of a specific field in the fields array.
   *
   * Handles three categories of changes:
   *  - "required" (boolean) → stored inside field.meta.required
   *  - "type" → updates the base type; also clears elementType if switching away from array/map
   *  - any other key (e.g. "name", "elementType") → set directly on the field object
   *
   * Also clears any existing validation error for the field name when the name is edited.
   *
   * @param index - The position of the field in the fields array.
   * @param key   - The property being changed.
   * @param value - The new value for that property.
   */
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

  /**
   * Appends a new blank field to the fields list.
   * The new field defaults to type "string" and is not required.
   */
  const handleAddField = () => {
    setFields([...fields, { name: '', type: 'string', meta: { required: false } }]);
  };

  /**
   * Opens the delete confirmation dialog for a specific field.
   * The actual deletion only happens if the user confirms in the dialog.
   *
   * @param index - The position of the field the user wants to delete.
   */
  const requestFieldDelete = (index: number) => {
    setFieldToDeleteIndex(index);
    setShowConfirmDialog(true);
  };

  /**
   * Executes the deletion of the field that was flagged via requestFieldDelete().
   * Called when the user confirms the action in the ConfirmDialog.
   *
   * Also cleans up any validation error associated with the deleted field.
   */
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

  /**
   * Validates and submits the updated model to the server.
   *
   * Steps:
   *  1. Checks that a projectId is available (required for the API call).
   *  2. Runs form validation; aborts if there are errors.
   *  3. Builds the schema object from the fields array,
   *     serialising array/map types into their string form (e.g. "array<string>").
   *  4. Calls the update API (currently commented out pending integration).
   *  5. Shows a success snackbar and redirects to /console/models after 1.5s.
   *  6. On failure, shows an error snackbar.
   */
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

  /**
   * The list of types available in the element type dropdown
   * (shown when a field's base type is "array" or "map").
   * Combines primitive types with any existing model names from the project,
   * allowing models to reference other models as element types.
   */
  const combinedElementTypes: string[] = [...primitiveTypes, ...existingModels];

  /**
   * A formatted JSON string of the current schema, used in the preview panel.
   * Complex types (array, map) are serialised to their string form.
   * Updates live as the user edits fields.
   */
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

  /**
   * Guard: If no user is signed in, show a prompt instead of the form.
   * The user must authenticate before they can edit models.
   */
  if (!user) {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <div className="flex justify-center items-center h-64">
          <p>{t('editModel.auth.signInRequired')}</p>
        </div>
      </div>
    );
  }

  /**
   * Guard: Show a loading spinner while model data is being fetched.
   */
  if (loading) return <Loader />

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <NxfForm
        onSubmit={(e) => {
          e.preventDefault();
          handleSubmit();
        }}
      >
        {/* ── Page Header ── */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold mb-4">{t('editModel.title')}</h1>
          <div className="flex gap-2">

            {/* Save button — submits the form */}
            <NxfElevatedButton
              type="submit"
              className="flex items-center gap-2 px-4 py-2 !bg-black text-white"
              aria-label={t('editModel.actions.saveAriaLabel')}
            >
              <FiSave size={18} />
              {t('editModel.actions.save')}
            </NxfElevatedButton>

            {/* Preview toggle — shows/hides the JSON schema panel */}
            <NxfElevatedButton
              type="button"
              className="flex items-center gap-2 px-4 py-2 !bg-black text-white"
              onClick={() => setShowPreview((prev) => !prev)}
              aria-label={t('editModel.actions.togglePreviewAriaLabel')}
            >
              <FiEye size={18} />
              {showPreview
                ? t('editModel.actions.hidePreview')
                : t('editModel.actions.preview')}
            </NxfElevatedButton>
          </div>
        </div>

        <div className="flex gap-6">

          {/* ── Left Panel: Form Fields ── */}
          <div className={`${showPreview ? 'w-1/2' : 'w-full'}`}>

            {/* Model Name Input */}
            <div className="mb-6">
              <label className="block font-medium mb-2">
                {t('editModel.form.modelNameLabel')}
              </label>
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
                placeholder={t('editModel.form.modelNamePlaceholder')}
              />
              {validationErrors.modelName && (
                <p className="text-red-500 text-sm mt-1">{validationErrors.modelName}</p>
              )}
            </div>

            {/* Fields Section Header */}
            <h2 className="text-lg font-semibold mb-4">{t('editModel.form.fieldsHeading')}</h2>

            {/* Field Rows — one row per field in the schema */}
            {fields.map((field, index) => (
              <div
                key={index}
                className="flex items-center gap-4 mb-4 flex-wrap border border-gray-300 rounded p-3"
              >
                {/* Field Name Input */}
                <div className="flex-1 min-w-[150px]">
                  <NxfTextField
                    value={field.name}
                    onChange={(e) => handleFieldChange(index, 'name', e.target.value)}
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

                {/*
                 * Element Type Dropdown — only shown when the base type is "array" or "map".
                 * Lets the user define what type the array items or map values should be.
                 */}
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

                {/* Remove Field Button — opens confirmation dialog */}
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
            <NxfElevatedButton
              type="button"
              onClick={handleAddField}
              className="mb-4 !bg-black text-white"
            >
              {t('editModel.form.addField')}
            </NxfElevatedButton>
          </div>

          {/* ── Right Panel: JSON Schema Preview ──
              Only rendered when showPreview is true.
              Displays a live JSON representation of the current schema. */}
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
      </NxfForm>

      {/* Snackbar Notification — shown after save success, save failure, or validation errors */}
      {showSnackbar && (
        <NxfSnackbar
          show={showSnackbar}
          message={snackbarMessage}
          onClose={() => setShowSnackbar(false)}
        />
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

function useTranslation(): { t: any; } {
  throw new Error('Function not implemented.');
}
