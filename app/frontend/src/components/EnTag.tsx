/** The small "EN" tag beside the title of an Article that has no Translation: the link opens the English page. `label` is its accessible name. */
export function EnTag({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <span
      title={label}
      aria-label={label}
      className="ml-2 inline-block rounded-sm border border-rule-strong px-1 align-middle font-sans text-xs leading-4 tracking-caps text-meta"
    >
      {children}
    </span>
  );
}
