import Link from "next/link";
import type { Journey } from "../types";
import { SiteHeader } from "../components/SiteHeader";
import { SiteFooter } from "../components/SiteFooter";
import { Photo } from "../components/Photo";
import { EditorialPhotoBlock } from "../components/Editorial";

export function JourneyView({ journey }: { journey: Journey }) {
  return (
    <>
      <main id="journey-top">
        <section className="journey-hero">
          <SiteHeader overlay />
          <Photo photo={journey.hero} eager downloadable={journey.allowDownloads !== false} showCaption={false} />
          <div className="hero-wash" />
          <div className="journey-hero__copy">
            <p>Journey</p>
            <h1>{journey.title}</h1>
            <span>{journey.meta}</span>
          </div>
        </section>

        <nav className="journey-chapter-nav" aria-label={`${journey.title} chapters`}>
          <Link href="/journeys">All journeys</Link>
          <span aria-hidden="true">/</span>
          <div>
            {journey.chapters.map((chapter, index) => (
              <a href={`#${chapter.id}`} key={chapter.id}>0{index + 1} {chapter.title}</a>
            ))}
          </div>
        </nav>

        {journey.hero.caption && (
          <p className="journey-cover-caption section-shell">{journey.hero.caption}</p>
        )}

        {journey.intro && (
          <section className="journey-intro section-shell">
            <p className="eyebrow">The story</p>
            <p className="journey-intro__description">{journey.intro}</p>
          </section>
        )}

        <div className={`journey-story${journey.intro ? "" : " journey-story--no-intro"}`}>
          {journey.chapters.map((chapter, chapterIndex) => (
            <section className="chapter" id={chapter.id} key={chapter.id}>
              <header className="chapter__header section-shell">
                <p>0{chapterIndex + 1}</p>
                <h2>{chapter.title}</h2>
                {chapter.note && <span>{chapter.note}</span>}
              </header>
              {chapter.blocks.map((block, blockIndex) => (
                <EditorialPhotoBlock
                  block={block}
                  downloadable={journey.allowDownloads !== false}
                  index={blockIndex}
                  key={`${chapter.id}-${blockIndex}`}
                />
              ))}
            </section>
          ))}
        </div>

        <nav className="journey-end section-shell" aria-label="End of journey">
          <Link href="/journeys"><span aria-hidden="true">←</span> All journeys</Link>
          <a href="#journey-top">Back to top <span aria-hidden="true">↑</span></a>
        </nav>
      </main>
      <SiteFooter />
    </>
  );
}
