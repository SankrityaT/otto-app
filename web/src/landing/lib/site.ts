// Everything that changes between deployments comes from the environment (see .env.example).

export const site = {
  /** The Otto app, for "Try Otto": on the same site, at /app. */
  appUrl: "/app",
  /** The demo video. Until it's set, the demo section shows a "coming soon" card. */
  demoVideoUrl: process.env.NEXT_PUBLIC_DEMO_VIDEO_URL || null,
  /** Where "Get in touch" emails go. Hidden when empty. */
  contactEmail: process.env.NEXT_PUBLIC_CONTACT_EMAIL || null,
  githubUrl: "https://github.com/SankrityaT/otto-app",
};

/** One of the landing page's own files, kept in public/landing. */
export const asset = (path: string) => `/landing${path}`;

/** The section links in the nav, in page order. */
export const NAV = [
  { href: "#how", label: "How it works" },
  { href: "#otter", label: "Your otter" },
  { href: "#raft", label: "Your raft" },
  { href: "#parents", label: "For parents" },
];
