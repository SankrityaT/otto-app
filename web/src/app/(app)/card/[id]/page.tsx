import { Suspense } from "react";
import { WorkCard } from "@/components/WorkCard";
import { OtterWaits } from "@/components/OtterWaits";

export default function WorkCardPage() {
  return (
    <Suspense fallback={<OtterWaits says="Getting the card" />}>
      <WorkCard />
    </Suspense>
  );
}
