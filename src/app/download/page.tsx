import type { Metadata } from "next";
import { DownloadPage } from "@/components/DownloadPage";

export const metadata: Metadata = {
  title: "Download PaperLens",
  description: "PaperLens for Mac, Windows and Linux. Use your Claude or ChatGPT subscription to understand any research paper.",
};

export default function Page() {
  return <DownloadPage />;
}
