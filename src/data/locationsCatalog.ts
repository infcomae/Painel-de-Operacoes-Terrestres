/**
 * locationsCatalog.ts
 *
 * Módulo atualizado: O catálogo estático offline e a verificação local foram removidos
 * conforme diretriz operacional. A consulta online via OpenStreetMap é a fonte
 * principal e exclusiva para determinação de coordenadas e sugestões durante a digitação.
 */

export {
  searchOnlineLocations,
  resolveOnlineCoordinates,
  type GeocodingSuggestion,
} from '../services/geocodingService';
