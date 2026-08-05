type SocketLike = {
  send: (data: string) => void;
  readyState?: number;
};

const rooms = new Map<string, Set<SocketLike>>();

export function addClient(room: string, socket: SocketLike) {
  let set = rooms.get(room);
  if (!set) {
    set = new Set();
    rooms.set(room, set);
  }
  set.add(socket);
}

export function removeClient(room: string, socket: SocketLike) {
  rooms.get(room)?.delete(socket);
}

export function broadcastToTenant(
  tenantId: string,
  message: Record<string, unknown>,
) {
  const room = `tenant:${tenantId}:map`;
  const payload = JSON.stringify(message);
  const set = rooms.get(room);
  if (!set) return;
  for (const client of set) {
    try {
      client.send(payload);
    } catch {
      set.delete(client);
    }
  }
}

export function roomSize(room: string) {
  return rooms.get(room)?.size ?? 0;
}
