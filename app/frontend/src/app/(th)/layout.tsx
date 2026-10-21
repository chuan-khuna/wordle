import { SiteDocument, siteMetadata } from "@/components/SiteDocument";
import { thaiFonts } from "@/lib/fonts-thai";

// The Thai route group's root layout: `<html lang="th">` and the Thai font, which English pages never load.
export const metadata = siteMetadata("th");

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <SiteDocument lang="th" fonts={thaiFonts}>{children}</SiteDocument>;
}
