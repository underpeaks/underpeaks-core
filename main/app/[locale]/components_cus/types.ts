/**
 * types.ts  (Console Layout — Shared Types)
 * -------------------------------------------
 * This file defines all the shared TypeScript types used across the console
 * layout components: TopNavbar, Sidebar, and their associated dropdowns.
 *
 * What is a "type" in TypeScript?
 * --------------------------------
 * A type (or interface) is a blueprint that describes the shape of a piece of data.
 * It tells TypeScript exactly what properties an object must have, what types those
 * properties must be, and which ones are optional (marked with ?).
 *
 * If you try to pass an object that doesn't match the type, TypeScript will show
 * a red error in your editor before you even run the code — catching bugs early.
 *
 * Why keep all types in one file?
 * ---------------------------------
 * Having a single types.ts for a feature area (like the console layout) means:
 *  - All components in this folder import from one consistent source of truth
 *  - If a type changes (e.g. you add a field to Notification), you change it once
 *    and all components that use it automatically get the update
 *  - New developers can read this file to understand all the data shapes in one place
 */

/**
 * TODO: DEPRECATED PACKAGE — ACTION REQUIRED BEFORE PRODUCTION
 * --------------------------------------------------------------
 * '@supabase/auth-helpers-react' has been officially deprecated by Supabase.
 * It is no longer maintained and may break with future Supabase or Next.js updates.
 *
 * The replacement is '@supabase/ssr', which is Supabase's official package for
 * server-side rendering support in Next.js App Router.
 *
 * Migration steps:
 *  1. Install the new package:
 *       npm install @supabase/ssr
 *  2. Uninstall the old package:
 *       npm uninstall @supabase/auth-helpers-react
 *  3. Update this import and any other files that import from auth-helpers-react.
 *  4. See the official migration guide:
 *       https://supabase.com/docs/guides/auth/server-side/migrating-to-ssr-from-auth-helpers
 *
 * For now, the import is kept as-is to avoid breaking changes mid-development.
 */
import { User } from '@supabase/auth-helpers-react'
import { NXFUser } from '../../store/consoleStore'

/**
 * TopNavbarProps
 * ---------------
 * The props (inputs) accepted by the TopNavbar component.
 *
 * All three props are optional — the navbar can render in a minimal state
 * without any of them (e.g. showing a text logo and no project name).
 *
 * @prop user        - The currently logged-in user object from the console store.
 *                     When null or undefined, the navbar shows Sign In and Register
 *                     links instead of the user dropdown.
 * @prop logoUrl     - A URL pointing to the project's custom logo image.
 *                     When null or undefined, the "NextFlutter" text logo is shown instead.
 * @prop projectName - The display name of the current project.
 *                     When provided, it appears next to the logo in a styled badge.
 */
export type TopNavbarProps = {
  user?: NXFUser | null
  logoUrl?: string | null
  projectName?: string | null
}

/**
 * SidebarProps
 * -------------
 * The props accepted by the Sidebar component.
 *
 * The collapsed state is managed by the parent layout (ConsoleLayout) rather than
 * inside the Sidebar itself. This allows the parent to also adjust the main content
 * area width when the sidebar is collapsed — both components react to the same state.
 *
 * @prop collapsed    - Whether the sidebar is currently in collapsed (icon-only) mode.
 *                      true  = collapsed: shows icons only, no text labels
 *                      false = expanded:  shows icons and full text labels
 * @prop setCollapsed - Callback function to update the collapsed state in the parent.
 *                      Called when the user clicks the collapse/expand toggle button.
 */
export type SidebarProps = {
  collapsed: boolean
  setCollapsed: (value: boolean) => void
}

/**
 * Locale
 * -------
 * Represents a single supported language/locale option in the locale switcher.
 *
 * @prop code    - The ISO 639-1 language code (e.g. 'en', 'fr', 'ar').
 *                 This is what gets stored and used internally by the i18n system.
 * @prop label   - The human-readable display name of the language (e.g. 'English', 'French').
 *                 Shown in the locale switcher dropdown.
 * @prop country - The ISO 3166-1 alpha-2 country code used to show the correct flag icon
 *                 (e.g. 'gb' for the UK flag, 'fr' for the French flag).
 *                 Uses the flag-icons library for rendering.
 */
export type Locale = {
  code: string
  label: string
  country: string
}

/**
 * Notification
 * -------------
 * Represents a single notification item shown in the NotificationsDropdown.
 *
 * @prop id          - Unique numeric identifier for the notification.
 *                     Used as the React key and to target specific notifications
 *                     in mark-read API calls.
 * @prop title       - The short heading of the notification (e.g. 'New comment on your post').
 * @prop description - The longer body text of the notification with more detail.
 * @prop time        - A human-readable timestamp string (e.g. '2 minutes ago', '3 Jan 2025').
 *                     Formatted for display — not a raw Date object.
 * @prop read        - Whether the notification has been read by the user.
 *                     Unread notifications are typically highlighted in the UI.
 */
export type Notification = {
  id: number
  title: string
  description: string
  time: string
  read: boolean
}

/**
 * Message
 * --------
 * Represents a single message conversation preview shown in the MessagesDropdown.
 * This is a summary/preview of a conversation — not an individual message.
 *
 * @prop id      - Unique numeric identifier for the conversation.
 *                 Used as the React key and to target conversations in mark-read API calls.
 * @prop from    - The display name of the person who sent the message (e.g. 'Jane Smith').
 * @prop avatar  - A URL pointing to the sender's avatar/profile image.
 *                 Shown as a small circular image next to the message preview.
 * @prop subject - The subject or title of the conversation thread.
 * @prop preview - A short excerpt of the most recent message in the conversation.
 *                 Typically truncated to fit in the dropdown row.
 * @prop time    - A human-readable timestamp of the most recent message
 *                 (e.g. '5 minutes ago', 'Yesterday').
 * @prop read    - Whether the conversation has any unread messages.
 *                 Unread conversations are typically highlighted in the UI.
 */
export type Message = {
  id: number
  from: string
  avatar: string
  subject: string
  preview: string
  time: string
  read: boolean
}

/**
 * Re-export: User (from Supabase)
 * --------------------------------
 * The Supabase User type is re-exported here for convenience so that other files
 * in this folder can import it from this central types file instead of importing
 * directly from the Supabase package.
 *
 * This also means if the Supabase import path changes (e.g. when migrating from
 * auth-helpers-react to @supabase/ssr — see TODO above), you only need to update
 * the import in this one file rather than hunting down every file that uses it.
 */
export type { User }