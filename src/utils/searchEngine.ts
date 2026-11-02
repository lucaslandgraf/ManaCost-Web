export const SEARCH_SYNONYMS: Record<string, string[]> = {
  galo: ['gallo'],
  helmans: ['hellmanns'],
  helmann: ['hellmanns'],
  hellmans: ['hellmanns'],
  nescal: ['nescau'],
  toddy: ['toddy'],
  nestle: ['nestle'],
  heineken: ['heineken'],
  haineken: ['heineken'],
  coca: ['coca'],
  refri: ['refrigerante'],
  mussarela: ['mussarela', 'mucarela', 'queijo'],
  muçarela: ['mussarela', 'mucarela', 'queijo'],
  sabao: ['sabao', 'lava roupas'],
  amaciante: ['amaciante'],
  detergente: ['detergente'],
};

export const cleanSearchText = (text: string): string => {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
};

export const parseSearchTokens = (searchText: string): string[][] => {
  const clean = cleanSearchText(searchText);
  if (!clean) return [];

  const rawTokens = clean.split(/\s+/).filter(Boolean);

  return rawTokens.map((token) => {
    const synonyms = SEARCH_SYNONYMS[token];
    if (synonyms && synonyms.length > 0) {
      return Array.from(new Set([token, ...synonyms]));
    }
    return [token];
  });
};