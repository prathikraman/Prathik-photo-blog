"use client";
import { useState, type FormEvent } from 'react';
import type { Photo } from '../types';

export function AboutImages({ initialImages }: { initialImages: Partial<Record<'portrait' | 'secondary', Photo>> }) {
  return <div className="admin-about-images">{(['portrait', 'secondary'] as const).map(slot => <ImageSlot key={slot} slot={slot} initial={initialImages[slot]} />)}</div>;
}
function ImageSlot({ slot, initial }: { slot: 'portrait' | 'secondary'; initial?: Photo }) {
  const [photo, setPhoto] = useState(initial);
  const [alt, setAlt] = useState(initial?.alt ?? '');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('Changes appear immediately. JPEG, PNG, WebP or AVIF; up to 30 MB.');
  async function change(method: 'PUT' | 'PATCH' | 'DELETE', file?: File) {
    setBusy(true);
    setMessage('Saving…');
    try {
      let url = `/api/admin/about/images/${slot}`;
      let body: BodyInit | undefined;
      let headers: HeadersInit | undefined;
      if (method === 'PUT') {
        if (!file || !file.size || file.size > 30 * 1024 * 1024) throw new Error('Choose an image up to 30 MB.');
        const bitmap = await createImageBitmap(file);
        const query = new URLSearchParams({ width: String(bitmap.width), height: String(bitmap.height), alt });
        bitmap.close();
        url += `?${query}`; body = file; headers = { 'Content-Type': file.type };
      } else if (method === 'PATCH') {
        body = JSON.stringify({ alt }); headers = { 'Content-Type': 'application/json' };
      }
      const response = await fetch(url, { method, body, headers });
      const data = await response.json().catch(() => { throw new Error('Upload could not be processed. Try a smaller image.'); });
      if (!response.ok) throw new Error(data.error ?? 'Could not save image.');
      setPhoto(data.images[slot]);
      setMessage(method === 'DELETE' ? 'Removed. The default image will be shown.' : 'Saved. Refresh the public page to see your image.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Could not save image.'); }
    finally { setBusy(false); }
  }
  function upload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const file = new FormData(event.currentTarget).get('photo');
    void change('PUT', file instanceof File ? file : undefined);
  }
  return <section className="admin-about-image">
    <h3>{slot === 'portrait' ? 'Portrait' : 'Secondary photo'}</h3>
    <p>{slot === 'portrait' ? 'Used beside your About introduction and on the homepage.' : 'A wider personal or behind-the-scenes photograph for About.'}</p>
    {photo && <img src={photo.src} alt={photo.alt} width={photo.width} height={photo.height} />}
    <form onSubmit={upload}>
      <label>Alternative text<input value={alt} maxLength={1000} onChange={e => setAlt(e.target.value)} disabled={busy} /></label>
      <label>{photo ? 'Replace image' : 'Choose image'}<input name="photo" type="file" accept="image/jpeg,image/png,image/webp,image/avif" required disabled={busy} /></label>
      <button disabled={busy}>{busy ? 'Saving…' : photo ? 'Upload replacement' : 'Upload image'}</button>
    </form>
    {photo && <div><button disabled={busy} onClick={() => void change('PATCH')}>Save alt text</button><button disabled={busy} onClick={() => { if (window.confirm('Remove this About photo? The stored image will be deleted.')) void change('DELETE'); }}>Remove image</button></div>}
    <p role="status">{message}</p>
  </section>;
}
