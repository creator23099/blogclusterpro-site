"use client";

import { Toaster } from "sonner";

/**
 * Global toast provider for the entire app.
 * Automatically mounted in layout.tsx.
 */
export default function ClientToaster() {
  return (
    <Toaster
      position="top-right"
      richColors
      expand
      closeButton
      duration={5000}
    />
  );
}