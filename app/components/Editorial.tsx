import Link from "next/link";
import type { EditorialBlock, JourneyCardData } from "../types";
import { Photo } from "./Photo";

export function SectionHeading({ eyebrow, title }: { eyebrow: string; title: string }) {
  return <div className="section-heading"><p className="eyebrow">{eyebrow}</p><h2>{title}</h2></div>;
}

export function JourneyCard({ journey, index }: { journey: JourneyCardData; index: number }) {
  return (
    <Link className={`journey-card journey-card--${index + 1}`} href={journey.href}>
      <Photo photo={journey.photo} />
      <div><h3>{journey.title}</h3><p>{journey.meta}</p><span>View journey <span aria-hidden="true">↗</span></span></div>
    </Link>
  );
}

export function EditorialPhotoBlock({ block, downloadable = false }: { block: EditorialBlock; downloadable?: boolean }) {
  switch (block.type) {
    case "fullBleed":
      return <div className="editorial-block editorial-full"><Photo photo={block.photo} downloadable={downloadable} /></div>;
    case "single":
      return <div className={`editorial-block editorial-single editorial-single--${block.align ?? "center"}`}><Photo photo={block.photo} downloadable={downloadable} /></div>;
    case "pair":
      return <div className="editorial-block editorial-pair">{block.photos.map((photo, i) => <Photo photo={photo} downloadable={downloadable} key={`${photo.src}-${i}`} />)}</div>;
    case "leadDetail":
      return <div className="editorial-block editorial-lead-detail">{block.photos.map((photo, i) => <Photo photo={photo} downloadable={downloadable} key={`${photo.src}-${i}`} />)}</div>;
    case "portraitFocus":
      return <div className="editorial-block editorial-portrait"><Photo photo={block.photo} downloadable={downloadable} /></div>;
    case "sequence":
      return <div className="editorial-block editorial-sequence">{block.photos.map((photo, i) => <Photo photo={photo} downloadable={downloadable} key={`${photo.src}-${i}`} />)}</div>;
    case "storyMoment":
      return <aside className={`editorial-block story-moment story-moment--copy-${block.alignment}`}><Photo photo={block.photo} downloadable={downloadable} /><div className="story-moment__copy"><p className="eyebrow">Story moment</p>{block.title && <h3>{block.title}</h3>}<p className="story-moment__body">{block.body}</p></div></aside>;
  }
}
