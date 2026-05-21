import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "./globals.css";

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "RMS Discussion - Manipal University Jaipur",
  description: "Research Management System Discussion Portal",
  icons: {
    icon: [
      { url: "/mujlogo.png", type: "image/png", sizes: "any" },
    ],
    shortcut: "/mujlogo.png",
    apple: "/mujlogo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${poppins.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        {children}
        <ToastContainer position="top-right" autoClose={3000} theme="colored" />
      </body>
    </html>
  );
}
