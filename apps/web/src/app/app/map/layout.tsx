import "./map-leaflet.css";

export default function MapLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <link rel="preconnect" href="https://server.arcgisonline.com" crossOrigin="" />
      <link rel="preconnect" href="https://tile.openstreetmap.de" crossOrigin="" />
      <link rel="dns-prefetch" href="https://server.arcgisonline.com" />
      <link rel="dns-prefetch" href="https://tile.openstreetmap.de" />
      {children}
    </>
  );
}
