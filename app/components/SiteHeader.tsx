import Link from "next/link";

const links = [
  ["Journeys", "/journeys"],
  ["About", "/about"],
];

export function SiteHeader({ overlay = false }: { overlay?: boolean }) {
  return (
    <header className={`site-header ${overlay ? "site-header--overlay" : ""}`}>
      <Link className="wordmark" href="/" aria-label="Prathik Raman, home">Prathik Raman</Link>
      <nav className="desktop-nav" aria-label="Primary navigation">
        {links.map(([label, href]) => <Link href={href} key={label}>{label}</Link>)}
      </nav>
      <details className="mobile-menu">
        <summary aria-label="Open navigation">Menu</summary>
        <nav aria-label="Mobile navigation">
          {links.map(([label, href]) => <Link href={href} key={label}>{label}</Link>)}
        </nav>
      </details>
    </header>
  );
}
