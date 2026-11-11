import type { FareStatus } from '@flight/core';

const STYLES: Record<FareStatus, string> = {
  demo: 'bg-fuchsia-100 text-fuchsia-800 dark:bg-fuchsia-950 dark:text-fuchsia-200',
  cached: 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-200',
  manual: 'bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-200',
  live: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200',
};

const LABELS: Record<FareStatus, string> = {
  demo: 'Demo',
  cached: 'Cached',
  manual: 'Manual',
  live: 'Live',
};

export function StatusTag({ status, className = '' }: { status: FareStatus; className?: string }) {
  return (
    <span
      className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] leading-none font-semibold tracking-wide uppercase ${STYLES[status]} ${className}`}
    >
      {LABELS[status]}
    </span>
  );
}
