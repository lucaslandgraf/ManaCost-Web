import { supabase } from './supabase';
import { ProductMatch, FlyerDeal, WeeklyFlyer } from '../types/database';
import { parseSearchTokens } from '../utils/searchEngine';

export const CATALOG_PAGE_SIZE = 60;

export async function fetchProductMatches(): Promise<ProductMatch[]> {
  const { data, error } = await supabase
    .from('product_matches')
    .select(`
      id,
      display_name,
      category,
      stores_count,
      min_price,
      max_price,
      spread,
      cheapest_store,
      priciest_store,
      image_url,
      updated_at,
      product_match_items (
        id,
        store_name,
        raw_product_name,
        price
      )
    `)
    .order('spread', { ascending: false });

  if (error) throw error;
  return (data as unknown as ProductMatch[]) || [];
}

// Busca a lista real de categorias registradas no banco
export async function fetchAvailableCategories(): Promise<string[]> {
  const { data, error } = await supabase
    .from('flyer_deals')
    .select('category')
    .not('category', 'is', null);

  if (error) return [];

  const set = new Set<string>();
  (data || []).forEach((row) => {
    if (row.category && typeof row.category === 'string' && row.category.trim().length > 1) {
      set.add(row.category.trim());
    }
  });

  return Array.from(set).sort((a, b) => a.localeCompare(b, 'pt-BR'));
}

// Busca a data do último lote de ofertas sincronizado
export async function fetchLastUpdateDate(): Promise<string | null> {
  try {
    const { data } = await supabase
      .from('flyer_deals')
      .select('created_at')
      .order('created_at', { ascending: false })
      .limit(1);

    if (data && data.length > 0 && data[0].created_at) {
      return data[0].created_at;
    }
  } catch (_) {}
  return null;
}

export interface FetchFlyerDealsResult {
  deals: FlyerDeal[];
  totalCount: number;
}

export async function fetchFlyerDeals(
  offset = 0,
  search = '',
  category = 'Todas as Categorias',
  store = 'Todas as lojas'
): Promise<FetchFlyerDealsResult> {
  let query = supabase
    .from('flyer_deals')
    .select('id, store_name, product_name, deal_price, image_url, category', { count: 'exact' })
    .order('deal_price', { ascending: true })
    .order('id', { ascending: true })
    .range(offset, offset + CATALOG_PAGE_SIZE - 1);

  if (store !== 'Todas' && store !== 'Todas as lojas') {
    let storeKeyword = store;
    if (store.includes('Almeida')) storeKeyword = 'Almeida';
    else if (store.includes('Muffato')) storeKeyword = 'Muffato';
    else if (store.includes('Condor')) storeKeyword = 'Condor';
    else if (store.includes('Angeloni')) storeKeyword = 'Angeloni';
    else if (store.includes('Atacadão')) storeKeyword = 'Atacad';
    else if (store.includes('Amigão')) storeKeyword = 'Amigão';
    else if (store.includes('Carrefour')) storeKeyword = 'Carrefour';
    else if (store.includes('Santarém')) storeKeyword = 'Santarém';
    else if (store.includes('Viscardi')) storeKeyword = 'Viscardi';

    query = query.ilike('store_name', `%${storeKeyword}%`);
  }

  if (category && category !== 'Todas as Categorias' && category !== 'Todos') {
    query = query.eq('category', category);
  }

  const tokenGroups = parseSearchTokens(search);
  if (tokenGroups.length > 0) {
    tokenGroups.forEach((options) => {
      if (options.length === 1) {
        query = query.ilike('product_name', `%${options[0]}%`);
      } else {
        const orWords = options.map((term) => `product_name.ilike.%${term}%`).join(',');
        query = query.or(orWords);
      }
    });
  }

  const { data, count, error } = await query;
  if (error) throw error;

  return {
    deals: (data as FlyerDeal[]) || [],
    totalCount: count ?? (data?.length || 0),
  };
}

export async function fetchWeeklyFlyers(): Promise<WeeklyFlyer[]> {
  const { data, error } = await supabase
    .from('weekly_flyers')
    .select('*')
    .order('store_name', { ascending: true });

  if (error) throw error;
  return (data as unknown as WeeklyFlyer[]) || [];
}