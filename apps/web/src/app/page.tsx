import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";

export default function HomePage() {
  return (
    <div className="relative mx-auto flex min-h-dvh max-w-lg flex-col justify-center gap-6 px-6 py-10">
      <div className="absolute right-6 top-6">
        <ThemeToggle />
      </div>
      <div className="space-y-3">
        <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">
          Creative Multi Solutions
        </p>
        <h1 className="text-4xl font-semibold tracking-tight text-foreground">
          HR Track
        </h1>
        <p className="text-muted-foreground">
          Mobile-first workforce clock-in, KPIs, and live field location for
          outdoor teams.
        </p>
      </div>
      <Button asChild size="lg" className="w-full">
        <Link href="/login">Sign in</Link>
      </Button>
    </div>
  );
}
