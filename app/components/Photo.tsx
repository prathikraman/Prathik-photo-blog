import type { Photo as PhotoType } from "../types";

export function Photo({ photo, className = "", eager = false, downloadable = false, showCaption = true }: { photo: PhotoType; className?: string; eager?: boolean; downloadable?: boolean; showCaption?: boolean }) {
  const downloadUrl = downloadable && photo.src.startsWith("/media/") ? `${photo.src}?download=1` : null;
  const orientation = photo.width > photo.height ? "landscape" : photo.height > photo.width ? "portrait" : "square";
  return (
    <figure className={`photo photo--${orientation} ${className}`}>
      <div className="photo__media">
        <img
          src={photo.src}
          alt={photo.alt}
          width={photo.width}
          height={photo.height}
          loading={eager ? "eager" : "lazy"}
          fetchPriority={eager ? "high" : "auto"}
        />
        {downloadUrl && <a className="photo-download" href={downloadUrl} download aria-label={`Download original: ${photo.alt}`}><span aria-hidden="true">↓</span> Download</a>}
      </div>
      {showCaption && photo.caption && <figcaption>{photo.caption}</figcaption>}
    </figure>
  );
}
