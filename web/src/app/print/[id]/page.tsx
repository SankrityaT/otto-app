import { Suspense } from "react";
import { StepCard } from "@/components/StepCard";

export default function PrintPage() {
  return (
    <Suspense fallback={<p className="p-6 text-center">Loading</p>}>
      <StepCard />
    </Suspense>
  );
}
