# Build plan

> This is the plan we wrote on Nov 4, kept as a record. Some names changed since (the crew became the raft, Ayin became Otto); the [README](../README.md) describes what we actually built.

Our plan for the Nov 5 submission. We wrote it after the AZACS visit and the First Place AZ research, then tightened it while pair programming with Claude Code.

## Goal

Help autistic students at AZACS work sites finish multi-step job tasks on their own, so they need fewer prompts by the time they reach a first job.

Two parts, one log:

1. **Step coach.** Show the next step as a picture. Check it with the camera. Give more help only when asked, and less over time.
2. **Crew.** A few students from the same work site who cheer each other on and help when someone is stuck.

## Features

### Step coach

| Feature | Priority |
| --- | --- |
| Start any task by saying it or showing it; Claude breaks it into steps | Must |
| One step at a time: picture, 8 words or fewer, read aloud, progress dots | Must |
| "Done" takes a photo; Claude checks the step | Must |
| Help ladder: nudge, hint, show me | Must |
| Log every step as "on my own" or "with help" | Must |
| Fading: after 3 runs with no help, start one level lower | Should |
| Staff can fix generated steps | Later |
| Spanish | Later |

### Crew

| Feature | Priority |
| --- | --- |
| Crews of 3–6 from one program, created by staff | Must |
| Shared weekly crew goal | Must |
| Weekly ring per student (steps on my own) | Must |
| One-tap cheers with preset words | Must |
| Ask a crewmate who has done the step | Must |
| "Less help than last month" badge | Should |

## Decisions

- **Weekly rings, not daily streaks.** Broken streaks make people quit, and leaderboards lowered motivation in studies. Rings restart quietly each week.
- **No "people nearby."** Crews come from the same program, added by staff. No location, no strangers.
- **Nothing is hardcoded.** Tasks and steps come from the student or from Claude. Settings come from `.env`.
- **Phone camera for the demo.** The otter device code goes in `device/`, but we haven't run it on a Pi yet, and we say so.
- **No photos stored.** A photo is taken only when the student taps Done or Help.
- **No accounts yet.** A profile picker for the demo.

## Milestones

- [x] Repo, README, research notes, prompt ledger
- [x] Server: tasks, steps, step check, help ladder, log
- [x] Step screen with Havi's otter, step pictures and 3D "show me"
- [x] Crew: goal, rings, cheers, ask a crewmate, practice buddies
- [x] Havi's pond home screen, and an otter colour for every student
- [x] Research pass: timers for timed steps, smaller steps on demand
- [x] Otter device code (XIAO camera; Raspberry Pi camera and buttons, not yet run on a Pi)
- [ ] Record the 30-second demo
- [ ] Deck, Business Model Canvas, prompts PDF, essays
