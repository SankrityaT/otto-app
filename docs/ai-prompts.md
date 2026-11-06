# AI prompts

We built Ayin with Claude Code as a pair programmer. We wrote the plan and made the calls; Claude helped us research, polish the writing and write code, and we reviewed every change before it went in.

This file lists the prompts that shaped the project, grouped by the part of Ayin they built. Small requests ("fix this typo", "make this button bigger") and ideas we tried and then dropped are left out. Each prompt is lightly cleaned up for readability, and each result describes what is in the app now. We didn't keep a log before Nov 4, so the earlier entries are short versions written from memory; the organizers said that was fine.

## Tools

| Tool | What for |
| --- | --- |
| Claude Code | Research, planning, writing and reviewing code |
| Claude (inside Ayin) | Breaking a task into steps, checking a step from a photo, hints, step pictures, 3D "show me" models, the voice coach, chat, and checking raft posts for kindness |
| Parakeet, run locally | Transcribing our AZACS tour recording without uploading it |
| Real-ESRGAN, run locally | Upscaling Havi's otter artwork so it stays sharp on phones |

## Research and direction

| Date | Prompt | Result |
| --- | --- | --- |
| Oct 29 | Summarize the kickoff: rules, deadlines, rubric and partners. | A briefing we used to plan the two weeks |
| Oct 29 | Transcribe our AZACS tour on this laptop, then find the gaps for students. Keep what staff said separate from what we said. | A gap analysis with evidence labelled by source |
| Nov 2 | Re-read every resource and last year's winners. Where is our idea weak? | We dropped the glasses-first idea and focused on job tasks at AZACS work sites |
| Nov 2 | What can we learn from Farza's "Clicky" demo? | Answers should be visual, not walls of text |
| Nov 4 | Research First Place AZ, peer support, streaks and safety for autistic young people. | Weekly rings instead of streaks, closed rafts instead of "people nearby" |
| Nov 5 | Read our First Place AZ tour notes and build what they teach. | Their five-stage skill path on every task, a calm start screen, personal goals and a work card for employers |
| Nov 5 | Look at our competitors, Ama and Focusmate, and say where Ayin is different. | Added to [`research.md`](research.md): ages 16–22, hands-on job tasks, and working alongside raftmates without video |
| Nov 5 | Find research on how neurodivergent people and their parents use AI, and how we should position Ayin. | Research and positioning in [`research.md`](research.md): extend job coaches, be a tool not a friend, and fade on purpose |

## Design and hardware

| Date | Prompt | Result |
| --- | --- | --- |
| Nov 2 | Turn our teammate's otter into a 3D-printable desk buddy that looks cute, not creepy. | The otter enclosure with a camera pebble and privacy shutter |
| Nov 3 | Which board and camera give the best picture for the otter? | Raspberry Pi with Camera Module 3 Wide |
| Nov 4 | Turn our plan into problems, features and visuals the team can review. | The plan in [`plan.md`](plan.md) |
| Nov 5 | Use Havi's pond and otter for the app instead of our own styling, and let each student pick their otter's colour. | Havi's pond, otter, talk bar and tabs, with light and dark mode |
| Nov 5 | Write the otter device code: the XIAO camera we have now, and the Raspberry Pi with Done, Help and Show me buttons for students who can't speak. | `device/xiao` and `device/pi`, both talking to the same API as the phone |

## The step coach

