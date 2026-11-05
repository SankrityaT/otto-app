import { Suspense } from "react";
import { ProfileScreen } from "@/components/raft/ProfileScreen";

export default function PersonPage() {
  return (
    <Suspense fallback={<p className="p-6 text-center">Loading</p>}>
      <ProfileScreen />
    </Suspense>
  );
}
