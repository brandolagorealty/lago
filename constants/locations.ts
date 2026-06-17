export const MARACAIBO_SECTORS = [
    'La Lago',
    'La Virginia',
    'Las Mercedes',
    'Tierra Negra',
    'Bella Vista',
    'El Milagro',
    'San Jacinto',
    'El Paraíso',
    'Santa Rita',
    'Indio Mara',
    'Cecilio Acosta',
    'La Limpia',
    'Santa Lucía',
    'Valle Frio',
    'Juana de Avila',
    'Canchancha'
];

export const SAN_FRANCISCO_SECTORS = [
    'Urbanización La Coromoto',
    'Urbanización San Francisco',
    'Urbanización El Soler',
    'Urbanización El Caujaro',
    'Villas del Lago / Riberas del Lago',
    'Urbanización San Felipe',
    'Barrio Sierra Maestra',
    'Barrio El Manzanillo',
    'Zona Industrial de San Francisco',
    'Sector Bajo Grande',
    'Ciudadela Rafael Caldera (Fundabarrios)',
    'Urbanización Villa Chinita / Villa Sur'
];

export const LOCATION_GROUPS = [
    { municipality: 'Maracaibo', sectors: MARACAIBO_SECTORS },
    { municipality: 'San Francisco', sectors: SAN_FRANCISCO_SECTORS },
];

/** Flat list of all sectors across all municipalities */
export const ALL_SECTORS = LOCATION_GROUPS.flatMap(g => g.sectors);
