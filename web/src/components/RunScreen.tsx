"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { StepCoach } from "./StepCoach";
import type { Run } from "@/lib/data/runs";
import { api } from "@/lib/client/api";

/** Loads a run by the id in the URL, then hands it to the step coach. */
export function RunScreen() {
  const { id } = useParams<{ id: string }>();
  const [run, setRun] = useState<Run | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.run(id).then((r) => setRun(r.run)).catch((e) => setError(e.message));
  }, [id]);

  if (error) return <p className="p-6 text-center text-lg">{error}</p>;
  if (!run) return <p className="p-6 text-center text-lg text-muted">Getting your task ready…</p>;
  return <StepCoach run={run} />;
}
