// src/services/sefazService.ts
import { encodeGeohash, decodeGeohash, getUserCoordinates } from '../utils/geohash';
import type { SefazProduct } from '../types/database';

export async function searchSefazPrices(
  term: string,
  radius = 10
): Promise<SefazProduct[]> {
  const coords = await getUserCoordinates();
  const localGeohash = encodeGeohash(coords.lat, coords.lng, 9);

  // Em desenvolvimento local pelo Vite usamos o proxy do vite ou a função da vercel em produção
  const endpoint = `/api/sefaz?local=${localGeohash}&termo=${encodeURIComponent(term)}&raio=${radius}`;

  const res = await fetch(endpoint);
  if (!res.ok) {
    throw new Error(`Falha na consulta SEFAZ (${res.status})`);
  }

  const data = await res.json();
  const rawList = data?.produtos || [];

  return rawList
    .map((item: any) => {
      const est = item.estabelecimento || {};
      const nomeEstabelecimento = (est.nm_fan || est.nm_emp || 'Mercado').trim();
      const logr = [est.tp_logr, est.nm_logr].filter(Boolean).join(' ').trim();
      const enderecoCompleto = logr ? `${logr}, ${est.nr_logr || 's/n'}` : '';
      const itemCoords = decodeGeohash(item.local || localGeohash);

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
          latitude: itemCoords.latitude,
          longitude: itemCoords.longitude,
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
}