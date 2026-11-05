# AI prompt ledger

This is the record of how we used AI to research, design and build Ayin. The challenge asks for it, and we want reviewers to see exactly where AI helped.

**How to read it**

- Prompts are lightly rewritten for clarity. They keep what we asked for but drop typos, side chatter and personal details (passwords, addresses, names of people outside the team).
- **Before Nov 4** we didn't keep a ledger, so that part is reconstructed from our session history. The organizers confirmed this is fine.
- **From Nov 4** we add entries as we work.
- A human read, tested and decided on every output. Nothing an AI wrote went into the repo without a teammate reviewing it.

**AI tools used**

| Tool | Used for |
| --- | --- |
| Claude Code (Claude Opus) | Research, design, planning, writing and reviewing code |
| Claude Haiku (inside Ayin) | Turning a task into steps, checking a step from a photo, drawing step pictures |
| Parakeet (runs locally) | Transcribing our recorded AZACS tour, so no audio left our laptop |
| Juno (our own browser agent) | Filling the daily progress-report form, from text we approved |

---

## Reconstructed history (Oct 20 – Nov 3)

### Oct 20–22 · Design and architecture ideas (no code)

| Prompt | What the AI did |
| --- | --- |
| Study well-designed wearable and companion apps and suggest an experience for neurodivergent users. | Collected reference apps and drafted screen mock-ups. |
| These mock-ups feel generic. Make them more custom and visual, with less text. | Redrew the mock-ups with custom illustrations and fewer words. |
| Explore logo and brand directions for Ayin. | Produced logo and type explorations for us to choose from. |
| Design a backend that is always available in the cloud but private by default. Compare how similar products do it. | Wrote an architecture: one core with many "doors" (app, glasses, chat), encrypted links, and a privacy review. |
| Check every infrastructure decision against our neurodivergent research. | Found that an always-on camera conflicts with the research; proposed "look only when asked" modes. |

### Oct 26–27 · First prototype

| Prompt | What the AI did |
| --- | --- |
| Walk me through wiring the ESP32 camera board step by step, in simple words. | Gave wiring steps and diagrams; helped upload the camera example. |
| Make the voice conversation feel real-time. | Compared speech-to-text and text-to-speech services and set up a streaming voice line. |
| Add "Make it simple": point at anything and get it explained, drawn, read aloud or shown in 3D. Don't hardcode cases. | Built an open-ended explainer that returns words, a drawing and a simple 3D model. |
| Let users teach Ayin their own objects so it can find them later. | Built "My things": teach an object with a few photos, then ask where it is. |
| Redesign the chat to suit neurodivergent users. Research how they use AI chat first. | Researched forums and studies, then redesigned the chat as a calm reading page. |
| Nothing can be hardcoded. Tasks, objects and timings must come from the user or the model. | Removed fixed lists and made durations come from the user, or a labelled estimate. |

### Oct 29 · Kickoff and partner research

| Prompt | What the AI did |
| --- | --- |
| Summarize the kickoff: rules, deadlines, judging criteria and partners. | Wrote a briefing covering the rubric, deliverables and partners. |
| Transcribe our AZACS tour recording on this laptop. | Ran Parakeet locally and produced a timestamped transcript. |
| From the transcript, find the real gaps for students and how Ayin could close them. Separate what staff said from what we said. | Wrote a gap analysis that labels evidence by source, plus 8 research topics with citations. |

### Nov 2–3 · Choosing the problem and the hardware

| Prompt | What the AI did |
| --- | --- |
| Read every resource again, including last year's winners, and tell us where we are weak. | Re-grounded the plan; corrected mistakes in our earlier notes. |
| These reference videos (Omi, Farza's "Clicky") show the feel we want. What can we learn from them? | Pulled out "visual answers, not chat" and the risk of creepy always-on AI. |
| Help us pick one problem we can prove with evidence. | Recommended coaching students through hands-on job tasks, with help that fades. |
| Turn our teammate's otter character into a 3D-printable desk buddy that looks cute, not creepy. | Generated a printable otter with a camera pebble, privacy shutter and light ring. |
| Which camera and board give the best picture for the otter? Check it fits the whole setup. | Compared boards and cameras; chose Raspberry Pi + Camera Module 3 Wide. |

---

## Ongoing ledger (from Nov 4)

| Date | Prompt | What the AI did |
| --- | --- | --- |
| Nov 4 | Research First Place AZ and the evidence on peer support, streaks and safety for autistic young people. | Found First Place's own words, the peer-support evidence, and evidence that broken streaks and leaderboards backfire. |
| Nov 4 | Turn the research into a build plan with problems, features and visuals. | Wrote the plan with a flow diagram, screen mock-ups and a demo storyboard. |
| Nov 4 | Start a clean repo with a clear README, simple code and this ledger. | Set up this repository's structure, README and `.gitignore`. |
