import { Suspense } from "react";
import { Thread } from "@/components/raft/Thread";
import { OtterWaits } from "@/components/OtterWaits";

export default function PostPage() {
  return (
    <Suspense fallback={<OtterWaits says="Opening the post" />}>
      <Thread />
    </Suspense>
  );
}
