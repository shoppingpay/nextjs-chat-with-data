"use client";

import { useEffect } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function ProtectedError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="lg:pl-72">
      <div className="mx-auto w-full max-w-screen-2xl px-4 py-6 sm:px-6 lg:px-8">
        <Card>
          <CardContent className="flex min-h-96 flex-col items-center justify-center text-center">
            <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-[#00ffbb]/20 text-slate-950">
              <AlertTriangle aria-hidden="true" className="h-6 w-6" />
            </span>
            <h2 className="mt-5 text-xl font-semibold text-slate-950">
              Something needs attention
            </h2>
            <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
              The dashboard could not finish loading this view. Try again to
              refresh the current state.
            </p>
            <Button className="mt-6" onClick={() => unstable_retry()} type="button">
              <RotateCcw aria-hidden="true" className="h-4 w-4" />
              Try again
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
