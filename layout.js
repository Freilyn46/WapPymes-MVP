import { Inter, Manrope } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  display: "swap",
});

export const metadata = {
  title: "CitaFlow — Pedidos y citas por WhatsApp",
  description:
    "Recibe pedidos y reservas de tus clientes directo en tu WhatsApp, sin llamadas ni formularios complicados.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="es" className={`${inter.variable} ${manrope.variable}`}>
      <body className="bg-paper text-ink font-body antialiased">
        {children}
      </body>
    </html>
  );
}