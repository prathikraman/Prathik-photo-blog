"use client";

import { useMemo, useState, type FormEvent } from "react";
import type { AboutContent, AdminChapter, AdminJourney, AdminPhoto } from "../lib/content-db";
import type { EditorialBlock } from "../types";

const layouts: { value: EditorialBlock["type"]; label: string; count: string }[] = [
  { value: "single", label: "Single", count: "1+ photos" },
  { value: "fullBleed", label: "Full bleed", count: "1+ photos" },
  { value: "portraitFocus", label: "Portrait focus", count: "1+ photos" },
  { value: "pair", label: "Pair", count: "2 photos" },
  { value: "leadDetail", label: "Lead + detail", count: "2 photos" },
  { value: "sequence", label: "Sequence", count: "2–3 photos" },
  { value: "storyMoment", label: "Story moment", count: "1 photo" },
];

async function parseResponse(response: Response) {
  const text = await response.text();
  let payload: { error?: string; [key: string]: unknown } = {};
  if (text) {
    try { payload = JSON.parse(text) as typeof payload; }
    catch {
      if (!response.ok) {
        const message = response.status === 413
          ? "This upload is too large for a single request. Please try again; large photos are now sent in smaller parts."
          : text;
        throw new Error(message || "Request failed");
      }
    }
  }
  if (!response.ok) throw new Error(payload.error || "Request failed");
  return payload;
}

const uploadPartSize = 5 * 1024 * 1024;
type LayoutType = EditorialBlock["type"];
type ComposerBlock = { id: string; layoutType: LayoutType; photos: AdminPhoto[]; storyTitle: string; storyBody: string; storyAlignment: "left" | "right" };
type PhotoDetailsUpdate = { alt: string; caption: string; hero?: boolean };

const layoutLabel = (type: LayoutType) => layouts.find((layout) => layout.value === type)?.label ?? type;
const isValidBlock = (type: LayoutType, count: number) => type === "pair" || type === "leadDetail" ? count === 2 : type === "sequence" ? count >= 2 && count <= 3 : count === 1;

function blocksForChapter(chapter: AdminChapter): ComposerBlock[] {
  const groups = new Map<string, AdminPhoto[]>();
  chapter.photos.forEach((photo) => groups.set(photo.layout_group, [...(groups.get(photo.layout_group) ?? []), photo]));
  return [...groups.entries()].map(([id, photos]) => ({ id, layoutType: photos[0].layout_type, photos, storyTitle: photos[0].story_title, storyBody: photos[0].story_body, storyAlignment: photos[0].story_alignment }));
}

function autoCompose(photos: AdminPhoto[]): ComposerBlock[] {
  const blocks: ComposerBlock[] = [];
  let index = 0;
  const add = (layoutType: LayoutType, count: number) => {
    blocks.push({ id: crypto.randomUUID(), layoutType, photos: photos.slice(index, index + count), storyTitle: "", storyBody: "", storyAlignment: "right" });
    index += count;
  };
  if (photos.length) add("fullBleed", 1);
  while (index < photos.length) {
    const remaining = photos.length - index;
    if (remaining >= 5) add("sequence", 3);
    else if (remaining >= 2) add(photos[index].width >= photos[index].height && photos[index + 1].height > photos[index + 1].width ? "leadDetail" : "pair", 2);
    else add(photos[index].height > photos[index].width ? "portraitFocus" : "single", 1);
  }
  return blocks;
}

