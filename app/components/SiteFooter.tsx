import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <Link className="wordmark" href="/">Prathik Raman</Link>
      <p>Visual stories from places I&apos;ve been.</p>
      <div><a href="https://instagram.com" target="_blank" rel="noreferrer">Instagram ↗</a><span>© 2026</span></div>
    </footer>
  );
}
