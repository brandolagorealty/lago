export interface GridCell {
  id: string;
  nombre: string;
  poligono: { lat: number; lng: number }[];
  meta_km: number;
}

// Generate a grid over Maracaibo and San Francisco
// ~1.5km x ~1.5km squares
export function generateMaracaiboGrid(): GridCell[] {
  const grid: GridCell[] = [];
  
  const startLat = 10.5000; // Sur (Más al sur en San Francisco)
  const endLat = 10.7700;   // Norte (Más al norte en Maracaibo Norte)
  const startLng = -71.7900; // Oeste (Incluir Ancón Alto, San Isidro, etc)
  const endLng = -71.5700;   // Este (Lago)

  const stepLat = 0.014; // ~1.55 km
  const stepLng = 0.014; // ~1.55 km

  let index = 1;
  for (let lat = startLat; lat <= endLat; lat += stepLat) {
    for (let lng = startLng; lng <= endLng; lng += stepLng) {
      grid.push({
        id: `grid-${index}`,
        nombre: `Cuadrante ${index}`,
        meta_km: 15, // Meta default estimada por cuadrante
        poligono: [
          { lat, lng },
          { lat: lat + stepLat, lng },
          { lat: lat + stepLat, lng: lng + stepLng },
          { lat, lng: lng + stepLng }
        ]
      });
      index++;
    }
  }
  return grid;
}
