import { Suspense } from "react";
import { RunScreen } from "@/components/RunScreen";
import { OtterWaits } from "@/components/OtterWaits";

export default function RunPage() {
  return (
    <Suspense fallback={<OtterWaits says="Getting your task ready" />}>
      <RunScreen />
    </Suspense>
  );
}
