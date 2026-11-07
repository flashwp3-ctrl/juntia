// T045 / FR-022; 04·17: las pantallas de acceso, en el marco común (src/features/auth/auth-frame.tsx).
import type { ReactNode } from "react";
import { AuthFrame } from "@/features/auth/auth-frame";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return <AuthFrame>{children}</AuthFrame>;
}
