export function DemoBanner({ onExit }: { onExit: () => void }) {
  return (
    <div
      role="alert"
      className="sticky top-0 z-30 border-b border-fuchsia-300 bg-fuchsia-600 px-4 py-2 text-center text-sm font-medium text-white shadow"
    >
      <strong className="font-bold tracking-wide">DEMO DATA – not real fares.</strong> Prices on
      this page are randomly generated to preview the interface.{' '}
      <button
        type="button"
        onClick={onExit}
        className="underline underline-offset-2 hover:no-underline"
      >
        Exit demo
      </button>
    </div>
  );
}
