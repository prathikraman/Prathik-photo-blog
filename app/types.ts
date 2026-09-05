export type Photo = {
  src: string;
  alt: string;
  width: number;
  height: number;
  caption?: string;
};

export type EditorialBlock =
  | { type: "fullBleed"; photo: Photo }
  | { type: "single"; photo: Photo; align?: "left" | "center" | "right" }
  | { type: "pair"; photos: [Photo, Photo] }
  | { type: "leadDetail"; photos: [Photo, Photo] }
  | { type: "portraitFocus"; photo: Photo }
  | { type: "sequence"; photos: Photo[] }
  | { type: "storyMoment"; photo: Photo; title?: string; body: string; alignment: "left" | "right" };

export type JourneyChapter = {
  id: string;
  title: string;
  note?: string;
  blocks: EditorialBlock[];
};

export type Journey = {
  slug: string;
  title: string;
  meta: string;
  intro: string;
  hero: Photo;
  chapters: JourneyChapter[];
};

export type JourneyCardData = {
  title: string;
  meta: string;
  href: string;
  photo: Photo;
};
