"use client";

import * as React from "react";
import {
  motion,
  useMotionValue,
  useSpring,
  type SpringOptions,
} from "motion/react";
import { cn } from "@/lib/utils";

type BubbleColors = {
  first: string;
  second: string;
  third: string;
  fourth: string;
  fifth: string;
  sixth: string;
};

type BubbleBackgroundProps = React.ComponentProps<"div"> & {
  interactive?: boolean;
  transition?: SpringOptions;
  colors?: BubbleColors;
};

const DEFAULT_COLORS: BubbleColors = {
  first: "12, 107, 151",
  second: "32, 160, 176",
  third: "14, 90, 120",
  fourth: "196, 154, 108",
  fifth: "40, 140, 132",
  sixth: "56, 170, 196",
};

function BubbleBackground({
  ref,
  className,
  children,
  interactive = false,
  transition = { stiffness: 100, damping: 20 },
  colors = DEFAULT_COLORS,
  style,
  ...props
}: BubbleBackgroundProps) {
  const filterId = React.useId().replace(/:/g, "");
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  React.useImperativeHandle(ref, () => containerRef.current as HTMLDivElement);

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const springX = useSpring(mouseX, transition);
  const springY = useSpring(mouseY, transition);

  const rectRef = React.useRef<DOMRect | null>(null);
  const rafIdRef = React.useRef<number | null>(null);
  const [reduceMotion, setReduceMotion] = React.useState(false);

  React.useLayoutEffect(() => {
    const updateRect = () => {
      if (containerRef.current) {
        rectRef.current = containerRef.current.getBoundingClientRect();
      }
    };

    updateRect();
    const el = containerRef.current;
    const ro = new ResizeObserver(updateRect);
    if (el) ro.observe(el);
    window.addEventListener("resize", updateRect);
    window.addEventListener("scroll", updateRect, { passive: true });
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", updateRect);
      window.removeEventListener("scroll", updateRect);
    };
  }, []);

  React.useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduceMotion(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  React.useEffect(() => {
    if (!interactive || reduceMotion) return;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = rectRef.current;
      if (!rect) return;
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      if (rafIdRef.current != null) cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = requestAnimationFrame(() => {
        mouseX.set(e.clientX - centerX);
        mouseY.set(e.clientY - centerY);
      });
    };

    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      if (rafIdRef.current != null) cancelAnimationFrame(rafIdRef.current);
    };
  }, [interactive, reduceMotion, mouseX, mouseY]);

  const orb = "pointer-events-none opacity-80 dark:opacity-70";

  return (
    <div
      ref={containerRef}
      data-slot="bubble-background"
      className={cn(
        "relative size-full overflow-hidden bg-transparent",
        className,
      )}
      style={
        {
          "--first-color": colors.first,
          "--second-color": colors.second,
          "--third-color": colors.third,
          "--fourth-color": colors.fourth,
          "--fifth-color": colors.fifth,
          "--sixth-color": colors.sixth,
          ...style,
        } as React.CSSProperties
      }
      {...props}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="absolute left-0 top-0 h-0 w-0"
        aria-hidden
      >
        <defs>
          <filter id={`${filterId}-goo`}>
            <feGaussianBlur
              in="SourceGraphic"
              stdDeviation="16"
              result="blur"
            />
            <feColorMatrix
              in="blur"
              mode="matrix"
              values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -8"
              result="goo"
            />
            <feBlend in="SourceGraphic" in2="goo" />
          </filter>
        </defs>
      </svg>

      <div
        className="absolute inset-0"
        style={{ filter: `url(#${filterId}-goo) blur(48px)` }}
      >
        <motion.div
          className={cn(
            orb,
            "absolute left-[10%] top-[10%] size-[80%] rounded-full bg-[radial-gradient(circle_at_center,rgba(var(--first-color),0.7)_0%,rgba(var(--first-color),0)_55%)]",
          )}
          animate={reduceMotion ? undefined : { y: [-24, 24, -24] }}
          transition={{ duration: 48, ease: "easeInOut", repeat: Infinity }}
          style={{ transform: "translateZ(0)", willChange: "transform" }}
        />

        <motion.div
          className="absolute inset-0 flex origin-[calc(50%-400px)] items-center justify-center"
          animate={reduceMotion ? undefined : { rotate: 360 }}
          transition={{
            duration: 50,
            ease: "linear",
            repeat: Infinity,
            repeatType: "loop",
          }}
          style={{ transform: "translateZ(0)", willChange: "transform" }}
        >
          <div
            className={cn(
              orb,
              "size-[80%] rounded-full bg-[radial-gradient(circle_at_center,rgba(var(--second-color),0.65)_0%,rgba(var(--second-color),0)_55%)]",
            )}
          />
        </motion.div>

        <motion.div
          className="absolute inset-0 flex origin-[calc(50%+400px)] items-center justify-center"
          animate={reduceMotion ? undefined : { rotate: 360 }}
          transition={{ duration: 70, ease: "linear", repeat: Infinity }}
          style={{ transform: "translateZ(0)", willChange: "transform" }}
        >
          <div
            className={cn(
              orb,
              "absolute left-[calc(50%-500px)] top-[calc(50%+200px)] size-[80%] rounded-full bg-[radial-gradient(circle_at_center,rgba(var(--third-color),0.6)_0%,rgba(var(--third-color),0)_55%)]",
            )}
          />
        </motion.div>

        <motion.div
          className={cn(
            orb,
            "absolute left-[10%] top-[10%] size-[80%] rounded-full bg-[radial-gradient(circle_at_center,rgba(var(--fourth-color),0.5)_0%,rgba(var(--fourth-color),0)_55%)] opacity-60",
          )}
          animate={reduceMotion ? undefined : { x: [-22, 22, -22] }}
          transition={{ duration: 62, ease: "easeInOut", repeat: Infinity }}
          style={{ transform: "translateZ(0)", willChange: "transform" }}
        />

        <motion.div
          className="absolute inset-0 flex origin-[calc(50%-800px)_calc(50%+200px)] items-center justify-center"
          animate={reduceMotion ? undefined : { rotate: 360 }}
          transition={{ duration: 56, ease: "linear", repeat: Infinity }}
          style={{ transform: "translateZ(0)", willChange: "transform" }}
        >
          <div
            className={cn(
              orb,
              "absolute left-[calc(50%-80%)] top-[calc(50%-80%)] size-[160%] rounded-full bg-[radial-gradient(circle_at_center,rgba(var(--fifth-color),0.55)_0%,rgba(var(--fifth-color),0)_55%)]",
            )}
          />
        </motion.div>

        {interactive && !reduceMotion ? (
          <motion.div
            className={cn(
              orb,
              "absolute size-full rounded-full bg-[radial-gradient(circle_at_center,rgba(var(--sixth-color),0.85)_0%,rgba(var(--sixth-color),0)_50%)] opacity-80",
            )}
            style={{
              x: springX,
              y: springY,
              willChange: "transform",
            }}
          />
        ) : null}
      </div>

      {children}
    </div>
  );
}

export { BubbleBackground, type BubbleBackgroundProps };
export type { BubbleColors };
