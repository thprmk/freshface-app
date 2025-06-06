// src/app/layout.tsx
// This will become a Client Component because we are instantiating providers
// that likely use client-side hooks (like useState in StaffProvider).
'use client'; 

import React from "react"; // React is needed for JSX
// import type { Metadata } from "next"; // Static metadata export might be ignored with 'use client'
import { Inter } from "next/font/google";
import "./globals.css";

// Adjust paths if these are located elsewhere
import { StaffProvider } from "../context/StaffContext";   // Assuming src/context/StaffContext.tsx
import { ThemeProvider } from "../context/ThemeContext"; // Assuming src/context/ThemeContext.tsx (if you use it)
import Sidebar from "@/components/Sidebar";              // Assuming src/components/Sidebar.tsx

const inter = Inter({ subsets: ["latin"] });

/*
// If 'use client' is used, this metadata object might not be applied as expected from this file.
// Manage metadata in individual page.tsx files or via next/head if this is a client component.
export const metadata: Metadata = {
  title: "ff project",
  description: "Modern salon management system",
};
*/

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <title>FF Project</title> {/* Manage title here or in pages for client components */}
        <meta name="description" content="Modern salon management system" />
      </head>
      <body className={`${inter.className} bg-gray-50`}>
        <ThemeProvider> {/* If you use ThemeProvider */}
          <StaffProvider> {/* <<<<----- StaffProvider now wraps your desired structure -----<<<< */}
            {/* Your original layout structure is preserved inside the providers */}
            <Sidebar /> {/* Assuming Sidebar doesn't need props like isOpen/toggleSidebar from layout */}
            <main className="ml-64 p-8 min-h-screen"> {/* Assumes Sidebar is w-64, added min-h-screen */}
              {children}
            </main>
          </StaffProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}