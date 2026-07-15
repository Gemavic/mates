// Real on-device NSFW detection (replaces the mock scanner for images).
// Uses NSFWJS (TensorFlow.js) loaded lazily in a separate chunk, so the main
// bundle stays small and the model only downloads when someone attaches an
// image. Nothing is sent to any third-party server — scanning is local.

export interface ImageSafetyResult {
  /** true = nudity/explicit content detected → must be blurred */
  sensitive: boolean;
  /** true = the model could not run; treat as sensitive in private mail */
  unknown: boolean;
  scores?: Record<string, number>;
}

let modelPromise: Promise<any> | null = null;

async function getModel() {
  if (!modelPromise) {
    modelPromise = (async () => {
      const [nsfwjs, tf] = await Promise.all([
        import('nsfwjs'),
        import('@tensorflow/tfjs'),
      ]);
      await tf.ready();
      // MobileNetV2 — good accuracy/size tradeoff, ~2.6MB download, cached
      return nsfwjs.load('MobileNetV2');
    })().catch((err) => {
      console.error('NSFW model failed to load:', err);
      modelPromise = null;
      throw err;
    });
  }
  return modelPromise;
}

/**
 * Scan an image file for explicit content.
 * Thresholds: Porn or Hentai ≥ 0.4, or Sexy ≥ 0.7 → sensitive.
 * (Sexy alone gets a higher bar so swimwear/gym photos aren't over-flagged.)
 */
export async function scanImageSensitivity(file: File): Promise<ImageSafetyResult> {
  if (!file.type.startsWith('image/')) {
    return { sensitive: false, unknown: false };
  }

  let objectUrl: string | null = null;
  try {
    const model = await getModel();

    objectUrl = URL.createObjectURL(file);
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('image load failed'));
      img.src = objectUrl!;
    });

    const predictions: Array<{ className: string; probability: number }> =
      await model.classify(img);

    const scores: Record<string, number> = {};
    for (const p of predictions) scores[p.className] = p.probability;

    const porn = scores['Porn'] ?? 0;
    const hentai = scores['Hentai'] ?? 0;
    const sexy = scores['Sexy'] ?? 0;

    const sensitive = porn >= 0.4 || hentai >= 0.4 || sexy >= 0.7;
    return { sensitive, unknown: false, scores };
  } catch {
    // Fail-safe: if we can't scan it, treat it as sensitive in contexts
    // where explicit content is possible (private mail), so nothing
    // explicit ever slips through unblurred.
    return { sensitive: true, unknown: true };
  } finally {
    if (objectUrl) URL.revokeObjectURL(objectUrl);
  }
}
