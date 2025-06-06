// src/app/providers.tsx
'use client'; // This component MUST be a client component

import React from 'react';
import { StaffProvider } from '../context/StaffContext';   // Adjust path if StaffContext is not in ../context/
import { ThemeProvider } from '../context/ThemeContext'; // Adjust path if ThemeContext is not in ../context/

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider> {/* ThemeProvider can wrap StaffProvider or vice-versa */}
      <StaffProvider>
        {children}
      </StaffProvider>
    </ThemeProvider>
  );
}