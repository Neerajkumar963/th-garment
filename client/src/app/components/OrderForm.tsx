import { useState, useEffect } from "react";
import { Check, Plus, Trash2, Loader2, ArrowUp, ArrowDown } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Textarea } from "./ui/textarea";
import { api } from "../../services/api";
import { toast } from "sonner";

const steps = ["Basic Info", "Items & Sizes", "Review"];

interface OrderItem {
  id: string;
  productId: string; // org_dress_id
  productName: string;
  sizeList: { id: string; size: string; qty: number }[]; // Stable IDs for UI
  customization: string;
  remarks: string;
}

interface OrderFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function OrderForm({ onSuccess, onCancel }: OrderFormProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [clients, setClients] = useState<any[]>([]);
  const [availableProducts, setAvailableProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [selectedOrg, setSelectedOrg] = useState<string>("");
  const [availableBranches, setAvailableBranches] = useState<any[]>([]);

  const [orderData, setOrderData] = useState({
    clientId: "",
    branch: "",
    orderDate: new Date().toISOString().split('T')[0],
    dueDate: "",
    orderType: "Retail",
    advance: "0",
    remarks: "",
    items: [] as OrderItem[],
  });

  useEffect(() => {
    const fetchClients = async () => {
      try {
        const data = await api.get('/clients');
        const externalClients = (data.clients || []).filter((c: any) => c.name !== 'INTERNAL_STOCK');
        setClients(externalClients);
      } catch (error) {
        toast.error("Failed to load clients");
      }
    };
    fetchClients();
  }, []);

  // Unique Organizations for Dropdown
  const uniqueOrgs = Array.from(new Set(clients.map(c => c.org_name))).map(orgName => {
    return clients.find(c => c.org_name === orgName);
  });

  // Handle Organization Selection
  const handleOrgChange = (orgName: string) => {
    setSelectedOrg(orgName);

    // Filter clients (branches) for this organization
    const branches = clients.filter(c => c.org_name === orgName);
    setAvailableBranches(branches);

    // If only one branch, auto-select it
    if (branches.length === 1) {
      setOrderData(prev => ({
        ...prev,
        clientId: branches[0].id.toString(),
        branch: branches[0].branch || "Main"
      }));
    } else {
      // Reset selection if multiple
      setOrderData(prev => ({ ...prev, clientId: "", branch: "" }));
    }
  };

  // Handle Branch Selection
  const handleBranchChange = (clientId: string) => {
    const selectedClient = clients.find(c => c.id.toString() === clientId);
    if (selectedClient) {
      setOrderData(prev => ({
        ...prev,
        clientId: clientId,
        branch: selectedClient.branch || "Main"
      }));
    }
  };

  useEffect(() => {
    if (orderData.clientId) {
      const fetchProducts = async () => {
        setLoading(true);
        try {
          const data = await api.get(`/clients/${orderData.clientId}/products`);
          setAvailableProducts(data.products || []);
        } catch (error) {
          toast.error("Failed to load products for this client");
        } finally {
          setLoading(false);
        }
      };
      fetchProducts();
    } else {
      setAvailableProducts([]);
    }
  }, [orderData.clientId]);

  const addItem = () => {
    const newItem: OrderItem = {
      id: Date.now().toString(),
      productId: "",
      productName: "",
      sizeList: [], // Start with empty list
      customization: "",
      remarks: "",
    };
    setOrderData({ ...orderData, items: [...orderData.items, newItem] });
  };

  const removeItem = (id: string) => {
    setOrderData({
      ...orderData,
      items: orderData.items.filter((item) => item.id !== id),
    });
  };

  const updateItem = (id: string, updates: Partial<OrderItem>) => {
    setOrderData(prev => ({
      ...prev,
      items: prev.items.map((item) =>
        item.id === id ? { ...item, ...updates } : item
      ),
    }));
  };

  const handleSubmit = async () => {
    if (!orderData.clientId || orderData.items.length === 0) {
      toast.error("Please fill client and at least one item");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        org_id: parseInt(orderData.clientId),
        branch: orderData.branch,
        date: orderData.orderDate,
        order_type: orderData.orderType,
        advance: parseFloat(orderData.advance),
        eta: orderData.dueDate,
        remarks: orderData.remarks,
        items: orderData.items.map(item => {
          // Convert sizeList to sq object
          const sq = item.sizeList.reduce((acc, s) => {
            if (s.size.trim()) {
              acc[s.size.trim()] = s.qty;
            }
            return acc;
          }, {} as Record<string, number>);

          return {
            org_dress_id: parseInt(item.productId),
            sq: sq,
            customization: item.customization,
            remarks: item.remarks
          };
        })
      };

      await api.post('/orders', payload);
      toast.success("Order created successfully!");
      if (onSuccess) onSuccess();
      // Reset form or redirect
      setCurrentStep(0);
      setOrderData({
        clientId: "",
        branch: "",
        orderDate: new Date().toISOString().split('T')[0],
        dueDate: "",
        orderType: "Retail",
        advance: "0",
        remarks: "",
        items: [],
      });
    } catch (error: any) {
      toast.error(error.message || "Failed to create order");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex-1 overflow-auto bg-background">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-8 py-6">
        <h1 className="text-3xl font-bold text-gray-900">Create New Order</h1>
        <p className="text-sm text-gray-600 mt-1">Fill in the details to create a new order</p>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto p-8">
        {/* Step Indicators */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => (
              <div key={index} className="flex items-center flex-1">
                <div className="flex flex-col items-center flex-1">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all ${index < currentStep
                      ? "bg-green-500 text-white"
                      : index === currentStep
                        ? "bg-[#e94560] text-white shadow-lg"
                        : "bg-gray-200 text-gray-500"
                      }`}
                  >
                    {index < currentStep ? <Check className="w-5 h-5" /> : index + 1}
                  </div>
                  <span className="text-xs mt-2 font-medium text-gray-700">{step}</span>
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={`h-0.5 flex-1 mx-2 transition-all ${index < currentStep ? "bg-green-500" : "bg-gray-200"
                      }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8">
          {/* Step 1: Basic Info */}
          {currentStep === 0 && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="org">Select Organization</Label>
                  <Select
                    value={selectedOrg}
                    onValueChange={handleOrgChange}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Organization" />
                    </SelectTrigger>
                    <SelectContent>
                      {uniqueOrgs.map(c => (
                        <SelectItem key={c.id} value={c.org_name}>{c.org_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="branch">Select Branch / Location</Label>
                  <Select
                    value={orderData.clientId}
                    onValueChange={handleBranchChange}
                    disabled={!selectedOrg}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={!selectedOrg ? "Select Organization First" : "Select Branch"} />
                    </SelectTrigger>
                    <SelectContent>
                      {availableBranches.map(c => (
                        <SelectItem key={c.id} value={c.id.toString()}>
                          {c.branch ? c.branch : "Head Office / Main"} <span className="text-xs text-gray-400">({c.name})</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="orderDate">Order Date</Label>
                  <Input
                    id="orderDate"
                    type="date"
                    value={orderData.orderDate}
                    onChange={(e) => setOrderData({ ...orderData, orderDate: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dueDate">Due Date (ETA)</Label>
                  <Input
                    id="dueDate"
                    type="date"
                    value={orderData.dueDate}
                    onChange={(e) => setOrderData({ ...orderData, dueDate: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="orderType">Order Type</Label>
                  <Select
                    value={orderData.orderType}
                    onValueChange={(value) => setOrderData({ ...orderData, orderType: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Retail">Retail</SelectItem>
                      <SelectItem value="Wholesale">Wholesale</SelectItem>
                      <SelectItem value="Urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="advance">Advance Payment (₹)</Label>
                  <Input
                    id="advance"
                    type="number"
                    value={orderData.advance}
                    onChange={(e) => setOrderData({ ...orderData, advance: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="remarks">General Remarks</Label>
                <Textarea
                  id="remarks"
                  placeholder="Additional delivery instructions..."
                  value={orderData.remarks}
                  onChange={(e) => setOrderData({ ...orderData, remarks: e.target.value })}
                />
              </div>
            </div>
          )}

          {/* Step 2: Items & Sizes */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-gray-900">Order Items</h3>
                <Button onClick={addItem} className="bg-[#e94560] hover:bg-[#d13a52]">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Item
                </Button>
              </div>

              {orderData.items.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
                  <p className="text-gray-500">No items added yet. Click "Add Item" to get started.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {orderData.items.map((item, index) => (
                    <div key={item.id} className="p-6 border border-gray-200 rounded-lg">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="font-bold text-gray-900">Item {index + 1}</h4>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeItem(item.id)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div className="space-y-2">
                          <Label>Product Configuration</Label>
                          {loading ? (
                            <div className="flex items-center text-sm text-gray-500"><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading products...</div>
                          ) : (
                            <Select
                              value={item.productId}
                              onValueChange={(value) => {
                                const prod = availableProducts.find(p => p.id.toString() === value);
                                updateItem(item.id, {
                                  productId: value,
                                  productName: prod ? `${prod.org_dress_name} (${prod.item_name})` : ""
                                });
                              }}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select product" />
                              </SelectTrigger>
                              <SelectContent>
                                {availableProducts.map(p => (
                                  <SelectItem key={p.id} value={p.id.toString()}>{p.org_dress_name} ({p.item_name} - {p.color_name})</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        </div>
                        <div className="space-y-2">
                          <Label>Customization (e.g. Logo)</Label>
                          <Input
                            placeholder="Add customization details"
                            value={item.customization}
                            onChange={(e) => updateItem(item.id, { customization: e.target.value })}
                          />
                        </div>
                      </div>

                      <div className="bg-slate-50/50 rounded-2xl border border-slate-100 p-6">
                        <div className="flex items-center justify-between mb-6">
                          <h5 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Sizing & Quantity Matrix</h5>
                        </div>

                        <div className="overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-slate-200">
                          <div className="flex gap-3 min-w-max">
                            {/* Static Row Labels */}
                            <div className="flex flex-col gap-3 pr-4 border-r border-slate-200">
                              <div className="h-10 flex items-center justify-end">
                                <span className="text-xl font-black text-slate-400 italic">S</span>
                              </div>
                              <div className="h-12 flex items-center justify-end gap-1 relative group/bulk">
                                <div className="flex flex-col -gap-1 opacity-0 group-hover/bulk:opacity-100 transition-all">
                                  <button
                                    onClick={() => {
                                      const newSizeList = item.sizeList.map(s => ({ ...s, qty: (s.qty || 0) + 1 }));
                                      updateItem(item.id, { sizeList: newSizeList });
                                    }}
                                    className="p-0.5 hover:bg-rose-50 rounded text-rose-400 transition-all"
                                    title="Increase all by 1"
                                  >
                                    <ArrowUp className="w-2.5 h-2.5" />
                                  </button>
                                  <button
                                    onClick={() => {
                                      const newSizeList = item.sizeList.map(s => ({ ...s, qty: Math.max(0, (s.qty || 0) - 1) }));
                                      updateItem(item.id, { sizeList: newSizeList });
                                    }}
                                    className="p-0.5 hover:bg-rose-50 rounded text-rose-400 transition-all"
                                    title="Decrease all by 1"
                                  >
                                    <ArrowDown className="w-2.5 h-2.5" />
                                  </button>
                                </div>
                                <span className="text-xl font-black text-slate-400 italic">Q</span>
                              </div>
                            </div>

                            {/* Dynamic Size Columns */}
                            {item.sizeList.map((sizeItem) => (
                              <div key={sizeItem.id} className="flex flex-col gap-3 group relative">
                                {/* Size Name Entry */}
                                <div className="relative">
                                  <Input
                                    value={sizeItem.size}
                                    placeholder="SIZE"
                                    className="h-10 w-24 text-center font-black uppercase text-[11px] bg-white border-slate-200 rounded-lg focus:border-rose-300 focus:ring-rose-500/10"
                                    onChange={(e) => {
                                      const newName = e.target.value.toUpperCase();
                                      const newSizeList = item.sizeList.map(s => s.id === sizeItem.id ? { ...s, size: newName } : s);
                                      updateItem(item.id, { sizeList: newSizeList });
                                    }}
                                  />
                                  <button
                                    className="absolute -top-2 -right-2 w-5 h-5 bg-white border border-rose-100 rounded-full flex items-center justify-center text-rose-400 hover:text-rose-600 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity z-10"
                                    onClick={() => {
                                      const newSizeList = item.sizeList.filter(s => s.id !== sizeItem.id);
                                      updateItem(item.id, { sizeList: newSizeList });
                                    }}
                                  >
                                    <Trash2 className="w-2.5 h-2.5" />
                                  </button>
                                </div>

                                {/* Quantity Entry */}
                                <Input
                                  type="text"
                                  inputMode="numeric"
                                  value={sizeItem.qty === 0 ? '' : sizeItem.qty}
                                  placeholder="0"
                                  className="h-12 w-24 text-center font-black text-lg bg-white border-slate-200 rounded-lg focus:border-green-300 focus:ring-green-500/10"
                                  onChange={(e) => {
                                    const rawValue = e.target.value.replace(/^0+/, ''); // Remove leading zeros
                                    const val = parseInt(rawValue) || 0;
                                    const newSizeList = item.sizeList.map(s => s.id === sizeItem.id ? { ...s, qty: val } : s);
                                    updateItem(item.id, { sizeList: newSizeList });
                                  }}
                                />
                              </div>
                            ))}

                            {/* Inline Add Button Box */}
                            <button
                              onClick={() => {
                                const newSizeList = [
                                  ...item.sizeList,
                                  { id: Date.now().toString() + Math.random(), size: "", qty: 0 }
                                ];
                                updateItem(item.id, { sizeList: newSizeList });
                              }}
                              className="w-24 h-[100px] border-2 border-dashed border-slate-200 rounded-xl flex items-center justify-center hover:bg-white hover:border-rose-200 transition-all group shrink-0"
                            >
                              <Plus className="w-6 h-6 text-slate-300 group-hover:text-rose-400 group-hover:scale-110 transition-transform" />
                            </button>

                            {/* Empty State Instructions */}
                            {item.sizeList.length === 0 && (
                              <div className="flex items-center px-4">
                                <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Click plus to add sizes</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {item.sizeList.length > 0 && (
                          <div className="mt-4 flex items-center justify-end gap-2 text-slate-400">
                            <span className="text-[10px] font-black uppercase">Cumulative Total:</span>
                            <span className="text-xl font-black text-slate-900 tracking-tighter">
                              {item.sizeList.reduce((a, b) => a + (b.qty || 0), 0)}
                            </span>
                            <span className="text-[10px] font-black text-slate-400 uppercase">Pieces</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Step 3: Review */}
          {currentStep === 2 && (
            <div className="space-y-6 font-primary">
              <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                <h3 className="font-bold text-gray-900 mb-4 text-lg">Order Confirmation</h3>
                <dl className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-8">
                  <div>
                    <dt className="text-xs font-bold text-gray-500 uppercase tracking-wider">Client</dt>
                    <dd className="text-base font-medium text-gray-900">{clients.find(c => c.id.toString() === orderData.clientId)?.org_name || "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-bold text-gray-500 uppercase tracking-wider">Branch</dt>
                    <dd className="text-base font-medium text-gray-900">{orderData.branch || "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-bold text-gray-500 uppercase tracking-wider">Order Date</dt>
                    <dd className="text-base font-medium text-gray-900">{orderData.orderDate}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-bold text-gray-500 uppercase tracking-wider">Due Date</dt>
                    <dd className="text-base font-medium text-gray-900 font-mono">{orderData.dueDate || "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-bold text-gray-500 uppercase tracking-wider">Type / Advance</dt>
                    <dd className="text-base font-medium text-gray-900">{orderData.orderType} / ₹{orderData.advance}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-bold text-gray-500 uppercase tracking-wider">Total Items</dt>
                    <dd className="text-base font-medium text-gray-900">{orderData.items.length} Product(s)</dd>
                  </div>
                </dl>
              </div>

              {orderData.items.length > 0 && (
                <div>
                  <h3 className="font-bold text-gray-900 mb-4">Line Items</h3>
                  <div className="space-y-3">
                    {orderData.items.map((item, index) => (
                      <div key={item.id} className="p-4 border border-gray-100 rounded-lg bg-gray-50/50">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-gray-900">
                            {index + 1}. {item.productName || "Product #" + item.productId}
                          </span>
                          <span className="text-sm font-bold text-primary">
                            Qty: {item.sizeList.reduce((a, b) => a + (b.qty || 0), 0)}
                          </span>
                        </div>
                        {item.customization && (
                          <p className="text-xs text-gray-500 mt-1 italic">Note: {item.customization}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-200">
            <Button
              variant="outline"
              onClick={() => {
                if (currentStep === 0) {
                  if (onCancel) onCancel();
                } else {
                  setCurrentStep(Math.max(0, currentStep - 1));
                }
              }}
              disabled={isSubmitting}
            >
              {currentStep === 0 ? "Cancel" : "Back"}
            </Button>

            <div className="flex gap-3">
              {currentStep < steps.length - 1 ? (
                <Button
                  onClick={() => setCurrentStep(Math.min(steps.length - 1, currentStep + 1))}
                  className="bg-[#e94560] hover:bg-[#d13a52]"
                >
                  Next
                </Button>
              ) : (
                <Button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="bg-green-600 hover:bg-green-700 min-w-32"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4 mr-2" />
                  )}
                  {isSubmitting ? "Finalizing..." : "Create Order"}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div >
  );
}
