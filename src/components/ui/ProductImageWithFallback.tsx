import React, { useState } from 'react';
import {
  ShoppingBag,
  Milk,
  Apple,
  Coffee,
  Beer,
  Sparkles,
  Beef,
  Flame,
} from 'lucide-react';

interface Props {
  uri?: string | null;
  category?: string | null;
  name?: string;
  className?: string;
}

// Domínios de CDN conhecidos por estarem inativos ou com falha de DNS
const BROKEN_DOMAINS = ['static.vipcommerce.com.br'];

export const ProductImageWithFallback: React.FC<Props> = ({ uri, category, name, className = '' }) => {
  const [hasError, setHasError] = useState(false);

  const getFallbackIcon = () => {
    const text = `${category || ''} ${name || ''}`.toLowerCase();
    if (text.includes('leite') || text.includes('iogurte') || text.includes('queijo')) {
      return <Milk size={22} className="text-amber-300" />;
    }
    if (text.includes('carne') || text.includes('bife') || text.includes('frango') || text.includes('suíno')) {
      return <Beef size={22} className="text-rose-400" />;
    }
    if (text.includes('café') || text.includes('cafe')) {
      return <Coffee size={22} className="text-amber-600" />;
    }
    if (text.includes('cerveja') || text.includes('chopp')) {
      return <Beer size={22} className="text-amber-400" />;
    }
    if (text.includes('fruta') || text.includes('maçã') || text.includes('banana') || text.includes('tomate')) {
      return <Apple size={22} className="text-emerald-400" />;
    }
    if (text.includes('limpeza') || text.includes('sabão') || text.includes('detergente')) {
      return <Sparkles size={22} className="text-sky-400" />;
    }
    if (text.includes('gasolina') || text.includes('etanol') || text.includes('combustível')) {
      return <Flame size={22} className="text-amber-500" />;
    }
    return <ShoppingBag size={22} className="text-slate-500" />;
  };

  // Verifica se o URL é nulo ou pertence a um domínio inativo
  const isBrokenUrl = Boolean(
    uri && BROKEN_DOMAINS.some((domain) => uri.toLowerCase().includes(domain))
  );

  if (!uri || hasError || isBrokenUrl) {
    return (
      <div className={`w-full h-full bg-[#0B0F19] flex items-center justify-center ${className}`}>
        {getFallbackIcon()}
      </div>
    );
  }

  return (
    <img
      src={uri}
      alt={name || 'Produto'}
      onError={() => setHasError(true)}
      className={`w-full h-full object-contain p-1.5 ${className}`}
      loading="lazy"
    />
  );
};