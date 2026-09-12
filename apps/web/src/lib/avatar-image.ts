const MAX_SOURCE_BYTES = 12 * 1024 * 1024;
const MAX_EDGE = 512;
const JPEG_QUALITY = 0.82;

type Drawable = {
  width: number;
  height: number;
  draw: (ctx: CanvasRenderingContext2D, width: number, height: number) => void;
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
