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
