import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Pablo Valdes | DL",
  description: "Deep Learning Visualizations & Examples",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="">
        {children}
      </body>
    </html>
  );
}
