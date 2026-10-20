import { OpenerDistribution } from "@/components/widgets/OpenerDistribution";

export const metadata = { title: "Opener Distribution" };

/** The Opener Distribution page: the Widget at full width. */
export default function OpenersPage() {
  return (
    <div className="relative min-w-0 space-y-8">
      <header className="max-w-measure space-y-4">
        <p className="eyebrow">Explore</p>
        <h1 className="text-3xl sm:text-4xl font-medium tracking-tight text-balance text-text">Opener Distribution</h1>
        <p className="text-lg text-meta">
          Play every word on the Guess List as the Opener, let the Solver finish each Game, and count how many Openers land at each Average Guess Count.
        </p>
      </header>
      <OpenerDistribution />
    </div>
  );
}
