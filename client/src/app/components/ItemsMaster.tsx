import { useState, useEffect } from "react";
import { Plus, Edit, Trash2, Search, Loader2, Shirt, Scissors, Ruler, Layers } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import { api } from "../../services/api";
import toast from "react-hot-toast";
import { Modal } from "./ui/modal";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";

interface MasterItem {
  id: number;
  name: string;
  item_type: string;
  gender: string;
  symbol: string | null;
}

export function ItemsMaster() {
  const [items, setItems] = useState<MasterItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Add Item Modal state
  const [isAddItemModalOpen, setIsAddItemModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [itemForm, setItemForm] = useState({
    name: "",
    symbol: "",
    item_type: "tailor_made",
    gender: "U"
  });

  // Edit/Delete state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MasterItem | null>(null);
  const [editForm, setEditForm] = useState({
    name: "",
    symbol: "",
    item_type: "",
    gender: ""
  });

  const handleAddItem = async () => {
    if (!itemForm.name || !itemForm.symbol) {
      return toast.error("Please fill all required fields");
    }
    if (itemForm.symbol.length < 3 || itemForm.symbol.length > 5) {
      return toast.error("Symbol must be between 3 and 5 characters");
    }

    setIsSubmitting(true);
    try {
      await api.post('/items', itemForm);
      toast.success("New model registered in catalog!");
      setIsAddItemModalOpen(false);
      setItemForm({ name: "", symbol: "", item_type: "tailor_made", gender: "U" });
      fetchData();
    } catch (error: any) {
      toast.error(error.message || "Failed to add item");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditItem = async () => {
    if (!editingItem) return;
    setIsSubmitting(true);
    try {
      await api.put(`/items/${editingItem.id}`, editForm);
      toast.success("Item updated successfully");
      setIsEditModalOpen(false);
      fetchData();
    } catch (error: any) {
      toast.error(error.message || "Failed to update item");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteItem = async (id: number) => {
    if (!confirm("Are you sure you want to remove this item from catalog?")) return;
    try {
      await api.delete(`/items/${id}`);
      toast.success("Item removed from catalog");
      fetchData();
    } catch (error: any) {
      toast.error(error.message || "Failed to delete item");
    }
  };

  const fetchData = async () => {
    try {
      const res = await api.get('/items');
      setItems(res.items || []);
    } catch (error) {
      toast.error("Failed to load catalog");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredItems = items.filter(i =>
    i.name.toLowerCase().includes(search.toLowerCase()) ||
    i.item_type.toLowerCase().includes(search.toLowerCase())
  );



  return (
    <div className="flex-1 overflow-auto bg-[#f8fafc]">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-8 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black text-gray-900 italic tracking-tighter">Master Catalog</h1>
            <p className="text-sm font-bold text-gray-400 mt-1 uppercase tracking-widest">Global Product Registry & Base Configurations</p>
          </div>
          <Button
            className="bg-[#e94560] hover:bg-[#d13a52] font-black uppercase text-xs tracking-widest px-6 h-11 rounded-xl shadow-lg shadow-rose-100"
            onClick={() => setIsAddItemModalOpen(true)}
          >
            <Plus className="w-4 h-4 mr-2" />
            Build New Model
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="p-8 max-w-7xl mx-auto space-y-8">
        {/* Stats Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Shirt className="w-7 h-7" />
            </div>
            <div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Active Models</p>
              <h2 className="text-2xl font-black text-gray-900">{items.length}</h2>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center">
              <Layers className="w-7 h-7" />
            </div>
            <div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Variant Categories</p>
              <h2 className="text-2xl font-black text-gray-900">{new Set(items.map(i => i.item_type)).size} Styles</h2>
            </div>
          </div>
        </div>

        {/* Search & Browser */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-50 bg-gray-50/20">
            <div className="relative">
              <Search className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
              <Input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Filter by name, type, or gender..."
                className="pl-12 h-14 border-none bg-white shadow-sm rounded-xl font-bold text-gray-700"
              />
            </div>
          </div>

          {loading ? (
            <div className="py-40 text-center opacity-30">
              <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4" />
              <p className="text-xs font-black uppercase tracking-widest">Streaming Catalog Data...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
              {filteredItems.map(item => (
                <div key={item.id} className="group bg-white rounded-2xl border border-gray-100 p-6 hover:shadow-xl hover:scale-[1.02] transition-all relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="flex gap-2">
                      <Button
                        variant="secondary"
                        size="icon"
                        className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 border-none shadow-none"
                        onClick={() => {
                          setEditingItem(item);
                          setEditForm({
                            name: item.name,
                            symbol: item.symbol || "",
                            item_type: item.item_type,
                            gender: item.gender
                          });
                          setIsEditModalOpen(true);
                        }}
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="secondary"
                        size="icon"
                        className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 border-none shadow-none"
                        onClick={() => handleDeleteItem(item.id)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-16 h-16 rounded-2xl bg-[#1a1a2e] flex items-center justify-center text-3xl shadow-lg">
                      {item.symbol || '👕'}
                    </div>
                    <div>
                      <Badge className="bg-indigo-50 text-indigo-600 border-none font-black text-[9px] mb-1 uppercase tracking-tighter">{item.item_type}</Badge>
                      <h3 className="font-black text-gray-900 group-hover:text-indigo-600 transition-colors">{item.name}</h3>
                    </div>
                  </div>

                  <div className="space-y-3 pt-4 border-t border-gray-50">
                    <div className="flex justify-between items-center px-1">
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Gender Tag</span>
                      <Badge variant="outline" className="text-[10px] font-bold border-gray-100 text-gray-500 uppercase">{item.gender}</Badge>
                    </div>
                  </div>
                </div>
              ))}
              {filteredItems.length === 0 && (
                <div className="col-span-full py-20 text-center text-xs font-black text-gray-300 uppercase italic tracking-widest">No models match your search</div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Add Item Modal */}
      <Modal
        isOpen={isAddItemModalOpen}
        onClose={() => setIsAddItemModalOpen(false)}
        title="Register New Catalog Model"
        size="md"
      >
        <div className="space-y-6">
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Product Name</Label>
            <Input
              value={itemForm.name}
              onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })}
              placeholder="e.g. Classic Cotton Shirt"
              className="h-12 border-gray-100 bg-gray-50/50 rounded-xl font-bold"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Model Symbol (Unique Code)</Label>
              <Input
                value={itemForm.symbol}
                onChange={(e) => setItemForm({ ...itemForm, symbol: e.target.value.toUpperCase() })}
                placeholder="ABC-1"
                maxLength={5}
                className="h-12 border-gray-100 bg-gray-50/50 rounded-xl font-mono font-bold"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Gender Target</Label>
              <Select defaultValue="U" onValueChange={(val) => setItemForm({ ...itemForm, gender: val })}>
                <SelectTrigger className="h-12 border-gray-100 bg-gray-50/50 rounded-xl font-bold">
                  <SelectValue placeholder="Select gender" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="M">Male (M)</SelectItem>
                  <SelectItem value="F">Female (F)</SelectItem>
                  <SelectItem value="U">Unisex (U)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Production Type</Label>
            <Select defaultValue="tailor_made" onValueChange={(val) => setItemForm({ ...itemForm, item_type: val })}>
              <SelectTrigger className="h-12 border-gray-100 bg-gray-50/50 rounded-xl font-bold">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="tailor_made">Tailor Made (Custom)</SelectItem>
                <SelectItem value="ready_made">Ready Made (Bulk)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between pt-6 border-t border-gray-100">
            <p className="text-[10px] text-gray-400 italic">This will create a base entry in the master price list.</p>
            <div className="flex gap-3">
              <Button variant="ghost" className="font-bold text-xs" onClick={() => setIsAddItemModalOpen(false)}>Cancel</Button>
              <Button
                className="bg-indigo-600 hover:bg-indigo-700 text-xs font-bold px-8 shadow-lg shadow-indigo-100"
                onClick={handleAddItem}
                disabled={isSubmitting}
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Finalize Registry"}
              </Button>
            </div>
          </div>
        </div>
      </Modal>

      {/* Edit Item Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Catalog Model"
        size="md"
      >
        <div className="space-y-6">
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Product Name</Label>
            <Input
              value={editForm.name}
              onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              placeholder="e.g. Classic Cotton Shirt"
              className="h-12 border-gray-100 bg-gray-50/50 rounded-xl font-bold"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Model Symbol</Label>
              <Input
                value={editForm.symbol}
                onChange={(e) => setEditForm({ ...editForm, symbol: e.target.value.toUpperCase() })}
                placeholder="ABC-1"
                maxLength={5}
                className="h-12 border-gray-100 bg-gray-50/50 rounded-xl font-mono font-bold"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Gender Target</Label>
              <Select value={editForm.gender} onValueChange={(val) => setEditForm({ ...editForm, gender: val })}>
                <SelectTrigger className="h-12 border-gray-100 bg-gray-50/50 rounded-xl font-bold">
                  <SelectValue placeholder="Select gender" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="M">Male (M)</SelectItem>
                  <SelectItem value="F">Female (F)</SelectItem>
                  <SelectItem value="U">Unisex (U)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Production Type</Label>
            <Select value={editForm.item_type} onValueChange={(val) => setEditForm({ ...editForm, item_type: val })}>
              <SelectTrigger className="h-12 border-gray-100 bg-gray-50/50 rounded-xl font-bold">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="tailor_made">Tailor Made (Custom)</SelectItem>
                <SelectItem value="ready_made">Ready Made (Bulk)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between pt-6 border-t border-gray-100">
            <div className="flex gap-3 ml-auto">
              <Button variant="ghost" className="font-bold text-xs" onClick={() => setIsEditModalOpen(false)}>Cancel</Button>
              <Button
                className="bg-indigo-600 hover:bg-indigo-700 text-xs font-bold px-8 shadow-lg shadow-indigo-100"
                onClick={handleEditItem}
                disabled={isSubmitting}
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Update Model"}
              </Button>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}

