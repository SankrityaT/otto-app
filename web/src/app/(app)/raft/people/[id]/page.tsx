import { Suspense } from "react";
import { ProfileScreen } from "@/components/raft/ProfileScreen";
import { OtterWaits } from "@/components/OtterWaits";

export default function PersonPage() {
  return (
    <Suspense fallback={<OtterWaits says="Finding them in the pond" />}>
      <ProfileScreen />
    </Suspense>
  );
}
