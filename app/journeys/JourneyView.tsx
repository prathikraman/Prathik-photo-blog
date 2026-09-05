import type { Journey } from "../types";
import { SiteHeader } from "../components/SiteHeader";
import { SiteFooter } from "../components/SiteFooter";
import { Photo } from "../components/Photo";
import { EditorialPhotoBlock } from "../components/Editorial";

export function JourneyView({ journey }: { journey: Journey }) {
  return (
    <><main><section className="journey-hero"><SiteHeader overlay /><Photo photo={journey.hero} eager downloadable /><div className="hero-wash" /><div className="journey-hero__copy"><p>Journey · 01</p><h1>{journey.title}</h1><span>{journey.meta}</span></div></section><section className="journey-intro section-shell"><p className="eyebrow">The story</p><h2>{journey.intro}</h2><nav aria-label="Jump to chapter">{journey.chapters.map((chapter) => <a href={`#${chapter.id}`} key={chapter.id}>{chapter.title}</a>)}</nav></section><div className="journey-story">{journey.chapters.map((chapter, index) => <section className="chapter" id={chapter.id} key={chapter.id}><header className="chapter__header section-shell"><p>0{index + 1}</p><h2>{chapter.title}</h2><span>{chapter.note}</span></header>{chapter.blocks.map((block, i) => <EditorialPhotoBlock block={block} downloadable key={`${chapter.id}-${i}`} />)}</section>)}</div></main><SiteFooter /></>
  );
}
