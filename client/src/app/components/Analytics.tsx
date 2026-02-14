import { useState, useEffect } from "react";
import { TrendingUp, DollarSign, ShoppingBag, Users, Package, Clock, Loader2, ArrowDownRight, ArrowUpRight, ShieldCheck, Wallet } from "lucide-react";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { api } from "../../services/api";
import { toast } from "sonner";
import { cn } from "./ui/utils.tsx";
import { Badge } from "./ui/badge";
import { PageHeader } from "./ui/PageHeader";

interface PLData {
  revenue: number;
  labor_cost: number;
  fabric_cost: number;
  net_profit: number;
  month: string;
  year: string;
}

interface InventoryValue {
  fabric_stock: number;
  finished_goods_value: number;
}

interface ProductionStageSummary {
  stage_name: string;
  completed: number;
}

export function Analytics() {
  const [loading, setLoading] = useState(true);
  const [pl, setPl] = useState<PLData | null>(null);
  const [inv, setInv] = useState<InventoryValue | null>(null);
  const [prod, setProd] = useState<ProductionStageSummary[]>([]);
  const [outstanding, setOutstanding] = useState<any>(null);

  const fetchData = async () => {
    try {
      const now = new Date();
      const month = now.getMonth() + 1;
      const year = now.getFullYear();

      const [plRes, invRes, prodRes, outRes] = await Promise.all([
        api.get(`/reports/profit-loss?month=${month}&year=${year}`),
        api.get('/reports/inventory-value'),
        api.get(`/reports/production-summary?month=${month}&year=${year}`),
        api.get('/reports/outstanding')
      ]);

      setPl(plRes);
      setInv(invRes);
      setProd(prodRes.summary || []);
      setOutstanding(outRes);
    } catch (error) {
      toast.error("Failed to sync business intelligence");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const totalInvValue = (inv?.fabric_stock || 0) + (inv?.finished_goods_value || 0);

  return (
    <div className="flex-1 overflow-auto bg-[#f8fafc]">
      <PageHeader
        title="Intelligence Dashboard"
        subtitle="Enterprise Analytics & Profitability Metrics"
      >
        <Badge className="bg-indigo-50 text-indigo-600 border-none font-bold py-1.5 px-4 h-auto">
          Real-time Sync Active
        </Badge>
      </PageHeader>

      {loading ? (
        <div className="flex flex-col items-center justify-center h-[60vh] opacity-30 animate-pulse">
          <Loader2 className="w-12 h-12 animate-spin mb-4" />
          <p className="text-xs font-black uppercase tracking-[0.2em]">Aggregating Master Data...</p>
        </div>
      ) : (
        <div className="p-8 max-w-7xl mx-auto space-y-8">
          {/* Financial P&L Row */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm relative overflow-hidden">
              <DollarSign className="absolute -right-2 -top-2 w-16 h-16 text-gray-50" />
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Monthly Revenue</p>
              <h3 className="text-2xl font-black text-gray-900">₹{pl?.revenue.toLocaleString()}</h3>
              <div className="mt-4 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                <p className="text-[10px] font-bold text-green-600 uppercase">Cash Inflow</p>
              </div>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm relative overflow-hidden">
              <Users className="absolute -right-2 -top-2 w-16 h-16 text-gray-50" />
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Labor Expense</p>
              <h3 className="text-2xl font-black text-rose-600">₹{pl?.labor_cost.toLocaleString()}</h3>
              <p className="text-[10px] font-bold text-rose-400 mt-4 uppercase">Direct Production Cost</p>
            </div>

            <div className="bg-indigo-600 p-6 rounded-3xl shadow-xl shadow-indigo-100 relative overflow-hidden group">
              <TrendingUp className="absolute -right-4 -bottom-4 w-24 h-24 text-white/10 group-hover:scale-110 transition-transform" />
              <p className="text-[10px] font-black text-indigo-100 uppercase tracking-widest mb-1">Net Earnings (P/L)</p>
              <h3 className="text-3xl font-black text-white">₹{pl?.net_profit.toLocaleString()}</h3>
              <p className="text-[10px] font-bold text-indigo-200 mt-4 uppercase">
                {(pl?.net_profit || 0) > 0 ? 'Surplus Recorded' : 'Operating Deficit'}
              </p>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm relative overflow-hidden">
              <Package className="absolute -right-2 -top-2 w-16 h-16 text-gray-50" />
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Inventory Valuation</p>
              <h3 className="text-2xl font-black text-gray-900">₹{totalInvValue.toLocaleString()}</h3>
              <p className="text-[10px] font-bold text-indigo-500 mt-4 uppercase">Asset Net Worth</p>
            </div>
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Production Yield */}
            <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
              <div className="flex items-center justify-between mb-8">
                <h4 className="text-sm font-black text-gray-900 uppercase tracking-widest flex items-center gap-2">
                  <Clock className="w-4 h-4 text-indigo-600" /> Production Efficacy
                </h4>
                <Badge variant="outline" className="text-[9px] font-bold border-indigo-100 text-indigo-600">UNITS PER STAGE</Badge>
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={prod} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                  <XAxis type="number" hide />
                  <YAxis dataKey="stage_name" type="category" stroke="#94a3b8" fontSize={10} width={100} axisLine={false} tickLine={false} />
                  <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '12px', border: 'none' }} />
                  <Bar dataKey="completed" fill="#6366f1" radius={[0, 10, 10, 0]} barSize={24} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Inventory Split */}
            <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
              <div className="flex items-center justify-between mb-8">
                <h4 className="text-sm font-black text-gray-900 uppercase tracking-widest flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-indigo-600" /> Asset Allocation
                </h4>
                <span className="text-[10px] font-bold text-gray-400">STOCK VALUE SPLIT</span>
              </div>
              <div className="flex items-center justify-center">
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Fabric Stock', value: inv?.fabric_stock || 0 },
                        { name: 'Finished Goods', value: inv?.finished_goods_value || 0 }
                      ]}
                      cx="50%" cy="50%" innerRadius={80} outerRadius={110} paddingAngle={5} dataKey="value"
                    >
                      <Cell fill="#6366f1" />
                      <Cell fill="#f43f5e" />
                    </Pie>
                    <Tooltip />
                    <Legend verticalAlign="bottom" height={36} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Outstanding Balances */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="p-6 bg-green-50/50 border-b border-green-100">
                <h4 className="text-xs font-black text-green-700 uppercase tracking-widest flex items-center gap-2">
                  <Wallet className="w-4 h-4" /> Receivables (Clients)
                </h4>
              </div>
              <div className="p-6 space-y-4">
                {outstanding?.receivables_from_clients?.map((c: any, i: number) => (
                  <div key={i} className="flex justify-between items-center py-2 border-b border-gray-50 last:border-0">
                    <span className="text-sm font-bold text-gray-700">{c.org_name}</span>
                    <span className="text-sm font-black text-green-600">₹{c.balance.toLocaleString()}</span>
                  </div>
                ))}
                <div className="pt-4 flex justify-between items-center opacity-50">
                  <span className="text-[10px] font-black uppercase">Total Collection Target</span>
                  <span className="text-md font-black">₹{outstanding?.receivables_from_clients?.reduce((a: any, b: any) => a + b.balance, 0).toLocaleString()}</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="p-6 bg-rose-50/50 border-b border-rose-100">
                <h4 className="text-xs font-black text-rose-700 uppercase tracking-widest flex items-center gap-2">
                  <Users className="w-4 h-4" /> Payables (Staff Wages)
                </h4>
              </div>
              <div className="p-6 space-y-4">
                {outstanding?.payables_to_employees?.map((e: any, i: number) => (
                  <div key={i} className="flex justify-between items-center py-2 border-b border-gray-50 last:border-0">
                    <span className="text-sm font-bold text-gray-700">{e.name}</span>
                    <span className="text-sm font-black text-rose-600">₹{e.balance.toLocaleString()}</span>
                  </div>
                ))}
                <div className="pt-4 flex justify-between items-center opacity-50">
                  <span className="text-[10px] font-black uppercase">Total Pending Liability</span>
                  <span className="text-md font-black">₹{outstanding?.payables_to_employees?.reduce((a: any, b: any) => a + b.balance, 0).toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
