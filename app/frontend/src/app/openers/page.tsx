import Link from "next/link";
import { OpenerDistribution } from "@/components/widgets/OpenerDistribution";

export const metadata = { title: "Opener Distribution" };

/** The Opener Distribution page: the Widget at full width, with every control. */
export default function OpenersPage() {
  return (
    <div className="relative min-w-0 space-y-8">
      <header className="max-w-measure space-y-4">
        <p className="eyebrow">Explore</p>
        <h1 className="text-3xl sm:text-4xl font-medium tracking-tight text-balance text-text">Opener Distribution</h1>
        <p className="text-lg text-meta">
          Play every word on the Guess List as the Opener, let the Solver finish each Game, and count how many Openers land at each Average Guess Count.
        </p>
        <p className="text-base text-meta">
          Each block is one Opener. Hover a block to see its stats, or click a bar to list the Openers in it. Pick a Strategy, show only Answer List words, or
          highlight a few words by name.
          {" "}
          <Link href="/articles/opener-distribution" className="underline">How it works</Link>.
        </p>
      </header>
      <OpenerDistribution tabs />
    </div>
  );
}
