import type { Variants } from "framer-motion";

// Soft, springy editorial reveals reused across the app.
export const EASE = [0.22, 1, 0.36, 1] as const;

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE } },
};

export const stagger = (gap = 0.07, delay = 0): Variants => ({
  hidden: {},
  show: { transition: { staggerChildren: gap, delayChildren: delay } },
});

export const springCard = {
  type: "spring" as const,
  stiffness: 220,
  damping: 26,
  mass: 0.9,
};
