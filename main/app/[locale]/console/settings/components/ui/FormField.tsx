/**
 * FormField Component
 *
 * A reusable form field wrapper used throughout the CMS settings pages.
 * It groups a label, an input (or any other form control), and an optional
 * hint text together in a consistent, vertically stacked layout.
 *
 * What it renders:
 * - A bold label above the input.
 * - The input itself (passed in as `children` — could be an <Input>,
 *   <select>, or any other form element).
 * - An optional small grey hint/helper text below the input, only rendered
 *   if the `hint` prop is provided.
 *
 * Why use this instead of writing label/input/hint manually each time?
 * - Keeps all form fields visually consistent across the whole settings area.
 * - Reduces repetition — you only write the layout logic once here.
 * - Makes it easy to update the styling for all form fields in one place.
 *
 * Translation note:
 * - Both `label` and `hint` accept plain strings. The parent component is
 *   responsible for passing already-translated strings via t('someKey').
 *   This keeps FormField generic and reusable across different namespaces.
 *
 * Usage example:
 * ```tsx
 * const t = useTranslations('myPage')
 * <FormField
 *   label={t('fieldLabel')}
 *   hint={t('fieldHint')}
 * >
 *   <Input value={value} onChange={setValue} />
 * </FormField>
 * ```
 */

/**
 * Props for the FormField component.
 *
 * @property label    - The label text displayed above the input.
 *                      Should be a pre-translated string passed in by the parent.
 * @property hint     - Optional helper text shown below the input in small grey text.
 *                      Useful for extra guidance (e.g. "The public URL of your app.").
 *                      Only rendered if provided. Should also be pre-translated.
 * @property children - The form control to render between the label and the hint.
 *                      Typically an <Input>, <select>, or similar element.
 */
export function FormField({
  label,
  hint,
  children,
}: {
  label:    string
  hint?:    string
  children: React.ReactNode
}) {
  return (
    /*
     * Outer wrapper
     * Stacks the label, input, and hint vertically with a small gap between them.
     */
    <div className="flex flex-col gap-1">

      {/* Field label — bold and dark, sits above the input */}
      <label className="text-xs font-semibold text-gray-700">{label}</label>

      {/* The form control (Input, select, etc.) passed in by the parent */}
      {children}

      {/*
       * Optional hint text
       * Only rendered when the `hint` prop is provided.
       * Displayed in small grey text below the input to give the user
       * extra context about what the field expects.
       */}
      {hint && (
        <p className="text-[11px] text-gray-400">{hint}</p>
      )}

    </div>
  )
}