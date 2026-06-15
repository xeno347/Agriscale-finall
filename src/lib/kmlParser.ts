// KML coordinates are stored as "longitude,latitude,altitude" — we return [lat, lng] pairs.

export interface KmlParseResult {
  /** First polygon — kept for backward compat (AddLeadModal uses this) */
  land_coordinates: [number, number][];
  /** Polygons after the first one */
  plots: { name: string; coordinates: [number, number][] }[];
  /** Every polygon in the file — use this when all polygons are plots */
  allPolygons: { name: string; coordinates: [number, number][] }[];
}

const parseCoordString = (raw: string): [number, number][] =>
  raw
    .trim()
    .split(/\s+/)
    .map(pair => {
      const parts = pair.split(',').map(Number);
      // KML order: lon, lat, [alt]
      if (parts.length >= 2 && !isNaN(parts[0]) && !isNaN(parts[1]))
        return [parts[1], parts[0]] as [number, number];
      return null;
    })
    .filter((c): c is [number, number] => c !== null);

export const parseKmlFile = (file: File): Promise<KmlParseResult> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read KML file'));
    reader.onload = () => {
      try {
        const text = reader.result as string;
        const parser = new DOMParser();
        const doc = parser.parseFromString(text, 'application/xml');

        const parseError = doc.querySelector('parsererror');
        if (parseError) throw new Error('Invalid KML/XML file');

        const placemarks = Array.from(doc.querySelectorAll('Placemark'));
        const polygons: { name: string; coordinates: [number, number][] }[] = [];

        for (const pm of placemarks) {
          const name = pm.querySelector('name')?.textContent?.trim() ?? '';
          const coordNodes = pm.querySelectorAll('Polygon > outerBoundaryIs > LinearRing > coordinates');
          for (const node of Array.from(coordNodes)) {
            const coords = parseCoordString(node.textContent ?? '');
            if (coords.length >= 3) polygons.push({ name, coordinates: coords });
          }
        }

        // If no Placemark > Polygon structure, fall back to any <coordinates> tag
        if (polygons.length === 0) {
          const coordNodes = Array.from(doc.querySelectorAll('coordinates'));
          for (const node of coordNodes) {
            const coords = parseCoordString(node.textContent ?? '');
            if (coords.length >= 3) polygons.push({ name: '', coordinates: coords });
          }
        }

        if (polygons.length === 0)
          throw new Error('No polygon coordinates found in this KML file');

        resolve({
          land_coordinates: polygons[0].coordinates,
          plots: polygons.slice(1),
          allPolygons: polygons,
        });
      } catch (err: any) {
        reject(err);
      }
    };
    reader.readAsText(file);
  });