async function dimensionsFor(file: File) {
  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(file);
      const size = { width: bitmap.width, height: bitmap.height };
      bitmap.close();
      return size;
    } catch {
      // Some camera-exported JPEGs fail in createImageBitmap but still decode in an image element.
    }
  }

  const objectUrl = URL.createObjectURL(file);
  try {
    return await new Promise<{ width: number; height: number }>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight });
      image.onerror = () => reject(new Error(`${file.name} could not be read as an image. Try exporting it as JPEG, PNG, WebP or AVIF.`));
      image.src = objectUrl;
    });
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export function AboutEditor({ initialAbout }: { initialAbout: AboutContent }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("Edit the words shown on your public About page.");

  async function saveAbout(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage("Saving About page…");
    const form = new FormData(event.currentTarget);
    try {
      await parseResponse(await fetch("/api/admin/about", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(Object.fromEntries(form)) }));
      setMessage("About page saved and visible on the site.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not save the About page."); }
    finally { setBusy(false); }
  }

  return <section className="admin-about-editor">
    <header><div><p className="eyebrow">Site page</p><h2>About</h2><p>{message}</p></div><a href="/about" target="_blank" rel="noreferrer">View About page ↗</a></header>
    <form onSubmit={saveAbout}>
      <label>Opening headline<textarea name="introHeading" rows={3} required defaultValue={initialAbout.intro_heading} /></label>
      <label>Opening description<textarea name="introBody" rows={4} required defaultValue={initialAbout.intro_body} /></label>
      <label>Approach heading<textarea name="approachHeading" rows={3} required defaultValue={initialAbout.approach_heading} /><small>Use a new line to control the line break.</small></label>
      <label>Approach description<textarea name="approachBody" rows={7} required defaultValue={initialAbout.approach_body} /><small>Leave a blank line between paragraphs.</small></label>
      <label>In the bag<textarea name="gear" rows={5} defaultValue={initialAbout.gear} /><small>Enter one item per line.</small></label>
      <label>Instagram link<input name="instagramUrl" type="url" placeholder="https://instagram.com/yourname" defaultValue={initialAbout.instagram_url} /></label>
      <button disabled={busy}>{busy ? "Saving…" : "Save About page"}</button>
    </form>
  </section>;
}

