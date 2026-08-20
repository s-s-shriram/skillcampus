import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SkillCampus",
  description: "All-in-One Learning, Coding, Aptitude & Placement Platform",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
