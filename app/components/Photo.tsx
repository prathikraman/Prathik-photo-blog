import type { Photo as PhotoType } from "../types";

export function Photo({ photo, className = "", eager = false, downloadable = false }: { photo: PhotoType; className?: string; eager?: boolean; downloadable?: boolean }) {
  const downloadUrl = downloadable && photo.src.startsWith("/media/") ? `${photo.src}?download=1` : null;
  return (
    <figure className={`photo ${className}`}>
      <img
        src={photo.src}
        alt={photo.alt}
        width={photo.width}
        height={photo.height}
        loading={eager ? "eager" : "lazy"}
        fetchPriority={eager ? "high" : "auto"}
      />
      {downloadUrl && <a className="photo-download" href={downloadUrl} download aria-label={`Download original: ${photo.alt}`}><span aria-hidden="true">↓</span> Download</a>}
      {photo.caption && <figcaption>{photo.caption}</figcaption>}
    </figure>
  );
}
