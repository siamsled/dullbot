'use client';

import { useState, useTransition } from 'react';
import { Shield, Search, TrendingUp, Users, DollarSign, Database, Plus, Loader2 } from 'lucide-react';
import { addCreditsAdmin } from './actions';

type ShopStats = {
  id: string;
  name: string;
  slug: string;
  credit_balance: number;
  agent_enabled: boolean;
  total_spent: number;
  created_at: string;
};

interface Props {
  shops: ShopStats[];
  platformMetrics: {
    totalShops: number;
    totalCreditsInCirculation: number;
    totalCreditsSpentAllTime: number;
    totalRawCostUsd: number;
  };
}

export default function AdminClient({ shops, platformMetrics }: Props) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isPending, startTransition] = useTransition();
  const [grantShopId, setGrantShopId] = useState<string | null>(null);
  const [grantAmount, setGrantAmount] = useState<number>(1000);

  const filteredShops = shops.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.slug.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleGrant = async () => {
    if (!grantShopId || grantAmount <= 0) return;
    startTransition(async () => {
      await addCreditsAdmin(grantShopId, grantAmount);
      setGrantShopId(null);
      setGrantAmount(1000);
    });
  };

  return (
    <div className="min-h-screen bg-fog pb-12">
      {/* Top Navbar */}
      <div className="bg-white border-b border-dove/20 h-16 flex items-center px-8 sticky top-0 z-10 shadow-subtle">
        <Shield className="w-5 h-5 text-rust mr-3" />
        <span className="text-xl font-serif font-medium text-ink tracking-tight">DullBot Super-Admin</span>
      </div>

      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-8">
        
        {/* Platform Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-6 rounded-cards shadow-subtle border border-dove/10 flex flex-col justify-between h-32 relative overflow-hidden group">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-ash uppercase tracking-wider">Total Workspaces</span>
              <div className="p-2 bg-sky-wash rounded-lg text-blue-600"><Users className="w-4 h-4" /></div>
            </div>
            <p className="text-3xl font-serif text-ink">{platformMetrics.totalShops.toLocaleString()}</p>
          </div>
          
          <div className="bg-white p-6 rounded-cards shadow-subtle border border-dove/10 flex flex-col justify-between h-32 relative overflow-hidden group">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-ash uppercase tracking-wider">Credits Floating</span>
              <div className="p-2 bg-apricot-wash rounded-lg text-rust"><Database className="w-4 h-4" /></div>
            </div>
            <p className="text-3xl font-serif text-ink">{platformMetrics.totalCreditsInCirculation.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
          </div>

          <div className="bg-white p-6 rounded-cards shadow-subtle border border-dove/10 flex flex-col justify-between h-32 relative overflow-hidden group">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-ash uppercase tracking-wider">Credits Burned</span>
              <div className="p-2 bg-fog rounded-lg text-graphite"><TrendingUp className="w-4 h-4" /></div>
            </div>
            <p className="text-3xl font-serif text-ink">{platformMetrics.totalCreditsSpentAllTime.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
          </div>

          <div className="bg-white p-6 rounded-cards shadow-subtle border border-dove/10 flex flex-col justify-between h-32 relative overflow-hidden group">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-ash uppercase tracking-wider">Total AI Cost</span>
              <div className="p-2 bg-green-50 rounded-lg text-green-600"><DollarSign className="w-4 h-4" /></div>
            </div>
            <p className="text-3xl font-serif text-ink">${platformMetrics.totalRawCostUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          </div>
        </div>

        {/* Workspaces Table */}
        <div className="bg-white rounded-cards shadow-subtle border border-dove/10 overflow-hidden">
          <div className="p-5 border-b border-dove/10 flex items-center justify-between gap-4 bg-white">
            <h2 className="text-lg font-medium text-ink shrink-0">All Workspaces</h2>
            <div className="relative max-w-sm w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ash" />
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Search shops by name or slug..."
                className="w-full pl-9 pr-4 py-2 bg-fog border border-transparent rounded-inputs text-sm focus:border-ink/20 focus:outline-none transition-colors"
              />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-fog text-xs text-ash uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3 font-medium">Workspace</th>
                  <th className="px-6 py-3 font-medium text-right">Balance</th>
                  <th className="px-6 py-3 font-medium text-right">Total Spent</th>
                  <th className="px-6 py-3 font-medium">Status</th>
                  <th className="px-6 py-3 font-medium">Joined</th>
                  <th className="px-6 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dove/10">
                {filteredShops.map(shop => (
                  <tr key={shop.id} className="hover:bg-fog/50 transition-colors group">
                    <td className="px-6 py-4">
                      <p className="font-medium text-ink">{shop.name}</p>
                      <p className="text-xs text-ash font-mono">{shop.slug}</p>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className={`font-medium ${shop.credit_balance <= 0 ? 'text-rust' : 'text-ink'}`}>
                        {shop.credit_balance.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right text-graphite">
                      {shop.total_spent.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${shop.agent_enabled ? 'bg-green-50 text-green-700' : 'bg-fog text-graphite'}`}>
                        {shop.agent_enabled ? (
                          <><span className="w-1.5 h-1.5 rounded-full bg-green-500" /> Active</>
                        ) : (
                          <><span className="w-1.5 h-1.5 rounded-full bg-ash" /> Disabled</>
                        )}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs text-ash">
                      {new Date(shop.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {grantShopId === shop.id ? (
                        <div className="flex items-center justify-end gap-2">
                          <input
                            type="number"
                            value={grantAmount}
                            onChange={e => setGrantAmount(parseInt(e.target.value) || 0)}
                            className="w-20 px-2 py-1 bg-white border border-dove/30 rounded text-xs focus:outline-none"
                          />
                          <button onClick={handleGrant} disabled={isPending} className="px-3 py-1 bg-ink text-white rounded text-xs font-medium hover:bg-black disabled:opacity-50">
                            {isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Add'}
                          </button>
                          <button onClick={() => setGrantShopId(null)} className="px-3 py-1 bg-fog text-graphite rounded text-xs hover:bg-dove/20">
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setGrantShopId(shop.id)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg text-ink hover:bg-fog inline-flex items-center gap-1 text-xs font-medium"
                        >
                          <Plus className="w-3.5 h-3.5" /> Credits
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {filteredShops.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-ash text-sm">No workspaces match your search.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
