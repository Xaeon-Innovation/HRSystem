"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { cn } from "@/lib/utils";

type BackgroundGradientAnimationProps = {
  gradientBackgroundStart?: string;
  gradientBackgroundEnd?: string;
  firstColor?: string;
  secondColor?: string;
  thirdColor?: string;
  fourthColor?: string;
  fifthColor?: string;
  pointerColor?: string;
  size?: string;
  blendingValue?: string;
  children?: React.ReactNode;
  className?: string;
  interactive?: boolean;
  containerClassName?: string;
};

/**
 * Aceternity-style gradient atmosphere.
 * Optimized for app shells: CSS vars on the container (not document.body),
 * interactive pointer off by default, CSS blur only (no SVG goo filter).
 */
export function BackgroundGradientAnimation({
  gradientBackgroundStart = "rgb(108, 0, 162)",
  gradientBackgroundEnd = "rgb(0, 17, 82)",
  firstColor = "18, 113, 255",
  secondColor = "221, 74, 255",
  thirdColor = "100, 220, 255",
  fourthColor = "200, 50, 50",
  fifthColor = "180, 180, 50",
  pointerColor = "140, 100, 255",
  size = "80%",
  blendingValue = "hard-light",
  children,
  className,
  interactive = false,
  containerClassName,
}: BackgroundGradientAnimationProps) {
  const interactiveRef = useRef<HTMLDivElement>(null);
  const cur = useRef({ x: 0, y: 0 });
  const target = useRef({ x: 0, y: 0 });
  const rafRef = useRef<number | null>(null);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduceMotion(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (!interactive || reduceMotion) return;

    const tick = () => {
      const el = interactiveRef.current;
      if (!el) return;
      cur.current.x += (target.current.x - cur.current.x) / 20;
      cur.current.y += (target.current.y - cur.current.y) / 20;
      el.style.transform = `translate(${Math.round(cur.current.x)}px, ${Math.round(cur.current.y)}px)`;
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, [interactive, reduceMotion]);

  const handleMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
    const el = interactiveRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    target.current.x = event.clientX - rect.left;
    target.current.y = event.clientY - rect.top;
  };

  const cssVars = {
    "--gradient-background-start": gradientBackgroundStart,
    "--gradient-background-end": gradientBackgroundEnd,
    "--first-color": firstColor,
    "--second-color": secondColor,
    "--third-color": thirdColor,
    "--fourth-color": fourthColor,
    "--fifth-color": fifthColor,
    "--pointer-color": pointerColor,
    "--size": size,
    "--blending-value": blendingValue,
  } as CSSProperties;

  const orbBase = cn(
    "absolute h-[var(--size)] w-[var(--size)]",
    "left-[calc(50%-var(--size)/2)] top-[calc(50%-var(--size)/2)]",
    "[mix-blend-mode:var(--blending-value)]",
  );

  return (
    <div
      className={cn(
        "relative h-full w-full overflow-hidden",
        "bg-[linear-gradient(40deg,var(--gradient-background-start),var(--gradient-background-end))]",
        containerClassName,
      )}
      style={cssVars}
    >
      {children ? (
        <div className={cn("relative z-10", className)}>{children}</div>
      ) : null}
      <div
        className={cn(
          "gradients-container absolute inset-0 h-full w-full blur-2xl",
          reduceMotion && "[&>*]:![animation:none]",
        )}
      >
        <div
          className={cn(
            orbBase,
            "[background:radial-gradient(circle_at_center,rgba(var(--first-color),0.8)_0,rgba(var(--first-color),0)_50%)_no-repeat]",
            "[transform-origin:center_center]",
            "animate-gradient-first opacity-100",
          )}
        />
        <div
          className={cn(
            orbBase,
            "[background:radial-gradient(circle_at_center,rgba(var(--second-color),0.8)_0,rgba(var(--second-color),0)_50%)_no-repeat]",
            "[transform-origin:calc(50%-400px)]",
            "animate-gradient-second opacity-100",
          )}
        />
        <div
          className={cn(
            orbBase,
            "[background:radial-gradient(circle_at_center,rgba(var(--third-color),0.8)_0,rgba(var(--third-color),0)_50%)_no-repeat]",
            "[transform-origin:calc(50%+400px)]",
            "animate-gradient-third opacity-100",
          )}
        />
        <div
          className={cn(
            orbBase,
            "[background:radial-gradient(circle_at_center,rgba(var(--fourth-color),0.8)_0,rgba(var(--fourth-color),0)_50%)_no-repeat]",
            "[transform-origin:calc(50%-200px)]",
            "animate-gradient-fourth opacity-70",
          )}
        />
        <div
          className={cn(
            orbBase,
            "[background:radial-gradient(circle_at_center,rgba(var(--fifth-color),0.8)_0,rgba(var(--fifth-color),0)_50%)_no-repeat]",
            "[transform-origin:calc(50%-800px)_calc(50%+800px)]",
            "animate-gradient-fifth opacity-100",
          )}
        />

        {interactive && !reduceMotion ? (
          <div
            ref={interactiveRef}
            onMouseMove={handleMouseMove}
            className={cn(
              "absolute -left-1/2 -top-1/2 h-full w-full opacity-70",
              "[background:radial-gradient(circle_at_center,rgba(var(--pointer-color),0.8)_0,rgba(var(--pointer-color),0)_50%)_no-repeat]",
              "[mix-blend-mode:var(--blending-value)]",
            )}
          />
        ) : null}
      </div>
    </div>
  );
}
