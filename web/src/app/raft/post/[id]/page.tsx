import { Suspense } from "react";
import { Thread } from "@/components/raft/Thread";

export default function PostPage() {
  return (
    <Suspense fallback={<p className="p-6 text-center">Loading</p>}>
      <Thread />
    </Suspense>
  );
}
