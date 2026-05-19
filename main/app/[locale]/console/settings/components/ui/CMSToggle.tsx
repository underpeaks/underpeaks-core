/**
 * CMSToggle Component
 *
 * A reusable on/off toggle switch with a label, styled to match the CMS design.
 *
 * What it looks like:
 * - A pill-shaped track (dark when on, grey when off) with a white circular
 *   thumb that slides left (off) or right (on) with a smooth CSS transition.
 * - A text label sits to the right of the toggle.
 *
 * How it works:
 * - This is a fully controlled component — it does not manage its own on/off
 *   state. The parent passes in the current `checked` value and an `onChange`
 *   callback. When the user clicks the toggle, `onChange` is called with the
 *   opposite value (!checked), and the parent updates its own state.
 *
 * Why the label receives the click too:
 * - The whole thing is wrapped in a <label> element, which means clicking
 *   anywhere — the toggle track OR the label text — triggers the onClick.
 *   This is a standard accessibility pattern for toggle/checkbox inputs.
 *
 * Translation note:
 * - The `label` prop accepts a plain string. The parent component is
 *   responsible for passing an already-translated string via
 *   `t('someKey')` — this component does not call useTranslations itself.
 *   This keeps it generic and reusable across different namespaces.
 *
 * Usage example:
 * ```tsx
 * const t = useTranslations('myPage')
 * <CMSToggle
 *   checked={isEnabled}
 *   onChange={setIsEnabled}
 *   label={t('myToggleLabel')}
 * />
 * ```
 */

/**
 * Props for the CMSToggle component.
 *
 * @property checked  - Whether the toggle is currently on (true) or off (false).
 * @property onChange - Callback fired when the user clicks the toggle.
 *                      Receives the new boolean value (the opposite of `checked`).
 * @property label    - The text label displayed to the right of the toggle.
 *                      Should be a pre-translated string passed in by the parent.
 */
export function CMSToggle({
  checked,
  onChange,
  label,
}: {
  checked:  boolean
  onChange: (v: boolean) => void
  label:    string
}) {
  return (
    /*
     * Outer <label> wrapper
     * Wrapping everything in a <label> means clicking the label text
     * also triggers the toggle — improving usability and accessibility.
     * `select-none` prevents the label text from being highlighted on click.
     */
    <label className="flex items-center gap-3 cursor-pointer select-none">

      {/*
       * Toggle track
       * The pill-shaped background that switches between dark (on) and grey (off).
       * Clicking anywhere on the track calls onChange with the flipped value.
       */}
      <div
        onClick={() => onChange(!checked)}
        className={`relative w-10 h-5 rounded-full transition-colors duration-200 ${
          checked ? 'bg-gray-800' : 'bg-gray-300'
        }`}
      >
        {/*
         * Toggle thumb
         * The white circle that slides within the track.
         * - When OFF: sits on the left (translate-x-0)
         * - When ON:  slides to the right (translate-x-5)
         * The CSS transition makes the slide smooth (duration-200).
         */}
        <div
          className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${
            checked ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </div>

      {/* Label text — displayed to the right of the toggle track */}
      <span className="text-sm text-gray-700">{label}</span>

    </label>
  )
}