export function AdminStudio({ initialJourneys, ownerName }: { initialJourneys: AdminJourney[]; ownerName: string }) {
  const [journeys, setJourneys] = useState(initialJourneys);
  const [journeyId, setJourneyId] = useState(initialJourneys[0]?.id ?? "");
  const [chapterId, setChapterId] = useState(initialJourneys[0]?.chapters[0]?.id ?? "");
  const [layoutType, setLayoutType] = useState<EditorialBlock["type"]>("single");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(`Welcome, ${ownerName}.`);
  const activeJourney = useMemo(() => journeys.find((journey) => journey.id === journeyId) ?? journeys[0], [journeys, journeyId]);
  const activeChapter = activeJourney?.chapters.find((chapter) => chapter.id === chapterId) ?? activeJourney?.chapters[0];

  async function refresh(preferredJourney = journeyId) {
    const response = await fetch("/api/admin/content", { cache: "no-store" });
    const payload = await parseResponse(response) as { journeys?: AdminJourney[] };
    const next = payload.journeys ?? [];
    setJourneys(next);
    const selectedJourney = next.find((journey) => journey.id === preferredJourney) ?? next[0];
    setJourneyId(selectedJourney?.id ?? "");
    setChapterId((current) => selectedJourney?.chapters.some((chapter) => chapter.id === current) ? current : selectedJourney?.chapters[0]?.id ?? "");
  }

  async function createJourney(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage("Creating journey…");
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    try {
      const response = await fetch("/api/admin/journeys", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(Object.fromEntries(form)) });
      const payload = await parseResponse(response) as { id?: string };
      formElement.reset(); await refresh(payload.id); setMessage("Journey created as a draft. Add its first chapter below.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not create journey."); }
    finally { setBusy(false); }
  }

  async function createChapter(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!activeJourney) return; setBusy(true); setMessage("Adding chapter…");
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    try {
      await parseResponse(await fetch("/api/admin/chapters", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...Object.fromEntries(form), journeyId: activeJourney.id }) }));
      formElement.reset(); await refresh(activeJourney.id); setMessage("Chapter added. You can upload photographs now.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not add chapter."); }
    finally { setBusy(false); }
  }

  async function updateJourney(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!activeJourney) return; setBusy(true); setMessage("Saving journey details…");
    const form = new FormData(event.currentTarget);
    try {
      await parseResponse(await fetch(`/api/admin/journeys/${activeJourney.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(Object.fromEntries(form)) }));
      await refresh(activeJourney.id); setMessage("Journey name, year, and introduction saved.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not update the journey."); }
    finally { setBusy(false); }
  }

  async function updateChapter(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!activeJourney || !activeChapter) return; setBusy(true); setMessage("Saving chapter details…");
    const form = new FormData(event.currentTarget);
    try {
      await parseResponse(await fetch(`/api/admin/chapters/${activeChapter.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(Object.fromEntries(form)) }));
      await refresh(activeJourney.id); setMessage("Chapter name and short note saved.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not update the chapter."); }
    finally { setBusy(false); }
  }

  async function uploadPhotos(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!activeJourney || !activeChapter) return;
    setBusy(true); setMessage("Preparing original files…");
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const files = form.getAll("files").filter((value): value is File => value instanceof File && value.size > 0);
    try {
      if (!files.length) throw new Error("Choose at least one photograph to upload.");
      const oversized = files.find((file) => file.size > 30 * 1024 * 1024);
      if (oversized) throw new Error(`${oversized.name} is larger than 30 MB.`);
      if ((layoutType === "pair" || layoutType === "leadDetail") && files.length !== 2) throw new Error(`${layoutLabel(layoutType)} requires exactly 2 photographs.`);
      if (layoutType === "sequence" && (files.length < 2 || files.length > 3)) throw new Error("Sequence requires 2 or 3 photographs.");
      const dimensions = await Promise.all(files.map(dimensionsFor));
      setMessage(`Uploading ${files.length} original${files.length === 1 ? "" : "s"}…`);
      const uploadGroup = crypto.randomUUID();
      const shared = { journeyId: activeJourney.id, chapterId: activeChapter.id, layoutType, alt: String(form.get("alt") ?? ""), caption: String(form.get("caption") ?? "") };

      for (let fileIndex = 0; fileIndex < files.length; fileIndex++) {
        const file = files[fileIndex];
        const size = dimensions[fileIndex];
        setMessage(`Uploading ${file.name} · ${fileIndex + 1} of ${files.length}…`);
        const started = await parseResponse(await fetch("/api/admin/uploads", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "start", ...shared, layoutGroup: layoutType === "pair" || layoutType === "leadDetail" || layoutType === "sequence" ? uploadGroup : crypto.randomUUID(), name: file.name, mimeType: file.type, fileSize: file.size, width: size.width, height: size.height }),
        })) as { key?: string; uploadId?: string };
        if (!started.key || !started.uploadId) throw new Error("The upload could not be started.");

        const parts: { partNumber: number; etag: string }[] = [];
        try {
          for (let offset = 0, partNumber = 1; offset < file.size; offset += uploadPartSize, partNumber++) {
            const response = await fetch(`/api/admin/uploads?key=${encodeURIComponent(started.key)}&uploadId=${encodeURIComponent(started.uploadId)}&partNumber=${partNumber}`, {
              method: "PUT", headers: { "Content-Type": "application/octet-stream" }, body: file.slice(offset, Math.min(offset + uploadPartSize, file.size)),
            });
            const uploaded = await parseResponse(response) as { etag?: string };
            if (!uploaded.etag) throw new Error(`Part ${partNumber} of ${file.name} was not accepted.`);
            parts.push({ partNumber, etag: uploaded.etag });
          }
          await parseResponse(await fetch("/api/admin/uploads", {
            method: "PATCH", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...shared, layoutGroup: layoutType === "pair" || layoutType === "leadDetail" || layoutType === "sequence" ? uploadGroup : crypto.randomUUID(), key: started.key, uploadId: started.uploadId, parts, name: file.name, mimeType: file.type, width: size.width, height: size.height }),
          }));
        } catch (error) {
          await fetch(`/api/admin/uploads?key=${encodeURIComponent(started.key)}&uploadId=${encodeURIComponent(started.uploadId)}`, { method: "DELETE" }).catch(() => undefined);
          throw error;
        }
      }
      formElement.reset(); await refresh(activeJourney.id); setMessage(`${files.length} photo${files.length === 1 ? "" : "s"} added to ${activeChapter.title}.`);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Upload failed."); }
    finally { setBusy(false); }
  }

  async function updatePhoto(photo: AdminPhoto, values: PhotoDetailsUpdate) {
    setBusy(true); setMessage(photo.layout_type === "storyMoment" ? "Saving the story moment…" : "Saving photo details…");
    try {
      await parseResponse(await fetch(`/api/admin/photos/${photo.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(values) }));
      await refresh(activeJourney?.id); setMessage(values.hero ? "Cover photo updated." : photo.layout_type === "storyMoment" ? "Story moment saved." : "Photo details saved.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not save photo."); }
    finally { setBusy(false); }
  }

  async function saveComposition(blocks: ComposerBlock[]) {
    if (!activeJourney || !activeChapter) return;
    setBusy(true); setMessage("Saving the editorial composition…");
    try {
      await parseResponse(await fetch(`/api/admin/chapters/${activeChapter.id}/composition`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ blocks: blocks.map((block) => ({ layoutType: block.layoutType, photoIds: block.photos.map((photo) => photo.id), storyTitle: block.storyTitle, storyBody: block.storyBody, storyAlignment: block.storyAlignment })) }),
      }));
      await refresh(activeJourney.id); setMessage(`${activeChapter.title} composition saved.`);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not save the composition."); }
    finally { setBusy(false); }
  }

  async function removePhoto(photo: AdminPhoto) {
    if (!window.confirm(`Remove ${photo.original_name}? This deletes the stored original.`)) return;
    setBusy(true); setMessage("Removing photo…");
    try { await parseResponse(await fetch(`/api/admin/photos/${photo.id}`, { method: "DELETE" })); await refresh(activeJourney?.id); setMessage("Photo removed."); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Could not remove photo."); }
    finally { setBusy(false); }
  }

  async function changePublishStatus() {
    if (!activeJourney) return; const status = activeJourney.status === "published" ? "draft" : "published";
    setBusy(true); setMessage(status === "published" ? "Publishing journey…" : "Returning journey to draft…");
    try {
      await parseResponse(await fetch(`/api/admin/journeys/${activeJourney.id}/publish`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) }));
      await refresh(activeJourney.id); setMessage(status === "published" ? "Journey published." : "Journey is now a draft.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not change status."); }
    finally { setBusy(false); }
  }

  return (
    <div className="admin-studio">
      <aside className="admin-sidebar">
        <div className="admin-panel-heading"><span>Journeys</span><small>{journeys.length}</small></div>
        <div className="admin-journey-list">{journeys.map((journey) => <button className={journey.id === activeJourney?.id ? "is-active" : ""} key={journey.id} onClick={() => { setJourneyId(journey.id); setChapterId(journey.chapters[0]?.id ?? ""); }}><span>{journey.title}</span><small>{journey.status}</small></button>)}</div>
        <details className="admin-create"><summary>New journey +</summary><form onSubmit={createJourney}><label>Title<input name="title" required placeholder="Iceland" /></label><label>URL slug<input name="slug" placeholder="iceland" /></label><label>Journey year<input name="year" type="number" min="1900" max="2100" required placeholder="2026" /></label><label>Journey line<input name="meta" placeholder="Reykjavík · Winter" /></label><label>Introduction<textarea name="intro" rows={3} /></label><button disabled={busy}>Create draft</button></form></details>
      </aside>

      <section className="admin-workspace">
        <div className="admin-status" role="status"><span className={busy ? "is-busy" : ""} />{message}</div>
        {activeJourney ? <>
          <header className="admin-journey-header"><div><p>{activeJourney.status} · {activeJourney.year ?? "Year not set"} · /journeys/{activeJourney.slug}</p><h2>{activeJourney.title}</h2><span>{activeJourney.meta}</span></div><div className="admin-journey-actions"><a href={`/admin/preview/${activeJourney.slug}`} target="_blank" rel="noreferrer">Private preview ↗</a><details className="admin-edit" key={activeJourney.id}><summary>Edit journey</summary><form onSubmit={updateJourney}><label>Name<input name="title" required defaultValue={activeJourney.title} /></label><label>Journey year<input name="year" type="number" min="1900" max="2100" required defaultValue={activeJourney.year ?? ""} placeholder="2026" /></label><label>Journey line<input name="meta" defaultValue={activeJourney.meta} /></label><label>Short introduction<textarea name="intro" rows={4} defaultValue={activeJourney.intro} /></label><button disabled={busy}>Save journey</button></form></details><button className="admin-publish" disabled={busy} onClick={changePublishStatus}>{activeJourney.status === "published" ? "Move to draft" : "Publish journey"}</button></div></header>
          <div className="admin-chapters"><nav aria-label="Journey chapters">{activeJourney.chapters.map((chapter) => <button className={chapter.id === activeChapter?.id ? "is-active" : ""} key={chapter.id} onClick={() => setChapterId(chapter.id)}>{chapter.title}<small>{chapter.photos.length}</small></button>)}</nav><div className="admin-chapter-actions">{activeChapter && <details key={activeChapter.id}><summary>Edit chapter</summary><form onSubmit={updateChapter}><label>Name<input name="title" required defaultValue={activeChapter.title} /></label><label>Chapter description<textarea name="note" rows={4} defaultValue={activeChapter.note} /></label><button disabled={busy}>Save chapter</button></form></details>}<details><summary>Add chapter +</summary><form onSubmit={createChapter}><label>Title<input name="title" required /></label><label>Chapter description<textarea name="note" rows={3} /></label><button disabled={busy}>Add chapter</button></form></details></div></div>
          {activeChapter ? <>
            <form className="admin-upload" onSubmit={uploadPhotos}><div><p className="eyebrow">Add to {activeChapter.title}</p><h3>Upload original photographs</h3><p>JPEG, PNG, WebP or AVIF. Up to 20 files, 30 MB each.</p></div><label className="admin-file-drop">Choose photographs<input type="file" name="files" accept="image/jpeg,image/png,image/webp,image/avif" multiple required /></label><div className="admin-upload-fields"><label>Editorial layout<select value={layoutType} onChange={(event) => setLayoutType(event.target.value as EditorialBlock["type"])}>{layouts.map((layout) => <option value={layout.value} key={layout.value}>{layout.label} · {layout.count}</option>)}</select></label><label>Shared alt text<input name="alt" placeholder="Describe the scene" /></label><label>Shared caption<input name="caption" placeholder="Optional location or note" /></label><button disabled={busy}>Upload to chapter</button></div></form>
            {activeChapter.photos.length ? <><ChapterComposer key={`${activeChapter.id}:${activeChapter.photos.map((photo) => `${photo.id}-${photo.layout_group}-${photo.position}`).join(":")}`} chapter={activeChapter} busy={busy} onSave={saveComposition} /><div className="admin-photo-grid">{activeChapter.photos.map((photo) => <PhotoEditor key={`${photo.id}:${photo.layout_type}`} photo={photo} busy={busy} isHero={activeJourney.hero_photo_id === photo.id} onSave={updatePhoto} onRemove={removePhoto} />)}</div></> : <div className="admin-empty"><span>01</span><p>No photographs here yet.<br />Upload the first frame above.</p></div>}
          </> : <div className="admin-empty admin-empty-setup"><div><p className="eyebrow">First chapter</p><h3>Start the {activeJourney.title} story</h3><p>Add a location or theme such as Phnom Penh, Siem Reap, or Quiet Moments.</p></div><form onSubmit={createChapter}><label>Chapter title<input name="title" required placeholder="Phnom Penh" /></label><label>Chapter description<textarea name="note" rows={4} placeholder="Introduce this part of the journey" /></label><button disabled={busy}>Create first chapter</button></form></div>}
        </> : <div className="admin-empty"><p>Create your first journey to begin.</p></div>}
      </section>
    </div>
  );
}

function ChapterComposer({ chapter, busy, onSave }: { chapter: AdminChapter; busy: boolean; onSave: (blocks: ComposerBlock[]) => Promise<void> }) {
  const [blocks, setBlocks] = useState(() => blocksForChapter(chapter));
  const [selected, setSelected] = useState<string[]>([]);
  const [selectedLayout, setSelectedLayout] = useState<LayoutType>("pair");
  const [notice, setNotice] = useState("Select one photograph and choose Story moment to place writing beside it.");
  const [draggedBlock, setDraggedBlock] = useState<number | null>(null);

  function moveBlock(index: number, direction: number) {
    const target = index + direction;
    if (target < 0 || target >= blocks.length) return;
    setBlocks((current) => { const next = [...current]; [next[index], next[target]] = [next[target], next[index]]; return next; });
  }

  function movePhoto(blockIndex: number, photoIndex: number, direction: number) {
    const target = photoIndex + direction;
    if (target < 0 || target >= blocks[blockIndex].photos.length) return;
    setBlocks((current) => current.map((block, index) => {
      if (index !== blockIndex) return block;
      const photos = [...block.photos]; [photos[photoIndex], photos[target]] = [photos[target], photos[photoIndex]];
      return { ...block, photos };
    }));
  }

  function groupSelection() {
    const count = selected.length;
    if (!isValidBlock(selectedLayout, count)) {
      setNotice(selectedLayout === "sequence" ? "A sequence needs 2 or 3 selected photographs." : selectedLayout === "pair" || selectedLayout === "leadDetail" ? "This layout needs exactly 2 selected photographs." : "This layout needs exactly 1 selected photograph.");
      return;
    }
    const selectedSet = new Set(selected);
    const order = new Map(blocks.flatMap((block) => block.photos).map((photo, index) => [photo.id, index]));
    const chosen = blocks.flatMap((block) => block.photos).filter((photo) => selectedSet.has(photo.id));
    const remaining = blocks.flatMap((block) => {
      const photos = block.photos.filter((photo) => !selectedSet.has(photo.id));
      if (!photos.length) return [];
      if (isValidBlock(block.layoutType, photos.length)) return [{ ...block, photos }];
      return photos.map((photo) => ({ id: crypto.randomUUID(), layoutType: "single" as LayoutType, photos: [photo], storyTitle: photo.story_title, storyBody: photo.story_body, storyAlignment: photo.story_alignment }));
    });
    const next = [...remaining, { id: crypto.randomUUID(), layoutType: selectedLayout, photos: chosen, storyTitle: chosen[0]?.story_title ?? "", storyBody: chosen[0]?.story_body ?? "", storyAlignment: chosen[0]?.story_alignment ?? "right" }]
      .sort((a, b) => (order.get(a.photos[0].id) ?? 0) - (order.get(b.photos[0].id) ?? 0));
    setBlocks(next); setSelected([]); setNotice(selectedLayout === "storyMoment" ? "Story moment created. Write beside the photo, then save the composition." : `${layoutLabel(selectedLayout)} block created. Save the composition when the story feels right.`);
  }

  function dropBlock(target: number) {
    if (draggedBlock === null || draggedBlock === target) return;
    setBlocks((current) => { const next = [...current]; const [moving] = next.splice(draggedBlock, 1); next.splice(target, 0, moving); return next; });
    setDraggedBlock(null);
  }

  const invalid = blocks.some((block) => !isValidBlock(block.layoutType, block.photos.length) || (block.layoutType === "storyMoment" && !block.storyBody.trim()));

  function updateStory(index: number, values: Partial<Pick<ComposerBlock, "storyTitle" | "storyBody" | "storyAlignment">>) {
    setBlocks((current) => current.map((block, blockIndex) => blockIndex === index ? { ...block, ...values } : block));
  }

  return <section className="admin-composer">
    <header><div><p className="eyebrow">Chapter storyboard</p><h3>Compose {chapter.title}</h3><span>{notice}</span></div><div className="admin-composer-actions"><button disabled={busy} onClick={() => { setBlocks(autoCompose(blocks.flatMap((block) => block.photos))); setSelected([]); setNotice("An editorial rhythm has been created. Reorder or regroup anything before saving."); }}>Auto-compose</button><label>Turn selected into<select value={selectedLayout} onChange={(event) => { const nextLayout = event.target.value as LayoutType; setSelectedLayout(nextLayout); if (nextLayout === "storyMoment") setNotice("Now click Convert to Story moment to open the writing fields."); }}>{layouts.map((layout) => <option key={layout.value} value={layout.value}>{layout.label} · {layout.count}</option>)}</select></label><button className={selectedLayout === "storyMoment" && selected.length === 1 ? "story-action" : ""} disabled={busy || !selected.length} onClick={groupSelection}>{selectedLayout === "storyMoment" && selected.length === 1 ? "Convert to Story moment" : `Apply to ${selected.length || "selected"}`}</button><button className="primary" disabled={busy || invalid} onClick={() => onSave(blocks)}>Save composition</button></div></header>
    <div className="admin-storyboard">{blocks.map((block, blockIndex) => <article className={`admin-story-block admin-story-block--${block.layoutType} ${isValidBlock(block.layoutType, block.photos.length) ? "" : "is-invalid"}`} draggable onDragStart={() => setDraggedBlock(blockIndex)} onDragOver={(event) => event.preventDefault()} onDrop={() => dropBlock(blockIndex)} key={block.id}>
      <div className="admin-story-block-heading"><span>{String(blockIndex + 1).padStart(2, "0")} · {layoutLabel(block.layoutType)}</span><div><button aria-label="Move block earlier" disabled={blockIndex === 0} onClick={() => moveBlock(blockIndex, -1)}>←</button><button aria-label="Move block later" disabled={blockIndex === blocks.length - 1} onClick={() => moveBlock(blockIndex, 1)}>→</button></div></div>
      <div className="admin-story-photos">{block.photos.map((photo, photoIndex) => <label className={selected.includes(photo.id) ? "is-selected" : ""} key={photo.id}><input type="checkbox" checked={selected.includes(photo.id)} onChange={() => setSelected((current) => current.includes(photo.id) ? current.filter((id) => id !== photo.id) : [...current, photo.id])} /><img src={photo.src} alt={photo.alt} width={photo.width} height={photo.height} /><span>{photo.original_name}</span>{block.photos.length > 1 && <small><button type="button" disabled={photoIndex === 0} onClick={(event) => { event.preventDefault(); movePhoto(blockIndex, photoIndex, -1); }}>←</button><button type="button" disabled={photoIndex === block.photos.length - 1} onClick={(event) => { event.preventDefault(); movePhoto(blockIndex, photoIndex, 1); }}>→</button></small>}</label>)}</div>
      {block.layoutType === "storyMoment" && <div className="admin-composer-story"><label>Optional story title<input value={block.storyTitle} onChange={(event) => updateStory(blockIndex, { storyTitle: event.target.value })} placeholder="A moment worth remembering" /></label><label>Short story<textarea rows={5} required value={block.storyBody} onChange={(event) => updateStory(blockIndex, { storyBody: event.target.value })} placeholder="Write the story that belongs beside this photograph…" /></label><label>Desktop arrangement<select value={block.storyAlignment} onChange={(event) => updateStory(blockIndex, { storyAlignment: event.target.value as "left" | "right" })}><option value="right">Photo left · story right</option><option value="left">Story left · photo right</option></select></label></div>}
    </article>)}</div>
  </section>;
}

function PhotoEditor({ photo, busy, isHero, onSave, onRemove }: { photo: AdminPhoto; busy: boolean; isHero: boolean; onSave: (photo: AdminPhoto, values: PhotoDetailsUpdate) => void; onRemove: (photo: AdminPhoto) => void }) {
  const [alt, setAlt] = useState(photo.alt); const [caption, setCaption] = useState(photo.caption);
  const values = { alt, caption };
  return <article className="admin-photo-card"><div className="admin-photo-preview"><img src={photo.src} alt={photo.alt} width={photo.width} height={photo.height} />{isHero && <span>Cover</span>}</div><div className="admin-photo-fields"><p>{photo.original_name} · {photo.width}×{photo.height}{photo.layout_type === "storyMoment" ? " · Story moment" : ""}</p><label>Alt text<input value={alt} onChange={(event) => setAlt(event.target.value)} /></label><label>Caption<input value={caption} onChange={(event) => setCaption(event.target.value)} /></label><div><button disabled={busy} onClick={() => onSave(photo, values)}>Save details</button><button disabled={busy || isHero} onClick={() => onSave(photo, { ...values, hero: true })}>Set cover</button><button className="danger" disabled={busy} onClick={() => onRemove(photo)}>Remove</button></div></div></article>;
}
