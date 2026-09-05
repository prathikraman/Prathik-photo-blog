import Link from "next/link";
import { requireAdminUser } from "../lib/admin-auth";
import { getAboutContent, listAdminContent } from "../lib/content-db";
import { AboutEditor, AdminStudio } from "./AdminStudio";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const user = await requireAdminUser();
  const journeys = await listAdminContent();
  const about = await getAboutContent();
  return (
    <main className="admin-shell">
      <header className="admin-topbar">
        <div><Link className="wordmark" href="/">Prathik Raman</Link><span>Studio</span></div>
        <nav><Link href="/journeys/japan">View site ↗</Link><a href="/signout-with-chatgpt?return_to=/">Sign out</a></nav>
      </header>
      <section className="admin-intro">
        <div><p className="eyebrow">Private workspace</p><h1>Photo Studio</h1></div>
        <p>Upload original photographs, arrange them into editorial chapters, and publish when the story is ready.</p>
      </section>
      <AboutEditor initialAbout={about} />
      <AdminStudio initialJourneys={journeys} ownerName={user.displayName} />
    </main>
  );
}
