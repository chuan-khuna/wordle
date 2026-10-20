import { ThemePicker } from "@/components/ThemePicker";

const TILES = [
  { letter: "C", style: "bg-absent text-on-absent" },
  { letter: "R", style: "bg-present text-on-present" },
  { letter: "A", style: "bg-correct text-on-correct" },
  { letter: "N", style: "bg-absent text-on-absent" },
  { letter: "E", style: "bg-correct text-on-correct" },
];

const ROLES = ["background", "surface", "overlay", "text", "heading", "accent", "error", "success"];

export default function Home() {
  return (
    <main className="mx-auto max-w-2xl space-y-8 p-8">
      <header className="flex items-center justify-between gap-4">
        <h1 className="text-3xl font-bold text-heading">Solving Wordle</h1>
        <ThemePicker />
      </header>
      <p className="text-subtle">Articles come next. For now, pick a theme.</p>
      <div className="flex gap-2">
        {TILES.map((tile, i) => (
          <div key={i} className={`flex size-14 items-center justify-center rounded-md text-2xl font-bold ${tile.style}`}>
            {tile.letter}
          </div>
        ))}
      </div>
      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {ROLES.map((role) => (
          <li key={role} className="rounded-md border border-highlight-med bg-surface p-3 text-sm">
            <span className="mb-2 block h-6 rounded" style={{ background: `var(--${role})` }} />
            {role}
          </li>
        ))}
      </ul>
    </main>
  );
}
