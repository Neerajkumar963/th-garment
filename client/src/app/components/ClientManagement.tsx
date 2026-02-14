import { useState, useEffect } from "react";
import { Search, Phone, Mail, MapPin, Building2, Plus, DollarSign, Package, TrendingUp, Loader2, ArrowRightLeft, Edit, Trash2, ArrowUp, ArrowDown, Eye, ClipboardCheck } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import { cn } from "./ui/utils.tsx";
import { api } from "../../services/api";
import toast from "react-hot-toast";
import { Modal } from "./ui/modal";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";

interface Client {
  id: number;
  org_name: string;
  name: string;
  phone: string;
  email: string;
  org_type: string;
  current_balance: number;
  branch?: string;
}

interface Product {
  id: number;
  org_dress_name: string;
  item_name: string;
  color_name: string;
  material_req: number;
  processing_rate: number;
  prices: { size: string, price: number }[];
}

interface LedgerEntry {
  id: number;
  datetime: string;
  transaction: 'DR' | 'CR';
  mode: string;
  description: string;
  debit: number;
  credit: number;
  amount: number;
  remarks?: string;
  balance: number;
}

export function ClientManagement() {
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Add Client Modal state
  const [isAddClientModalOpen, setIsAddClientModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [clientForm, setClientForm] = useState({
    name: "",
    org_name: "",
    phone: "",
    email: "",
    gstin: "",
    adhaar: "",
    branch: "",
    org_type: "Retail"
  });

  // Edit/Product Modals
  const [isEditClientModalOpen, setIsEditClientModalOpen] = useState(false);
  const [isAddProductModalOpen, setIsAddProductModalOpen] = useState(false);
  const [isEditProductModalOpen, setIsEditProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const [clientEditForm, setClientEditForm] = useState({
    name: "",
    org_name: "",
    phone: "",
    email: "",
    gstin: "",
    adhaar: "",
    branch: "",
    org_type: ""
  });

  // View Client Modal
  const [isViewClientModalOpen, setIsViewClientModalOpen] = useState(false);

  // Branch Management
  const [isBranchListModalOpen, setIsBranchListModalOpen] = useState(false);
  const [branchListOrg, setBranchListOrg] = useState<string | null>(null);

  const [productForm, setProductForm] = useState({
    item_id: "",
    color_id: "",
    org_dress_name: "",
    material_req: "",
    processing_rate: "",
    prices: [] as { size: string, price: string }[]
  });

  const [masterData, setMasterData] = useState<{ items: any[], colors: any[] }>({ items: [], colors: [] });

  const handleAddClient = async () => {
    if (!clientForm.org_name || !clientForm.phone) {
      return toast.error("Organization name and phone are required");
    }

    setIsSubmitting(true);
    try {
      const payload = {
        name: clientForm.name,
        org_name: clientForm.org_name,
        phone: clientForm.phone,
        email: clientForm.email,
        gstin: clientForm.gstin,
        adhaar: clientForm.adhaar,
        branch: clientForm.branch || "Main", // Default to Main if empty
        org_type: clientForm.org_type
      };

      await api.post('/clients', payload);
      toast.success("Client onboarded successfully");
      setIsAddClientModalOpen(false);
      fetchClients();

      // Reset form
      setClientForm({
        name: "",
        org_name: "",
        phone: "",
        email: "",
        gstin: "",
        adhaar: "",
        branch: "",
        org_type: "Retail"
      });
    } catch (error: any) {
      toast.error(error.message || "Failed to add client");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditClient = async () => {
    if (!selectedClient) return;
    setIsSubmitting(true);
    try {
      await api.put(`/clients/${selectedClient.id}`, clientEditForm);
      toast.success("Client updated successfully");
      setIsEditClientModalOpen(false);
      fetchClients();
    } catch (error: any) {
      toast.error(error.message || "Failed to update client");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddProduct = async () => {
    if (!selectedClient) return;
    setIsSubmitting(true);
    try {
      await api.post(`/clients/${selectedClient.id}/products`, productForm);
      toast.success("Product added to client catalog");
      setIsAddProductModalOpen(false);
      fetchDetails(selectedClient.id);
    } catch (error: any) {
      toast.error(error.message || "Failed to add product");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditProduct = async () => {
    if (!selectedClient || !editingProduct) return;
    setIsSubmitting(true);
    try {
      await api.put(`/clients/${selectedClient.id}/products/${editingProduct.id}`, productForm);
      toast.success("Product updated successfully");
      setIsEditProductModalOpen(false);
      fetchDetails(selectedClient.id);
    } catch (error: any) {
      toast.error(error.message || "Failed to update product");
    } finally {
      setIsSubmitting(false);
    }
  };

  const fetchMasterData = async () => {
    try {
      const [itemsRes, colorsRes] = await Promise.all([
        api.get('/items'),
        api.get('/fabric/colors')
      ]);
      setMasterData({
        items: itemsRes.items || [],
        colors: Array.isArray(colorsRes) ? colorsRes : (colorsRes.colors || [])
      });
    } catch (error) {
      console.error("Failed to load master data for products");
    }
  };

  const fetchClients = async () => {
    try {
      const data = await api.get('/clients');
      const externalClients = (data.clients || []).filter((c: any) => c.name !== 'INTERNAL_STOCK');
      setClients(externalClients);
      if (data.clients?.length > 0 && !selectedClient) {
        setSelectedClient(data.clients[0]);
      }
    } catch (error) {
      toast.error("Failed to load clients");
    } finally {
      setLoading(false);
    }
  };

  const fetchDetails = async (clientId: number) => {
    setDetailLoading(true);
    try {
      const [prodRes, ledgerRes] = await Promise.all([
        api.get(`/clients/${clientId}/products`),
        api.get(`/clients/${clientId}/account`)
      ]);
      setProducts(prodRes.products || []);
      setLedger(ledgerRes.ledger || []);
    } catch (error) {
      toast.error("Failed to load client details");
    } finally {
      setDetailLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
    fetchMasterData();
  }, []);

  useEffect(() => {
    if (selectedClient) {
      fetchDetails(selectedClient.id);
    }
  }, [selectedClient?.id]);

  // Group clients by Organization Name and aggregate balance
  const groupedClients = clients.reduce((acc, client) => {
    const existing = acc.find(c => c.org_name === client.org_name);
    if (existing) {
      existing.current_balance += Number(client.current_balance);
      existing.branchCount = (existing.branchCount || 1) + 1;
    } else {
      acc.push({ ...client, current_balance: Number(client.current_balance), branchCount: 1 });
    }
    return acc;
  }, [] as any[]);

  const filteredClients = groupedClients.filter(c =>
    c.org_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex-1 overflow-auto bg-[#f8fafc]">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-8 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black text-gray-900">CRM & Accounts</h1>
            <p className="text-sm font-bold text-gray-500 mt-1 uppercase tracking-widest">Manage clients, price lists and payment ledgers</p>
          </div>
          <Button
            className="bg-[#e94560] hover:bg-[#d13a52] font-bold px-6"
            onClick={() => setIsAddClientModalOpen(true)}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add New Client
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex h-[calc(100vh-140px)]">
        {/* Left Sidebar - Client List */}
        <div className="w-96 bg-white border-r border-gray-200 flex flex-col">
          {/* Search */}
          <div className="p-4 border-b border-gray-200">
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                placeholder="Search clients..."
                className="pl-9 h-11 border-gray-100 bg-gray-50 focus:bg-white"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {/* Client List */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="py-20 text-center flex flex-col items-center gap-2">
                <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Syncing CRM...</span>
              </div>
            ) : filteredClients.length === 0 ? (
              <p className="py-20 text-center text-xs font-bold text-gray-400 uppercase">No clients found</p>
            ) : (
              filteredClients.map((client) => (
                <div
                  key={client.id}
                  onClick={() => {
                    // When clicking a group, simplify find the main branch or first occurrence
                    const actualClient = clients.find(c => c.org_name === client.org_name && (c.branch === 'Main' || true));
                    setSelectedClient(actualClient || client);
                  }}
                  className={cn(
                    "p-5 border-b border-gray-50 cursor-pointer transition-all hover:bg-indigo-50/30",
                    selectedClient?.org_name === client.org_name && "bg-indigo-50 border-l-4 border-l-indigo-600 shadow-sm"
                  )}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-bold text-gray-900 text-sm">{client.org_name}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="secondary" className="text-[9px] uppercase font-black bg-white border-gray-100">
                          {client.org_type || 'General'}
                        </Badge>
                        <Badge
                          variant="outline"
                          className="text-[9px] font-bold text-indigo-500 border-indigo-100 hover:bg-indigo-100 cursor-pointer transition-colors"
                          onClick={(e) => {
                            e.stopPropagation();
                            setBranchListOrg(client.org_name);
                            setIsBranchListModalOpen(true);
                          }}
                        >
                          {client.branchCount || 1} Branch{client.branchCount !== 1 ? 'es' : ''}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-3">
                    <span className="text-[10px] font-bold text-gray-400 uppercase">Total Balance</span>
                    <span
                      className={cn(
                        "text-sm font-black",
                        client.current_balance >= 0 ? "text-green-600" : "text-rose-600"
                      )}
                    >
                      ₹{Math.abs(client.current_balance).toLocaleString()}
                      {client.current_balance < 0 && <span className="text-[10px] ml-1">DR</span>}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Panel - Client Details */}
        <div className="flex-1 overflow-y-auto bg-[#f8fafc]">
          {selectedClient ? (
            <div className="p-8 max-w-6xl mx-auto space-y-6">
              {/* Client Header */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
                <div className="flex items-start justify-between mb-8">
                  <div className="flex items-center gap-6">
                    <div className="w-16 h-16 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-200">
                      <Building2 className="w-8 h-8 text-white" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-black text-gray-900">{selectedClient.org_name}</h2>
                      <div className="flex items-center gap-3 mt-1">
                        <Badge className="bg-indigo-50 text-indigo-600 border-indigo-100 font-bold uppercase text-[10px]">
                          {selectedClient.org_type}
                        </Badge>
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">ID #{selectedClient.id}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="font-bold h-9 bg-gray-50 border-gray-200"
                      onClick={() => {
                        setClientEditForm({
                          name: selectedClient.name,
                          org_name: selectedClient.org_name,
                          phone: selectedClient.phone,
                          email: selectedClient.email || "",
                          gstin: (selectedClient as any).gstin || "",
                          adhaar: (selectedClient as any).adhaar || "",
                          branch: selectedClient.branch || "",
                          org_type: selectedClient.org_type
                        });
                        setIsEditClientModalOpen(true);
                      }}
                    >
                      Edit Info
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="font-bold h-9 bg-gray-50 border-gray-200"
                      onClick={() => setIsViewClientModalOpen(true)}
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      View Overview
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="font-bold h-9 bg-gray-50 border-gray-200"
                      onClick={() => {
                        setProductForm({
                          item_id: "",
                          color_id: "",
                          org_dress_name: "",
                          material_req: "",
                          processing_rate: "",
                          prices: []
                        });
                        setIsAddProductModalOpen(true);
                      }}
                    >
                      New Product
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="font-bold h-9 bg-gray-50 border-gray-200 text-indigo-600 hover:bg-indigo-50"
                      onClick={() => {
                        setClientForm({
                          name: selectedClient.name,
                          org_name: selectedClient.org_name,
                          phone: selectedClient.phone,
                          email: selectedClient.email || "",
                          gstin: (selectedClient as any).gstin || "",
                          adhaar: (selectedClient as any).adhaar || "",
                          branch: "", // Clear branch for new entry
                          org_type: selectedClient.org_type
                        });
                        setIsAddClientModalOpen(true);
                      }}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Branch
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  <div className="space-y-4">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-50 pb-2">Contact Details</p>
                    <div className="space-y-3">
                      <div className="flex items-center gap-3 text-sm font-bold text-gray-700">
                        <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center"><Phone className="w-4 h-4 text-indigo-600" /></div>
                        <span>{selectedClient.phone}</span>
                      </div>
                      <div className="flex items-center gap-3 text-sm font-bold text-gray-700">
                        <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center"><Mail className="w-4 h-4 text-indigo-600" /></div>
                        <span className="truncate">{selectedClient.email || 'N/A'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-50 pb-2">Business Terms</p>
                    <div className="space-y-3">
                      <div className="flex items-center gap-3 text-sm font-bold text-gray-700">
                        <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center"><TrendingUp className="w-4 h-4 text-indigo-600" /></div>
                        <span>{selectedClient.org_type} Pricing</span>
                      </div>
                      <div className="flex items-center gap-3 text-sm font-bold text-gray-700">
                        <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center"><Package className="w-4 h-4 text-indigo-600" /></div>
                        <span>{products.length} Products Linked</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-50 pb-2">Account Summary</p>
                    <div className="p-4 bg-indigo-600 rounded-2xl shadow-lg shadow-indigo-100 relative overflow-hidden group">
                      <DollarSign className="absolute -right-4 -bottom-4 w-24 h-24 text-white/10 group-hover:scale-110 transition-transform" />
                      <p className="text-[9px] font-black text-indigo-100 uppercase tracking-widest mb-1">Current Balance</p>
                      <p className="text-2xl font-black text-white">₹{Math.abs(selectedClient.current_balance).toLocaleString()}</p>
                      <p className="text-[10px] font-bold text-indigo-200 mt-1">
                        {selectedClient.current_balance >= 0 ? "SURPLUS / ADVANCE" : "OUTSTANDING DUE"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Product Catalog */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-md font-black text-gray-900 uppercase tracking-widest flex items-center gap-2">
                      <Package className="w-4 h-4 text-indigo-600" /> Product Matrix
                    </h3>
                    <Badge className="bg-gray-100 text-gray-500 font-bold border-none">{products.length}</Badge>
                  </div>
                  <div className="space-y-3">
                    {detailLoading ? <Loader2 className="w-6 h-6 animate-spin mx-auto my-10 text-indigo-200" /> :
                      products.length === 0 ? <p className="text-center py-10 text-xs font-bold text-gray-400 uppercase">No products configured</p> :
                        products.map((product) => (
                          <div key={product.id} className="p-4 rounded-xl border border-gray-50 bg-gray-50/50 hover:bg-white hover:border-indigo-100 hover:shadow-md transition-all group">
                            <div className="flex justify-between items-start">
                              <div>
                                <p className="font-bold text-gray-900">{product.org_dress_name}</p>
                                <p className="text-[10px] font-bold text-gray-400 mt-0.5">{product.item_name} • {product.color_name}</p>
                              </div>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={() => {
                                  setEditingProduct(product);
                                  setProductForm({
                                    item_id: "", // We might not change these upon edit if backend doesn't support
                                    color_id: "",
                                    org_dress_name: product.org_dress_name,
                                    material_req: product.material_req.toString(),
                                    processing_rate: product.processing_rate.toString(),
                                    prices: product.prices.map(p => ({ size: p.size, price: p.price.toString() }))
                                  });
                                  setIsEditProductModalOpen(true);
                                }}
                              >
                                <Edit className="w-3 h-3" />
                              </Button>
                            </div>
                            <div className="grid grid-cols-3 gap-2 mt-4">
                              {product.prices?.map((p, idx) => (
                                <div key={idx} className="bg-white p-2 rounded-lg border border-gray-100 text-center">
                                  <p className="text-[8px] font-black text-gray-400 uppercase">{p.size}</p>
                                  <p className="text-xs font-black text-indigo-600">₹{p.price}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                  </div>
                </div>

                {/* Account Ledger */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-md font-black text-gray-900 uppercase tracking-widest flex items-center gap-2">
                      <ArrowRightLeft className="w-4 h-4 text-indigo-600" /> Recent Ledger
                    </h3>
                    <Button variant="link" className="text-xs font-bold text-indigo-600 px-0 h-auto" onClick={() => toast.success(`Statement contains ${ledger.length} operations`)}>View Full Statement</Button>
                  </div>
                  <div className="flex-1 space-y-4">
                    {detailLoading ? <Loader2 className="w-6 h-6 animate-spin mx-auto my-10 text-indigo-200" /> :
                      ledger.length === 0 ? <p className="text-center py-10 text-xs font-bold text-gray-400 uppercase">No transaction history</p> :
                        ledger.map((entry) => (
                          <div key={entry.id} className="flex items-center justify-between p-3 border-b border-gray-50 last:border-0 hover:bg-gray-50/50 rounded-lg transition-colors">
                            <div className="space-y-0.5">
                              <p className="text-sm font-bold text-gray-800">{entry.description || entry.remarks || 'No description'}</p>
                              <p className="text-[10px] font-bold text-gray-400 capitalize">{new Date(entry.datetime).toLocaleDateString()} • {entry.mode}</p>
                            </div>
                            <div className="text-right">
                              <p className={cn(
                                "text-sm font-black",
                                entry.transaction === 'DR' ? "text-rose-600" : "text-green-600"
                              )}>
                                {entry.transaction === 'DR' ? `-₹${entry.amount}` : `+₹${entry.amount}`}
                              </p>
                              <p className="text-[9px] font-bold text-gray-400">Bal: ₹{entry.balance}</p>
                            </div>
                          </div>
                        ))}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center opacity-40">
              <Building2 className="w-20 h-20 text-indigo-200 mb-4" />
              <p className="text-sm font-black text-gray-400 uppercase tracking-widest">Select a client to manage</p>
            </div>
          )}
        </div>
      </div>

      {/* Add Client Modal */}
      <Modal
        isOpen={isAddClientModalOpen}
        onClose={() => setIsAddClientModalOpen(false)}
        title={clientForm.org_name ? `Add New Branch for ${clientForm.org_name}` : "Onboard New Corporate Client"}
        size="lg"
      >
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Organization Name *</Label>
              <Input
                value={clientForm.org_name}
                onChange={(e) => setClientForm({ ...clientForm, org_name: e.target.value })}
                placeholder="Business Entity Name"
                className="h-12 border-gray-100 bg-gray-50/50 rounded-xl font-bold"
                disabled={!!clientForm.org_name} // Disable if adding branch
              />
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Primary Contact Person</Label>
              <Input
                value={clientForm.name}
                onChange={(e) => setClientForm({ ...clientForm, name: e.target.value })}
                placeholder="Full Name"
                className="h-12 border-gray-100 bg-gray-50/50 rounded-xl font-bold"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Phone Number *</Label>
              <Input
                value={clientForm.phone}
                onChange={(e) => setClientForm({ ...clientForm, phone: e.target.value })}
                placeholder="+91 XXXXX XXXXX"
                className="h-12 border-gray-100 bg-gray-50/50 rounded-xl font-bold"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Email Address</Label>
              <Input
                value={clientForm.email}
                onChange={(e) => setClientForm({ ...clientForm, email: e.target.value })}
                placeholder="contact@business.com"
                className="h-12 border-gray-100 bg-gray-50/50 rounded-xl font-bold"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">GSTIN / Tax ID</Label>
              <Input
                value={clientForm.gstin}
                onChange={(e) => setClientForm({ ...clientForm, gstin: e.target.value })}
                placeholder="22AAAAA0000A1Z5"
                className="h-12 border-gray-100 bg-gray-50/50 rounded-xl font-mono"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Aadhaar / KYC ID</Label>
              <Input
                value={clientForm.adhaar}
                onChange={(e) => setClientForm({ ...clientForm, adhaar: e.target.value })}
                placeholder="XXXX XXXX XXXX"
                className="h-12 border-gray-100 bg-gray-50/50 rounded-xl font-mono"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Branch / Location</Label>
              <Input
                value={clientForm.branch}
                onChange={(e) => setClientForm({ ...clientForm, branch: e.target.value })}
                placeholder="Main Campus / City"
                className="h-12 border-gray-100 bg-gray-50/50 rounded-xl font-bold"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Client Category</Label>
              <Select
                value={clientForm.org_type}
                onValueChange={(val) => setClientForm({ ...clientForm, org_type: val })}
              >
                <SelectTrigger className="h-12 border-gray-100 bg-gray-50/50 rounded-xl font-bold">
                  <SelectValue placeholder="Select Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Retail">Retail</SelectItem>
                  <SelectItem value="Wholesale">Wholesale</SelectItem>
                  <SelectItem value="Distribution">Distribution</SelectItem>
                  <SelectItem value="Export">Export</SelectItem>
                  <SelectItem value="Job Work">Job Work</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center justify-between pt-6 border-t border-gray-100">
            <p className="text-[10px] text-gray-400 italic">Creating a client will automatically initialize their financial ledger.</p>
            <div className="flex gap-3">
              <Button variant="ghost" className="font-bold text-xs" onClick={() => setIsAddClientModalOpen(false)}>Cancel</Button>
              <Button
                className="bg-indigo-600 hover:bg-indigo-700 text-xs font-bold px-8 shadow-lg shadow-indigo-100"
                onClick={handleAddClient}
                disabled={isSubmitting}
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Establish Relationship"}
              </Button>
            </div>
          </div>
        </div>
      </Modal>

      {/* Branch List / Management Modal */}
      <Modal
        isOpen={isBranchListModalOpen}
        onClose={() => setIsBranchListModalOpen(false)}
        title={`Manage Branches - ${branchListOrg}`}
        size="lg"
      >
        <div className="space-y-4">
          <div className="flex justify-between items-center mb-4">
            <p className="text-sm text-gray-500">Select a branch to edit details or view history.</p>
            <Button
              size="sm"
              className="bg-indigo-600 hover:bg-indigo-700 text-xs font-bold"
              onClick={() => {
                const prototypeClient = clients.find(c => c.org_name === branchListOrg);
                if (prototypeClient) {
                  setClientForm({
                    name: prototypeClient.name,
                    org_name: prototypeClient.org_name,
                    phone: prototypeClient.phone,
                    email: prototypeClient.email || "",
                    gstin: (prototypeClient as any).gstin || "",
                    adhaar: (prototypeClient as any).adhaar || "",
                    branch: "",
                    org_type: prototypeClient.org_type
                  });
                  setIsAddClientModalOpen(true);
                  setIsBranchListModalOpen(false);
                }
              }}
            >
              <Plus className="w-3 h-3 mr-2" />
              Add New Branch
            </Button>
          </div>

          <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
            {clients.filter(c => c.org_name === branchListOrg).map(branchClient => (
              <div key={branchClient.id} className="flex items-center justify-between p-4 border border-gray-100 rounded-xl hover:bg-gray-50 transition-colors group">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900">{branchClient.branch || "Head Office / Main"}</h4>
                    <p className="text-xs text-gray-500">{branchClient.name} • {branchClient.phone}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right mr-4">
                    <p className={`text-sm font-black ${branchClient.current_balance >= 0 ? "text-green-600" : "text-rose-600"}`}>
                      ₹{Math.abs(branchClient.current_balance).toLocaleString()}
                      <span className="text-[9px] text-gray-400 ml-1">{branchClient.current_balance >= 0 ? "CR" : "DR"}</span>
                    </p>
                  </div>

                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-gray-400 hover:text-indigo-600 hover:bg-white"
                    onClick={() => {
                      setSelectedClient(branchClient);
                      setClientEditForm({
                        name: branchClient.name,
                        org_name: branchClient.org_name,
                        phone: branchClient.phone,
                        email: branchClient.email || "",
                        gstin: (branchClient as any).gstin || "",
                        adhaar: (branchClient as any).adhaar || "",
                        branch: branchClient.branch || "",
                        org_type: branchClient.org_type
                      });
                      setIsEditClientModalOpen(true);
                      setIsBranchListModalOpen(false);
                    }}
                    title="Edit Branch Info"
                  >
                    <Edit className="w-4 h-4" />
                  </Button>

                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-gray-400 hover:text-indigo-600 hover:bg-white"
                    onClick={() => {
                      setSelectedClient(branchClient);
                      setIsBranchListModalOpen(false);
                    }}
                    title="View Dashboard"
                  >
                    <ArrowRightLeft className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Modal>

      {/* View Client Details Modal */}
      <Modal
        isOpen={isViewClientModalOpen}
        onClose={() => setIsViewClientModalOpen(false)}
        title="Client Overview"
        size="lg"
      >
        <div className="space-y-8">
          {selectedClient && (
            <>
              {/* Header Section */}
              <div className="flex items-start justify-between border-b border-gray-100 pb-6">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center border border-indigo-100">
                    <Building2 className="w-8 h-8 text-indigo-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-gray-900">{selectedClient.org_name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="border-indigo-100 text-indigo-600 bg-indigo-50">{selectedClient.org_type}</Badge>
                      <span className="text-xs font-bold text-gray-400">ID #{selectedClient.id}</span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Current Balance</p>
                  <p className={`text-2xl font-black ${selectedClient.current_balance >= 0 ? "text-indigo-600" : "text-rose-600"}`}>
                    ₹{Math.abs(selectedClient.current_balance).toLocaleString()}
                    <span className="text-xs ml-1 text-gray-400">{selectedClient.current_balance >= 0 ? "CR" : "DR"}</span>
                  </p>
                </div>
              </div>

              {/* Details Grid */}
              <div className="grid grid-cols-2 gap-x-12 gap-y-8">
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-gray-400 mb-1">
                    <MapPin className="w-4 h-4" />
                    <p className="text-[10px] font-black uppercase tracking-widest">Branch / Location</p>
                  </div>
                  <p className="text-sm font-bold text-gray-900 pl-6">{selectedClient.branch || "Head Office / Main"}</p>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-gray-400 mb-1">
                    <Building2 className="w-4 h-4" />
                    <p className="text-[10px] font-black uppercase tracking-widest">Primary Contact</p>
                  </div>
                  <p className="text-sm font-bold text-gray-900 pl-6">{selectedClient.name}</p>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-gray-400 mb-1">
                    <Phone className="w-4 h-4" />
                    <p className="text-[10px] font-black uppercase tracking-widest">Phone Number</p>
                  </div>
                  <p className="text-sm font-bold text-gray-900 pl-6">{selectedClient.phone}</p>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-gray-400 mb-1">
                    <Mail className="w-4 h-4" />
                    <p className="text-[10px] font-black uppercase tracking-widest">Email Address</p>
                  </div>
                  <p className="text-sm font-bold text-gray-900 pl-6">{selectedClient.email || "Not Provided"}</p>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-gray-400 mb-1">
                    <ClipboardCheck className="w-4 h-4" />
                    <p className="text-[10px] font-black uppercase tracking-widest">GSTIN</p>
                  </div>
                  <p className="text-sm font-mono font-bold text-gray-900 pl-6">{selectedClient.gstin || "N/A"}</p>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-gray-400 mb-1">
                    <ClipboardCheck className="w-4 h-4" />
                    <p className="text-[10px] font-black uppercase tracking-widest">Aadhaar / KYC</p>
                  </div>
                  <p className="text-sm font-mono font-bold text-gray-900 pl-6">{selectedClient.adhaar || "N/A"}</p>
                </div>
              </div>

              <div className="flex justify-end pt-6 border-t border-gray-100">
                <Button className="bg-gray-900 text-white font-bold" onClick={() => setIsViewClientModalOpen(false)}>Close Overview</Button>
              </div>
            </>
          )}
        </div>
      </Modal>

      {/* Edit Client Modal */}
      <Modal
        isOpen={isEditClientModalOpen}
        onClose={() => setIsEditClientModalOpen(false)}
        title="Update Client Logistics"
        size="lg"
      >
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Primary Contact</Label>
              <Input
                value={clientEditForm.name}
                onChange={(e) => setClientEditForm({ ...clientEditForm, name: e.target.value })}
                className="h-12 font-bold"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Organization Name</Label>
              <Input
                value={clientEditForm.org_name}
                onChange={(e) => setClientEditForm({ ...clientEditForm, org_name: e.target.value })}
                className="h-12 font-bold"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Phone</Label>
              <Input
                value={clientEditForm.phone}
                onChange={(e) => setClientEditForm({ ...clientEditForm, phone: e.target.value })}
                className="h-12 font-bold"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Email</Label>
              <Input
                value={clientEditForm.email}
                onChange={(e) => setClientEditForm({ ...clientEditForm, email: e.target.value })}
                className="h-12 font-bold"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">GSTIN</Label>
              <Input
                value={clientEditForm.gstin}
                onChange={(e) => setClientEditForm({ ...clientEditForm, gstin: e.target.value })}
                className="h-12 font-bold"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Aadhar / KYC</Label>
              <Input
                value={clientEditForm.adhaar}
                onChange={(e) => setClientEditForm({ ...clientEditForm, adhaar: e.target.value })}
                className="h-12 font-bold"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Branch</Label>
              <Input
                value={clientEditForm.branch}
                onChange={(e) => setClientEditForm({ ...clientEditForm, branch: e.target.value })}
                className="h-12 font-bold"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Category</Label>
              <Select
                value={clientEditForm.org_type}
                onValueChange={(val) => setClientEditForm({ ...clientEditForm, org_type: val })}
              >
                <SelectTrigger className="h-12 border-gray-100 bg-gray-50/50 rounded-xl font-bold">
                  <SelectValue placeholder="Select Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Retail">Retail</SelectItem>
                  <SelectItem value="Wholesale">Wholesale</SelectItem>
                  <SelectItem value="Distribution">Distribution</SelectItem>
                  <SelectItem value="Export">Export</SelectItem>
                  <SelectItem value="Job Work">Job Work</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="ghost" onClick={() => setIsEditClientModalOpen(false)}>Cancel</Button>
            <Button className="bg-indigo-600" onClick={handleEditClient} disabled={isSubmitting}>Update Client</Button>
          </div>
        </div>
      </Modal>

      {/* Product Modal (Add/Edit) */}
      <Modal
        isOpen={isAddProductModalOpen || isEditProductModalOpen}
        onClose={() => { setIsAddProductModalOpen(false); setIsEditProductModalOpen(false); }}
        title={isEditProductModalOpen ? "Modify Product Rules" : "Link New Product"}
        size="lg"
      >
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Internal Model</Label>
              <Select value={productForm.item_id} onValueChange={v => setProductForm({ ...productForm, item_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select Item" /></SelectTrigger>
                <SelectContent>
                  {masterData.items.map((i: any) => <SelectItem key={i.id} value={i.id.toString()}>{i.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Fabric Color</Label>
              <Select value={productForm.color_id} onValueChange={v => setProductForm({ ...productForm, color_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select Color" /></SelectTrigger>
                <SelectContent>
                  {masterData.colors.map((c: any) => <SelectItem key={c.id} value={c.id.toString()}>{c.color_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Client's Nomenclature (Display Name)</Label>
            <Input value={productForm.org_dress_name} onChange={e => setProductForm({ ...productForm, org_dress_name: e.target.value })} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Material Required (Meters/Pc)</Label>
              <Input type="number" value={productForm.material_req} onChange={e => setProductForm({ ...productForm, material_req: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Processing Rate (Labor Cost)</Label>
              <Input type="number" value={productForm.processing_rate} onChange={e => setProductForm({ ...productForm, processing_rate: e.target.value })} />
            </div>
          </div>

          <div className="bg-gray-50/50 rounded-2xl border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-6">
              <h5 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Size Pricing Matrix (₹)</h5>
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-[10px] font-black uppercase tracking-widest border-indigo-100 text-indigo-600 hover:bg-indigo-50"
                onClick={() => {
                  setProductForm({
                    ...productForm,
                    prices: [...productForm.prices, { size: "", price: "" }]
                  });
                }}
              >
                <Plus className="w-3 h-3 mr-2" />
                Add Column
              </Button>
            </div>

            <div className="overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-gray-200">
              <div className="flex gap-3 min-w-max">
                {/* Labels Row */}
                <div className="flex flex-col gap-3 pr-4 border-r border-gray-200">
                  <div className="h-10 flex items-center justify-end">
                    <span className="text-xl font-black text-gray-400 italic">S</span>
                  </div>
                  <div className="h-12 flex items-center justify-end gap-1 relative group/bulk">
                    <div className="flex flex-col -gap-1 opacity-0 group-hover/bulk:opacity-100 transition-all">
                      <button
                        onClick={() => {
                          const newPrices = productForm.prices.map(p => ({
                            ...p,
                            price: (p.price === "" ? "1" : (parseInt(p.price) + 1).toString())
                          }));
                          setProductForm({ ...productForm, prices: newPrices });
                        }}
                        className="p-0.5 hover:bg-indigo-50 rounded text-indigo-400 transition-all"
                        title="Increase all prices by 1"
                      >
                        <ArrowUp className="w-2.5 h-2.5" />
                      </button>
                      <button
                        onClick={() => {
                          const newPrices = productForm.prices.map(p => ({
                            ...p,
                            price: Math.max(0, (parseInt(p.price) || 0) - 1).toString()
                          }));
                          setProductForm({ ...productForm, prices: newPrices });
                        }}
                        className="p-0.5 hover:bg-indigo-50 rounded text-indigo-400 transition-all"
                        title="Decrease all prices by 1"
                      >
                        <ArrowDown className="w-2.5 h-2.5" />
                      </button>
                    </div>
                    <span className="text-xl font-black text-gray-400 italic">₹</span>
                  </div>
                </div>

                {/* Pricing Columns */}
                {productForm.prices.map((p, idx) => (
                  <div key={idx} className="flex flex-col gap-3 group relative">
                    <div className="relative">
                      <Input
                        defaultValue={p.size}
                        placeholder="SIZE"
                        className="h-10 w-24 text-center font-black uppercase text-[11px] bg-white border-gray-200 rounded-lg focus:border-indigo-300 focus:ring-indigo-500/10"
                        onBlur={(e) => {
                          const newName = e.target.value.trim();
                          if (newName !== p.size) {
                            const newPrices = [...productForm.prices];
                            newPrices[idx].size = newName;
                            setProductForm({ ...productForm, prices: newPrices });
                          }
                        }}
                      />
                      <button
                        className="absolute -top-2 -right-2 w-5 h-5 bg-white border border-rose-100 rounded-full flex items-center justify-center text-rose-400 hover:text-rose-600 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity z-10"
                        onClick={() => {
                          const newPrices = productForm.prices.filter((_, i) => i !== idx);
                          setProductForm({ ...productForm, prices: newPrices });
                        }}
                      >
                        <Trash2 className="w-2.5 h-2.5" />
                      </button>
                    </div>

                    <Input
                      type="text"
                      inputMode="numeric"
                      value={p.price === "0" || p.price === "" ? "" : p.price}
                      placeholder="0"
                      className="h-12 w-24 text-center font-black text-lg bg-white border-gray-200 rounded-lg focus:border-indigo-300 focus:ring-indigo-500/10"
                      onChange={(e) => {
                        const rawValue = e.target.value.replace(/[^0-9]/g, '').replace(/^0+/, '');
                        const newPrices = [...productForm.prices];
                        newPrices[idx].price = rawValue || "";
                        setProductForm({ ...productForm, prices: newPrices });
                      }}
                    />
                  </div>
                ))}

                {/* Empty State */}
                {productForm.prices.length === 0 && (
                  <div className="flex items-center px-4">
                    <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest italic">Add pricing columns to specify rates per size</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-6 border-t">
            <Button variant="ghost" onClick={() => { setIsAddProductModalOpen(false); setIsEditProductModalOpen(false); }}>Cancel</Button>
            <Button className="bg-indigo-600" onClick={isEditProductModalOpen ? handleEditProduct : handleAddProduct} disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Configuration"}
            </Button>
          </div>
        </div>
      </Modal>
    </div >
  );
}

