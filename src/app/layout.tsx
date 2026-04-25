import type { Metadata } from "next";
import { Cormorant_Garamond, Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/auth-provider";

const elementoSans = Inter({
  variable: "--font-elemento-sans",
  subsets: ["latin"],
});

const elementoDisplay = Cormorant_Garamond({
  variable: "--font-elemento-display",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Elemento Estúdio e Barbearia",
  description: "Sistema premium de agendamento da Elemento Estúdio e Barbearia",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className="dark">
      <body
        className={`${elementoSans.variable} ${elementoDisplay.variable} antialiased`}
      >
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
