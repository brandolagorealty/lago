// Pre-defined polygon coordinates for Maracaibo sectors
// Each sector has approximate boundary vertices for map rendering
export const MARACAIBO_ZONES: { nombre: string; poligono: { lat: number; lng: number }[]; meta_km: number; color: string }[] = [
  {
    nombre: 'La Lago',
    color: '#10b981',
    meta_km: 20,
    poligono: [
      { lat: 10.6810, lng: -71.6230 }, { lat: 10.6810, lng: -71.6100 },
      { lat: 10.6710, lng: -71.6100 }, { lat: 10.6710, lng: -71.6230 }
    ]
  },
  {
    nombre: 'Tierra Negra',
    color: '#f59e0b',
    meta_km: 18,
    poligono: [
      { lat: 10.6710, lng: -71.6230 }, { lat: 10.6710, lng: -71.6100 },
      { lat: 10.6620, lng: -71.6100 }, { lat: 10.6620, lng: -71.6230 }
    ]
  },
  {
    nombre: 'Bella Vista',
    color: '#8b5cf6',
    meta_km: 25,
    poligono: [
      { lat: 10.6700, lng: -71.6100 }, { lat: 10.6700, lng: -71.5960 },
      { lat: 10.6580, lng: -71.5960 }, { lat: 10.6580, lng: -71.6100 }
    ]
  },
  {
    nombre: 'Las Mercedes',
    color: '#06b6d4',
    meta_km: 22,
    poligono: [
      { lat: 10.6810, lng: -71.6100 }, { lat: 10.6810, lng: -71.5960 },
      { lat: 10.6700, lng: -71.5960 }, { lat: 10.6700, lng: -71.6100 }
    ]
  },
  {
    nombre: 'La Virginia',
    color: '#ec4899',
    meta_km: 15,
    poligono: [
      { lat: 10.6900, lng: -71.6200 }, { lat: 10.6900, lng: -71.6070 },
      { lat: 10.6810, lng: -71.6070 }, { lat: 10.6810, lng: -71.6200 }
    ]
  },
  {
    nombre: 'El Milagro',
    color: '#f97316',
    meta_km: 18,
    poligono: [
      { lat: 10.6950, lng: -71.6350 }, { lat: 10.6950, lng: -71.6200 },
      { lat: 10.6850, lng: -71.6200 }, { lat: 10.6850, lng: -71.6350 }
    ]
  },
  {
    nombre: 'San Jacinto',
    color: '#14b8a6',
    meta_km: 20,
    poligono: [
      { lat: 10.6620, lng: -71.6230 }, { lat: 10.6620, lng: -71.6100 },
      { lat: 10.6520, lng: -71.6100 }, { lat: 10.6520, lng: -71.6230 }
    ]
  },
  {
    nombre: 'El Paraíso',
    color: '#a855f7',
    meta_km: 22,
    poligono: [
      { lat: 10.6580, lng: -71.6100 }, { lat: 10.6580, lng: -71.5960 },
      { lat: 10.6470, lng: -71.5960 }, { lat: 10.6470, lng: -71.6100 }
    ]
  },
  {
    nombre: 'Indio Mara',
    color: '#ef4444',
    meta_km: 20,
    poligono: [
      { lat: 10.6520, lng: -71.6230 }, { lat: 10.6520, lng: -71.6100 },
      { lat: 10.6420, lng: -71.6100 }, { lat: 10.6420, lng: -71.6230 }
    ]
  },
  {
    nombre: 'Cecilio Acosta',
    color: '#64748b',
    meta_km: 28,
    poligono: [
      { lat: 10.6470, lng: -71.6100 }, { lat: 10.6470, lng: -71.5930 },
      { lat: 10.6350, lng: -71.5930 }, { lat: 10.6350, lng: -71.6100 }
    ]
  },
  {
    nombre: 'La Limpia',
    color: '#0ea5e9',
    meta_km: 25,
    poligono: [
      { lat: 10.6420, lng: -71.6230 }, { lat: 10.6420, lng: -71.6050 },
      { lat: 10.6300, lng: -71.6050 }, { lat: 10.6300, lng: -71.6230 }
    ]
  },
  {
    nombre: 'Santa Lucía',
    color: '#d946ef',
    meta_km: 22,
    poligono: [
      { lat: 10.6620, lng: -71.6350 }, { lat: 10.6620, lng: -71.6230 },
      { lat: 10.6500, lng: -71.6230 }, { lat: 10.6500, lng: -71.6350 }
    ]
  },
  {
    nombre: 'Valle Frío',
    color: '#84cc16',
    meta_km: 18,
    poligono: [
      { lat: 10.6750, lng: -71.6350 }, { lat: 10.6750, lng: -71.6230 },
      { lat: 10.6620, lng: -71.6230 }, { lat: 10.6620, lng: -71.6350 }
    ]
  },
  {
    nombre: 'Juana de Ávila',
    color: '#eab308',
    meta_km: 25,
    poligono: [
      { lat: 10.6850, lng: -71.5960 }, { lat: 10.6850, lng: -71.5800 },
      { lat: 10.6720, lng: -71.5800 }, { lat: 10.6720, lng: -71.5960 }
    ]
  },
  {
    nombre: 'Santa Rita',
    color: '#22d3ee',
    meta_km: 20,
    poligono: [
      { lat: 10.6350, lng: -71.6100 }, { lat: 10.6350, lng: -71.5930 },
      { lat: 10.6220, lng: -71.5930 }, { lat: 10.6220, lng: -71.6100 }
    ]
  },
  {
    nombre: 'Canchancha',
    color: '#fb923c',
    meta_km: 22,
    poligono: [
      { lat: 10.6720, lng: -71.5960 }, { lat: 10.6720, lng: -71.5800 },
      { lat: 10.6580, lng: -71.5800 }, { lat: 10.6580, lng: -71.5960 }
    ]
  },
  {
    nombre: 'Coquivacoa',
    color: '#4ade80',
    meta_km: 20,
    poligono: [
      { lat: 10.6900, lng: -71.6070 }, { lat: 10.6900, lng: -71.5960 },
      { lat: 10.6810, lng: -71.5960 }, { lat: 10.6810, lng: -71.6070 }
    ]
  },
  {
    nombre: 'San Francisco Norte',
    color: '#c084fc',
    meta_km: 35,
    poligono: [
      { lat: 10.6300, lng: -71.6350 }, { lat: 10.6300, lng: -71.6100 },
      { lat: 10.6100, lng: -71.6100 }, { lat: 10.6100, lng: -71.6350 }
    ]
  },
  {
    nombre: 'San Francisco Sur',
    color: '#fbbf24',
    meta_km: 30,
    poligono: [
      { lat: 10.6100, lng: -71.6350 }, { lat: 10.6100, lng: -71.6100 },
      { lat: 10.5900, lng: -71.6100 }, { lat: 10.5900, lng: -71.6350 }
    ]
  },
  {
    nombre: '5 de Julio',
    color: '#2dd4bf',
    meta_km: 20,
    poligono: [
      { lat: 10.6710, lng: -71.6350 }, { lat: 10.6710, lng: -71.6230 },
      { lat: 10.6620, lng: -71.6230 }, { lat: 10.6620, lng: -71.6350 }
    ]
  }
];
