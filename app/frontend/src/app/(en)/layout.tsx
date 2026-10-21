import { SiteDocument, siteMetadata } from "@/components/site/SiteDocument";

// English and Thai are two route groups, each with its own root layout, so `<html lang>` is right in the static HTML of every page.
export const metadata = siteMetadata("en");

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <SiteDocument lang="en">{children}</SiteDocument>;
}
