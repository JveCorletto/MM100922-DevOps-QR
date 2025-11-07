// app/layout.tsx
import "./globals.css";
import type { Metadata } from "next";
import NavBar from "@/components/NavBar";
import { Toaster } from "react-hot-toast";

export const metadata: Metadata = {
  title: "Sistema de Encuestas con QR",
  description: "Crea, publica y analiza encuestas con acceso por QR o enlace público",
};

// 👇 AÑADIR ESTO
export const viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        <NavBar />
        {children}
        <Toaster
          position="top-center"
          toastOptions={{
            style: {
              background: "#FAF5E9",
              color: "#4A4544",
              border: "1px solid #C1E1C1",
              borderRadius: "12px",
              fontSize: "0.95rem",
            },
            success: { iconTheme: { primary: "#9FB982", secondary: "#FAF5E9" } },
            error: { iconTheme: { primary: "#B84D4D", secondary: "#FAF5E9" } },
          }}
        />
        <footer className="footer container">© {new Date().getFullYear()} UFG Surveys</footer>
      </body>
    </html>
  );
}
