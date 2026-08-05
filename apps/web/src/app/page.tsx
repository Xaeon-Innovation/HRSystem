import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center gap-6 px-6 py-10">
      <div className="space-y-3">
        <p className="text-sm uppercase tracking-[0.2em] text-primary">
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
