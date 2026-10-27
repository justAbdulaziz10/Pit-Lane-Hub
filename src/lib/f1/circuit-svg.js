// Project a circuit's GeoJSON coordinates ([lng, lat]) into an SVG path.

const SIZE = 1000;
const PADDING = 40;

export function circuitOutline(coordinates) {
    const points = (coordinates || []).filter((point) => Array.isArray(point)
        && Number.isFinite(point[0]) && Number.isFinite(point[1]));
    if (points.length < 2) return null;

    const lats = points.map(([, lat]) => lat);
    const lngs = points.map(([lng]) => lng);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    const centerLat = (minLat + maxLat) / 2;
    // Equirectangular projection; longitude shrinks with latitude.
    const xScale = Math.cos((centerLat * Math.PI) / 180);
    const width = (maxLng - minLng) * xScale || 1e-9;
    const height = maxLat - minLat || 1e-9;
    const scale = (SIZE - PADDING * 2) / Math.max(width, height);
    const offsetX = (SIZE - width * scale) / 2;
    const offsetY = (SIZE - height * scale) / 2;

    const projected = points.map(([lng, lat]) => [
        Number((offsetX + (lng - minLng) * xScale * scale).toFixed(1)),
        Number((offsetY + (maxLat - lat) * scale).toFixed(1)),
    ]);
    const d = projected.map(([x, y], index) => `${index === 0 ? 'M' : 'L'}${x} ${y}`).join(' ');
    return {
        d,
        viewBox: `0 0 ${SIZE} ${SIZE}`,
        start: projected[0],
        center: { lat: centerLat, lng: (minLng + maxLng) / 2 },
        bounds: { minLat, maxLat, minLng, maxLng },
    };
}

/** Lengths in the circuits dataset are metres. */
export function formatCircuitLength(metres) {
    const value = Number(metres);
    if (!Number.isFinite(value) || value <= 0) return null;
    return `${(value / 1000).toFixed(3)} km`;
}
