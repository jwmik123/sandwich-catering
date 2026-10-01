// Product photos are 1920×1080 shots with the product small in the middle.
// Instead of scaling them up in CSS (blurry), ask the Sanity CDN for a zoomed
// crop around the centre at exactly the width the browser needs.
import { dataset, projectId } from "@/sanity/env";

const parseRef = (image) => {
  const ref = image?.asset?._ref;
  const match = ref?.match(/^image-([a-f0-9]+)-(\d+)x(\d+)-(\w+)$/);
  if (!match) return null;
  return { id: match[1], width: Number(match[2]), height: Number(match[3]), format: match[4] };
};

/**
 * URL for a centred crop with the given aspect ratio (width / height), zoomed
 * in by `zoom` (1 = the largest crop that fits), `width` pixels wide.
 */
export const productImageUrl = (image, { width, aspect = 4 / 3, zoom = 1.5, quality = 80 }) => {
  const asset = parseRef(image);
  if (!asset) return null;

  let cropWidth = asset.width;
  let cropHeight = asset.width / aspect;
  if (cropHeight > asset.height) {
    cropHeight = asset.height;
    cropWidth = asset.height * aspect;
  }
  cropWidth = Math.round(cropWidth / zoom);
  cropHeight = Math.round(cropHeight / zoom);
  const x = Math.round((asset.width - cropWidth) / 2);
  const y = Math.round((asset.height - cropHeight) / 2);

  const params = new URLSearchParams({
    rect: `${x},${y},${cropWidth},${cropHeight}`,
    w: String(Math.round(width)),
    h: String(Math.round(width / aspect)),
    q: String(quality),
    auto: "format",
    fit: "crop",
  });
  return `https://cdn.sanity.io/images/${projectId}/${dataset}/${asset.id}-${asset.width}x${asset.height}.${asset.format}?${params}`;
};

/**
 * next/image loader for a product photo, so every srcset width comes straight
 * from the Sanity CDN (no second round of compression by Next.js).
 * Use with `src={productImageKey(image)}`.
 */
export const productImageLoader =
  (image, { aspect = 4 / 3, zoom = 1.5 } = {}) =>
  ({ width, quality }) =>
    productImageUrl(image, { width, aspect, zoom, quality: quality || 80 });

export const productImageKey = (image) => image?.asset?._ref || "";
