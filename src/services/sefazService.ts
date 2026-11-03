import { SefazProduct } from '../types/database';

const BASE32 = '0123456789bcdefghjkmnpqrstuvwxyz';

// Fallback neutro do município de Londrina caso o utilizador negue a permissão de GPS
export const DEFAULT_COORDS = {
  lat: -23.3103,
  lng: -51.1628,
};

export function encodeGeohash(latitude: number, longitude: number, precision: number = 9): string {
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

export function decodeGeohash(geohash: string): { latitude: number; longitude: number } {
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

/**
 * Obtém a localização GPS exata do utilizador.
 * Prioriza dados reais de satélite/rede do dispositivo com alta precisão.
 */
export async function getUserCoordinates(): Promise<{ lat: number; lng: number }> {
  return new Promise((resolve) => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          resolve({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          });
        },
        (err) => {
          console.warn('Permissão de GPS negada ou indisponível:', err.message);
          resolve(DEFAULT_COORDS);
        },
        {
          enableHighAccuracy: true, // Força chip GPS e antenas de alta precisão
          timeout: 10000,
          maximumAge: 0,            // Sempre obtém a posição atual em tempo real
        }
      );
    } else {
      resolve(DEFAULT_COORDS);
    }
  });
}

export const searchSefazProducts = async (
  termToSearch: string,
  radius: number = 10,
  lat?: number,
  lng?: number,
  offset: number = 0 // <-- Adicionado aqui
): Promise<SefazProduct[]> => {
  const term = termToSearch.trim();
  if (!term) return [];

  let finalLat = lat;
  let finalLng = lng;

  if (finalLat === undefined || finalLng === undefined) {
    const coords = await getUserCoordinates();
    finalLat = coords.lat;
    finalLng = coords.lng;
  }

  const localGeohash = encodeGeohash(finalLat, finalLng, 9);
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
    offset: String(offset), // <-- Passa o offset dinâmico
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