const MAX_SOURCE_BYTES = 12 * 1024 * 1024;
const MAX_EDGE = 512;
const JPEG_QUALITY = 0.82;

export type AvatarCropState = {
  imageWidth: number;
  imageHeight: number;
  viewportSize: number;
  zoom: number;
  offsetX: number;
  offsetY: number;
};

export type SourceSquare = {
  x: number;
  y: number;
  size: number;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

/** Cover scale so the shorter image edge fills the circular viewport at zoom 1. */
export function avatarCoverScale(
  imageWidth: number,
  imageHeight: number,
  viewportSize: number,
): number {
  const shortest = Math.min(imageWidth, imageHeight);
  if (shortest <= 0 || viewportSize <= 0) return 1;
  return viewportSize / shortest;
}

export function avatarDisplaySize(crop: AvatarCropState): {
  width: number;
  height: number;
} {
  const scale = avatarCoverScale(
    crop.imageWidth,
    crop.imageHeight,
    crop.viewportSize,
  ) * crop.zoom;
  return {
    width: crop.imageWidth * scale,
    height: crop.imageHeight * scale,
  };
}

/** Keep the circular viewport inside the image. */
export function clampAvatarCropOffset(
  crop: Omit<AvatarCropState, "offsetX" | "offsetY"> & {
    offsetX: number;
    offsetY: number;
  },
): { offsetX: number; offsetY: number } {
  const { width, height } = avatarDisplaySize(crop);
  const maxX = Math.max(0, (width - crop.viewportSize) / 2);
  const maxY = Math.max(0, (height - crop.viewportSize) / 2);
  return {
    offsetX: clamp(crop.offsetX, -maxX, maxX),
    offsetY: clamp(crop.offsetY, -maxY, maxY),
  };
}

/** Map viewport crop circle → source image square (natural pixels). */
export function cropSourceSquare(crop: AvatarCropState): SourceSquare {
  const scale =
    avatarCoverScale(crop.imageWidth, crop.imageHeight, crop.viewportSize) *
    crop.zoom;
  const { width, height } = avatarDisplaySize(crop);
  const left = (crop.viewportSize - width) / 2 + crop.offsetX;
  const top = (crop.viewportSize - height) / 2 + crop.offsetY;
  const size = crop.viewportSize / scale;
  const x = clamp(-left / scale, 0, Math.max(0, crop.imageWidth - size));
  const y = clamp(-top / scale, 0, Math.max(0, crop.imageHeight - size));
  return {
    x,
    y,
    size: Math.min(size, crop.imageWidth, crop.imageHeight),
  };
}

type Drawable = {
  width: number;
  height: number;
  draw: (ctx: CanvasRenderingContext2D, width: number, height: number) => void;
  drawRegion: (
    ctx: CanvasRenderingContext2D,
    sx: number,
    sy: number,
    sSize: number,
    dx: number,
    dy: number,
    dSize: number,
  ) => void;
  close?: () => void;
};

async function decodeImage(file: File): Promise<Drawable> {
  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(file);
      return {
        width: bitmap.width,
        height: bitmap.height,
        draw: (ctx, width, height) => ctx.drawImage(bitmap, 0, 0, width, height),
        drawRegion: (ctx, sx, sy, sSize, dx, dy, dSize) =>
          ctx.drawImage(bitmap, sx, sy, sSize, sSize, dx, dy, dSize, dSize),
        close: () => bitmap.close(),
      };
    } catch {
      /* fall through to HTMLImageElement */
    }
  }

  const objectUrl = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("Could not read that image"));
      el.src = objectUrl;
    });
    return {
      width: image.naturalWidth,
      height: image.naturalHeight,
      draw: (ctx, width, height) => ctx.drawImage(image, 0, 0, width, height),
      drawRegion: (ctx, sx, sy, sSize, dx, dy, dSize) =>
        ctx.drawImage(image, sx, sy, sSize, sSize, dx, dy, dSize, dSize),
    };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

