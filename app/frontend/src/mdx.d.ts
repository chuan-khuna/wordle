declare module "*.mdx" {
  import type { MDXProps } from "mdx/types";
  import type { ComponentType } from "react";
  /** `components` override the ones from mdx-components.tsx; a page passes the set for its language. */
  const Body: ComponentType<MDXProps>;
  export default Body;
}
