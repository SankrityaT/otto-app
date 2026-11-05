# AI prompts

We built Ayin with Claude Code as a pair programmer. We wrote the plan and made the calls; Claude helped us research, polish the writing and write code, and we reviewed every change before it went in.

This file lists the prompts that shaped the project. Small requests like "fix this typo" or "rename this" are left out, and each prompt is lightly cleaned up for readability. We didn't keep a log before Nov 4, so the earlier entries are short versions written from memory; the organizers said that was fine.

## Tools

| Tool | What for |
| --- | --- |
| Claude Code | Research, planning, writing and reviewing code |
| Claude (inside Ayin) | Breaking a task into steps, checking a step from a photo, writing hints, drawing step pictures |
| Parakeet, run locally | Transcribing our AZACS tour recording without uploading it |

## Research and direction

| Date | Prompt | Result |
| --- | --- | --- |
| Oct 29 | Summarize the kickoff: rules, deadlines, rubric and partners. | A briefing we used to plan the two weeks |
| Oct 29 | Transcribe our AZACS tour on this laptop, then find the gaps for students. Keep what staff said separate from what we said. | A gap analysis with evidence labelled by source |
| Nov 2 | Re-read every resource and last year's winners. Where is our idea weak? | We dropped the glasses-first idea and focused on job tasks at AZACS work sites |
| Nov 2 | What can we learn from Farza's "Clicky" demo? | Answers should be visual, not chat |
| Nov 4 | Research First Place AZ, peer support, streaks and safety for autistic young people. | Weekly rings instead of streaks; closed crews instead of "people nearby" |

## Design and hardware

| Date | Prompt | Result |
| --- | --- | --- |
| Nov 2 | Turn our teammate's otter into a 3D-printable desk buddy that looks cute, not creepy. | The otter enclosure with a camera pebble and privacy shutter |
| Nov 3 | Which board and camera give the best picture for the otter? | Raspberry Pi with Camera Module 3 Wide |
| Nov 4 | Turn our plan into problems, features and visuals the team can review. | The plan in [`plan.md`](plan.md) |

## Building

| Date | Prompt | Result |
| --- | --- | --- |
| Nov 4 | Start a clean repo with a clear README and simple folders. | This repository's structure |
| Nov 4 | Build the step coach from the plan: steps, step check, help ladder, pictures, log and crew. The backend must give the same answer whether the photo comes from the phone or the otter. | The API in `web/src/app/api` and the Claude prompts in `web/src/lib/ai` |
| Nov 4 | The first screens look plain. Restyle them with Ayin's own design system from our earlier mockups. | Gloock headings, Lexend text, warm ground and dark ink buttons |
| Nov 5 | Make "show me" work like Farza's Clicky: turn the thing the student is stuck on into a 3D model with sticky-note labels. | Claude builds the model from simple shapes; three.js renders it on graph paper |
| Nov 5 | Add peer matching to the crew: pair students so each can show the other a step they've mastered. | Practice buddies, matched from the same log that drives fading |
| Nov 5 | Use Havi's pond UI instead of ours, and let each student customise their own otter. | Havi's pond, leaves, basket, talk bar and tabs wired to our data; each student's fur colour is saved |
| Nov 5 | Check the code against our research: time blindness, task breakdown and overwhelm. Make the 3D view fit and move. | Visual timers only for timed steps, "Smaller steps" on demand, a 3D view that fits itself and turns until touched |
| Nov 5 | Write the otter device code: the XIAO camera we have now, and the Raspberry Pi with Done, Help and Show me buttons for students who can't speak. | `device/xiao` and `device/pi`, both talking to the same API as the phone |
| Nov 5 | The otter looks fuzzy on phones. Make the artwork sharper without changing it. | Havi's layers upscaled 4× locally with Real-ESRGAN and saved at 2048 px |
| Nov 5 | Students without a camera, or doing a task on a computer, should be able to share a screen with Ayin instead. | "A shared screen" as a third choice for Ayin's eyes |
