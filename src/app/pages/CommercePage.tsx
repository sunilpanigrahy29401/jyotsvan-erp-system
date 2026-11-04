import { ModulePlaceholder } from './ModulePlaceholder';
import { ShoppingBag } from 'lucide-react';
import { ShopifyCommercePage } from './commerce/ShopifyCommercePage.tsx';
import { AmazonMarketplacePage } from './commerce/amazon/AmazonMarketplacePage.tsx';
import { FlipkartMarketplacePage } from './commerce/flipkart/FlipkartMarketplacePage.tsx';
import { MyntraMarketplacePage } from './commerce/myntra/MyntraMarketplacePage.tsx';
import { MarketplacesHubPage } from './commerce/marketplaces/MarketplacesHubPage.tsx';

export interface CommercePageProps {
  currentPath?: string;
  onNavigate?: (path: string) => void;
}

export function CommercePage({ currentPath = '/commerce', onNavigate }: CommercePageProps) {
  if (currentPath === '/commerce/shopify' || currentPath.startsWith('/commerce/shopify')) {
    return <ShopifyCommercePage onNavigate={onNavigate} />;
  }

  if (
    currentPath === '/commerce/marketplaces/amazon' ||
    currentPath === '/commerce/amazon' ||
    currentPath.startsWith('/commerce/amazon') ||
    currentPath.startsWith('/commerce/marketplaces/amazon')
  ) {
    return <AmazonMarketplacePage />;
  }

  if (
    currentPath === '/commerce/marketplaces/flipkart' ||
    currentPath === '/commerce/flipkart' ||
    currentPath.startsWith('/commerce/flipkart') ||
    currentPath.startsWith('/commerce/marketplaces/flipkart')
  ) {
    return <FlipkartMarketplacePage />;
  }

  if (
    currentPath === '/commerce/marketplaces/myntra' ||
    currentPath === '/commerce/myntra' ||
    currentPath.startsWith('/commerce/myntra') ||
    currentPath.startsWith('/commerce/marketplaces/myntra')
  ) {
    return <MyntraMarketplacePage />;
  }

  if (
    currentPath === '/commerce/marketplaces' ||
    currentPath === '/commerce/marketplaces/overview' ||
    currentPath === '/commerce' ||
    currentPath === '/commerce/overview'
  ) {
    return <MarketplacesHubPage onNavigate={onNavigate} />;
  }

  return <MarketplacesHubPage onNavigate={onNavigate} />;
}
