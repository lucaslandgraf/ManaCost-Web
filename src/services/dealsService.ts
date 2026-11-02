import { supabase } from './supabase';
import { ProductMatch, FlyerDeal, WeeklyFlyer } from '../types/database';
import { cleanSearchText, parseSearchTokens } from '../utils/searchEngine';

const CATALOG_PAGE_SIZE = 50;

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

export async function fetchFlyerDeals(
  offset = 0,
  search = '',
  category = 'Todos',
  store = 'Todas'
): Promise<FlyerDeal[]> {
  let query = supabase
    .from('flyer_deals')
    .select('id, store_name, product_name, deal_price, image_url, category')
    .order('deal_price', { ascending: true })
    .order('id', { ascending: true })
    .range(offset, offset + CATALOG_PAGE_SIZE - 1);

  const tokenGroups = parseSearchTokens(search);

  if (category !== 'Todos') {
    query = query.eq('category', category);
  }

  if (store !== 'Todas') {
    query = query.ilike('store_name', `%${store}%`);
  }

  const { data, error } = await query;
  if (error) throw error;

  const deals = (data as FlyerDeal[]) || [];
  if (tokenGroups.length === 0) {
    return deals;
  }

  return deals.filter((deal) => {
    const normalizedName = cleanSearchText(deal.product_name);
    return tokenGroups.every((group) => group.some((token) => normalizedName.includes(token)));
  });
}

export async function fetchWeeklyFlyers(): Promise<WeeklyFlyer[]> {
  const { data, error } = await supabase
    .from('weekly_flyers')
    .select('*')
    .order('store_name', { ascending: true });

  if (error) throw error;
  return (data as unknown as WeeklyFlyer[]) || [];
}