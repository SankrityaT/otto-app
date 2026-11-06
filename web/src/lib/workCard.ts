// Tips for a supervisor or coworker, one for each "how I work best" phrase a student picks.
// The student chooses what to share; these turn their choices into plain advice.

export const TIPS: Record<string, string> = {
  "One step at a time": "Give one step at a time, and wait until it's done before the next.",
  "Show me, then let me try": "Show the task once, then let me try it while you watch.",
  "Pictures over words": "A picture or a quick demo works better than a long explanation.",
  "Words over pictures": "Clear spoken or written words work best for me.",
  "Quiet is good": "A quiet spot helps me focus. I may not chat while I work.",
  "Talking it through helps": "Talking through the task with me helps it stick.",
  "Give me time to think": "Give me a few seconds to answer before you repeat the question.",
  "Tell me what's changing first": "Tell me before plans or tasks change, so I can get ready.",
};

export function tipsFor(workStyle: string[]): string[] {
  return workStyle.map((style) => TIPS[style]).filter((tip): tip is string => Boolean(tip));
}
