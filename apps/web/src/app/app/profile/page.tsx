"use client";

import { ChangeEvent, useRef, useState } from "react";
import {
  api,
  getUser,
  updateSessionUser,
  type AuthUser,
} from "@/lib/api";
import { prepareAvatarDataUrl } from "@/lib/avatar-image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UserAvatar } from "@/components/user-avatar";
import { Camera } from "lucide-react";

const MAX_BYTES = 12 * 1024 * 1024;
const ACCEPT = "image/jpeg,image/png,image/webp,image/gif";

const ROLE_LABEL: Record<AuthUser["role"], string> = {
  super_admin: "Platform admin",
  tenant_admin: "Admin",
  employee: "Employee",
};

export default function ProfilePage() {
  const [user, setUser] = useState<AuthUser | null>(() =>
    typeof window === "undefined" ? null : getUser(),
  );
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function applyUser(next: AuthUser) {
    updateSessionUser(next);
    setUser(next);
  }

  async function onFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > MAX_BYTES) {
      setError("Choose a photo under 12 MB.");
      setMessage(null);
      return;
    }
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const imageBase64 = await prepareAvatarDataUrl(file);
      const res = await api<{ user: AuthUser }>("/v1/auth/me/avatar", {
        method: "POST",
        body: JSON.stringify({ imageBase64 }),
      });
      applyUser(res.user);
      setMessage("Profile photo updated.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not upload photo");
    } finally {
      setBusy(false);
    }
  }

  async function removePhoto() {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const res = await api<{ user: AuthUser }>("/v1/auth/me/avatar", {
        method: "DELETE",
      });
      applyUser(res.user);
      setMessage("Profile photo removed.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not remove photo");
    } finally {
      setBusy(false);
    }
  }

  if (!user) {
    return <p className="text-sm text-muted-foreground">Loading…</p>;
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Profile</h1>
        <p className="text-sm text-muted-foreground">
          Add a photo so teammates can recognize you on the roster and map.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Your photo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
            <button
              type="button"
              className="group relative rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              onClick={() => inputRef.current?.click()}
              disabled={busy}
              aria-label="Change profile photo"
            >
              <UserAvatar
                name={user.name}
                avatarUrl={user.avatarUrl}
                size="xl"
              />
              <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/45 text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                <Camera className="h-6 w-6" />
              </span>
            </button>
            <div className="min-w-0 space-y-1">
              <p className="truncate font-medium">{user.name}</p>
              <p className="truncate text-sm text-muted-foreground">
                {user.email}
              </p>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                {ROLE_LABEL[user.role]}
              </p>
            </div>
          </div>
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPT}
            className="hidden"
            onChange={(e) => void onFile(e)}
          />
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              disabled={busy}
              onClick={() => inputRef.current?.click()}
            >
              {busy ? "Saving…" : user.avatarUrl ? "Change photo" : "Upload photo"}
            </Button>
            {user.avatarUrl ? (
              <Button
                type="button"
                variant="outline"
                disabled={busy}
                onClick={() => void removePhoto()}
              >
                Remove
              </Button>
            ) : null}
          </div>
          <p className="text-xs text-muted-foreground">
            JPEG, PNG, WebP, or GIF — photos are resized automatically
          </p>
          {message ? (
            <p className="text-sm text-teal-800">{message}</p>
          ) : null}
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </CardContent>
      </Card>
    </div>
  );
}
