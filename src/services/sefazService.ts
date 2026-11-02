import { SefazProduct } from '../types/database';

const BASE32 = '0123456789bcdefghjkmnpqrstuvwxyz';

function encodeGeohash(latitude: number, longitude: number, precision: number = 9): string {
  const BITS = [16, 8, 4, 2, 1];
  let isEven = true;
  let latMin = -90.0,
    latMax = 90.0;
  let lonMin = -180.0,
    lonMax = 180.0;
  let arg = 0;
  let bit = 0;
  let hash = '';

  while (hash.length < precision) {
    if (isEven) {
      const mid = (lonMin + lonMax) / 2;
      if (longitude > mid) {
        arg |= BITS[bit];
        lonMin = mid;
      } else {
        lonMax = mid;
      }
    } else {
      const mid = (latMin + latMax) / 2;
      if (latitude > mid) {
        arg |= BITS[bit];
        latMin = mid;
      } else {
        latMax = mid;
      }
    }

    isEven = !isEven;
    if (bit < 4) {
      bit++;
    } else {
      hash += BASE32[arg];
      bit = 0;
      arg = 0;
    }
  }
  return hash;
}

function decodeGeohash(geohash: string): { latitude: number; longitude: number } {
  let isEven = true;
  let latMin = -90.0,
    latMax = 90.0;
  let lonMin = -180.0,
    lonMax = 180.0;

  for (let i = 0; i < geohash.length; i++) {
    const c = geohash[i];
    const cd = BASE32.indexOf(c);
    if (cd === -1) break;

    for (let j = 0; j < 5; j++) {
      const mask = [16, 8, 4, 2, 1][j];
      if (isEven) {
        const mid = (lonMin + lonMax) / 2;
        if ((cd & mask) !== 0) {
          lonMin = mid;
        } else {
          lonMax = mid;
        }
      } else {
        const mid = (latMin + latMax) / 2;
        if ((cd & mask) !== 0) {
          latMin = mid;
        } else {
          latMax = mid;
        }
      }
      isEven = !isEven;
    }
  }

  return {
    latitude: Number(((latMin + latMax) / 2).toFixed(6)),
    longitude: Number(((lonMin + lonMax) / 2).toFixed(6)),
  };
}

export const searchSefazProducts = async (
  termToSearch: string,
  radius: number = 10,
  lat: number = -23.3045,
  lng: number = -51.1696
): Promise<SefazProduct[]> => {
  const term = termToSearch.trim();
  if (!term) return [];

  const localGeohash = encodeGeohash(lat, lng, 9);
  const termoBase = term.split(' ')[0];

  let catId = '';
  try {
    const catRes = await fetch(
      `/api/sefaz/categorias?local=${localGeohash}&termo=${encodeURIComponent(termoBase)}&raio=${radius}`
    );
    if (catRes.ok) {
      const catData = await catRes.json();
      const listaCats = catData?.categorias || (Array.isArray(catData) ? catData : []);
      if (listaCats.length > 0) {
        catId = String(listaCats[0].id || listaCats[0].codigo || '');
      }
    }
  } catch (_) {}

  const prodParams = new URLSearchParams({
    local: localGeohash,
    termo: term,
    offset: '0',
    raio: String(radius),
    data: '-1',
    ordem: '0',
  });

  if (catId) {
    prodParams.append('categoria', catId);
  }

  const prodRes = await fetch(`/api/sefaz/produtos?${prodParams.toString()}`);
  if (!prodRes.ok) {
    throw new Error(`Erro na resposta da SEFAZ (${prodRes.status})`);
  }

  const data = await prodRes.json();
  const rawList = data?.produtos || [];

  return rawList
    .map((item: any): SefazProduct => {
      const est = item.estabelecimento || {};
      const nomeEstabelecimento = (est.nm_fan || est.nm_emp || 'Mercado').trim();
      const logr = [est.tp_logr, est.nm_logr].filter(Boolean).join(' ').trim();
      const enderecoCompleto = logr ? `${logr}, ${est.nr_logr || 's/n'}` : '';
      const coords = decodeGeohash(item.local || localGeohash);

      return {
        id: String(item.id || item.codigo || Math.random()),
        descricao: (item.desc || term).trim(),
        valor: parseFloat(String(item.valor || 0).replace(',', '.')),
        valorOriginal: item.valor_tabela ? parseFloat(String(item.valor_tabela).replace(',', '.')) : null,
        dataHora: item.datahora || null,
        tempoRelativo: item.tempo || 'recente',
        distanciaKm: item.distkm ? Number(item.distkm).toFixed(2) : null,
        estabelecimento: {
          nome: nomeEstabelecimento,
          endereco: enderecoCompleto,
          bairro: est.bairro || '',
          municipio: est.mun || 'Londrina',
          latitude: coords.latitude,
          longitude: coords.longitude,
        },
      };
    })
    .filter((prod: SefazProduct) => {
      const endereco = (prod.estabelecimento.endereco || '').toUpperCase();
      const bairro = (prod.estabelecimento.bairro || '').toUpperCase();
      const isRural =
        endereco.includes('ZONA RURAL') ||
        endereco.includes('COL NOVA') ||
        endereco.includes('ASSENTAMENTO') ||
        bairro.includes('ZONA RURAL') ||
        bairro.includes('RURAL');
      return !isRural;
    });
};