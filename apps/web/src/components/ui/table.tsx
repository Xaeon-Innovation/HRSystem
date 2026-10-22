import * as React from "react";
import { cn } from "@/lib/utils";

export function DataTableWrap({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("min-w-0 overflow-x-auto", className)}>{children}</div>
  );
}

export function DataTable({
  className,
  ...props
}: React.TableHTMLAttributes<HTMLTableElement>) {
  return (
    <table
      className={cn("w-full min-w-0 border-collapse text-[12.5px]", className)}
      {...props}
    />
  );
}

export function DataTableHead({
  className,
  ...props
}: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <thead className={cn(className)} {...props} />;
}

export function DataTableBody({
  className,
  ...props
}: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody className={cn(className)} {...props} />;
}

export function DataTableFoot({
  className,
  ...props
}: React.HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <tfoot
      className={cn(
        "border-t border-line-strong bg-surface-2 font-semibold text-ink",
        className,
      )}
      {...props}
    />
  );
}

export function DataTableRow({
  className,
  ...props
}: React.HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr
      className={cn(
        "border-b border-line transition-colors last:border-b-0 hover:bg-surface-2",
        className,
      )}
      {...props}
    />
  );
}

export function DataTableHeaderCell({
  className,
  numeric,
  ...props
}: React.ThHTMLAttributes<HTMLTableCellElement> & { numeric?: boolean }) {
  return (
    <th
      className={cn(
        "whitespace-nowrap px-3.5 py-2.5 text-start text-[11px] font-medium text-ink-muted first:ps-4 last:pe-4",
        numeric && "text-end tabular-nums",
        className,
      )}
      {...props}
    />
  );
}

export function DataTableCell({
  className,
  numeric,
  ...props
}: React.TdHTMLAttributes<HTMLTableCellElement> & { numeric?: boolean }) {
  return (
    <td
      className={cn(
        "whitespace-nowrap px-3.5 py-[11px] align-middle text-ink first:ps-4 last:pe-4",
        numeric && "text-end tabular-nums",
        className,
      )}
      {...props}
    />
  );
}
