import { SiteFooter } from "../components/SiteFooter";
import { SiteHeader } from "../components/SiteHeader";
import { JourneyCard } from "../components/Editorial";
import { listPublishedJourneys } from "../lib/content-db";

export const dynamic = "force-dynamic";

export default async function JourneysPage() {
  const journeys = await listPublishedJourneys();
  return <><SiteHeader /><main className="page-main journeys-index section-shell"><header className="page-title"><p className="eyebrow">Photographic archive</p><h1>Journeys</h1><p>Places revisited through light, movement, and the moments between landmarks.</p></header>{journeys.length ? <section className="journey-grid">{journeys.map((journey, index) => <JourneyCard key={journey.slug} index={index} journey={{ title: journey.title, meta: journey.meta, href: `/journeys/${journey.slug}`, photo: journey.hero }} />)}</section> : <p className="journey-empty-copy">No journeys have been published yet.</p>}</main><SiteFooter /></>;
}
