import { getDriverColor } from "@/lib/driverColors";

// Shows a staff member's uploaded photo, or a colored initials circle when
// they haven't set one — the same driver-id-hashed palette used for
// calendar color-coding (driverColors.ts), so a given person's color stays
// consistent between their avatar and their calendar entries.
export function Avatar({
  userId,
  name,
  avatarUrl,
  size = 28,
}: {
  userId: string;
  name: string;
  avatarUrl?: string | null;
  size?: number;
}) {
  if (avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- a Vercel Blob URL, not a static asset next/image can optimize
      <img
        src={avatarUrl}
        alt={name}
        width={size}
        height={size}
        className="flex-shrink-0 rounded-full object-cover"
        style={{ width: size, height: size }}
      />
    );
  }

  const color = getDriverColor(userId);
  const initials = name
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <span
      className={`flex flex-shrink-0 items-center justify-center rounded-full font-bold ${color.bg || "bg-zinc-100"} ${color.text || "text-zinc-600"}`}
      style={{ width: size, height: size, fontSize: size * 0.4 }}
      title={name}
    >
      {initials || "?"}
    </span>
  );
}
