import { Link } from "@tanstack/react-router";

export function Footer() {
  return (
    <footer className="mt-16 border-t border-white/10 glass-strong">
      <div className="max-w-6xl mx-auto px-4 py-10 grid gap-8 sm:grid-cols-2 md:grid-cols-4">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <img src="/logo.PNG" alt="EJ" className="h-8 w-8 rounded-full object-cover" />
            <span className="font-bold gradient-text">Electronics Journey</span>
          </div>
          <p className="text-sm text-muted-foreground">Made for Indian makers ⚡</p>
        </div>
        <FooterCol title="Explore" links={[["Projects", "/"], ["Quick Learn", "/quick-learn"], ["Search", "/search"]]} />
        <FooterCol title="Community" links={[["Share a project", "/projects/new"], ["Notifications", "/notifications"]]} />
        <FooterCol title="About" links={[["About", "/"], ["Contact", "mailto:satheeshscientist@gmail.com"]]} />
      </div>
      <div className="border-t border-white/5 py-4 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Electronics Journey · Built with ⚡ in India
      </div>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: [string, string][] }) {
  return (
    <div>
      <div className="font-semibold mb-3 text-sm">{title}</div>
      <ul className="space-y-2 text-sm text-muted-foreground">
        {links.map(([label, href]) => (
          <li key={label}>
            {href.startsWith("/") ? (
              <Link to={href} className="hover:text-primary transition">{label}</Link>
            ) : (
              <a href={href} className="hover:text-primary transition">{label}</a>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
