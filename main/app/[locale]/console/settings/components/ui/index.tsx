/**
 * ui/index.ts — Barrel export file for all shared UI components.
 *
 * What is a barrel file?
 * A barrel file is a single file that re-exports everything from a folder,
 * so that other files can import multiple components from one clean path
 * instead of having to know the exact file each component lives in.
 *
 * Without this file, every import would look like:
 *   import { FormField } from '../../ui/FormField'
 *   import { Input }     from '../../ui/Input'
 *   import { SaveButton} from '../../ui/SaveButton'
 *
 * With this barrel file, all of the above becomes one clean line:
 *   import { FormField, Input, SaveButton } from '../../ui'
 *
 * What is exported from here:
 * - FormField  — Label + input + optional hint wrapper (see FormField.tsx)
 * - Input      — Styled text input component (see Input.tsx)
 * - CMSToggle  — On/off toggle switch with label (see CMSToggle.tsx)
 * - SectionCard — Titled card wrapper for settings sections (see SectionCard.tsx)
 * - SaveButton — Shared save button with loading/saved states (see SaveButton.tsx)
 *
 * How to add a new shared component:
 * 1. Create the component file in this same /ui folder (e.g. MyComponent.tsx).
 * 2. Add a new export line here: export { MyComponent } from './MyComponent';
 * 3. It will then be available to import from '../../ui' anywhere in the project.
 */

export { FormField }   from './FormField'
export { Input }       from './Input'
export { CMSToggle }   from './CMSToggle'
export { SectionCard } from './SectionCard'
export { SaveButton }  from './SaveButton'