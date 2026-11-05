# Ayin landing page

The public page for Ayin, written for students and their parents. It's a static Next.js site, separate from the app in `web/`, so it can be deployed on its own.

## Run it

```bash
cd landing
npm install
npm run dev        # http://localhost:3001 (the app in web/ uses 3000)
```

Checks: `npm run lint`, `npx tsc --noEmit` and `npm run build`.

## Settings

All optional. Copy `.env.example` to `.env.local` to set them.

| Variable | What it does |
| --- | --- |
| `NEXT_PUBLIC_APP_URL` | Where "Try Ayin" goes. Defaults to `http://localhost:3000`. |
| `NEXT_PUBLIC_DEMO_VIDEO_URL` | The demo video: a YouTube or Vimeo link, or an `.mp4`. Until it's set, the demo section shows a "coming soon" card. |
| `NEXT_PUBLIC_CONTACT_EMAIL` | Adds a "Get in touch" button and footer link. |

## What's where

- `src/app/page.tsx` lists the sections in order. Each section is one file in `src/components/`.
- `src/components/otter/` is Havi's otter, copied from `web/` unchanged, with its artwork in `public/otter/`.
- `public/device/` holds renders of the 3D-printed otter from `hardware/otter/renders/`.

## Writing for this page

- Say "neurodivergent", never "autistic". Our partner school's name is the one exception.
- Playful, in sentence case. The otter gets the jokes, in its handwriting (the `OtterSays` bubble).
- Calm by design: soft colours, no red, gentle motion that stops when the device asks for reduced motion.
