"use client";

/**
 * @file ConfirmDialog.tsx
 * @description
 * A reusable confirmation dialog (modal) component built on top of Radix UI's
 * Dialog primitive. It is used anywhere in the app where the user needs to
 * confirm or cancel a potentially destructive or important action before it runs.
 *
 * Common use cases:
 *   - "Are you sure you want to delete this project?"
 *   - "Are you sure you want to remove this user?"
 *   - "Are you sure you want to publish these changes?"
 *
 * How does it work?
 * ------------------
 * The parent component controls whether the dialog is open or closed via the
 * `open` and `onOpenChange` props. When the user clicks Confirm, `onConfirm`
 * is called and the dialog closes. When the user clicks Cancel, the dialog
 * closes without doing anything (or calls `onCancel` if provided).
 *
 * All visible text (title, description, button labels) is customisable via props,
 * with sensible translated defaults provided for each.
 *
 * Why Radix UI Dialog?
 * ---------------------
 * Radix UI provides accessible, unstyled dialog primitives that handle
 * focus trapping, keyboard navigation (Escape to close), and ARIA attributes
 * automatically. We layer our own styles on top.
 *
 * @example
 * ```tsx
 * const [open, setOpen] = useState(false)
 *
 * <ConfirmDialog
 *   open={open}
 *   onOpenChange={setOpen}
 *   title="Delete Project"
 *   description="This action cannot be undone."
 *   onConfirm={() => deleteProject(id)}
 * />
 * ```
 */

import * as Dialog from "@radix-ui/react-dialog";
import { Button } from "../../../components/ui/button";
import { useTranslations } from "next-intl";

/**
 * @interface ConfirmDialogProps
 * @description
 * The props accepted by the ConfirmDialog component.
 *
 * @property {boolean} open
 *   Controls whether the dialog is currently visible.
 *   Managed by the parent component.
 *
 * @property {(open: boolean) => void} onOpenChange
 *   Callback fired by Radix UI whenever the dialog's open state should change.
 *   The parent should update its own `open` state here.
 *   Also called with `false` when the user clicks the Confirm button.
 *
 * @property {string} [title]
 *   The heading text shown at the top of the dialog.
 *   Defaults to the translated "Confirm action" string.
 *
 * @property {string} [description]
 *   The body text shown below the title explaining what the user is confirming.
 *   Defaults to the translated "Are you sure you want to proceed?" string.
 *
 * @property {string} [confirmText]
 *   The label for the confirm (destructive) button.
 *   Defaults to the translated "Confirm" string.
 *
 * @property {string} [cancelText]
 *   The label for the cancel button.
 *   Defaults to the translated "Cancel" string.
 *
 * @property {() => void} onConfirm
 *   Callback fired when the user clicks the confirm button.
 *   This is where you put the action to execute (e.g. delete, publish).
 *
 * @property {() => void} [onCancel]
 *   Optional callback fired when the user clicks the cancel button.
 *   If not provided, the dialog simply closes with no side effects.
 */
interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel?: () => void;
}

/**
 * @component ConfirmDialog
 * @description
 * Renders an accessible modal dialog asking the user to confirm or cancel an action.
 *
 * The dialog is fully controlled — the parent component manages the open/closed
 * state via the `open` and `onOpenChange` props. All text content has translated
 * defaults but can be overridden per usage.
 *
 * @param {ConfirmDialogProps} props
 * @returns {JSX.Element}
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmText,
  cancelText,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  /**
   * t() is the translation function from next-intl.
   * All keys for this component live under the "confirmDialog" namespace in en.json.
   * We use t() for default values so that if the parent doesn't pass a prop,
   * the dialog still displays correctly translated text.
   */
  const t = useTranslations("confirmDialog");

  return (
    /**
     * Dialog.Root is the top-level Radix UI dialog controller.
     * `open` and `onOpenChange` wire up our parent-controlled open state
     * to Radix's internal dialog management.
     */
    <Dialog.Root open={open} onOpenChange={onOpenChange}>

      {/*
       * Dialog.Portal renders the dialog outside the normal DOM tree
       * (appended to document.body). This prevents z-index and overflow
       * clipping issues from parent elements affecting the modal.
       */}
      <Dialog.Portal>

        {/*
         * Dialog.Overlay is the semi-transparent black backdrop behind the dialog.
         * `data-[state=open]:animate-fadeIn` applies a fade-in animation
         * when the dialog opens (defined in your Tailwind config or global CSS).
         */}
        <Dialog.Overlay className="fixed inset-0 bg-black/50 data-[state=open]:animate-fadeIn" />

        {/*
         * Dialog.Content is the white dialog box itself.
         * Positioned in the exact centre of the screen using fixed positioning
         * combined with translate-x/y -50% (a common centring technique).
         * `data-[state=open]:animate-scaleIn` applies a scale-in animation on open.
         * `focus:outline-none` removes the default browser focus ring on the container.
         */}
        <Dialog.Content className="fixed top-[50%] left-[50%] max-w-lg w-full p-6 bg-white rounded-md shadow-lg -translate-x-[50%] -translate-y-[50%] focus:outline-none data-[state=open]:animate-scaleIn">

          {/*
           * Dialog.Title is the accessible heading for the dialog.
           * Screen readers announce this when the dialog opens.
           * Falls back to the translated default if no title prop is passed.
           */}
          <Dialog.Title className="text-lg font-semibold">
            {title ?? t("defaults.title")}
          </Dialog.Title>

          {/*
           * Dialog.Description provides additional context below the title.
           * Also announced by screen readers for accessibility.
           * Falls back to the translated default if no description prop is passed.
           */}
          <Dialog.Description className="mt-2 text-sm text-gray-600">
            {description ?? t("defaults.description")}
          </Dialog.Description>

          {/* Action buttons — right-aligned with a small gap between them */}
          <div className="mt-4 flex justify-end space-x-2">

            {/*
             * Cancel button — wrapped in Dialog.Close so Radix automatically
             * closes the dialog when it is clicked, without us needing to call
             * onOpenChange(false) manually. Also calls onCancel if provided.
             */}
            <Dialog.Close asChild>
              <Button variant="outline" onClick={onCancel}>
                {cancelText ?? t("buttons.cancel")}
              </Button>
            </Dialog.Close>

            {/*
             * Confirm button — styled as destructive (typically red) to signal
             * that this action may be irreversible.
             *
             * On click:
             *   1. Calls onConfirm() to execute the parent's action.
             *   2. Calls onOpenChange(false) to close the dialog.
             *
             * We close manually here (rather than using Dialog.Close) so we can
             * guarantee onConfirm always runs before the dialog closes.
             */}
            <Button
              variant="destructive"
              onClick={() => {
                onConfirm();
                onOpenChange(false);
              }}
            >
              {confirmText ?? t("buttons.confirm")}
            </Button>

          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}