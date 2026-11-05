import { Suspense } from "react";
import { RunScreen } from "@/components/RunScreen";

export default function RunPage() {
  return (
    <Suspense fallback={<p className="p-6 text-center text-lg text-muted">Getting your task ready…</p>}>
      <RunScreen />
    </Suspense>
  );
}
