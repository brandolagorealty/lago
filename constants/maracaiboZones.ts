export interface GridCell {
  id: string;
  nombre: string;
  poligono: { lat: number; lng: number }[];
  meta_km: number;
}

// Generate a grid over Maracaibo, San Francisco and the Eastern Shore
// ~1.5km x ~1.5km squares
export function generateMaracaiboGrid(): GridCell[] {
  const grid: GridCell[] = [];
  const stepLat = 0.014; // ~1.55 km
  const stepLng = 0.014; // ~1.55 km
  let index = 1;

  // Configuration for Grid Boxes
  const boxes = [
    {
      name: "Occidente", // Maracaibo / San Francisco
      startLat: 10.5000,
      endLat: 10.7700,
      startLng: -71.7900,
      endLng: -71.5800 
    },
    {
      name: "Oriente", // Miranda / Cabimas / Lagunillas
      startLat: 10.1500,
      endLat: 10.7500,
      startLng: -71.5500, // Expanded west to reach the coast
      endLng: -71.2800
    }
  ];

  // Helper to check if a coordinate is in the lake (refined)
  const isLikelyWater = (lat: number, lng: number) => {
    // Narrow channel between Maracaibo and Los Puertos
    // East coast of channel (Miranda) is around -71.51 to -71.52
    if (lat > 10.60 && lat < 10.72 && lng > -71.59 && lng < -71.53) return true;
    
    // Wide lake area south of Maracaibo channel
    // East coast near Santa Rita is around -71.54
    if (lat > 10.45 && lat <= 10.60 && lng > -71.57 && lng < -71.54) return true;
    
    // Deeper lake area (center)
    if (lat > 10.10 && lat <= 10.45 && lng > -71.55 && lng < -71.45) return true;

    return false;
  };

  for (const box of boxes) {
    for (let lat = box.startLat; lat <= box.endLat; lat += stepLat) {
      for (let lng = box.startLng; lng <= box.endLng; lng += stepLng) {
        // Skip if center of cell is likely in water
        if (isLikelyWater(lat + stepLat/2, lng + stepLng/2)) continue;

        grid.push({
          id: `grid-${index}`,
          nombre: `Cuadrante ${index}`,
          meta_km: 15,
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
  }

  return grid;
}
