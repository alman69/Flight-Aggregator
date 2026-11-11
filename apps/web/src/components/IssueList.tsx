import type { Issue } from '@flight/core';
import { AlertIcon, InfoIcon } from './Icons';

export function IssueList({ issues }: { issues: readonly Issue[] }) {
  if (issues.length === 0) return null;
  return (
    <ul className="space-y-2">
      {issues.map((issue) => (
        <li
          key={`${issue.code}-${issue.field ?? ''}-${issue.message}`}
          role={issue.level === 'error' ? 'alert' : 'status'}
          className={`flex gap-2 rounded-lg px-3 py-2 text-sm ${
            issue.level === 'error'
              ? 'bg-rose-50 text-rose-800 dark:bg-rose-950/50 dark:text-rose-200'
              : 'bg-amber-50 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200'
          }`}
        >
          {issue.level === 'error' ? (
            <AlertIcon className="mt-0.5 shrink-0" />
          ) : (
            <InfoIcon className="mt-0.5 shrink-0" />
          )}
          <span>{issue.message}</span>
        </li>
      ))}
    </ul>
  );
}
