// Everything that changes between deployments comes from the environment (see .env.example).

export const site = {
  /** The running Ayin app, for "Try Ayin". */
  appUrl: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  /** The demo video. Until it's set, the demo section shows a "coming soon" card. */
  demoVideoUrl: process.env.NEXT_PUBLIC_DEMO_VIDEO_URL || null,
  /** Where "Get in touch" emails go. Hidden when empty. */
  contactEmail: process.env.NEXT_PUBLIC_CONTACT_EMAIL || null,
  githubUrl: "https://github.com/SankrityaT/ayin-app",
};

/** The section links in the nav, in page order. */
export const NAV = [
  { href: "#how", label: "How it works" },
  { href: "#otter", label: "Your otter" },
  { href: "#raft", label: "Your raft" },
  { href: "#parents", label: "For parents" },
];
