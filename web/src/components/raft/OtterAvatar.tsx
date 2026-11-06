import UprightOtter from "../otter/UprightOtter";

/** A student's own otter, in a small round frame. */
export function OtterAvatar({ furHue, size = 44 }: { furHue: number; size?: number }) {
  return (
    <span className="grid shrink-0 place-items-center overflow-hidden rounded-full bg-clay" style={{ width: size, height: size }}>
      <UprightOtter className="h-full w-full translate-y-[6%] scale-110" furHue={furHue} active={false} />
    </span>
  );
}
