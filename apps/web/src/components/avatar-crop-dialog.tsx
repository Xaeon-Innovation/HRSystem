"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  avatarDisplaySize,
  clampAvatarCropOffset,
  prepareCroppedAvatarDataUrl,
} from "@/lib/avatar-image";
import { cn } from "@/lib/utils";
import { t } from "@/i18n";

const VIEWPORT_MAX = 280;
const MIN_ZOOM = 1;
const MAX_ZOOM = 3;

type CropDraft = {
  zoom: number;
  offsetX: number;
  offsetY: number;
};

export function AvatarCropDialog({
  open,
  file,
  busy = false,
  onOpenChange,
  onConfirm,
}: {
  open: boolean;
  file: File | null;
  busy?: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (imageBase64: string) => void | Promise<void>;
}) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [imageSize, setImageSize] = useState<{ w: number; h: number } | null>(
    null,
  );
  const [viewport, setViewport] = useState(VIEWPORT_MAX);
  const [crop, setCrop] = useState<CropDraft>({
    zoom: 1,
    offsetX: 0,
    offsetY: 0,
  });
  const [localBusy, setLocalBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
  } | null>(null);

  useEffect(() => {
    if (!open) return;
    const el = stageRef.current;
    if (!el) return;
    const update = () => {
      const width = el.clientWidth;
      if (width > 0) setViewport(Math.min(VIEWPORT_MAX, width));
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [open]);

  useEffect(() => {
    if (!file || !open) {
      setPreviewUrl(null);
      setImageSize(null);
      setCrop({ zoom: 1, offsetX: 0, offsetY: 0 });
      setError(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    setCrop({ zoom: 1, offsetX: 0, offsetY: 0 });
    setError(null);
    const img = new Image();
    img.onload = () => {
      setImageSize({ w: img.naturalWidth, h: img.naturalHeight });
    };
    img.onerror = () => {
      setError(t("Could not read that image"));
      setImageSize(null);
    };
    img.src = url;
    return () => URL.revokeObjectURL(url);
  }, [file, open]);

  const applyCrop = useCallback(
    (next: CropDraft, size: { w: number; h: number }, vp: number) => {
      const clamped = clampAvatarCropOffset({
        imageWidth: size.w,
        imageHeight: size.h,
        viewportSize: vp,
        zoom: next.zoom,
        offsetX: next.offsetX,
        offsetY: next.offsetY,
      });
      setCrop({ zoom: next.zoom, ...clamped });
    },
    [],
  );

  function onPointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    if (busy || localBusy || !imageSize) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      originX: crop.offsetX,
      originY: crop.offsetY,
    };
  }

  function onPointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== e.pointerId || !imageSize) return;
    applyCrop(
      {
        zoom: crop.zoom,
        offsetX: drag.originX + (e.clientX - drag.startX),
        offsetY: drag.originY + (e.clientY - drag.startY),
      },
      imageSize,
      viewport,
    );
  }

  function onPointerUp(e: ReactPointerEvent<HTMLDivElement>) {
    if (dragRef.current?.pointerId === e.pointerId) {
      dragRef.current = null;
    }
  }

  function onZoomChange(value: number) {
    if (!imageSize) return;
    applyCrop({ ...crop, zoom: value }, imageSize, viewport);
  }

  async function confirm() {
    if (!file || !imageSize) return;
    setLocalBusy(true);
    setError(null);
    try {
      const imageBase64 = await prepareCroppedAvatarDataUrl(file, {
        viewportSize: viewport,
        zoom: crop.zoom,
        offsetX: crop.offsetX,
        offsetY: crop.offsetY,
      });
      await onConfirm(imageBase64);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : t("Could not process that image"),
      );
    } finally {
      setLocalBusy(false);
    }
  }

  const saving = busy || localBusy;
  const display =
    imageSize != null
      ? avatarDisplaySize({
          imageWidth: imageSize.w,
          imageHeight: imageSize.h,
          viewportSize: viewport,
          zoom: crop.zoom,
          offsetX: crop.offsetX,
          offsetY: crop.offsetY,
        })
      : null;

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-[60] bg-foreground/20 backdrop-blur-md" />
        <DialogPrimitive.Content
          className={cn(
            "fixed left-1/2 top-1/2 z-[61] flex max-h-[min(90dvh,40rem)] w-[min(24rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-xl border border-white/40 bg-card shadow-2xl dark:border-white/10",
          )}
          onPointerDownOutside={(e) => {
            if (saving) e.preventDefault();
          }}
          onEscapeKeyDown={(e) => {
            if (saving) e.preventDefault();
          }}
        >
          <div className="shrink-0 border-b px-5 py-4">
            <DialogPrimitive.Title className="text-lg font-semibold tracking-tight">
              {t("Crop profile photo")}
            </DialogPrimitive.Title>
            <DialogPrimitive.Description className="mt-1 text-sm text-muted-foreground">
              {t("Drag to reposition. Use zoom to frame your face.")}
            </DialogPrimitive.Description>
          </div>

          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
            <div ref={stageRef} className="mx-auto w-full max-w-[280px]">
              <div
                className="relative touch-none select-none overflow-hidden rounded-full bg-muted"
                style={{ width: viewport, height: viewport }}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={onPointerUp}
                role="presentation"
              >
                {previewUrl && display && imageSize ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={previewUrl}
                    alt=""
                    draggable={false}
                    className="pointer-events-none absolute max-w-none"
                    style={{
                      width: display.width,
                      height: display.height,
                      left: (viewport - display.width) / 2 + crop.offsetX,
                      top: (viewport - display.height) / 2 + crop.offsetY,
                    }}
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                    {error ? t(error) : t("Loading…")}
                  </div>
                )}
                <div
                  className="pointer-events-none absolute inset-0 rounded-full ring-2 ring-white/90 ring-inset"
                  aria-hidden
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="avatar-crop-zoom">{t("Zoom")}</Label>
                <span className="text-xs text-muted-foreground tabular-nums">
                  {crop.zoom.toFixed(1)}×
                </span>
              </div>
              <input
                id="avatar-crop-zoom"
                type="range"
                min={MIN_ZOOM}
                max={MAX_ZOOM}
                step={0.05}
                value={crop.zoom}
                disabled={saving || !imageSize}
                onChange={(e) => onZoomChange(Number(e.target.value))}
                className="h-10 w-full accent-primary"
              />
            </div>

            {previewUrl && display && imageSize ? (
              <div className="flex items-center gap-3">
                <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full border bg-muted">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={previewUrl}
                    alt=""
                    draggable={false}
                    className="absolute max-w-none"
                    style={{
                      width: (display.width / viewport) * 56,
                      height: (display.height / viewport) * 56,
                      left:
                        (((viewport - display.width) / 2 + crop.offsetX) /
                          viewport) *
                        56,
                      top:
                        (((viewport - display.height) / 2 + crop.offsetY) /
                          viewport) *
                        56,
                    }}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  {t("Preview matches your roster and map photo.")}
                </p>
              </div>
            ) : null}

            {error ? (
              <p className="text-sm text-destructive">{t(error)}</p>
            ) : null}
          </div>

          <div className="flex shrink-0 flex-col gap-2 border-t px-5 py-4 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              className="w-full sm:w-auto"
              disabled={saving}
              onClick={() => onOpenChange(false)}
            >
              {t("Cancel")}
            </Button>
            <Button
              type="button"
              className="w-full sm:w-auto"
              disabled={saving || !file || !imageSize}
              onClick={() => void confirm()}
            >
              {saving ? t("Saving…") : t("Save photo")}
            </Button>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
