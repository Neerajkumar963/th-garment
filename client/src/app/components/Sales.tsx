import { useState, useEffect } from "react";
import { DollarSign, TrendingUp, ShoppingBag, Users, Calendar, Loader2, Package, Search, ArrowUpRight, History, Plus } from "lucide-react";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { api } from "../../services/api";
import { toast } from "sonner";
import { cn } from "./ui/utils.tsx";
import { Modal } from "./ui/modal";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";

interface SaleRecord {
  id: number;
  supply_type: "inward" | "outward";
  total: number;
  created_on: string;
  item_count: number;
  org_id: number;
}

interface StockItem {
  org_dress_id: number;
  size: string;
  price: number;
  available_qty: number;
  org_dress_name: string;
  org_name: string;
}

export function Sales() {
  const [history, setHistory] = useState<SaleRecord[]>([]);
  const [stock, setStock] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"history" | "stock">("history");
  const [stats, setStats] = useState({ revenue: 0, salesCount: 0, clients: 0 });

  // Detail Modal state
  const [selectedSale, setSelectedSale] = useState<SaleRecord | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [saleDetail, setSaleDetail] = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Create Sale state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [clients, setClients] = useState<any[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [saleItems, setSaleItems] = useState<any[]>([]); // { org_dress_id, size, quantity, price, dress_name }

  const fetchData = async () => {
    try {
      const start = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
      const end = new Date().toISOString().split('T')[0];

      const [histRes, stockRes, summaryRes] = await Promise.all([
        api.get('/sales/history'),
        api.get('/sales/stock'),
        api.get(`/reports/sales-summary?start=${start}&end=${end}`)
      ]);

      setHistory(histRes.history || []);
      setStock(stockRes.stock || []);

      const summary = summaryRes.summary || [];
      const revenue = summary.reduce((a: any, b: any) => a + Number(b.revenue), 0);
      const salesCount = summary.reduce((a: any, b: any) => a + b.orders, 0);

      setStats({
        revenue,
        salesCount,
        clients: new Set(histRes.history?.map((h: any) => h.org_id)).size
      });
    } catch (error) {
      toast.error("Failed to sync sales data");
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetail = async (sale: SaleRecord) => {
    setSelectedSale(sale);
    setShowDetailModal(true);
    setDetailLoading(true);
    try {
      const data = await api.get(`/sales/${sale.id}`);
      setSaleDetail(data.sale);
    } catch (error) {
      toast.error("Failed to load invoice details");
    } finally {
      setDetailLoading(false);
    }
  };

  const handleCreateSale = async () => {
    if (!selectedClientId || saleItems.length === 0) {
      toast.error("Please select a client and add items to the sale");
      return;
    }

    setIsSubmitting(true);
    try {
      const selectedClient = clients.find(c => c.id.toString() === selectedClientId);
      const payload = {
        org_id: parseInt(selectedClientId),
        branch: selectedClient?.branch || "Main",
        supply_type: "outward",
        items: saleItems.map(item => ({
          org_dress_id: item.org_dress_id,
          size: item.size,
          quantity: item.quantity,
          price: item.price
        }))
      };

      await api.post('/sales', payload);
      toast.success("Sale invoice generated successfully");
      setIsCreateModalOpen(false);
      setSelectedClientId("");
      setSaleItems([]);
      fetchData();
    } catch (error: any) {
      toast.error(error.message || "Failed to create sale");
    } finally {
      setIsSubmitting(false);
    }
  };

  const fetchClients = async () => {
    try {
      const data = await api.get('/clients');
      // Filter out internal stock production from sales dropdown
      const externalClients = (data.clients || []).filter((c: any) => c.name !== 'INTERNAL_STOCK');
      setClients(externalClients);
    } catch (error) {
      console.error("Failed to load clients", error);
    }
  };

  useEffect(() => {
    fetchClients();
  }, []);

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <div className="flex-1 overflow-auto bg-[#f8fafc]">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-8 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black text-gray-900">Commercial Hub</h1>
            <p className="text-sm font-bold text-gray-500 mt-1 uppercase tracking-widest">Revenue Tracking & Finished Goods Inventory</p>
          </div>
          <div className="flex gap-3">
            <div className="flex bg-gray-100 p-1 rounded-xl">
              <Button
                variant={view === 'history' ? 'secondary' : 'ghost'}
                size="sm"
                className={cn("rounded-lg font-bold text-xs px-6", view === 'history' && "bg-white shadow-sm")}
                onClick={() => setView('history')}
              >
                <History className="w-3.5 h-3.5 mr-2" /> Sales History
              </Button>
              <Button
                variant={view === 'stock' ? 'secondary' : 'ghost'}
                size="sm"
                className={cn("rounded-lg font-bold text-xs px-6", view === 'stock' && "bg-white shadow-sm")}
                onClick={() => setView('stock')}
              >
                <Package className="w-3.5 h-3.5 mr-2" /> Finished Stock
              </Button>
            </div>
            <Button
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-6 rounded-xl shadow-lg shadow-indigo-100 flex items-center gap-2"
              onClick={() => setIsCreateModalOpen(true)}
            >
              <Plus className="w-4 h-4" /> New Outward Sale
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-8 max-w-7xl mx-auto space-y-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm relative overflow-hidden group">
            <DollarSign className="absolute -right-4 -bottom-4 w-24 h-24 text-gray-50 group-hover:text-green-50 transition-colors" />
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">MTD Revenue</p>
            <div className="flex items-baseline gap-2">
              <h2 className="text-3xl font-black text-gray-900">₹{stats.revenue.toLocaleString()}</h2>
              <Badge className="bg-green-50 text-green-600 border-none font-bold text-[10px]"><ArrowUpRight className="w-3 h-3 mr-0.5" /> 12%</Badge>
            </div>
            <p className="text-[10px] font-bold text-gray-400 mt-2">CURRENT BILLING CYCLE</p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm relative overflow-hidden group">
            <ShoppingBag className="absolute -right-4 -bottom-4 w-24 h-24 text-gray-50 group-hover:text-indigo-50 transition-colors" />
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Total Invoices</p>
            <h2 className="text-3xl font-black text-gray-900">{stats.salesCount}</h2>
            <p className="text-[10px] font-bold text-gray-400 mt-2">PROCESSED THIS MONTH</p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm relative overflow-hidden group">
            <Users className="absolute -right-4 -bottom-4 w-24 h-24 text-gray-50 group-hover:text-purple-50 transition-colors" />
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Transacting Clients</p>
            <h2 className="text-3xl font-black text-gray-900">{stats.clients}</h2>
            <p className="text-[10px] font-bold text-gray-400 mt-2">ACTIVE RELATIONSHIPS</p>
          </div>
        </div>

        {loading ? (
          <div className="py-40 text-center space-y-4">
            <Loader2 className="w-10 h-10 animate-spin mx-auto text-indigo-600" />
            <p className="text-xs font-black text-gray-400 uppercase tracking-tighter">Synchronizing Commercial Data...</p>
          </div>
        ) : view === 'history' ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-50 flex items-center justify-between bg-gray-50/30">
              <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest">Recent Sales Logs</h3>
              <div className="relative w-64">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <Input placeholder="Search invoice..." className="pl-9 h-9 border-none bg-white shadow-sm" />
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50/50">
                    <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Date</th>
                    <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Invoice ID</th>
                    <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Flow</th>
                    <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Items</th>
                    <th className="px-6 py-4 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">Grand Total</th>
                    <th className="px-6 py-4 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {history.length === 0 ? (
                    <tr><td colSpan={6} className="py-20 text-center text-xs font-bold text-gray-400 uppercase">No sales history found</td></tr>
                  ) : history.map(sale => (
                    <tr key={sale.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4 text-xs font-bold text-gray-600">{new Date(sale.created_on).toLocaleDateString()}</td>
                      <td className="px-6 py-4"><span className="text-xs font-black text-indigo-600 bg-indigo-50 px-2 py-1 rounded">INV-{sale.id.toString().padStart(6, '0')}</span></td>
                      <td className="px-6 py-4">
                        <Badge className={cn("text-[9px] font-black uppercase tracking-tighter", sale.supply_type === 'outward' ? "bg-green-50 text-green-600" : "bg-orange-50 text-orange-600")}>
                          {sale.supply_type}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-xs font-bold text-gray-700">{sale.item_count} Unique Models</td>
                      <td className="px-6 py-4 text-right"><span className="text-sm font-black text-gray-900">₹{sale.total.toLocaleString()}</span></td>
                      <td className="px-6 py-4 text-center"><Button variant="ghost" size="sm" className="h-8 font-bold text-xs text-indigo-600" onClick={() => handleViewDetail(sale)}>Details</Button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {stock.length === 0 ? (
              <div className="col-span-full py-40 text-center opacity-30">
                <Package className="w-16 h-16 mx-auto mb-4" />
                <p className="text-xs font-black uppercase tracking-widest">Warehouse Empty</p>
              </div>
            ) : stock.map((item, idx) => (
              <div key={idx} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all group">
                <div className="flex justify-between items-start mb-4">
                  <div className="p-3 rounded-xl bg-orange-50 text-orange-600">
                    <Package className="w-5 h-5" />
                  </div>
                  <Badge className="bg-gray-50 text-gray-400 border-none font-black text-[10px]">{item.org_name}</Badge>
                </div>
                <h4 className="font-black text-gray-900 mb-1">{item.org_dress_name}</h4>
                <div className="flex items-center gap-2 mb-6">
                  <Badge variant="secondary" className="bg-indigo-50 text-indigo-600 border-none text-[9px] font-black">SIZE: {item.size}</Badge>
                  <p className="text-xs font-bold text-gray-400">₹{item.price} / unit</p>
                </div>
                <div className="pt-4 border-t border-gray-50 flex items-center justify-between">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Available Packets</p>
                  <p className="text-xl font-black text-gray-900">{item.available_qty}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Sale Detail Modal */}
      <Modal
        isOpen={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        title="Sale Invoice Details"
        size="lg"
      >
        {detailLoading ? (
          <div className="py-20 text-center uppercase font-black text-gray-300 text-[10px] tracking-widest">Fetching Ledger Entry...</div>
        ) : saleDetail && (
          <div className="space-y-6">
            <div className="flex justify-between items-start border-b pb-6">
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Bill For</p>
                <h3 className="text-xl font-black text-gray-900">{saleDetail.org_name}</h3>
                <p className="text-xs text-indigo-600 font-bold">INV-{String(saleDetail.id).padStart(6, '0')}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Date</p>
                <p className="font-bold text-gray-700">{new Date(saleDetail.created_on).toLocaleDateString()}</p>
                <Badge className="mt-1 bg-green-50 text-green-600 font-black">{saleDetail.supply_type}</Badge>
              </div>
            </div>

            <div className="space-y-4">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Item Breakdown</p>
              <div className="bg-gray-50 rounded-xl overflow-hidden border border-gray-100">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-100/50 text-[10px] uppercase font-black text-gray-400">
                      <th className="px-4 py-3 text-left">Product</th>
                      <th className="px-4 py-3 text-center">Qty</th>
                      <th className="px-4 py-3 text-right">Rate</th>
                      <th className="px-4 py-3 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {saleDetail.items?.map((item: any, i: number) => (
                      <tr key={i} className="text-gray-700">
                        <td className="px-4 py-3 font-bold">{item.org_dress_name} ({item.size})</td>
                        <td className="px-4 py-3 text-center font-mono">{item.qty}</td>
                        <td className="px-4 py-3 text-right">₹{item.price}</td>
                        <td className="px-4 py-3 text-right font-black">₹{item.qty * item.price}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="pt-6 border-t flex justify-end">
              <div className="w-48 space-y-2">
                <div className="flex justify-between text-xs font-bold text-gray-400 uppercase">
                  <span>Subtotal</span>
                  <span>₹{saleDetail.total}</span>
                </div>
                <div className="flex justify-between text-lg font-black text-gray-900 border-t pt-2">
                  <span>Grand Total</span>
                  <span>₹{saleDetail.total}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Create Sale Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Generate Outward Sale Invoice"
        size="lg"
      >
        <div className="space-y-6">
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase text-gray-400">Target Client</Label>
            <Select value={selectedClientId} onValueChange={setSelectedClientId}>
              <SelectTrigger className="h-12 border-gray-100 bg-gray-50/50 rounded-xl font-bold">
                <SelectValue placeholder="Select high-value account" />
              </SelectTrigger>
              <SelectContent>
                {clients.map(c => <SelectItem key={c.id} value={c.id.toString()}>{c.org_name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-4">
            <Label className="text-[10px] font-black uppercase text-gray-400">Available Stock for Client</Label>
            <div className="grid grid-cols-1 gap-2 max-h-60 overflow-y-auto pr-2">
              {stock.filter(s => s.org_name === clients.find(c => c.id.toString() === selectedClientId)?.org_name).length === 0 ? (
                <div className="py-10 text-center border-2 border-dashed border-gray-100 rounded-2xl">
                  <Package className="w-8 h-8 mx-auto text-gray-100 mb-2" />
                  <p className="text-[10px] font-black text-gray-300 uppercase">No ready stock found for this client</p>
                </div>
              ) : stock.filter(s => s.org_name === clients.find(c => c.id.toString() === selectedClientId)?.org_name).map((item, idx) => {
                const inCart = saleItems.find(si => si.org_dress_id === item.org_dress_id && si.size === item.size);
                return (
                  <div key={idx} className="flex items-center justify-between p-3 rounded-xl border border-gray-100 bg-white hover:border-indigo-100 transition-colors">
                    <div>
                      <p className="text-sm font-bold text-gray-800">{item.org_dress_name}</p>
                      <p className="text-[10px] font-bold text-gray-400">Size: {item.size} • Max Avail: {item.available_qty}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <p className="text-xs font-black text-indigo-600">₹{item.price}</p>
                      <Input
                        type="number"
                        placeholder="Qty"
                        className="w-20 h-8 text-center text-xs font-bold bg-gray-50 border-none"
                        min="0"
                        max={item.available_qty}
                        value={inCart?.quantity || ""}
                        onChange={(e) => {
                          const qty = parseInt(e.target.value) || 0;
                          if (qty > item.available_qty) return;

                          setSaleItems(prev => {
                            const filtered = prev.filter(si => !(si.org_dress_id === item.org_dress_id && si.size === item.size));
                            if (qty === 0) return filtered;
                            return [...filtered, {
                              org_dress_id: item.org_dress_id,
                              size: item.size,
                              quantity: qty,
                              price: item.price,
                              dress_name: item.org_dress_name
                            }];
                          });
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pt-6 border-t border-gray-50 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none">Grand Total</p>
              <p className="text-2xl font-black text-gray-900">₹{saleItems.reduce((a, b) => a + (b.quantity * b.price), 0).toLocaleString()}</p>
            </div>
            <div className="flex gap-3">
              <Button variant="ghost" className="font-bold" onClick={() => setIsCreateModalOpen(false)}>Cancel</Button>
              <Button
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-black px-8 rounded-xl shadow-lg shadow-indigo-100"
                onClick={handleCreateSale}
                disabled={isSubmitting || saleItems.length === 0}
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Dispatch & Invoice"}
              </Button>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
