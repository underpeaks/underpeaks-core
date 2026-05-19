"use client";

/**
 * @file VerifyEmailPage.tsx
 * @description
 * This is the Email Verification page. The user lands here after clicking the
 * verification link that was sent to their email address after sign-up.
 *
 * How does this page work?
 * -------------------------
 * The verification link in the email contains query parameters in the URL, e.g.:
 *   https://yourapp.com/verify-email?token=abc123&email=user@example.com
 *
 * This page reads those parameters and verifies them, but the exact behaviour
 * depends on which database backend the project is using (NEXT_PUBLIC_DB_TYPE):
 *
 *   1. Supabase:
 *      Supabase handles email verification entirely on its own — there is no
 *      token in the URL for us to validate manually. When the user clicks the
 *      Supabase verification link they are automatically redirected here.
 *      We simply show a success message and redirect them to /reset-password.
 *
 *   2. All other DB types (PostgreSQL, MySQL, MongoDB, Firebase custom):
 *      We read the ?token= and ?email= parameters from the URL and send them
 *      to our own /api/verify-email endpoint. That endpoint checks the token
 *      against the database and marks the email as verified.
 *      On success the user is redirected to /signin after 4 seconds.
 *
 * What are the possible page states?
 * ------------------------------------
 *   - loading  — The default state. Shown while the verification request is in flight.
 *   - success  — Shown when verification succeeded (or Supabase auto-verified).
 *   - error    — Shown when the token is missing, invalid, or the API call failed.
 *
 * ⚠️  Security rules for this page:
 *   - Never log the token from the URL — it is a one-time security credential
 *   - Never log the email address from the URL params
 */

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  Card,
  CardContent,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

/**
 * @component VerifyEmailPage
 * @description
 * Reads the verification token and email from the URL, calls the verification
 * API, and renders the appropriate status screen (loading, success, or error).
 *
 * No props required — all data comes from the URL query string.
 *
 * @returns {JSX.Element}
 */
export default function VerifyEmailPage() {
  /**
   * t() is the translation function from next-intl.
   * All keys for this page live under the "verifyEmail" namespace in en.json.
   */
  const t = useTranslations("verifyEmail");

  /**
   * searchParams gives us access to the URL query parameters.
   * We expect ?token=... and ?email=... to be present in the URL
   * for non-Supabase flows.
   * ⚠️ Never log the values of token or email from these params.
   */
  const searchParams = useSearchParams();

  /** Router used to redirect the user after verification completes. */
  const router = useRouter();

  // ─── State ─────────────────────────────────────────────────────────────────

  /**
   * The current verification status. Controls which UI is shown:
   *   - "loading" — spinner / waiting message (initial state)
   *   - "success" — verified successfully
   *   - "error"   — something went wrong
   */
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");

  /**
   * The message displayed below the status title.
   * Updated dynamically as verification progresses or fails.
   * Starts with the "Verifying your email..." loading message.
   */
  const [message, setMessage] = useState<string>(t("status.verifying"));

  // ─── Verification Effect ───────────────────────────────────────────────────

  /**
   * This effect runs once when the page first loads (and again if searchParams
   * or router changes, though that is uncommon).
   *
   * It performs the full verification flow described in the file header above.
   */
  useEffect(() => {
    /**
     * Read the token and email from the URL query string.
     * These are set by the verification link in the email we sent the user.
     * ⚠️ Never log these values — they are one-time security credentials.
     */
    const token = searchParams.get("token");
    const email = searchParams.get("email");

    /**
     * Check if this project uses Supabase as its database/auth backend.
     * NEXT_PUBLIC_DB_TYPE is set in .env and is safe to read in the browser.
     */
    const isSupabase = process.env.NEXT_PUBLIC_DB_TYPE === "supabase";

    // ── Supabase flow ──────────────────────────────────────────────────────
    /**
     * For Supabase projects, the email has already been verified by Supabase
     * before the user landed on this page — we don't need to do anything else.
     * We just show a success message and redirect to /reset-password after 2 seconds.
     */
    if (isSupabase) {
      setStatus("success");
      setMessage(t("status.supabaseRedirecting"));

      setTimeout(() => {
        router.push("/reset-password");
      }, 2000);

      return;
    }

    // ── Token + email validation ───────────────────────────────────────────
    /**
     * For all non-Supabase flows, both a token and an email must be present
     * in the URL. If either is missing the link is invalid or malformed.
     */
    if (!token || !email) {
      setStatus("error");
      setMessage(t("errors.missingTokenOrEmail"));
      return;
    }

    // ── Custom API verification flow ───────────────────────────────────────
    /**
     * @function verify
     * @description
     * Sends the token and email to our /api/verify-email endpoint.
     * The server looks up the token, checks it hasn't expired, matches it
     * to the email, and marks that email address as verified in the database.
     *
     * On success: updates status to "success" and redirects to /signin after 4 seconds.
     * On failure: updates status to "error" with the server's error message.
     *
     * We use encodeURIComponent() on the token and email before putting them
     * in the URL to safely handle any special characters they might contain.
     */
    const verify = async () => {
      try {
        const res = await fetch(
          `/api/verify-email?token=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}`
        );

        const data = await res.json();

        if (data.success) {
          setStatus("success");
          /**
           * Use the server's message if it provides one, otherwise fall back
           * to our own translated default success message.
           */
          setMessage(data.message || t("status.verified"));

          /**
           * Wait 4 seconds before redirecting so the user has time to read
           * the success message before being taken to sign-in.
           */
          setTimeout(() => {
            router.push("/signin");
          }, 4000);
        } else {
          setStatus("error");
          /**
           * Show the most specific error message available:
           * server error field → server message field → our own fallback.
           */
          setMessage(data.error || data.message || t("errors.verificationFailed"));
        }
      } catch (err: any) {
        /**
         * Network or unexpected errors — show a generic failure message.
         * We do not log the raw error to avoid exposing token or email values
         * that might be included in error stack traces.
         */
        setStatus("error");
        setMessage(err?.message || t("errors.verificationFailed"));
      }
    };

    verify();
  }, [searchParams, router, t]);

  // ─── Derived title ─────────────────────────────────────────────────────────

  /**
   * The card title is derived from the current status.
   * It updates automatically whenever the status state changes.
   */
  const title =
    status === "loading"
      ? t("titles.loading")
      : status === "success"
      ? t("titles.success")
      : t("titles.error");

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardContent className="text-center space-y-4 p-8">

          {/* Status title — updates based on loading / success / error state */}
          <CardTitle className="text-xl">{title}</CardTitle>

          {/* Status message — shows current progress or error detail */}
          <CardDescription className="text-base">
            {message}
          </CardDescription>

          {/*
           * "Go to Sign In" button.
           * Only shown once verification has completed (success or error).
           * Hidden during loading so the user doesn't navigate away mid-verification.
           */}
          {status !== "loading" && (
            <Button
              className="mt-4 w-full"
              onClick={() => router.push("/signin")}
            >
              {t("button.goToSignIn")}
            </Button>
          )}

        </CardContent>
      </Card>
    </div>
  );
}