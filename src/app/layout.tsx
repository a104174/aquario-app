import type { Metadata, Viewport } from "next";
import { Providers } from "@/components/providers";
import { splashScreens } from "./splash-screens";
import "./globals.css";

export const metadata: Metadata = {
  title: "Aquário",
  description: "Diário pessoal dos meus aquários.",
  applicationName: "Aquário",
  appleWebApp: {
    capable: true,
    title: "Aquário",
    statusBarStyle: "black-translucent",
    startupImage: splashScreens,
  },
  formatDetection: { telephone: false, email: false, address: false, date: false },
  icons: {
    icon: [{ url: "/icons/favicon-196.png", sizes: "196x196", type: "image/png" }],
    apple: [{ url: "/icons/apple-icon-180.png", sizes: "180x180" }],
  },
  other: {
    // Para iOS < 16.4, que ainda lê a meta antiga.
    "apple-mobile-web-app-capable": "yes",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  colorScheme: "light dark",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#0d4a66" },
    { media: "(prefers-color-scheme: dark)", color: "#071219" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-PT" suppressHydrationWarning>
      <head>
        {/* Android: o teclado encolhe o layout (interactive-widget=resizes-content).
            No iOS o WebKit não reconhece a chave (e avisa na consola): lá compensamos
            com visualViewport (lib/teclado.ts). */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){if(/iPhone|iPad|iPod|Macintosh/.test(navigator.userAgent))return;function f(){var m=document.querySelector('meta[name=viewport]');if(m&&m.content.indexOf('interactive-widget')<0)m.content+=', interactive-widget=resizes-content';}f();document.addEventListener('DOMContentLoaded',f);})();`,
          }}
        />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
