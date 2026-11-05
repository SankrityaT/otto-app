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
| Nov 5 | The crew screen reads like a list, not a community. Make it about the crew together, and fix it in dark mode. | One pond everyone fills together, buddies with "practise together" invites, and a feed with cheers |
| Nov 5 | Ayin should talk with the student like a coach beside them while they look at the diagram or hold the real part. | Spoken questions answered from the step, the 3D model and what the camera sees, in about 3 seconds |
| Nov 5 | Read our First Place AZ tour notes and build what they teach: their five-stage skill model, pause points, and personal goals. | The five-stage path on every task, a calm start screen, "Watch" and "On my own" modes |
| Nov 5 | Look at Ama (withama.ai), a competitor, and say where Ayin is different. | Added to the research notes |
| Nov 5 | You can't tap Done with soapy hands. Make Ayin hands-free, and bring back Havi's "Now" section. | Voice on during tasks, "watch for me" checks until each step is done, "I did it" when the camera can't see, and "Now" for tasks in progress |
| Nov 5 | Make the raft a safe social space where students share wins and help each other, with custom stickers, not stock emoji. Add what Josh at First Place asked for: personal goals, a work card for employers, and a paper backup. | Wins and help board with replies and "This helped", Ayin's kindness check on every post, otter-themed stickers, profiles with goals and "how I work best", a shareable work card and printable step cards |
| Nov 5 | Add a real "Connect your otter" setup: find it, show a live photo through it, test its buttons, with no files to edit. | A four-step setup in the Me tab; the otter's address is saved in the app |
| Nov 5 | The raft needs kid safety: no profanity and blocking. Let students help each other in real time, using the same 3D backend as the solo coach. Nobody should have to type an otter's address. | A clean-language filter, one-tap blocking, photos and 3D models in help replies with live updates, and automatic otter discovery |
| Nov 5 | The 3D labels pile up and the cup came out as a torus. Make the models accurate and the labels readable. | Real cup and rounded-box shapes, clearer orientation rules, one label per part, and labels laid out in rows with lines |
| Nov 5 | Connecting a phone should need no typing. | A QR code in the Me tab that opens Ayin on the phone, already set to the student, and an https mode so the phone's camera works |
| Nov 5 | Saying hi should get a real answer, and the Watch screen must not scroll. Make the coach 3D and interactive, with Ayin talking you through it. | Ayin chats back out loud and offers a task to start; Watch plays every step as a 3D model, narrated, and you can talk back ("next", "back", or a question) |
| Nov 5 | Students won't trust a camera they can't see, and tapping Next mid-task is clumsy. Find a smarter way to notice a step is done. | A "What Ayin sees" window is always on screen; the browser spots movement then stillness and only then sends one photo to check the step |
| Nov 5 | The chat feels like a basic chatbot. Find research on how ND people and parents use AI, and make the chat calm, playful and right for them. | Research added to the notes; the talk happens in the pond itself (no chat window), words light up as Ayin speaks, every line can be replayed, and answers are leaf buttons |
| Nov 5 | Our students are capable young adults; don't teach them to wash their hands. | Step planning and chat now teach the job, not everyday life |
| Nov 5 | The otter feels like a video on loop. Make it react to the student. | Spring-based reactions on Havi's otter: it leans toward your finger, leans in to listen, sways while thinking, hops on each spoken word, and a tap gets a happy bounce; tapping the floating otter starts a chat |
| Nov 5 | The raft still feels like a generic feed. Focusmate is a competitor: make the raft about working alongside each other. Drop the side panels on Today too. | One shared pond showing who's working now; "Do it together" links two students' runs so each sees the other's otter move and can send preset cheers; Today keeps only the pond, talk bar and tappable task leaves |
