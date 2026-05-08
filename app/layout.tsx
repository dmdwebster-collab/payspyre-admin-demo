import type { Metadata } from "next";
import { Sidebar } from "@/components/layout/sidebar";
import "./globals.css";

export const metadata: Metadata = {
  title: "PaySpyre Admin",
  description: "Operator console for PaySpyre — Canadian dental patient financing.",
  icons: { icon: "/payspyre-logo.png" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="h-full">
        <div className="grid grid-cols-[240px_1fr] h-screen overflow-hidden">
          <Sidebar />
          <main className="flex flex-col overflow-hidden">{children}</main>
        </div>
      </body>
    </html>
  );
}
