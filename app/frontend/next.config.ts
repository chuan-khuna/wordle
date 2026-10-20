import createMDX from "@next/mdx";
import type { NextConfig } from "next";

// Where the FastAPI backend runs. Next proxies /api/* there, so the browser only talks to one origin.
const BACKEND_URL = process.env.BACKEND_URL ?? "http://127.0.0.1:8000";

const nextConfig: NextConfig = {
  pageExtensions: ["ts", "tsx", "md", "mdx"],
  // The dev indicator defaults to bottom-left, on top of the sidebar's theme button.
  devIndicators: { position: "bottom-right" },
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${BACKEND_URL}/api/:path*` }];
  },
};

// Plugins are named by string, with serialisable options, because Turbopack cannot be handed functions.
const withMDX = createMDX({
  options: {
    // remark-frontmatter drops the `---` block from the output; lib/content.ts reads it with gray-matter.
    remarkPlugins: ["remark-frontmatter", "remark-math"],
    rehypePlugins: [["rehype-katex", { strict: "error", throwOnError: true }]],
  },
});

export default withMDX(nextConfig);