/** Compress a picked photo to a small JPEG data URL suitable for avatars. */
export async function prepareAvatarDataUrl(file: File): Promise<string> {
  if (file.size > MAX_SOURCE_BYTES) {
    throw new Error("Choose a photo under 12 MB.");
  }

  const source = await decodeImage(file);
  try {
    if (!source.width || !source.height) {
      throw new Error("Could not read that image");
    }
    const scale = Math.min(1, MAX_EDGE / Math.max(source.width, source.height));
    const width = Math.max(1, Math.round(source.width * scale));
    const height = Math.max(1, Math.round(source.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Could not process that image");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
    source.draw(ctx, width, height);
    const jpeg = canvas.toDataURL("image/jpeg", JPEG_QUALITY);
    if (!jpeg.startsWith("data:image/jpeg")) {
      throw new Error("Could not process that image");
    }
    return jpeg;
  } finally {
    source.close?.();
  }
}

/**
 * Bake a circular crop (square source region) into a 512×512 JPEG data URL.
 * Zoom/pan are viewport-relative; viewportSize must match the crop UI.
 */
export async function prepareCroppedAvatarDataUrl(
  file: File,
  crop: Omit<AvatarCropState, "imageWidth" | "imageHeight">,
): Promise<string> {
  if (file.size > MAX_SOURCE_BYTES) {
    throw new Error("Choose a photo under 12 MB.");
  }

  const source = await decodeImage(file);
  try {
    if (!source.width || !source.height) {
      throw new Error("Could not read that image");
    }
    const full: AvatarCropState = {
      imageWidth: source.width,
      imageHeight: source.height,
      viewportSize: crop.viewportSize,
      zoom: Math.max(1, crop.zoom),
      offsetX: crop.offsetX,
      offsetY: crop.offsetY,
    };
    const clamped = clampAvatarCropOffset(full);
    const square = cropSourceSquare({ ...full, ...clamped });
    const edge = MAX_EDGE;
    const canvas = document.createElement("canvas");
    canvas.width = edge;
    canvas.height = edge;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Could not process that image");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, edge, edge);
    source.drawRegion(ctx, square.x, square.y, square.size, 0, 0, edge);
    const jpeg = canvas.toDataURL("image/jpeg", JPEG_QUALITY);
    if (!jpeg.startsWith("data:image/jpeg")) {
      throw new Error("Could not process that image");
    }
    return jpeg;
  } finally {
    source.close?.();
  }
}

const MAX_DATA_URL_CHARS = 2_500_000;

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("Could not read that image"));
    reader.readAsDataURL(file);
  });
}

function looksLikeImageFile(file: File): boolean {
  if (/^image\/(jpeg|png|webp|gif)$/i.test(file.type)) return true;
  return /\.(jpe?g|png|webp|gif)$/i.test(file.name);
}

/** Resize a tenant logo, keeping PNG transparency when the file is small enough. */
export async function prepareLogoDataUrl(file: File): Promise<string> {
  if (file.size > MAX_SOURCE_BYTES) {
    throw new Error("Choose an image under 12 MB.");
  }
  if (!looksLikeImageFile(file)) {
    throw new Error("Use a JPEG, PNG, WebP, or GIF image");
  }
  if (file.size <= 2 * 1024 * 1024) {
    const raw = await fileToDataUrl(file);
    if (raw.startsWith("data:image/") && raw.length <= MAX_DATA_URL_CHARS) {
      return raw;
    }
  }

  const preferJpeg = /jpeg|jpg/i.test(file.type) || /\.jpe?g$/i.test(file.name);
  const source = await decodeImage(file);
  try {
    if (!source.width || !source.height) {
      throw new Error("Could not read that image");
    }
    const scale = Math.min(1, MAX_EDGE / Math.max(source.width, source.height));
    const width = Math.max(1, Math.round(source.width * scale));
    const height = Math.max(1, Math.round(source.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Could not process that image");
    if (preferJpeg) {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, width, height);
    }
    source.draw(ctx, width, height);
    if (!preferJpeg) {
      const png = canvas.toDataURL("image/png");
      if (png.startsWith("data:image/png") && png.length <= MAX_DATA_URL_CHARS) {
        return png;
      }
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, width, height);
      source.draw(ctx, width, height);
    }
    const jpeg = canvas.toDataURL("image/jpeg", JPEG_QUALITY);
    if (!jpeg.startsWith("data:image/jpeg")) {
      throw new Error("Could not process that image");
    }
    return jpeg;
  } finally {
    source.close?.();
  }
}
