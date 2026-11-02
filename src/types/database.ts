export interface MatchItem {
  id: string;
  store_name: string;
  raw_product_name: string;
  price: number;
}

export interface ProductMatch {
  id: string;
  display_name: string;
  category: string | null;
  stores_count: number;
  min_price: number;
  max_price: number;
  spread: number;
  cheapest_store: string;
  priciest_store: string;
  image_url: string | null;
  updated_at?: string;
  product_match_items: MatchItem[];
}

export interface FlyerDeal {
  id: string;
  store_name: string;
  product_name: string;
  deal_price: number;
  image_url: string | null;
  category: string | null;
}

export interface WeeklyFlyer {
  id: string;
  store_name: string;
  flyer_url: string;
  category: 'encarte' | 'instagram' | 'tabloide';
  badge_color?: string;
}

export interface SefazProduct {
  id: string;
  descricao: string;
  valor: number;
  valorOriginal: number | null;
  dataHora: string | null;
  tempoRelativo: string;
  distanciaKm: string | null;
  estabelecimento: {
    nome: string;
    endereco: string;
    bairro: string;
    municipio: string;
    latitude?: number;
    longitude?: number;
  };
}