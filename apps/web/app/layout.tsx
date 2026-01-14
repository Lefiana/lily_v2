import type { Metadata } from "next";
import localFont from "next/font/local";
import { Toaster } from "sonner"; // Import the toast provider
import "./globals.css";
import { AuthProvider } from "@/components/auth/auth-provider";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
});

export const metadata: Metadata = {
  title: "LILY V2",
  description: "Task Management & Gacha System",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark"> 
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased bg-black`}>
        <AuthProvider>
        {/* GLOBAL BACKGROUND LAYER (The Gacha Reward Image) */}
        <div 
          className="fixed inset-0 -z-20 bg-cover bg-center transition-all duration-1000"
          style={{ 
            backgroundImage: 'url("https://images.alphacoders.com/132/1327105.png")', 
            filter: 'brightness(0.4)' 
          }}
        />
        {/* OVERLAY FOR TEXT READABILITY */}
        <div className="fixed inset-0 -z-10 bg-black/40 backdrop-blur-[2px]" />

        {/* MAIN CONTENT */}
        {children}
      </AuthProvider>
        {/* NOTIFICATIONS */}
        <Toaster richColors position="bottom-right" />
      </body>
    </html>
  );
}