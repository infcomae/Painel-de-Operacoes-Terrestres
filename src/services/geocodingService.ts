/**
 * Serviço de Geocodificação Online (OpenStreetMap / Nominatim)
 * Fonte principal e exclusiva para busca e sugestão de coordenadas geográficas no Brasil.
 */

export interface GeocodingSuggestion {
  id: string;
  name: string;
  displayName: string;
  cityOrState: string;
  lat: number;
  lng: number;
  category?: string;
}

// Cache em memória para evitar chamadas redundantes durante a digitação
const suggestionsCache = new Map<string, GeocodingSuggestion[]>();

/**
 * Normaliza e extrai nome amigável e estado/cidade dos dados do Nominatim
 */
function formatAddressDetails(item: any): { shortName: string; cityOrState: string; category: string } {
  const addr = item.address || {};
  const city = addr.city || addr.town || addr.municipality || addr.village || addr.suburb || '';
  const state = addr.state || '';
  const stateCode = addr['ISO3166-2-lvl4'] ? addr['ISO3166-2-lvl4'].replace('BR-', '') : '';
  const country = addr.country || 'Brasil';

  let shortName = item.name || '';
  if (!shortName) {
    shortName = item.display_name?.split(',')[0]?.trim() || 'Localidade';
  }

  // Identifica categoria amigável
  let category = 'Localidade';
  if (item.class === 'aeroway' || item.type === 'aerodrome') {
    category = 'Aeródromo / Base';
  } else if (item.class === 'boundary' || item.type === 'administrative') {
    category = 'Município';
  } else if (item.class === 'military') {
    category = 'Área Militar';
  } else if (item.class === 'place') {
    category = 'Localidade';
  }

  let cityOrState = '';
  if (city && stateCode) {
    cityOrState = `${city} - ${stateCode}`;
  } else if (city && state) {
    cityOrState = `${city}, ${state}`;
  } else if (state) {
    cityOrState = state;
  } else {
    cityOrState = country;
  }

  return { shortName, cityOrState, category };
}

/**
 * Busca sugestões online em tempo real durante a digitação (OpenStreetMap Nominatim)
 */
export async function searchOnlineLocations(
  query: string,
  limit: number = 6
): Promise<GeocodingSuggestion[]> {
  const trimmed = (query || '').trim();
  if (trimmed.length < 2) return [];

  const cacheKey = trimmed.toLowerCase();
  if (suggestionsCache.has(cacheKey)) {
    return suggestionsCache.get(cacheKey)!;
  }

  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=${limit}&countrycodes=br&q=${encodeURIComponent(
      trimmed
    )}`;

    const response = await fetch(url, {
      headers: {
        'Accept-Language': 'pt-BR,pt;q=0.9',
      },
    });

    if (!response.ok) {
      return [];
    }

    const data = await response.json();
    if (!Array.isArray(data)) return [];

    const results: GeocodingSuggestion[] = [];
    for (let index = 0; index < data.length; index++) {
      const item = data[index];
      const parsedLat = parseFloat(item.lat);
      const parsedLng = parseFloat(item.lon);
      if (!Number.isFinite(parsedLat) || !Number.isFinite(parsedLng)) {
        continue;
      }

      const { shortName, cityOrState, category } = formatAddressDetails(item);

      results.push({
        id: String(item.place_id || `place-${index}`),
        name: shortName,
        displayName: String(item.display_name || shortName),
        cityOrState,
        lat: Number(parsedLat.toFixed(4)),
        lng: Number(parsedLng.toFixed(4)),
        category,
      });
    }

    // Salva no cache da sessão
    suggestionsCache.set(cacheKey, results);
    return results;
  } catch (err) {
    console.warn('[GeocodingService] Falha na consulta online de localidades:', err);
    return [];
  }
}

/**
 * Consulta online direta pelo termo completo digitado para obter o melhor resultado
 */
export async function resolveOnlineCoordinates(
  query: string
): Promise<GeocodingSuggestion | null> {
  const results = await searchOnlineLocations(query, 1);
  return results.length > 0 ? results[0] : null;
}
