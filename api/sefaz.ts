// api/sefaz.ts
export default async function handler(req: any, res: any) {
  // Configuração de CORS para permitir requisições do front web
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { local, termo, raio = '10', offset = '0' } = req.query;

  if (!local || !termo) {
    return res.status(400).json({ error: 'Parâmetros "local" e "termo" são obrigatórios.' });
  }

  try {
    const browserHeaders = {
      'Accept': 'application/json, text/plain, */*',
      'Accept-Language': 'pt-BR,pt;q=0.9',
      'Referer': `https://menorpreco.notaparana.pr.gov.br/app?termo=${encodeURIComponent(termo)}&local=${local}`,
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    };

    // 1. Tenta obter o ID da categoria base
    const termoBase = String(termo).split(' ')[0];
    let catId = '';
    try {
      const catRes = await fetch(
        `https://menorpreco.notaparana.pr.gov.br/api/v1/categorias?local=${local}&termo=${encodeURIComponent(termoBase)}&raio=${raio}`,
        { headers: browserHeaders }
      );
      if (catRes.ok) {
        const catData = await catRes.json();
        const listaCats = catData?.categorias || (Array.isArray(catData) ? catData : []);
        if (listaCats.length > 0) {
          catId = String(listaCats[0].id || listaCats[0].codigo || '');
        }
      }
    } catch (_) {}

    // 2. Consulta produtos
    const prodParams = new URLSearchParams({
      local: String(local),
      termo: String(termo),
      offset: String(offset),
      raio: String(raio),
      data: '-1',
      ordem: '0',
    });

    if (catId) {
      prodParams.append('categoria', catId);
    }

    const prodRes = await fetch(
      `https://menorpreco.notaparana.pr.gov.br/api/v1/produtos?${prodParams.toString()}`,
      { method: 'GET', headers: browserHeaders }
    );

    if (!prodRes.ok) {
      return res.status(prodRes.status).json({ error: `Erro SEFAZ: ${prodRes.statusText}` });
    }

    const data = await prodRes.json();
    return res.status(200).json(data);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Falha ao consultar SEFAZ-PR' });
  }
}