// src/app/pages/settings/integrations/ProviderIcon.tsx
// Lucide icon resolver for Integration Providers

import React from 'react';
import {
  ShoppingBag,
  CreditCard,
  Truck,
  MessageSquare,
  DollarSign,
  Navigation,
  Store,
  Package,
  Layers,
  FileSpreadsheet,
  Mail,
  Send,
  Code2,
  Webhook,
  Globe,
  Plug,
} from 'lucide-react';

interface ProviderIconProps {
  iconName?: string;
  providerKey?: string;
  className?: string;
}

export function ProviderIcon({ iconName, providerKey, className = 'w-5 h-5' }: ProviderIconProps) {
  const name = (iconName || providerKey || '').toLowerCase();

  if (name.includes('shop') || name === 'shoppingbag') {
    return <ShoppingBag className={className} />;
  }
  if (name.includes('razor') || name.includes('credit') || name === 'creditcard') {
    return <CreditCard className={className} />;
  }
  if (name.includes('ship') || name.includes('truck') || name === 'truck') {
    return <Truck className={className} />;
  }
  if (name.includes('delhiv') || name.includes('nav') || name === 'navigation') {
    return <Navigation className={className} />;
  }
  if (name.includes('what') || name.includes('message') || name === 'messagesquare') {
    return <MessageSquare className={className} />;
  }
  if (name.includes('cash') || name.includes('dollar') || name === 'dollarsign') {
    return <DollarSign className={className} />;
  }
  if (name.includes('woo') || name.includes('store') || name === 'store') {
    return <Store className={className} />;
  }
  if (name.includes('amazon') || name.includes('package') || name === 'package') {
    return <Package className={className} />;
  }
  if (name.includes('flip') || name.includes('layer') || name === 'layers') {
    return <Layers className={className} />;
  }
  if (name.includes('sheet') || name === 'filespreadsheet') {
    return <FileSpreadsheet className={className} />;
  }
  if (name.includes('gmail') || name === 'mail') {
    return <Mail className={className} />;
  }
  if (name.includes('smtp') || name === 'send') {
    return <Send className={className} />;
  }
  if (name.includes('custom') || name.includes('code') || name === 'code2') {
    return <Code2 className={className} />;
  }
  if (name.includes('hook') || name === 'webhook') {
    return <Webhook className={className} />;
  }

  return <Plug className={className} />;
}
