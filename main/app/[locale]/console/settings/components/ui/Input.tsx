/**
 * Input Component
 *
 * A reusable single-line text input field styled to match the CMS design system.
 * Used throughout the settings pages wherever the user needs to type a value
 * (e.g. project name, SMTP host, API key name, etc.).
 *
 * What it renders:
 * - A full-width styled <input> element with consistent padding, border,
 *   background, and focus ring styling.
 *
 * How it works:
 * - This is a controlled component — the parent manages the value via state
 *   and passes it in through the `value` prop.
 * - When the user types, the native onChange event fires, and this component
 *   extracts `e.target.value` and passes it up to the parent via the
 *   `onChange` callback.
 * - The `onChange?.(...)` syntax means the callback is optional — if no
 *   onChange is provided, typing does nothing (useful for read-only display).
 *
 * Translation note:
 * - The `placeholder` prop accepts a plain string. The parent component is
 *   responsible for passing an already-translated string via t('someKey').
 *   This keeps Input generic and reusable across different namespaces.
 *
 * Usage example:
 * ```tsx
 * const t = useTranslations('myPage')
 * <Input
 *   value={projectName}
 *   onChange={setProjectName}
 *   placeholder={t('projectNamePlaceholder')}
 * />
 * ```
 */

/**
 * Props for the Input component.
 *
 * @property placeholder - Optional ghost text shown inside the input when empty.
 *                         Guides the user on what to type (e.g. "smtp.example.com").
 *                         Should be a pre-translated string passed in by the parent.
 * @property type        - The HTML input type (e.g. 'text', 'password', 'email').
 *                         Defaults to 'text' if not provided.
 * @property value       - The current value of the input, managed by the parent.
 * @property onChange    - Optional callback fired whenever the user types.
 *                         Receives the new string value from the input.
 */
export function Input({
  placeholder,
  type = 'text',
  value,
  onChange,
}: {
  placeholder?: string
  type?:        string
  value?:       string
  onChange?:    (v: string) => void
}) {
  return (
    <input
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-300 focus:bg-white transition"
    />
  )
}