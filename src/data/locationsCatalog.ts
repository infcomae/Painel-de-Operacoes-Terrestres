export interface KnownLocation {
  name: string;
  aliases: string[];
  uf: string;
  lat: number;
  lng: number;
}

/**
 * Catálogo offline de localidades estratégicas, bases aéreas/terrestres,
 * municípios de fronteira e capitais brasileiras para geocodificação instantânea
 * mesmo quando o painel estiver desconectado da internet.
 */
export const BRAZIL_LOCATIONS_CATALOG: KnownLocation[] = [
  { name: 'Boa Vista - RR (BABV)', aliases: ['boa vista', 'babv', 'roraima', 'pacaraima'], uf: 'RR', lat: 2.8414, lng: -60.6922 },
  { name: 'Pacaraima - RR (PEF)', aliases: ['pacaraima', 'bv-8', 'fronteira venezuela'], uf: 'RR', lat: 4.4795, lng: -61.1477 },
  { name: 'Manaus - AM (BAMN)', aliases: ['manaus', 'bamn', 'ponta pelada', 'comar vii'], uf: 'AM', lat: -3.146, lng: -59.9863 },
  { name: 'São Gabriel da Cachoeira - AM', aliases: ['sao gabriel da cachoeira', 'são gabriel', 'uaupes', 'cabeça do cachorro'], uf: 'AM', lat: -0.1303, lng: -67.0892 },
  { name: 'Tabatinga - AM', aliases: ['tabatinga', 'solimoes', 'fronteira colombia', 'leticia'], uf: 'AM', lat: -4.2533, lng: -69.9381 },
  { name: 'Tefé - AM', aliases: ['tefe', 'tefé'], uf: 'AM', lat: -3.3541, lng: -64.7114 },
  { name: 'Porto Velho - RO (BAPV)', aliases: ['porto velho', 'bapv', 'rondonia'], uf: 'RO', lat: -8.7136, lng: -63.9028 },
  { name: 'Guajará-Mirim - RO', aliases: ['guajara-mirim', 'guajara mirim'], uf: 'RO', lat: -10.7828, lng: -65.3394 },
  { name: 'Rio Branco - AC', aliases: ['rio branco', 'acre', 'cruzeiro do sul'], uf: 'AC', lat: -9.9754, lng: -67.8249 },
  { name: 'Cruzeiro do Sul - AC', aliases: ['cruzeiro do sul'], uf: 'AC', lat: -7.6276, lng: -72.6756 },
  { name: 'Belém - PA (BABE)', aliases: ['belem', 'belém', 'babe', 'val de cans', 'comar i'], uf: 'PA', lat: -1.3847, lng: -48.4789 },
  { name: 'Santarém - PA', aliases: ['santarem', 'santarém'], uf: 'PA', lat: -2.4431, lng: -54.7083 },
  { name: 'Marabá - PA', aliases: ['maraba', 'marabá'], uf: 'PA', lat: -5.3686, lng: -49.1178 },
  { name: 'Novo Progresso - PA (Cachimbo)', aliases: ['cachimbo', 'novo progresso', 'serra do cachimbo', 'cpbv'], uf: 'PA', lat: -9.3339, lng: -54.9654 },
  { name: 'Macapá - AP', aliases: ['macapa', 'macapá', 'amapa'], uf: 'AP', lat: 0.0349, lng: -51.0694 },
  { name: 'Oiapoque - AP', aliases: ['oiapoque', 'clevelandia'], uf: 'AP', lat: 3.8407, lng: -51.8346 },
  { name: 'Alcântara - MA (CLA)', aliases: ['alcantara', 'alcântara', 'cla', 'sao luis', 'são luís'], uf: 'MA', lat: -2.3731, lng: -44.3964 },
  { name: 'Fortaleza - CE (BAFZ)', aliases: ['fortaleza', 'bafz', 'ceara'], uf: 'CE', lat: -3.7763, lng: -38.5326 },
  { name: 'Natal - RN (BANT)', aliases: ['natal', 'bant', 'parnamirim'], uf: 'RN', lat: -5.9114, lng: -35.2478 },
  { name: 'Recife - PE (BARF)', aliases: ['recife', 'barf', 'comar ii', 'pernambuco'], uf: 'PE', lat: -8.1264, lng: -34.9228 },
  { name: 'Salvador - BA (BASV)', aliases: ['salvador', 'basv', 'bahia'], uf: 'BA', lat: -12.9086, lng: -38.3225 },
  { name: 'Brasília - DF (BABR / COMAE)', aliases: ['brasilia', 'brasília', 'babr', 'comae', 'distrito federal'], uf: 'DF', lat: -15.8697, lng: -47.9172 },
  { name: 'Anápolis - GO (BAAN)', aliases: ['anapolis', 'anápolis', 'baan', 'goias'], uf: 'GO', lat: -16.2292, lng: -48.9644 },
  { name: 'Goiânia - GO', aliases: ['goiania', 'goiânia'], uf: 'GO', lat: -16.6869, lng: -49.2648 },
  { name: 'Cuiabá - MT', aliases: ['cuiaba', 'cuiabá', 'varzea grande'], uf: 'MT', lat: -15.6529, lng: -56.1167 },
  { name: 'Cáceres - MT', aliases: ['caceres', 'cáceres', 'fronteira bolivia'], uf: 'MT', lat: -16.0764, lng: -57.6818 },
  { name: 'Campo Grande - MS (BACG)', aliases: ['campo grande', 'bacg', 'mato grosso do sul'], uf: 'MS', lat: -20.4686, lng: -54.6742 },
  { name: 'Corumbá - MS', aliases: ['corumba', 'corumbá', 'ladario', 'pantanal'], uf: 'MS', lat: -19.0089, lng: -57.6511 },
  { name: 'Dourados - MS', aliases: ['dourados'], uf: 'MS', lat: -22.2231, lng: -54.812 },
  { name: 'Ponta Porã - MS', aliases: ['ponta pora', 'ponta porã', 'pedro juan'], uf: 'MS', lat: -22.5361, lng: -55.7256 },
  { name: 'Belo Horizonte - MG (Lagoa Santa)', aliases: ['belo horizonte', 'lagoa santa', 'pampulha', 'confins'], uf: 'MG', lat: -19.6625, lng: -43.8969 },
  { name: 'Rio de Janeiro - RJ (BAGL / BASC)', aliases: ['rio de janeiro', 'bagl', 'basc', 'bafm', 'galeao', 'santa cruz', 'afonsos'], uf: 'RJ', lat: -22.8134, lng: -43.2494 },
  { name: 'Resende - RJ', aliases: ['resende', 'aman'], uf: 'RJ', lat: -22.4705, lng: -44.4509 },
  { name: 'São Paulo - SP (BASP)', aliases: ['sao paulo', 'são paulo', 'basp', 'guarulhos', 'cumbica', 'comar iv'], uf: 'SP', lat: -23.4273, lng: -46.4819 },
  { name: 'Pirassununga - SP (AFA)', aliases: ['pirassununga', 'afa'], uf: 'SP', lat: -21.9844, lng: -47.3364 },
  { name: 'São José dos Campos - SP (DCTA)', aliases: ['sao jose dos campos', 'são josé dos campos', 'dcta', 'sjc'], uf: 'SP', lat: -23.2289, lng: -45.8614 },
  { name: 'Santos - SP (BAST)', aliases: ['santos', 'bast', 'guaruja'], uf: 'SP', lat: -23.9281, lng: -46.2981 },
  { name: 'Curitiba - PR (CINDACTA II)', aliases: ['curitiba', 'bacacheri', 'cindacta ii', 'parana'], uf: 'PR', lat: -25.4033, lng: -49.2336 },
  { name: 'Foz do Iguaçu - PR', aliases: ['foz do iguacu', 'foz do iguaçu', 'triplice fronteira', 'itaipu'], uf: 'PR', lat: -25.5469, lng: -54.5882 },
  { name: 'Guaíra - PR', aliases: ['guaira', 'guaíra'], uf: 'PR', lat: -24.085, lng: -54.2569 },
  { name: 'Cascavel - PR', aliases: ['cascavel'], uf: 'PR', lat: -24.9578, lng: -53.4595 },
  { name: 'Florianópolis - SC (BAFL)', aliases: ['florianopolis', 'florianópolis', 'bafl', 'santa catarina'], uf: 'SC', lat: -27.6703, lng: -48.5525 },
  { name: 'Canoas - RS (BACO)', aliases: ['canoas', 'baco', 'porto alegre', 'comar v'], uf: 'RS', lat: -29.9458, lng: -51.1444 },
  { name: 'Santa Maria - RS (BASM)', aliases: ['santa maria', 'basm'], uf: 'RS', lat: -29.7114, lng: -53.6922 },
  { name: 'Uruguaiana - RS', aliases: ['uruguaiana', 'fronteira sul', 'quarai'], uf: 'RS', lat: -29.7614, lng: -57.0853 },
  { name: 'Bagé - RS', aliases: ['bage', 'bagé', 'santana do livramento'], uf: 'RS', lat: -31.3297, lng: -54.1069 },
  { name: 'SBMN', aliases: ['sbmn', 'ponta pelada', 'bamn'], uf: 'AM', lat: -3.146, lng: -59.986 },
  { name: 'ZPH/SÃO BERNARDO DO CAMPO - SP', aliases: ['zph', 'sao bernardo do campo', 'são bernardo do campo'], uf: 'SP', lat: -23.6939, lng: -46.5648 },
  { name: 'SIBG/HELICIDADE', aliases: ['sibg', 'helicidade'], uf: 'SP', lat: -23.5436, lng: -46.7322 },
  { name: 'SBSP', aliases: ['sbsp', 'congonhas'], uf: 'SP', lat: -23.6275, lng: -46.656 },
  { name: 'SBRJ', aliases: ['sbrj', 'santos dumont'], uf: 'RJ', lat: -22.91, lng: -43.1625 },
  { name: 'SBGL', aliases: ['sbgl', 'galeao', 'galeão', 'antonio carlos jobim'], uf: 'RJ', lat: -22.8089, lng: -43.2506 },
  { name: 'MANAUS - AM', aliases: ['manaus - am', 'manaus'], uf: 'AM', lat: -3.1019, lng: -60.025 },
  { name: 'CONCÓRDIA DO PARÁ - PA', aliases: ['concordia do para', 'concórdia do pará'], uf: 'PA', lat: -1.9922, lng: -47.9497 },
  { name: 'ACARÁ - PA', aliases: ['acara - pa', 'acará - pa', 'acara'], uf: 'PA', lat: -1.9608, lng: -48.1967 },
  { name: 'TOMÉ-AÇU - PA', aliases: ['tome-acu', 'tomé-açu'], uf: 'PA', lat: -2.4189, lng: -48.1522 },
  { name: 'TAILÂNDIA - PA', aliases: ['tailandia - pa', 'tailândia - pa'], uf: 'PA', lat: -2.9462, lng: -48.9493 },
  { name: 'RIACHO DA CRUZ - RN', aliases: ['riacho da cruz'], uf: 'RN', lat: -5.9319, lng: -37.9464 },
  { name: 'SWLB', aliases: ['swlb', 'labrea', 'lábrea'], uf: 'AM', lat: -7.2778, lng: -64.83 },
  { name: 'SBTK', aliases: ['sbtk', 'tarauaca', 'tarauacá'], uf: 'AC', lat: -8.1555, lng: -70.783 },
];

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

