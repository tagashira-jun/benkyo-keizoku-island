"use client";

import dynamic from "next/dynamic";
import { ReactNode } from "react";

// Dynamic import to prevent Firebase from initializing during SSG/SSR
const AuthProvider = dynamic(
  () => import("@/contexts/AuthContext").then((mod) => mod.AuthProvider),
  { ssr: false }
);

export default function ClientProvider({ children }: { children: ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}
