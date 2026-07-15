import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { WorkspaceProvider } from "@/context/WorkspaceContext";

export const metadata: Metadata = {
  title: "Anamnesic",
  description: "Context & memory that follows you across every AI tool.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        <AuthProvider>
          <WorkspaceProvider>{children}</WorkspaceProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