/**
 * Busca coordenadas no catálogo offline brasileiro.
 */
export function findOfflineLocationCoordinates(query: string): {
  lat: number;
  lng: number;
  matchedName: string;
} | null {
  const clean = normalizeText(query);
  if (!clean || clean.length < 2) return null;

  for (const item of BRAZIL_LOCATIONS_CATALOG) {
    const itemNameNorm = normalizeText(item.name);
    if (itemNameNorm.includes(clean) || clean.includes(itemNameNorm.split(' - ')[0])) {
      return { lat: item.lat, lng: item.lng, matchedName: item.name };
    }
    for (const alias of item.aliases) {
      if (clean.includes(normalizeText(alias)) || normalizeText(alias).includes(clean)) {
        return { lat: item.lat, lng: item.lng, matchedName: item.name };
      }
    }
  }
  return null;
}

/**
 * Geocodificação híbrida: tenta o catálogo tático offline primeiro;
 * caso não encontre e o navegador esteja online, consulta o Nominatim (OpenStreetMap).
 */
export async function resolveLocationCoordinates(query: string): Promise<{
  lat: number;
  lng: number;
  source: 'offline' | 'online';
  label: string;
} | null> {
  const offlineMatch = findOfflineLocationCoordinates(query);
  if (offlineMatch) {
    return {
      lat: offlineMatch.lat,
      lng: offlineMatch.lng,
      source: 'offline',
      label: offlineMatch.matchedName,
    };
  }

  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return null;
  }

  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=br&q=${encodeURIComponent(
      query
    )}`;
    const response = await fetch(url, {
      headers: {
        'Accept-Language': 'pt-BR,pt;q=0.9',
      },
    });
    if (!response.ok) return null;
    const data = await response.json();
    if (Array.isArray(data) && data.length > 0) {
      const first = data[0];
      const lat = parseFloat(first.lat);
      const lng = parseFloat(first.lon);
      if (!Number.isNaN(lat) && !Number.isNaN(lng)) {
        return {
          lat: Number(lat.toFixed(4)),
          lng: Number(lng.toFixed(4)),
          source: 'online',
          label: first.display_name?.split(',').slice(0, 2).join(',') || query,
        };
      }
    }
  } catch {
    // Silencioso caso bloqueado ou sem rede
  }

  return null;
}
