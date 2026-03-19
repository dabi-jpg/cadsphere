import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "CADSphere — Secure CAD File Storage",
  description: "Enterprise-grade CAD file storage platform with 3D viewing, secure cloud storage, and team collaboration.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />
      </head>
      <body
        className={`${inter.variable} font-sans antialiased`}
      >
        {children}
        <Toaster
          theme="light"
          position="bottom-right"
          toastOptions={{
            duration: 3000,
          }}
        />
      </body>
    </html>
  );
}
