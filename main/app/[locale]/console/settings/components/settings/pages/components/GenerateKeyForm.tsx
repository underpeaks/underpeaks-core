/**
 * GenerateKeyForm Component
 *
 * This component renders a form card that allows the user to create a new API key.
 *
 * What it does:
 * - Displays a text input where the user types a descriptive name for their new key
 *   (e.g. "Flutter App — Production").
 * - Shows a "Generate Key" button that triggers the key creation process.
 * - While the key is being generated, the button shows a spinner and changes its
 *   label to "Generating…", and is disabled to prevent duplicate submissions.
 * - The button is also disabled if the key name input is empty or whitespace-only,
 *   ensuring the user always gives their key a meaningful name before creating it.
 *
 * This component is purely presentational — it receives all its state and handlers
 * from the parent via props, making it easy to test and reuse.
 */

'use client'

import { useTranslations } from 'next-intl'
import { SectionCard, Input, FormField } from '../../../ui'

// ---------------------------------------------------------------------------
// Props Type
// ---------------------------------------------------------------------------

/**
 * Props for the GenerateKeyForm component.
 *
 * @property keyName    - The current value of the key name input field.
 * @property generating - Whether a key generation request is currently in progress.
 *                        When true, the button is disabled and shows a spinner.
 * @property onChange   - Callback fired whenever the user types in the name input.
 *                        Receives the new string value.
 * @property onGenerate - Callback fired when the user clicks the "Generate Key" button.
 *                        The parent is responsible for making the API call.
 */
interface Props {
  keyName:    string
  generating: boolean
  onChange:   (v: string) => void
  onGenerate: () => void
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * GenerateKeyForm
 *
 * Renders a settings card with:
 * 1. A labelled text input for the key name, with a helpful hint below it.
 * 2. A submit button that:
 *    - Is disabled when the name is empty/whitespace or a request is in progress.
 *    - Shows a spinner + "Generating…" label while the request is in progress.
 *    - Shows "Generate Key" label when idle.
 *
 * @param keyName    - Current key name input value.
 * @param generating - Whether generation is in progress.
 * @param onChange   - Handler for input value changes.
 * @param onGenerate - Handler for the generate button click.
 */
export default function GenerateKeyForm({ keyName, generating, onChange, onGenerate }: Props) {
  /**
   * t — Translation function scoped to the 'generateKeyForm' namespace.
   * Use t('key') to get the translated string for that key.
   */
  const t = useTranslations('generateKeyForm')

  return (
    <SectionCard title={t('sectionTitle')}>

      {/*
       * Key Name Field
       * A labelled input with a hint underneath to guide the user.
       * The hint reminds them to use a descriptive name so they can
       * identify what the key is used for later.
       */}
      <FormField
        label={t('keyNameLabel')}
        hint={t('keyNameHint')}
      >
        <Input
          placeholder={t('keyNamePlaceholder')}
          value={keyName}
          onChange={onChange}
        />
      </FormField>

      {/*
       * Submit Button — right-aligned.
       *
       * Disabled when:
       *   - `generating` is true  → a request is already in progress
       *   - keyName.trim() is ''  → the user hasn't typed a name yet
       *
       * While generating:
       *   - A small spinning circle is shown to the left of the label
       *   - The label changes to "Generating…" to indicate work is happening
       */}
      <div className="flex justify-end">
        <button
          onClick={onGenerate}
          disabled={generating || !keyName.trim()}
          className="flex items-center gap-2 px-5 py-2 bg-gray-900 text-white text-sm font-medium rounded-md hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
        >
          {/* Spinner — only rendered while the generate request is in progress */}
          {generating && (
            <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          )}

          {/* Label — switches between idle and loading states */}
          {generating ? t('buttonGenerating') : t('buttonIdle')}
        </button>
      </div>

    </SectionCard>
  )
}