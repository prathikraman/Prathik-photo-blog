import { photos } from "../data";
import { SiteHeader } from "../components/SiteHeader";
import { SiteFooter } from "../components/SiteFooter";
import { Photo } from "../components/Photo";
import { getAboutContent, getRandomPublishedPhotos } from "../lib/content-db";

export const dynamic = "force-dynamic";

const paragraphs = (value: string) => value.split(/\n\s*\n/).filter(Boolean);

export default async function AboutPage() {
  const about = await getAboutContent();
  const travelPhotos = await getRandomPublishedPhotos(2);
  const openingPhoto = travelPhotos[0] ?? photos.camera;
  const landscapePhoto = travelPhotos[1] ?? travelPhotos[0] ?? photos.hills;
  return (
    <><SiteHeader /><main className="page-main about-page section-shell"><header className="page-title"><p className="eyebrow">Behind the camera</p><h1>About</h1></header><section className="about-intro"><Photo photo={openingPhoto} /><div><h2>{about.intro_heading}</h2><p>{about.intro_body}</p></div></section><section className="about-approach"><div><p className="eyebrow">Approach · 01</p><h2 className="preserve-lines">{about.approach_heading}</h2></div><div>{paragraphs(about.approach_body).map((paragraph) => <p key={paragraph}>{paragraph}</p>)}</div></section><Photo photo={landscapePhoto} className="about-landscape" /><section className="about-details"><div><p className="eyebrow">In the bag · 02</p><p className="preserve-lines">{about.gear}</p></div><div><p className="eyebrow">Elsewhere · 03</p>{about.instagram_url && <a href={about.instagram_url} target="_blank" rel="noreferrer">Instagram ↗</a>}</div></section></main><SiteFooter /></>
  );
}
