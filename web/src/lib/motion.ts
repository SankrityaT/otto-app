// Hands-free checking without sending a stream anywhere: the browser compares tiny copies of
// the camera picture itself, and Ayin only takes a photo once the student moved and then
// held still, which is usually the moment a step has just been done.

/** Average change per colour channel between two frames of RGBA pixels, from 0 to 255. */
export function frameChange(a: ArrayLike<number>, b: ArrayLike<number>): number {
  let total = 0;
  let channels = 0;
  for (let i = 0; i < a.length; i += 4) {
    total += Math.abs(a[i] - b[i]) + Math.abs(a[i + 1] - b[i + 1]) + Math.abs(a[i + 2] - b[i + 2]);
    channels += 3;
  }
  return channels === 0 ? 0 : total / channels;
}

/** A change bigger than this means something is moving in front of the camera. */
export const MOVING = 10;
/** How long the picture must stay still after moving before Ayin looks. */
export const STILL_MS = 1500;

/**
 * Follows frames over time and says when to look: after movement, once things have been
 * still for STILL_MS. Looking once resets it, so standing still doesn't keep asking.
 */
export function stillAfterMotion() {
  let moved = false;
  let lastMove = 0;
  return (change: number, now: number): boolean => {
    if (change > MOVING) {
      moved = true;
      lastMove = now;
      return false;
    }
    if (moved && now - lastMove >= STILL_MS) {
      moved = false;
      return true;
    }
    return false;
  };
}
