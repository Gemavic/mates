/**
 * Covers regions of an image before it is sent.
 *
 * Vision reads the text inside a photo and reports where each offending word
 * sits; this paints over those words so a phone number scrawled on a notepad
 * does not reach the other member. The coordinates are in the pixel space of
 * the exact bytes that were scanned, so the same blob must be passed back in
 * here - re-compressing between the scan and the cover would shift everything.
 */

export interface CoverBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

export async function coverRegions(source: Blob, boxes: CoverBox[]): Promise<Blob> {
  if (boxes.length === 0) return source;

  const bitmap = await createImageBitmap(source);

  try {
    const canvas = document.createElement('canvas');
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;

    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('2d canvas is unavailable');

    ctx.drawImage(bitmap, 0, 0);
    ctx.fillStyle = '#111827';

    for (const box of boxes) {
      const x = Math.max(0, Math.floor(box.x));
      const y = Math.max(0, Math.floor(box.y));
      const w = Math.min(canvas.width - x, Math.ceil(box.w));
      const h = Math.min(canvas.height - y, Math.ceil(box.h));
      if (w > 0 && h > 0) ctx.fillRect(x, y, w, h);
    }

    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error('Could not redraw the image'))),
        'image/jpeg',
        0.9
      );
    });
  } finally {
    bitmap.close?.();
  }
}
