/**
 * SectionCard Component
 *
 * A reusable card wrapper used throughout the CMS settings pages to visually
 * group related form fields and settings together under a titled section.
 *
 * What it renders:
 * - A white rounded card with a subtle border.
 * - A grey header bar at the top containing the section title in bold.
 * - A white content area below the header where the children are rendered,
 *   with consistent padding and vertical spacing between child elements.
 *
 * Why use this?
 * - Keeps all settings sections visually consistent across the whole CMS.
 * - Reduces repetition — the card layout is defined once here and reused
 *   everywhere instead of being copy-pasted into each page.
 * - Makes it easy to update the card styling globally in one place.
 *
 * Translation note:
 * - The `title` prop accepts a plain string. The parent component is
 *   responsible for passing an already-translated string via t('someKey').
 *   This keeps SectionCard generic and reusable across different namespaces.
 *
 * Usage example:
 * ```tsx
 * const t = useTranslations('myPage')
 * <SectionCard title={t('mySectionTitle')}>
 *   <FormField label={t('myFieldLabel')}>
 *     <Input value={value} onChange={setValue} />
 *   </FormField>
 * </SectionCard>
 * ```
 */

/**
 * Props for the SectionCard component.
 *
 * @property title    - The heading text displayed in the card's grey header bar.
 *                      Should be a pre-translated string passed in by the parent.
 * @property children - The content to render inside the card body.
 *                      Typically one or more <FormField> or <CMSToggle> elements.
 */
export function SectionCard({
  title,
  children,
}: {
  title:    string
  children: React.ReactNode
}) {
  return (
    /*
     * Card container
     * White background with a light border and rounded corners.
     * overflow-hidden ensures the rounded corners clip the header's
     * background colour cleanly at the top of the card.
     */
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">

      {/*
       * Card header
       * Light grey background with a bottom border to separate it
       * from the content area. Contains the section title.
       */}
      <div className="px-5 py-3.5 border-b border-gray-100 bg-gray-50">
        <h3 className="text-sm font-semibold text-gray-800">{title}</h3>
      </div>

      {/*
       * Card body
       * White background with consistent padding on all sides.
       * Children are stacked vertically with a gap between each one.
       */}
      <div className="px-5 py-4 flex flex-col gap-4">
        {children}
      </div>

    </div>
  )
}