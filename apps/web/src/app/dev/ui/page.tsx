"use client";

import * as React from "react";
import { Inbox, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AccentCard,
  AreaLine,
  DayStrip,
  Delta,
  EmptyState,
  HatchBar,
  IconTile,
  LegendList,
  ListRow,
  MiniBars,
  Notice,
  SegmentBar,
  Segmented,
  SegmentGauge,
  StatBlock,
  StatusText,
  StackedBarChart,
  TipCard,
} from "@/components/elevora";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-muted">
        {title}
      </h2>
      {children}
    </section>
  );
}

function DevUiGallery() {
  const [day, setDay] = React.useState("wed");
  const [range, setRange] = React.useState("7d");

  return (
    <div className="min-h-dvh bg-canvas p-4 sm:p-6">
      <div className="mx-auto max-w-4xl space-y-10 rounded-xl border border-line bg-frame p-4 sm:p-6">
        <header>
          <h1 className="text-[24px] font-semibold tracking-[-0.02em] text-ink">
            Elevora UI gallery
          </h1>
          <p className="mt-1 text-sm text-ink-muted">Development preview of presentational components.</p>
        </header>

        <Section title="Stats & progress">
          <div className="grid gap-6 sm:grid-cols-2">
            <StatBlock label="Active employees" value="49" size="md">
              <Delta value="+3" context="vs last week" />
            </StatBlock>
            <div className="space-y-2">
              <HatchBar percent={72} tone="accent" />
              <HatchBar percent={45} tone="warn" size="sm" />
              <HatchBar percent={18} tone="idle" size="xs" />
            </div>
          </div>
        </Section>

        <Section title="Segments">
          <SegmentBar
            segments={[
              { value: 40, tone: "accent" },
              { value: 25, tone: "warn" },
              { value: 20, tone: "yellow" },
              { value: 15, tone: "idle" },
            ]}
          />
          <LegendList
            items={[
              { label: "Productive", value: "40%", tone: "accent" },
              { label: "Travel", value: "25%", tone: "warn" },
              { label: "Idle", value: "35%", tone: "idle" },
            ]}
          />
        </Section>

        <Section title="Charts">
          <div className="grid gap-6 md:grid-cols-2">
            <SegmentGauge percent={78} label="78%" sub="on-time clock-ins" />
            <MiniBars values={[4, 6, 5, 8, 7, 9, 12]} />
          </div>
          <AreaLine values={[12, 14, 11, 18, 16, 22, 20, 26, 24, 28]} className="max-h-[120px]" />
          <StackedBarChart
            seriesLabels={["Billable", "Admin"]}
            activeIndex={2}
            days={[
              { label: "Mon", values: [12, 4] },
              { label: "Tue", values: [18, 3] },
              { label: "Wed", values: [22, 6] },
              { label: "Thu", values: [15, 5] },
              { label: "Fri", values: [20, 2] },
            ]}
          />
        </Section>

        <Section title="Lists & tiles">
          <ListRow
            leading={
              <IconTile tone="accent">
                <Sparkles className="h-4 w-4" />
              </IconTile>
            }
            title="Payroll run"
            subtitle="October cycle"
            value="AED 84k"
            status="Pending"
          />
          <div className="flex flex-wrap gap-2">
            <StatusText status="Approved" />
            <StatusText status="In progress" />
            <StatusText status="Rejected" />
            <StatusText status="Draft" />
          </div>
        </Section>

        <Section title="Cards & controls">
          <div className="grid gap-4 sm:grid-cols-2">
            <TipCard
              title="Quick tip"
              copy="Use hatched bars to compare active vs idle periods at a glance."
            />
            <AccentCard>
              <div className="text-sm font-semibold">Upgrade plan</div>
              <p className="mt-1 text-xs opacity-90">Unlock advanced analytics for your team.</p>
            </AccentCard>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Segmented
              value={range}
              onChange={setRange}
              options={[
                { value: "7d", label: "7d" },
                { value: "30d", label: "30d" },
                { value: "90d", label: "90d" },
              ]}
            />
            <Button size="sm">Primary (ink)</Button>
          </div>
        </Section>

        <Section title="Feedback & day strip">
          <Notice tone="warn">Sync paused — check your connection.</Notice>
          <EmptyState
            icon={<Inbox className="h-5 w-5" />}
            title="No items yet"
            subtitle="When records appear, they will show up here."
            action={
              <Button size="sm" variant="outline">
                Refresh
              </Button>
            }
          />
          <DayStrip
            activeKey={day}
            onChange={setDay}
            days={[
              { key: "mon", label: "Mon", sub: "14" },
              { key: "tue", label: "Tue", sub: "15" },
              { key: "wed", label: "Wed", sub: "16" },
              { key: "thu", label: "Thu", sub: "17" },
              { key: "fri", label: "Fri", sub: "18" },
            ]}
          />
        </Section>
      </div>
    </div>
  );
}

export default function DevUiPage() {
  if (process.env.NODE_ENV !== "development") {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-canvas p-6 text-sm text-ink-muted">
        Dev only
      </div>
    );
  }

  return <DevUiGallery />;
}
