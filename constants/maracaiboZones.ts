// Coordenadas calibradas de sectores de Maracaibo y San Francisco
// Referencia: Av. 5 de Julio como eje, El Lago al Este
export const MARACAIBO_ZONES: { nombre: string; poligono: { lat: number; lng: number }[]; meta_km: number; color: string }[] = [
  {
    nombre: 'La Lago',
    color: '#10b981',
    meta_km: 20,
    poligono: [
      { lat: 10.6920, lng: -71.6400 }, { lat: 10.6920, lng: -71.6250 },
      { lat: 10.6820, lng: -71.6250 }, { lat: 10.6820, lng: -71.6400 }
    ]
  },
  {
    nombre: 'Tierra Negra',
    color: '#f59e0b',
    meta_km: 18,
    poligono: [
      { lat: 10.6820, lng: -71.6400 }, { lat: 10.6820, lng: -71.6250 },
      { lat: 10.6720, lng: -71.6250 }, { lat: 10.6720, lng: -71.6400 }
    ]
  },
  {
    nombre: 'Bella Vista',
    color: '#8b5cf6',
    meta_km: 25,
    poligono: [
      { lat: 10.6780, lng: -71.6250 }, { lat: 10.6780, lng: -71.6100 },
      { lat: 10.6650, lng: -71.6100 }, { lat: 10.6650, lng: -71.6250 }
    ]
  },
  {
    nombre: 'Las Mercedes',
    color: '#06b6d4',
    meta_km: 22,
    poligono: [
      { lat: 10.6880, lng: -71.6250 }, { lat: 10.6880, lng: -71.6100 },
      { lat: 10.6780, lng: -71.6100 }, { lat: 10.6780, lng: -71.6250 }
    ]
  },
  {
    nombre: 'La Virginia',
    color: '#ec4899',
    meta_km: 15,
    poligono: [
      { lat: 10.7000, lng: -71.6320 }, { lat: 10.7000, lng: -71.6180 },
      { lat: 10.6920, lng: -71.6180 }, { lat: 10.6920, lng: -71.6320 }
    ]
  },
  {
    nombre: 'El Milagro',
    color: '#f97316',
    meta_km: 18,
    poligono: [
      { lat: 10.7080, lng: -71.6480 }, { lat: 10.7080, lng: -71.6320 },
      { lat: 10.6940, lng: -71.6320 }, { lat: 10.6940, lng: -71.6480 }
    ]
  },
  {
    nombre: 'San Jacinto',
    color: '#14b8a6',
    meta_km: 20,
    poligono: [
      { lat: 10.6650, lng: -71.6320 }, { lat: 10.6650, lng: -71.6180 },
      { lat: 10.6550, lng: -71.6180 }, { lat: 10.6550, lng: -71.6320 }
    ]
  },
  {
    nombre: 'El Paraíso',
    color: '#a855f7',
    meta_km: 22,
    poligono: [
      { lat: 10.6560, lng: -71.6180 }, { lat: 10.6560, lng: -71.6020 },
      { lat: 10.6440, lng: -71.6020 }, { lat: 10.6440, lng: -71.6180 }
    ]
  },
  {
    nombre: 'Indio Mara',
    color: '#ef4444',
    meta_km: 20,
    poligono: [
      { lat: 10.6550, lng: -71.6380 }, { lat: 10.6550, lng: -71.6220 },
      { lat: 10.6420, lng: -71.6220 }, { lat: 10.6420, lng: -71.6380 }
    ]
  },
  {
    nombre: 'Cecilio Acosta',
    color: '#64748b',
    meta_km: 28,
    poligono: [
      { lat: 10.6440, lng: -71.6220 }, { lat: 10.6440, lng: -71.6080 },
      { lat: 10.6300, lng: -71.6080 }, { lat: 10.6300, lng: -71.6220 }
    ]
  },
  {
    nombre: 'La Limpia',
    color: '#0ea5e9',
    meta_km: 25,
    poligono: [
      { lat: 10.6360, lng: -71.6380 }, { lat: 10.6360, lng: -71.6220 },
      { lat: 10.6200, lng: -71.6220 }, { lat: 10.6200, lng: -71.6380 }
    ]
  },
  {
    nombre: 'Santa Lucía',
    color: '#d946ef',
    meta_km: 22,
    poligono: [
      { lat: 10.6650, lng: -71.6520 }, { lat: 10.6650, lng: -71.6380 },
      { lat: 10.6500, lng: -71.6380 }, { lat: 10.6500, lng: -71.6520 }
    ]
  },
  {
    nombre: 'Valle Frío',
    color: '#84cc16',
    meta_km: 18,
    poligono: [
      { lat: 10.6750, lng: -71.6550 }, { lat: 10.6750, lng: -71.6400 },
      { lat: 10.6620, lng: -71.6400 }, { lat: 10.6620, lng: -71.6550 }
    ]
  },
  {
    nombre: 'Juana de Ávila',
    color: '#eab308',
    meta_km: 25,
    poligono: [
      { lat: 10.6920, lng: -71.6100 }, { lat: 10.6920, lng: -71.5900 },
      { lat: 10.6780, lng: -71.5900 }, { lat: 10.6780, lng: -71.6100 }
    ]
  },
  {
    nombre: 'Santa Rita',
    color: '#22d3ee',
    meta_km: 20,
    poligono: [
      { lat: 10.6260, lng: -71.6280 }, { lat: 10.6260, lng: -71.6120 },
      { lat: 10.6100, lng: -71.6120 }, { lat: 10.6100, lng: -71.6280 }
    ]
  },
  {
    nombre: 'Canchancha',
    color: '#fb923c',
    meta_km: 22,
    poligono: [
      { lat: 10.6780, lng: -71.6100 }, { lat: 10.6780, lng: -71.5900 },
      { lat: 10.6650, lng: -71.5900 }, { lat: 10.6650, lng: -71.6100 }
    ]
  },
  {
    nombre: 'Coquivacoa',
    color: '#4ade80',
    meta_km: 20,
    poligono: [
      { lat: 10.7040, lng: -71.6200 }, { lat: 10.7040, lng: -71.6040 },
      { lat: 10.6920, lng: -71.6040 }, { lat: 10.6920, lng: -71.6200 }
    ]
  },
  {
    nombre: 'San Francisco Norte',
    color: '#c084fc',
    meta_km: 35,
    poligono: [
      { lat: 10.6200, lng: -71.6550 }, { lat: 10.6200, lng: -71.6250 },
      { lat: 10.6000, lng: -71.6250 }, { lat: 10.6000, lng: -71.6550 }
    ]
  },
  {
    nombre: 'San Francisco Sur',
    color: '#fbbf24',
    meta_km: 30,
    poligono: [
      { lat: 10.6000, lng: -71.6550 }, { lat: 10.6000, lng: -71.6250 },
      { lat: 10.5780, lng: -71.6250 }, { lat: 10.5780, lng: -71.6550 }
    ]
  },
  {
    nombre: '5 de Julio',
    color: '#2dd4bf',
    meta_km: 20,
    poligono: [
      { lat: 10.6720, lng: -71.6550 }, { lat: 10.6720, lng: -71.6400 },
      { lat: 10.6620, lng: -71.6400 }, { lat: 10.6620, lng: -71.6550 }
    ]
  }
];
