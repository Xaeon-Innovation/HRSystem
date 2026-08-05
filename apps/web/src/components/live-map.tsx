"use client";

import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const icon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

type Loc = {
  employeeId: string;
  name: string;
  role: string;
  jobTitle: string | null;
  lat: number;
  lng: number;
  secondsSinceUpdate?: number;
};

export default function LiveMapView({
  center,
  locations,
}: {
  center: { lat: number; lng: number };
  locations: Loc[];
}) {
  return (
    <MapContainer
      center={[center.lat, center.lng]}
      zoom={12}
      style={{ height: "100%", width: "100%" }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {locations.map((l) => (
        <Marker key={l.employeeId} position={[l.lat, l.lng]} icon={icon}>
          <Popup>
            <strong>{l.name}</strong>
            <br />
            {l.jobTitle ?? l.role}
            <br />
            Updated {l.secondsSinceUpdate ?? 0}s ago
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
