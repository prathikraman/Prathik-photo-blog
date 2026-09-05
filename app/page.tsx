import Link from "next/link";
import { photos } from "./data";
import { SiteHeader } from "./components/SiteHeader";
import { SiteFooter } from "./components/SiteFooter";
import { JourneyCard, SectionHeading } from "./components/Editorial";
import { Photo } from "./components/Photo";
import { listPublishedJourneys } from "./lib/content-db";

export const dynamic = "force-dynamic";

export default async function Home() {
  const journeys = await listPublishedJourneys();
  const latest = journeys[0];
  const latestPhotos = latest
    ? [latest.hero, ...latest.chapters.flatMap((chapter) => chapter.blocks.flatMap((block) => "photo" in block ? [block.photo] : block.photos))]
      .filter((photo, index, all) => all.findIndex((candidate) => candidate.src === photo.src) === index)
    : [];
  const hero = latest?.hero ?? photos.crossing;
  const cards = journeys.map((journey) => ({ title: journey.title, meta: journey.meta, href: `/journeys/${journey.slug}`, photo: journey.hero }));

  return (
    <>
      <main>
        <section className="home-hero">
          <SiteHeader overlay />
          <Photo photo={hero} eager />
          <div className="hero-wash" />
          <div className="home-hero__copy">
            <p>Prathik Raman</p>
            <h1>Visual Journal</h1>
            <span>Places I&apos;ve been. Moments I noticed.</span>
          </div>
          <a className="explore-link" href="#latest">Explore <span aria-hidden="true">↓</span></a>
        </section>

        {latest ? <>
          <section className="latest section-shell" id="latest">
            <SectionHeading eyebrow="Latest journey · 01" title={latest.title} />
            <Photo photo={latest.hero} />
            <div className="latest__copy"><p className="meta">{latest.meta}</p><p>{latest.intro}</p><Link className="text-link" href={`/journeys/${latest.slug}`}>Explore {latest.title} <span aria-hidden="true">→</span></Link></div>
          </section>

          {latestPhotos.length > 1 && <section className="visual-teaser section-shell" aria-label={`${latest.title} photographic preview`}>
            {latestPhotos.slice(1, 4).map((photo) => <Photo photo={photo} key={photo.src} />)}
          </section>}
        </> : <section className="latest section-shell" id="latest"><SectionHeading eyebrow="Latest journey · 01" title="Stories in progress" /><p className="journey-empty-copy">Published journeys will appear here when they are ready.</p></section>}

        <section className="journeys-section section-shell">
          <SectionHeading eyebrow="Archive · 02" title="Selected Journeys" />
          {cards.length ? <div className="journey-grid">{cards.map((journey, index) => <JourneyCard journey={journey} index={index} key={journey.href} />)}</div> : <p className="journey-empty-copy">No journeys have been published yet.</p>}
        </section>

        <section className="photo-interruption">
          <Photo photo={latestPhotos[4] ?? latestPhotos[1] ?? photos.train} />
          <p>{latest?.meta || "A photographic note from the road"}</p>
        </section>

        <section className="about-teaser section-shell">
          <Photo photo={photos.camera} />
          <div><p className="eyebrow">Behind the camera · 03</p><h2>I photograph the details that make a place feel lived in.</h2><p>A visual observer drawn to quiet gestures, changing light, and the poetry of ordinary streets.</p><Link className="text-link" href="/about">About me <span aria-hidden="true">→</span></Link></div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
