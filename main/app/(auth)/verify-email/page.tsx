"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Card, CardContent, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function VerifyEmailPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState<string>("Verifying your email...");

  useEffect(() => {
    const token = searchParams.get("token");

    // ✅ Supabase check (ONLY ADDITION)
    const isSupabase = process.env.NEXT_PUBLIC_DB_TYPE === "supabase";

    if (isSupabase) {
      setStatus("success");
      setMessage("Redirecting to password setup...");

      setTimeout(() => {
        router.push("/reset-password");
      }, 2000);

      return;
    }

    // ---- EXISTING LOGIC (UNCHANGED) ----
    if (!token) {
      setStatus("error");
      setMessage("Invalid or missing verification token.");
      return;
    }

    const verify = async () => {
      try {
        const res = await fetch(`/api/verify-email?token=${token}`);
        const data = await res.json();

        if (data.success) {
          setStatus("success");
          setMessage(data.message || "Your email has been verified.");

          setTimeout(() => {
            router.push("/signin");
          }, 4000);
        } else {
          setStatus("error");
          setMessage(data.message || "Verification failed.");
        }
      } catch (err: any) {
        setStatus("error");
        setMessage(err?.message || "Verification failed.");
      }
    };

    verify();
  }, [searchParams, router]);

  const title =
    status === "loading"
      ? "Verifying Email"
      : status === "success"
      ? "Email Verified ✅"
      : "Verification Failed";

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardContent className="text-center space-y-4 p-8">
          <CardTitle className="text-xl">{title}</CardTitle>

          <CardDescription className="text-base">
            {message}
          </CardDescription>

          {status !== "loading" && (
            <Button
              className="mt-4 w-full"
              onClick={() => router.push("/signin")}
            >
              Go to Sign In
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}