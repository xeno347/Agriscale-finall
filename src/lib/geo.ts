export type LatLng = [number, number];

// Spherical-excess formula; accurate enough for farm-sized polygons.
export const calculateAcres = (coords: LatLng[]): number => {
  if (coords.length < 3) return 0;
  const R = 6371000; // Earth radius in metres
  let area = 0;
  const n = coords.length;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const lat1 = coords[i][0] * (Math.PI / 180);
    const lat2 = coords[j][0] * (Math.PI / 180);
    const dLon = (coords[j][1] - coords[i][1]) * (Math.PI / 180);
    area += dLon * (2 + Math.sin(lat1) + Math.sin(lat2));
  }
  return Math.abs((area * R * R) / 2) / 4046.856;
};

export const centerOf = (coords: LatLng[]): LatLng => {
  if (!coords.length) return [20.5937, 78.9629];
  return [
    coords.reduce((s, c) => s + c[0], 0) / coords.length,
    coords.reduce((s, c) => s + c[1], 0) / coords.length,
  ];
};
