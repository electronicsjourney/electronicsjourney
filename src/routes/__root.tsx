import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Outlet, Link, createRootRouteWithContext, useRouter, HeadContent, Scripts } from "@tanstack/react-router";
import appCss from "../styles.css?url";
import { AuthProvider } from "@/hooks/use-auth";
import { Toaster } from "sonner";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="max-w-md text-center glass-strong rounded-2xl p-8">
        <h1 className="text-7xl font-bold gradient-text">404</h1>
        <h2 className="mt-4 text-xl font-semibold">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">This circuit isn't connected.</p>
        <Link to="/" className="mt-6 inline-flex items-center justify-center rounded-full gradient-bg px-6 py-2 text-sm font-medium text-white glow-soft">
          Go home
        </Link>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="max-w-md text-center glass-strong rounded-2xl p-8">
        <h1 className="text-xl font-semibold">Something short-circuited</h1>
        <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button onClick={() => { router.invalidate(); reset(); }} className="rounded-full gradient-bg px-6 py-2 text-sm font-medium text-white glow-soft">
            Try again
          </button>
          <a href="/" className="rounded-full glass px-6 py-2 text-sm font-medium">Go home</a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Electronics Journey — Learn. Build. Innovate." },
      { name: "description", content: "Modern electronics, robotics, Arduino, IoT and AI hardware learning + community ecosystem." },
      { name: "theme-color", content: "#0a0420" },
      { property: "og:title", content: "Electronics Journey — Learn. Build. Innovate." },
      { property: "og:description", content: "Modern electronics, robotics, Arduino, IoT and AI hardware learning + community ecosystem." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Electronics Journey — Learn. Build. Innovate." },
      { name: "twitter:description", content: "Modern electronics, robotics, Arduino, IoT and AI hardware learning + community ecosystem." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/675e3c09-d91c-4cf1-b824-017bfbbf47b2/id-preview-46432e9d--7d5fb99a-73ed-451c-95fa-0a25019514fe.lovable.app-1778570171123.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/675e3c09-d91c-4cf1-b824-017bfbbf47b2/id-preview-46432e9d--7d5fb99a-73ed-451c-95fa-0a25019514fe.lovable.app-1778570171123.png" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&display=swap" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head><HeadContent /></head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Outlet />
        <Toaster theme="dark" position="top-center" richColors />
      </AuthProvider>
    </QueryClientProvider>
  );
}