| Date | Prompt | Result |
| --- | --- | --- |
| Nov 4 | Start a clean repo with a clear README and simple folders. | This repository's structure |
| Nov 4 | Build the step coach from the plan: steps, step check, help ladder, pictures and a log. The backend must give the same answer whether the photo comes from the phone or the otter. | The API in `web/src/app/api` and the Claude prompts in `web/src/lib/ai` |
| Nov 5 | Make "show me" work like Farza's Clicky: turn the thing the student is stuck on into a 3D model with labels. Keep it accurate and readable. | Claude builds the model from simple shapes; three.js renders it with labels in tidy rows |
| Nov 5 | Check the code against our research on time blindness, task breakdown and overwhelm. | Visual timers for timed steps, "Smaller steps" on demand, one step on screen at a time |
| Nov 5 | Every screen must fit without scrolling, and the "Watch" stage should be 3D and talked through, not a list. | Watch plays each step as a 3D model, read aloud; the student can say "next", "back" or ask a question |
| Nov 5 | You can't tap Done with soapy hands, and students won't trust a camera they can't see. | Voice during tasks; Ayin notices a step is done when the student moves and then holds still; a "What Ayin sees" window is always on screen |
| Nov 5 | Ayin should coach out loud like someone beside the student, looking at what they're holding. | Spoken questions answered from the step, the 3D model and the camera, in about 3 seconds |
| Nov 5 | Be very careful with safety: Ayin must never help with weapons, self-harm or hurting anyone. | One set of safety rules in every prompt, enforced by the server: unsafe tasks get no steps, and a student at risk always hears "talk to a staff member" and the 988 line |
| Nov 5 | Our students are capable young adults; don't teach them to wash their hands. | Step planning and chat teach the job, not everyday life |
| Nov 5 | Use the real voice we had before (Cartesia or Deepgram). While a 3D model takes time, show it being built and make small talk, not a loading screen. Nothing hardcoded. | Cartesia Sonic with a Deepgram backup; models stream in part by part as blueprint wireframes with the otter calling out each part; Claude makes small talk until the model is ready |
| Nov 5 | Students without a camera, or doing a task on a computer, should be able to share a screen with Ayin instead. | "A shared screen" as a third choice for Ayin's eyes |
| Nov 5 | Ayin keeps talking to itself, and the camera view is too small. Add a hands-free mode. | One Hands-free switch; Ayin ignores its own voice through the microphone; what Ayin sees is big on every task screen |

## Talking with Ayin

| Date | Prompt | Result |
| --- | --- | --- |
| Nov 5 | Saying hi should get a real answer, and it shouldn't feel like a basic chatbot. | The conversation happens in the pond: Ayin's words light up as it speaks, any line can be heard again, there are always ready answers to tap, and the student taps Start for a task |
| Nov 5 | The otter feels like a video on loop. Make it react to the student. | Havi's otter leans toward your finger, leans in to listen, sways while thinking, hops on each spoken word and bounces when tapped |

## The raft

| Date | Prompt | Result |
| --- | --- | --- |
| Nov 5 | Pair students so each can show the other a step they've mastered. | Practice buddies, matched from the same log that drives fading |
| Nov 5 | Make the raft a safe social space where students share wins and help each other, with custom stickers, not stock emoji. | Wins and a help board with replies and "This helped", otter-themed stickers, profiles with goals and "how I work best" |
| Nov 5 | The raft needs kid safety: no profanity and blocking. Students should help each other with the same 3D models as the coach. | A clean-language filter, Ayin's kindness check on every post, one-tap blocking and reporting, and 3D models in help replies |
| Nov 5 | Make the raft about working alongside each other, like Focusmate, but safe for our students. | "Do it together": two raftmates each see the other's otter and progress during a task, with preset cheers and no video |
| Nov 5 | Use Havi's raft design and make it live, so you can see a friend needs help without reading a feed. | Havi's pond of otters acts out real events: asking for help, steps done alone, cheers, finished tasks and working together; one card says what you can do |

## Setup

| Date | Prompt | Result |
| --- | --- | --- |
| Nov 5 | The otter looks fuzzy on phones. Make the artwork sharper without changing it. | Havi's layers upscaled 4× and saved at 2048 px |
| Nov 5 | The "Who's working today?" picker doesn't make sense, and it shows every student's name. | Ayin asks your first name, you pick your otter's colour and join your raft with a code from your teacher; names are only shown inside a raft |
| Nov 5 | Connecting the otter or a phone should need no typing. | Automatic otter discovery with a live test photo, and a QR code that opens Ayin on a phone already set to the student |
