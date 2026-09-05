import type { Journey, JourneyCardData, Photo } from "./types";

const unsplash = (id: string, width = 2200) =>
  `https://images.unsplash.com/${id}?auto=format&q=86&w=${width}`;

export const photos: Record<string, Photo> = {
  tokyoLane: { src: unsplash("photo-1690733856942-2d69d3a52bd2"), alt: "A skateboarder moving through a narrow Tokyo street", width: 2000, height: 2500 },
  tokyoWalk: { src: unsplash("photo-1740820924859-6fb9bd03f464"), alt: "A lone walker in a sunlit Tokyo backstreet", width: 2200, height: 1467 },
  kyotoPagoda: { src: unsplash("photo-1703106197832-75188748bf25"), alt: "A Kyoto pagoda among spring trees", width: 2200, height: 1467 },
  kyotoDusk: { src: unsplash("photo-1742982533138-047c5d82ecb2"), alt: "A Kyoto temple and cherry blossoms at dusk", width: 2200, height: 1467 },
  templeGreen: { src: unsplash("photo-1649819264866-82db25d76d85"), alt: "A vermilion temple surrounded by green leaves", width: 1600, height: 2000 },
  templeGate: { src: unsplash("photo-1711730580127-d63cfea007ab"), alt: "A quiet temple gate and spring garden", width: 2200, height: 1467 },
  crossing: { src: unsplash("photo-1540959733332-eab4deabeeaf"), alt: "Tokyo crossing glowing after dark", width: 2200, height: 1467 },
  lanterns: { src: unsplash("photo-1528360983277-13d401cdc186"), alt: "Warm lanterns along a Japanese evening street", width: 1800, height: 2400 },
  train: { src: unsplash("photo-1493976040374-85c8e12f0c0e"), alt: "A train passing through the Japanese landscape", width: 2200, height: 1467 },
  shrine: { src: unsplash("photo-1524413840807-0c3cb6fa808d"), alt: "Traditional Japanese shrine architecture", width: 2200, height: 1467 },
  alley: { src: unsplash("photo-1742268350489-e5d1c0616c54"), alt: "A quiet pause in a Japanese alley", width: 1600, height: 2000 },
  kyotoStreet: { src: unsplash("photo-1694071871360-74ffa0d6826c"), alt: "A still residential street in Kyoto", width: 2200, height: 1467 },
  cityLight: { src: unsplash("photo-1736134870118-bf631359ab3f"), alt: "Afternoon light along a Tokyo street", width: 1600, height: 2000 },
  rain: { src: unsplash("photo-1519501025264-65ba15a82390"), alt: "A city seen through rain and reflected light", width: 2200, height: 1467 },
  india: { src: unsplash("photo-1524492412937-b28074a5d7da"), alt: "The Taj Mahal in quiet morning light", width: 2200, height: 1467 },
  italy: { src: unsplash("photo-1529260830199-42c24126f198"), alt: "Warm evening light over an Italian street", width: 1600, height: 2000 },
  hills: { src: unsplash("photo-1464278533981-50106e6176b1"), alt: "A lone figure in misty mountain country", width: 2200, height: 1467 },
  camera: { src: unsplash("photo-1502982720700-bfff97f2ecac"), alt: "A photographer holding a camera outdoors", width: 1600, height: 2000 },
  process: { src: unsplash("photo-1452780212940-6f5c0d14d848"), alt: "Camera, notebook and photographic prints on a desk", width: 2200, height: 1467 },
};

export const japanJourney: Journey = {
  slug: "japan",
  title: "Japan",
  meta: "Tokyo · Kyoto · Spring 2026",
  intro: "A study in movement and stillness—neon crossings, temple gardens, and the small pauses that made the journey feel personal.",
  hero: photos.kyotoDusk,
  chapters: [
    {
      id: "tokyo",
      title: "Tokyo",
      note: "The city moves in layers. I kept looking for the quiet frame inside the noise.",
      blocks: [
        { type: "fullBleed", photo: photos.crossing },
        { type: "pair", photos: [photos.tokyoLane, photos.cityLight] },
        { type: "single", photo: photos.tokyoWalk, align: "right" },
      ],
    },
    {
      id: "kyoto",
      title: "Kyoto",
      note: "Stone, timber, blossom, rain. A slower rhythm, held in careful details.",
      blocks: [
        { type: "leadDetail", photos: [photos.kyotoPagoda, photos.templeGreen] },
        { type: "portraitFocus", photo: photos.lanterns },
        { type: "pair", photos: [photos.templeGate, photos.shrine] },
      ],
    },
    {
      id: "streets",
      title: "Streets",
      note: "The in-between places became the pictures I returned to most.",
      blocks: [
        { type: "sequence", photos: [photos.kyotoStreet, photos.alley, photos.cityLight] },
        { type: "fullBleed", photo: photos.train },
      ],
    },
    {
      id: "quiet-moments",
      title: "Quiet Moments",
      note: "A final set of small observations—nothing arranged, nothing hurried.",
      blocks: [
        { type: "pair", photos: [photos.templeGreen, photos.tokyoLane] },
        { type: "single", photo: photos.kyotoDusk, align: "center" },
        { type: "leadDetail", photos: [photos.templeGate, photos.lanterns] },
      ],
    },
  ],
};

export const selectedJourneys: JourneyCardData[] = [
  { title: "Japan", meta: "Tokyo · Kyoto · Spring 2026", href: "/journeys/japan", photo: photos.kyotoDusk },
  { title: "India", meta: "Agra · Rajasthan · Winter 2025", href: "/journeys/japan", photo: photos.india },
  { title: "Italy", meta: "Rome · Florence · Summer 2024", href: "/journeys/japan", photo: photos.italy },
];
