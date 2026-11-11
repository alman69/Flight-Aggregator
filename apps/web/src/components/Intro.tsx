const LABELS = [
  {
    tag: 'Cached',
    className: 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-200',
    text: 'A price someone else saw recently, from a cache. Shown with its age. Arrives in Milestone 3.',
  },
  {
    tag: 'Manual',
    className: 'bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-200',
    text: 'A price you saw on a provider and saved yourself. Arrives in Milestone 2.',
  },
  {
    tag: 'Links',
    className: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200',
    text: 'Every date combination links to all eight providers, with the dates filled in where the provider supports it.',
  },
];

export function Intro() {
  return (
    <section className="mt-8 grid gap-4 md:grid-cols-3" aria-label="How prices are labeled">
      {LABELS.map((l) => (
        <div
          key={l.tag}
          className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
        >
          <span
            className={`rounded px-1.5 py-0.5 text-[11px] font-semibold uppercase ${l.className}`}
          >
            {l.tag}
          </span>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">{l.text}</p>
        </div>
      ))}
      <p className="text-sm text-slate-500 md:col-span-3">
        This app never invents prices. Dates without an observed fare stay empty — which never means
        there are no flights.
      </p>
    </section>
  );
}
