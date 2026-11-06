import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const localCoords = req.query.local || req.query.geohash;
  const termo = req.query.termo;

  if (!termo || !localCoords) {
    return res.status(400).json({ error: 'Parâmetros "termo" e "local" (ou "geohash") são obrigatórios.' });
  }

  try {
    const isCategorias = req.url?.includes('/categorias');
    const endpoint = isCategorias ? 'categorias' : 'produtos';

    const targetUrl = new URL(`https://menorpreco.notaparana.pr.gov.br/api/v1/${endpoint}`);
    targetUrl.searchParams.set('termo', String(termo));
    targetUrl.searchParams.set('local', String(localCoords));
    targetUrl.searchParams.set('raio', String(req.query.raio || '10'));

    if (!isCategorias) {
      targetUrl.searchParams.set('offset', String(req.query.offset || '0'));
      targetUrl.searchParams.set('data', String(req.query.data || '-1'));
      targetUrl.searchParams.set('ordem', String(req.query.ordem || '0'));

      if (req.query.categoria) {
        targetUrl.searchParams.set('categoria', String(req.query.categoria));
      }
    }

    const response = await fetch(targetUrl.toString(), {
      method: 'GET',
      headers: {
        'User-Agent': 'okhttp/4.9.2',
        'Accept': 'application/json',
        'Accept-Language': 'pt-BR,pt;q=0.9',
        'Host': 'menorpreco.notaparana.pr.gov.br',
        'Connection': 'Keep-Alive',
      },
    });

    if (!response.ok) {
      return res.status(response.status).json({
        error: `Erro retornado pela SEFAZ: ${response.statusText}`,
      });
    }

    const data = await response.json();
    return res.status(200).json(data);
  } catch (error: any) {
    console.error('Erro no proxy da SEFAZ:', error);
    return res.status(500).json({ error: error.message || 'Falha interna ao consultar a SEFAZ-PR.' });
  }
}