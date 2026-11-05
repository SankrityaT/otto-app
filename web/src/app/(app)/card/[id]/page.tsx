import { Suspense } from "react";
import { WorkCard } from "@/components/WorkCard";

export default function WorkCardPage() {
  return (
    <Suspense fallback={<p className="p-6 text-center">Loading</p>}>
      <WorkCard />
    </Suspense>
  );
}
