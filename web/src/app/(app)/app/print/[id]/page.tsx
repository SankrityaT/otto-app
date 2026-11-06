import { Suspense } from "react";
import { StepCard } from "@/components/StepCard";
import { OtterWaits } from "@/components/OtterWaits";

export default function PrintPage() {
  return (
    <Suspense fallback={<OtterWaits says="Getting the step card" />}>
      <StepCard />
    </Suspense>
  );
}
