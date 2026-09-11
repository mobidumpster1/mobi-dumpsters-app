"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { overlayCss, type SectionBackground } from "@/lib/websiteBuilderMedia";

// The one place that renders a section's background layer — used by both
// the editor and the live page (Hero/CtaBanner pass the same `background`
// value through either way), same "one renderer" principle as
// EditableText/EditableImage. Renders nothing for type: "color" (the
// section just keeps its normal background). Absolutely positioned to
// fill its parent — the parent <section> must be `position: relative`
// (and reserve height via its own min-height clamp) for this to sit
// correctly with no layout shift.
export function SectionBackgroundMedia({
  background,
  priority = false,
}: {
  background: SectionBackground;
  priority?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoAllowed, setVideoAllowed] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [inView, setInView] = useState(false);

  // Evaluated client-only, after mount — SSR/first paint always shows the
  // poster (this only ever gates whether a <video> mounts, and `hasStarted`
  // below stays false until IntersectionObserver fires regardless, so
  // there's never a hydration mismatch either way). Deliberately re-synced
  // on every `background` change (e.g. toggling "play on mobile" live in
  // the editor) rather than computed once, which is exactly the kind of
  // "subscribe to external system state" effect the setState-in-effect
  // lint rule's own guidance carves out.
  useEffect(() => {
    if (background.type !== "video") return;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const connection = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } })
      .connection;
    const saveData = connection?.saveData === true;
    const slowConnection = /2g/.test(connection?.effectiveType ?? "");
    const isMobile = window.matchMedia("(max-width: 767px)").matches;
    const blockedOnMobile = isMobile && !background.playOnMobile;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- syncing from an external system (matchMedia/connection), not derivable during render
    setVideoAllowed(!reducedMotion && !saveData && !slowConnection && !blockedOnMobile);
  }, [background]);

  useEffect(() => {
    if (!videoAllowed) return;
    const el = containerRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        setInView(entry.isIntersecting);
        if (entry.isIntersecting) setHasStarted(true);
      },
      { rootMargin: "200px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [videoAllowed]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (inView) void video.play().catch(() => {});
    else video.pause();
  }, [inView, hasStarted]);

  if (background.type === "color") return null;

  return (
    <div ref={containerRef} className="absolute inset-0 overflow-hidden">
      <Image
        src={background.type === "image" ? background.imageUrl : background.posterUrl}
        alt=""
        fill
        priority={priority}
        sizes="100vw"
        className="object-cover"
      />
      {background.type === "video" && videoAllowed && hasStarted && (
        <video
          ref={videoRef}
          autoPlay
          muted
          loop
          playsInline
          preload="none"
          poster={background.posterUrl}
          className="absolute inset-0 h-full w-full object-cover"
        >
          <source src={background.webmUrl} type="video/webm" />
          <source src={background.videoUrl} type="video/mp4" />
        </video>
      )}
      <div className="absolute inset-0" style={{ background: overlayCss(background.overlay) }} />
    </div>
  );
}
