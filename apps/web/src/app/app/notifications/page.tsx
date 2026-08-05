"use client";

import { FormEvent, useEffect, useState } from "react";
import { api, getUser } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";

type Notification = {
  id: string;
  title: string;
  body: string;
  read: boolean;
  type: string;
  createdAt: string;
};

export default function NotificationsPage() {
  const [items, setItems] = useState<Notification[]>([]);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const user = typeof window !== "undefined" ? getUser() : null;

  async function load() {
    const data = await api<{ notifications: Notification[] }>(
      "/v1/notifications",
    );
    setItems(data.notifications);
  }

  useEffect(() => {
    void load();
  }, []);

  async function markRead(id: string) {
    await api(`/v1/notifications/${id}/read`, { method: "POST" });
    await load();
  }

  async function announce(e: FormEvent) {
    e.preventDefault();
    await api("/v1/notifications/announce", {
      method: "POST",
      body: JSON.stringify({ title, body }),
    });
    setTitle("");
    setBody("");
    await load();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Notifications</h1>
        <p className="text-sm text-muted-foreground">Inbox and announcements</p>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" onClick={() => api("/v1/notifications/read-all", { method: "POST" }).then(load)}>
          Mark all read
        </Button>
      </div>
      <div className="space-y-2">
        {items.map((n) => (
          <Card key={n.id} className={n.read ? "opacity-70" : ""}>
            <CardContent className="flex items-start justify-between gap-3 py-3">
              <div>
                <p className="font-medium">{n.title}</p>
                <p className="text-sm text-muted-foreground">{n.body}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {n.type} · {new Date(n.createdAt).toLocaleString()}
                </p>
              </div>
              {!n.read ? (
                <Button size="sm" variant="outline" onClick={() => markRead(n.id)}>
                  Read
                </Button>
              ) : null}
            </CardContent>
          </Card>
        ))}
      </div>
      {user?.role === "tenant_admin" ? (
        <form className="space-y-3 rounded-lg border bg-white/70 p-4" onSubmit={announce}>
          <h2 className="font-medium">Broadcast announcement</h2>
          <div className="space-y-1">
            <Label>Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} required />
          </div>
          <div className="space-y-1">
            <Label>Body</Label>
            <textarea
              className="min-h-24 w-full rounded-md border border-input bg-background p-3 text-sm"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              required
            />
          </div>
          <Button type="submit">Send</Button>
        </form>
      ) : null}
    </div>
  );
}
