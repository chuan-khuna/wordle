import type { MDXComponents } from "mdx/types";
import { Term } from "@/components/Term";

// <Term> is available in every Article and Series without an import.
const components: MDXComponents = { Term };

export function useMDXComponents(): MDXComponents {
  return components;
}
