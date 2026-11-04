// src/app/pages/settings/integrations/ProviderCatalog.tsx
// Provider Catalog Grid and Connector Discovery

import React, { useState } from 'react';
import { Card, CardContent } from '../../../../components/ui/card';
import { Badge } from '../../../../components/ui/badge';
import { Button } from '../../../../components/ui/button';
import { Input } from '../../../../components/ui/input';
import { Search, Plus, ExternalLink, ShieldCheck, Check, Sparkles } from 'lucide-react';
import { ProviderIcon } from './ProviderIcon.tsx';
import type { IntegrationProvider } from '../../../../types/integrations.ts';

interface ProviderCatalogProps {
  providers: IntegrationProvider[];
  isLoading: boolean;
  onSelectProvider: (provider: IntegrationProvider) => void;
}

export function ProviderCatalog({ providers, isLoading, onSelectProvider }: ProviderCatalogProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  const categories = [
    { label: 'All Providers', value: 'all' },
    { label: 'Commerce', value: 'commerce' },
    { label: 'Payments', value: 'payments' },
    { label: 'Shipping & Logistics', value: 'shipping' },
    { label: 'Communication', value: 'communication' },
    { label: 'Productivity', value: 'productivity' },
    { label: 'Custom & Webhooks', value: 'custom' },
  ];

  const filtered = providers.filter((p) => {
    const matchesCat = selectedCategory === 'all' || p.category === selectedCategory;
    const matchesSearch =
      !searchTerm ||
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.provider_key.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCat && matchesSearch;
  });

  return (
    <div className="space-y-4">
      {/* Category Filter & Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search provider connectors (Shopify, Razorpay, WhatsApp, Webhooks...)"
            className="pl-9 h-9 text-xs"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          {categories.map((cat) => (
            <button
              key={cat.value}
              onClick={() => setSelectedCategory(cat.value)}
              className={`px-2.5 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${
                selectedCategory === cat.value
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-200'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Provider Grid */}
      {isLoading ? (
        <div className="py-16 text-center text-slate-500 text-xs">Loading provider catalog...</div>
      ) : filtered.length === 0 ? (
        <div className="py-16 text-center bg-white rounded-xl border border-dashed border-slate-300 p-8">
          <p className="text-xs text-slate-500">No integration providers found matching your criteria.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((prov) => {
            const isImplemented = prov.implementation_status === 'implemented';
            const isAvailable = prov.implementation_status === 'available' || prov.status === 'available';
            const isComingSoon = prov.status === 'coming_soon';

            return (
              <Card
                key={prov.id}
                className="border border-slate-200 bg-white hover:border-indigo-200 hover:shadow-md transition-all duration-200 flex flex-col justify-between"
              >
                <CardContent className="p-5 flex flex-col h-full justify-between">
                  <div>
                    {/* Header */}
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="w-10 h-10 rounded-lg bg-slate-50 border border-slate-200 text-slate-700 flex items-center justify-center flex-shrink-0">
                        <ProviderIcon iconName={prov.icon_name} providerKey={prov.provider_key} className="w-5 h-5 text-indigo-600" />
                      </div>

                      <div className="flex items-center gap-1.5">
                        {isImplemented && (
                          <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-medium uppercase px-1.5 py-0.5">
                            Active / Ready
                          </Badge>
                        )}
                        {!isImplemented && isAvailable && (
                          <Badge className="bg-indigo-50 text-indigo-700 border-indigo-200 text-[10px] font-medium uppercase px-1.5 py-0.5">
                            Available
                          </Badge>
                        )}
                        {isComingSoon && (
                          <Badge variant="outline" className="bg-slate-50 text-slate-500 border-slate-200 text-[10px] font-medium uppercase px-1.5 py-0.5">
                            Coming Soon
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Title & Description */}
                    <h4 className="text-sm font-bold text-slate-900 leading-snug">{prov.name}</h4>
                    <p className="text-xs text-slate-500 mt-1 line-clamp-3 leading-relaxed">
                      {prov.description}
                    </p>

                    {/* Capabilities Badges */}
                    <div className="mt-3 flex flex-wrap gap-1">
                      {prov.capabilities?.read && (
                        <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-mono">Read API</span>
                      )}
                      {prov.capabilities?.write && (
                        <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-mono">Write / Mutate</span>
                      )}
                      {prov.capabilities?.webhooks && (
                        <span className="text-[10px] bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded font-mono">Webhooks</span>
                      )}
                      {prov.capabilities?.sync && (
                        <span className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded font-mono">Data Sync</span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[11px] font-medium text-slate-400 capitalize">{prov.category}</span>
                    <Button
                      size="sm"
                      onClick={() => onSelectProvider(prov)}
                      className={`text-xs px-3 h-8 ${
                        isImplemented
                          ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
                          : 'bg-slate-900 hover:bg-slate-800 text-white'
                      }`}
                    >
                      <Plus className="w-3.5 h-3.5 mr-1" />
                      Configure & Connect
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
