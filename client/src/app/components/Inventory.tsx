import { Search, Plus, Edit, Trash2, AlertCircle, Loader2, Package, Layers, Scissors, ArrowUp, ArrowDown, Filter, ChevronDown, Check, ChevronsUpDown, X, CheckCircle2, Eye } from "lucide-react";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandDialog } from "./ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover"; // Keeping for other popovers (filters)
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import { useState, useEffect, useMemo, memo } from "react";
import { api } from "../../services/api";
import toast from "react-hot-toast";
import { Modal } from "./ui/modal";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { cn } from "./ui/utils.tsx";

import { StockHistoryModal } from "./StockHistoryModal";

interface FabricItem {
  id: number;
  cloth_type: string;
  color_name: string;
  design_name: string;
  quality_name: string;
  total_quantity: number;
  roll_count: number;
  status: "in" | "low" | "out";
  updated_on: string;
}

interface SellingStockItem {
  org_dress_id: number;
  org_dress_name: string;
  org_name: string;
  size: string;
  price: number;
  brand: string;
  remarks: string;
  available_qty: number;
}

const FabricRow = memo(({ f, onCutting, onEdit }: { f: FabricItem; onCutting: (f: FabricItem) => void; onEdit: (f: FabricItem) => void }) => {
  return (
    <tr className="hover:bg-gray-50/50 transition-colors group" style={{ contentVisibility: 'auto', containIntrinsicSize: 'auto 80px' }}>
      <td className="px-8 py-5">
        <div>
          <p className="font-bold text-gray-900 text-sm">{f.cloth_type} • {f.quality_name}</p>
          <p className="text-xs text-gray-500 mt-0.5">{f.color_name} / {f.design_name}</p>
        </div>
      </td>
      <td className="px-8 py-5">
        <div className="flex items-center gap-2">
          <p className="text-lg font-black text-gray-900 font-mono">{Math.round(f.total_quantity)}</p>
          <span className="text-[10px] font-black text-gray-400">METERS</span>
        </div>
      </td>
      <td className="px-8 py-5">
        <Badge variant="outline" className="border-gray-200 text-gray-500 font-bold">{f.roll_count} Rolls</Badge>
      </td>
      <td className="px-8 py-5">
        <Badge
          className={`font-black uppercase tracking-tighter text-[10px] ${f.status === 'in' ? 'bg-green-50 text-green-600' :
            f.status === 'low' ? 'bg-yellow-50 text-yellow-600' : 'bg-red-50 text-red-600'
            }`}
        >
          {f.status === 'in' ? 'Available' : f.status === 'low' ? 'Low Stock' : 'Out of Stock'}
        </Badge>
      </td>
      <td className="px-8 py-5">
        <div className="flex gap-2">
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 hover:bg-indigo-50 text-indigo-400 hover:text-indigo-600 transition-colors"
            onClick={() => onCutting(f)}
          >
            <Scissors className="w-4 h-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 hover:bg-gray-100 text-gray-400 hover:text-indigo-600 transition-colors"
            onClick={() => onEdit(f)}
          >
            <Edit className="w-4 h-4" />
          </Button>
        </div>
      </td>
    </tr>
  );
});

const FinishedStockRow = memo(({ s, onHistory }: { s: SellingStockItem; onHistory: (s: SellingStockItem) => void }) => {
  return (
    <tr className="hover:bg-gray-50/50 transition-colors group" style={{ contentVisibility: 'auto', containIntrinsicSize: 'auto 80px' }}>
      <td className="px-8 py-5">
        <p className="font-bold text-gray-900 text-sm">{s.org_dress_name}</p>
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">SKU#{s.org_dress_id}</p>
        {s.brand && <p className="text-[10px] font-black text-indigo-500 mt-1 uppercase tracking-widest">{s.brand}</p>}
        {s.remarks && s.remarks !== 'Produced' && (
          <p className="text-[10px] text-gray-400 mt-0.5 italic">"{s.remarks}"</p>
        )}
      </td>
      <td className="px-8 py-5 text-xs font-bold text-gray-600">{s.org_name}</td>
      <td className="px-8 py-5">
        <Badge variant="outline" className="text-indigo-600 border-indigo-100 bg-indigo-50/50 font-black">{s.size}</Badge>
      </td>
      <td className="px-8 py-5">
        <div className="flex items-center gap-2">
          <span className="text-lg font-black text-gray-900">{Math.round(s.available_qty)}</span>
          <span className="text-[9px] font-black text-gray-400 uppercase">PCS</span>
        </div>
      </td>
      <td className="px-8 py-5 text-sm font-black text-indigo-600">₹{Math.round(s.price)}</td>
      <td className="px-8 py-5">
        <Button
          size="icon"
          variant="ghost"
          className="h-8 w-8 text-indigo-400 hover:text-indigo-600 hover:bg-indigo-50"
          onClick={() => onHistory(s)}
        >
          <Eye className="w-4 h-4" />
        </Button>
      </td>
    </tr>
  );
});

export function Inventory() {
  const [view, setView] = useState<"fabric" | "finished">("fabric");
  const [fabrics, setFabrics] = useState<FabricItem[]>([]);
  const [finishedStock, setFinishedStock] = useState<SellingStockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Column Filters
  const [clothTypeFilter, setClothTypeFilter] = useState<string | null>(null);
  const [qualityFilter, setQualityFilter] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);

  // Popover Open States
  const [isSpecsFilterOpen, setIsSpecsFilterOpen] = useState(false);
  const [isStatusFilterOpen, setIsStatusFilterOpen] = useState(false);

  // Add Fabric Modal state
  const [isAddFabricModalOpen, setIsAddFabricModalOpen] = useState(false);
  const [isEditFabricModalOpen, setIsEditFabricModalOpen] = useState(false);
  const [editingFabric, setEditingFabric] = useState<FabricItem | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [fabricEditForm, setFabricEditForm] = useState({
    clothType: "",
    colorName: "",
    designName: "",
    qualityName: "",
    rolls: [] as number[]
  });

  const [metadata, setMetadata] = useState<{
    clothTypes: any[];
    colors: any[];
    designs: any[];
    qualities: any[];
    dresses: any[];
    cutters: any[];
  }>({ clothTypes: [], colors: [], designs: [], qualities: [], dresses: [], cutters: [] });


  const [isCuttingModalOpen, setIsCuttingModalOpen] = useState(false);
  const [openCombobox, setOpenCombobox] = useState(false);
  const [selectedFabricForCutting, setSelectedFabricForCutting] = useState<FabricItem | null>(null);
  const [localSizes, setLocalSizes] = useState<{ id: string; size: string; qty: number }[]>([]);
  const [cuttingForm, setCuttingForm] = useState({
    org_dress_id: "",
    emp_id: "",
    pattern_series: "",
    sq: {} as { [key: string]: number },
  });

  const [fabricForm, setFabricForm] = useState({
    clothType: "",
    colorName: "",
    designName: "",
    qualityName: "",
    rolls: [] as number[]
  });
  const [rollQuickEntry, setRollQuickEntry] = useState("");

  // Stock History State
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [selectedStockForHistory, setSelectedStockForHistory] = useState<SellingStockItem | null>(null);

  const handleOpenHistory = (item: SellingStockItem) => {
    setSelectedStockForHistory(item);
    setIsHistoryModalOpen(true);
  };

  const fetchMetadata = async () => {
    try {
      const [ct, c, d, q, dresses, emps] = await Promise.all([
        api.get('/fabric/cloth-types'),
        api.get('/fabric/colors'),
        api.get('/fabric/designs'),
        api.get('/fabric/qualities'),
        api.get('/clients/all-products'), // Correct endpoint for all products
        api.get('/employees') // Correct endpoint for employees
      ]);

      // Show internal employees (tailors/cutters) and exclude Fabricators for cutting
      const employeesList = (emps.success ? emps.employees : []).filter(
        (e: any) => e.role_name?.toLowerCase() !== 'fabricator'
      );

      setMetadata({
        clothTypes: ct,
        colors: c,
        designs: d,
        qualities: q,
        dresses: dresses.success ? dresses.products : [],
        cutters: employeesList
      });
    } catch (error) {
      console.error("Failed to fetch metadata", error);
    }
  };

  const handleAddFabric = async () => {
    if (!fabricForm.clothType || !fabricForm.colorName || !fabricForm.designName || !fabricForm.qualityName) {
      return toast.error("Please fill all required fields");
    }
    if (fabricForm.rolls.length === 0) {
      return toast.error("Please add at least one roll");
    }

    setIsSubmitting(true);
    try {
      await api.post('/fabric', {
        ...fabricForm,
        rolls: fabricForm.rolls.map(r => Math.round(Number(r)))
      });
      toast.success("Fabric and rolls added successfully!");
      setIsAddFabricModalOpen(false);
      setFabricForm({ clothType: "", colorName: "", designName: "", qualityName: "", rolls: [] });
      fetchData();
    } catch (error: any) {
      toast.error(error.message || "Failed to add fabric");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickAddRolls = () => {
    if (!rollQuickEntry.trim()) return;

    // Parse comma separated values
    const newRolls = rollQuickEntry
      .split(',')
      .map(v => parseInt(v.trim()))
      .filter(v => !isNaN(v) && v > 0);

    if (newRolls.length === 0) {
      toast.error("No valid roll lengths found. Use commas like: 30,50,60");
      return;
    }

    setFabricForm(prev => ({
      ...prev,
      rolls: [...prev.rolls, ...newRolls]
    }));
    setRollQuickEntry("");
    toast.success(`Added ${newRolls.length} rolls`);
  };

  const handleEditFabric = async () => {
    if (!editingFabric) return;
    setIsSubmitting(true);
    try {
      await api.put(`/fabric/${editingFabric.id}`, fabricEditForm);
      toast.success("Fabric details updated");
      setIsEditFabricModalOpen(false);
      fetchData();
    } catch (error: any) {
      toast.error(error.message || "Failed to update fabric");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickAddRollsInEdit = () => {
    if (!rollQuickEntry.trim()) return;

    const newRolls = rollQuickEntry
      .split(',')
      .map(v => parseInt(v.trim()))
      .filter(v => !isNaN(v) && v > 0);

    if (newRolls.length === 0) {
      toast.error("No valid roll lengths found. Use commas like: 30,50,60");
      return;
    }

    setFabricEditForm(prev => ({
      ...prev,
      rolls: [...prev.rolls, ...newRolls]
    }));
    setRollQuickEntry("");
    toast.success(`Added ${newRolls.length} rolls to edit list`);
  };

  const handleOpenEditModal = async (f: FabricItem) => {
    setEditingFabric(f);
    setFabricEditForm({
      clothType: f.cloth_type,
      colorName: f.color_name,
      designName: f.design_name,
      qualityName: f.quality_name,
      rolls: []
    });
    setIsEditFabricModalOpen(true);

    // Fetch actual rolls
    try {
      const data = await api.get(`/fabric/${f.id}`);
      if (data.success && data.rolls) {
        setFabricEditForm(prev => ({
          ...prev,
          rolls: data.rolls.map((r: any) => Math.round(Number(r.roll_length)))
        }));
      }
    } catch (error) {
      console.error("Failed to fetch rolls for editing", error);
    }
  };

  const handleOpenCuttingModal = (f: FabricItem) => {
    setSelectedFabricForCutting(f);
    setCuttingForm({
      org_dress_id: "",
      emp_id: "",
      pattern_series: "",
      sq: {},
    });
    setLocalSizes([]);
    setIsCuttingModalOpen(true);
  };

  const handleStartCuttingStock = async () => {
    if (!cuttingForm.org_dress_id || !cuttingForm.emp_id) {
      return toast.error("Please select both product and cutter");
    }

    setIsSubmitting(true);
    try {

      // Convert localSizes to sq object
      const sqPayload = localSizes.reduce((acc, item) => {
        if (item.size.trim()) {
          acc[item.size.trim()] = item.qty;
        }
        return acc;
      }, {} as Record<string, number>);

      if (Object.keys(sqPayload).length === 0) {
        toast.error("Please add at least one production size");
        setIsSubmitting(false);
        return;
      }

      // POST to /cutting (Order-less via backend workaround)
      await api.post('/cutting', {
        ...cuttingForm,
        sq: sqPayload,
        remarks: selectedFabricForCutting
          ? `Planned Fabric ID: ${selectedFabricForCutting.id} | ${selectedFabricForCutting.cloth_type} ${selectedFabricForCutting.color_name} ${selectedFabricForCutting.design_name}`
          : ""
      });
      toast.success("Cutting job started for stock");
      setIsCuttingModalOpen(false);
      fetchData();
    } catch (error: any) {
      toast.error(error.message || "Failed to start cutting job");
    } finally {
      setIsSubmitting(false);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      if (view === "fabric") {
        const data = await api.get('/fabric');
        setFabrics(data.fabrics || []);
      } else {
        const data = await api.get('/sales/stock');
        setFinishedStock(data.stock || []);
      }
    } catch (error) {
      toast.error("Failed to load inventory data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    if (view === "fabric") fetchMetadata();
  }, [view]);

  // Filtering
  // Filtering
  const uniqueClothTypes = Array.from(new Set(fabrics.map(f => f.cloth_type))).filter(Boolean).sort();
  const uniqueQualities = Array.from(new Set(fabrics.map(f => f.quality_name))).filter(Boolean).sort();
  const uniqueStatuses = ["in", "low", "out"];

  const filteredFabrics = useMemo(() => fabrics.filter(f => {
    const matchesSearch =
      f.cloth_type.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.color_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.design_name.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesClothType = clothTypeFilter ? f.cloth_type === clothTypeFilter : true;
    const matchesQuality = qualityFilter ? f.quality_name === qualityFilter : true;
    const matchesStatus = statusFilter ? f.status === statusFilter : true;

    return matchesSearch && matchesClothType && matchesQuality && matchesStatus;
  }), [fabrics, searchQuery, clothTypeFilter, qualityFilter, statusFilter]);

  const filteredFinished = useMemo(() => finishedStock.filter(s =>
    s.org_dress_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.org_name.toLowerCase().includes(searchQuery.toLowerCase())
  ), [finishedStock, searchQuery]);

  return (
    <div className="flex-1 bg-[#f8fafc]">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-8 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black text-gray-900">Inventory Master</h1>
            <p className="text-sm font-bold text-gray-500 mt-1 uppercase tracking-widest">
              {view === "fabric" ? "Raw Material: Fabric & Rolls" : "Finished Goods: Ready for Sale"}
            </p>
          </div>
          <div className="flex gap-3">
            <div className="flex bg-gray-100 p-1 rounded-lg">
              <Button
                variant={view === "fabric" ? "default" : "ghost"}
                size="sm"
                onClick={() => setView("fabric")}
                className={`text-xs px-4 ${view === "fabric" ? "bg-white text-indigo-600 shadow-sm hover:bg-white" : "text-gray-500"}`}
              >
                <Layers className="w-3 h-3 mr-2" /> Fabric
              </Button>
              <Button
                variant={view === "finished" ? "default" : "ghost"}
                size="sm"
                onClick={() => setView("finished")}
                className={`text-xs px-4 ${view === "finished" ? "bg-white text-indigo-600 shadow-sm hover:bg-white" : "text-gray-500"}`}
              >
                <Package className="w-3 h-3 mr-2" /> Finished
              </Button>
            </div>
            <Button
              className="bg-[#e94560] hover:bg-[#d13a52] text-xs font-bold px-6"
              onClick={() => setIsAddFabricModalOpen(true)}
            >
              <Plus className="w-4 h-4 mr-2" /> Add {view === "fabric" ? "Fabric" : "Stock"}
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm hover:shadow-md transition-shadow">
            <p className="text-xs font-black uppercase tracking-widest text-gray-400 mb-2">Total SKU</p>
            <p className="text-3xl font-black text-gray-900">
              {view === "fabric" ? fabrics.length : finishedStock.length}
            </p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm hover:shadow-md transition-shadow">
            <p className="text-xs font-black uppercase tracking-widest text-gray-400 mb-2">
              {view === "fabric" ? "Total Meters" : "Total Ready"}
            </p>
            <p className="text-3xl font-black text-indigo-600">
              {view === "fabric"
                ? fabrics.reduce((a, b) => a + Number(b.total_quantity), 0).toFixed(1)
                : finishedStock.reduce((a, b) => a + Number(b.available_qty), 0)}
              <span className="text-sm font-bold ml-1">{view === "fabric" ? "m" : "pcs"}</span>
            </p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
            <p className="text-xs font-black uppercase tracking-widest text-gray-400 mb-2">Critical Stock</p>
            <p className="text-3xl font-black text-rose-500">
              {view === "fabric"
                ? fabrics.filter(f => f.status !== 'in').length
                : finishedStock.filter(s => s.available_qty < 10).length}
            </p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
            <p className="text-xs font-black uppercase tracking-widest text-gray-400 mb-2">Storage Status</p>
            <Badge className="bg-green-100 text-green-700 font-black border-green-200">OPTIMAL</Badge>
          </div>
        </div>

        {/* Search */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm mb-6 p-4">
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
              <Input
                placeholder={`Search ${view === "fabric" ? "cloth type, color or design..." : "dress or client..."}`}
                className="pl-11 h-12 border-none bg-gray-50 focus:bg-white transition-all font-medium placeholder:text-gray-400"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50/50 border-b border-gray-100">
                <tr>
                  {view === "fabric" ? (
                    <>
                      <th className="px-8 py-5 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest relative group">
                        <div className="flex items-center gap-2">
                          Fabric Specs
                          <div className="relative">
                            <Popover open={isSpecsFilterOpen} onOpenChange={setIsSpecsFilterOpen}>
                              <PopoverTrigger asChild>
                                <span
                                  className={`cursor-pointer hover:text-indigo-600 transition-colors ${clothTypeFilter || qualityFilter ? 'text-indigo-600' : ''}`}
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <Filter className="w-3 h-3" />
                                </span>
                              </PopoverTrigger>
                              <PopoverContent className="w-48 p-3" align="start">
                                <div className="space-y-3">
                                  <div>
                                    <p className="text-[9px] font-bold text-gray-400 uppercase mb-1">Cloth Type</p>
                                    <div className="space-y-1 max-h-32 overflow-y-auto">
                                      {uniqueClothTypes.map(type => (
                                        <div
                                          key={type}
                                          className={`text-xs px-2 py-1.5 rounded cursor-pointer ${clothTypeFilter === type ? 'bg-indigo-50 text-indigo-700 font-bold' : 'hover:bg-gray-50 text-gray-600'}`}
                                          onClick={() => {
                                            setClothTypeFilter(clothTypeFilter === type ? null : type);
                                            // Don't close yet if they might want to select quality too, or close? 
                                            // User requested "select option... disappear". Let's close it.
                                            setIsSpecsFilterOpen(false);
                                          }}
                                        >
                                          {type}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                  <div className="border-t border-gray-50 pt-2">
                                    <p className="text-[9px] font-bold text-gray-400 uppercase mb-1">Quality</p>
                                    <div className="space-y-1 max-h-32 overflow-y-auto">
                                      {uniqueQualities.map(q => (
                                        <div
                                          key={q}
                                          className={`text-xs px-2 py-1.5 rounded cursor-pointer ${qualityFilter === q ? 'bg-indigo-50 text-indigo-700 font-bold' : 'hover:bg-gray-50 text-gray-600'}`}
                                          onClick={() => {
                                            setQualityFilter(qualityFilter === q ? null : q);
                                            setIsSpecsFilterOpen(false);
                                          }}
                                        >
                                          {q}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                  {(clothTypeFilter || qualityFilter) && (
                                    <div className="pt-2 border-t border-gray-50">
                                      <button
                                        className="text-[10px] text-red-500 font-bold w-full text-left hover:underline"
                                        onClick={() => {
                                          setClothTypeFilter(null);
                                          setQualityFilter(null);
                                          setIsSpecsFilterOpen(false);
                                        }}
                                      >
                                        Clear Filters
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </PopoverContent>
                            </Popover>
                          </div>
                          {(clothTypeFilter || qualityFilter) && (
                            <Badge className="h-4 p-0 px-1 text-[8px] bg-indigo-100 text-indigo-700 border-none">
                              {clothTypeFilter && !qualityFilter ? '1' : !clothTypeFilter && qualityFilter ? '1' : '2'}
                            </Badge>
                          )}
                        </div>
                      </th>
                      <th className="px-8 py-5 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Stock Level</th>
                      <th className="px-8 py-5 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Rolls</th>
                      <th className="px-8 py-5 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">
                        <div className="flex items-center gap-2">
                          Status
                          <div className="relative">
                            <Popover open={isStatusFilterOpen} onOpenChange={setIsStatusFilterOpen}>
                              <PopoverTrigger asChild>
                                <span
                                  className={`cursor-pointer hover:text-indigo-600 transition-colors ${statusFilter ? 'text-indigo-600' : ''}`}
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <Filter className="w-3 h-3" />
                                </span>
                              </PopoverTrigger>
                              <PopoverContent className="w-32 p-2" align="end">
                                <div className="space-y-1">
                                  {uniqueStatuses.map(s => (
                                    <div
                                      key={s}
                                      className={`text-xs px-2 py-1.5 rounded cursor-pointer uppercase font-bold flex items-center justify-between ${statusFilter === s ? 'bg-indigo-50 text-indigo-700' : 'hover:bg-gray-50 text-gray-500'}`}
                                      onClick={() => {
                                        setStatusFilter(statusFilter === s ? null : s);
                                        setIsStatusFilterOpen(false);
                                      }}
                                    >
                                      {s === 'in' ? 'Available' : s === 'low' ? 'Low Stock' : 'Out'}
                                      {statusFilter === s && <CheckCircle2 className="w-3 h-3" />}
                                    </div>
                                  ))}
                                  {statusFilter && (
                                    <div className="pt-2 border-t border-gray-50">
                                      <button
                                        className="text-[10px] text-red-500 font-bold w-full text-left hover:underline px-1"
                                        onClick={() => {
                                          setStatusFilter(null);
                                          setIsStatusFilterOpen(false);
                                        }}
                                      >
                                        Clear
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </PopoverContent>
                            </Popover>
                          </div>
                        </div>
                      </th>
                    </>
                  ) : (
                    <>
                      <th className="px-8 py-5 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Product / Dress</th>
                      <th className="px-8 py-5 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Client</th>
                      <th className="px-8 py-5 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Size</th>
                      <th className="px-8 py-5 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Quantity</th>
                      <th className="px-8 py-5 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">MRP</th>
                    </>
                  )}
                  <th className="px-8 py-5 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-20 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
                        <span className="text-xs font-bold text-gray-400 uppercase">Synchronizing...</span>
                      </div>
                    </td>
                  </tr>
                ) : view === "fabric" ? (
                  filteredFabrics.map((f) => (
                    <FabricRow
                      key={f.id}
                      f={f}
                      onCutting={handleOpenCuttingModal}
                      onEdit={handleOpenEditModal}
                    />
                  ))
                ) : (
                  filteredFinished.map((s, idx) => (
                    <FinishedStockRow
                      key={idx}
                      s={s}
                      onHistory={handleOpenHistory}
                    />
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Add Fabric Modal */}
      <Modal
        isOpen={isAddFabricModalOpen}
        onClose={() => setIsAddFabricModalOpen(false)}
        title="Register New Fabric Entry"
        size="lg"
      >
        <div className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Cloth Type</Label>
              <Select onValueChange={(val) => setFabricForm({ ...fabricForm, clothType: val })}>
                <SelectTrigger className="h-12 border-gray-100 bg-gray-50/50 rounded-xl font-bold">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {metadata.clothTypes.map(t => <SelectItem key={t.id} value={t.type}>{t.type}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Color Variant</Label>
              <Select onValueChange={(val) => setFabricForm({ ...fabricForm, colorName: val })}>
                <SelectTrigger className="h-12 border-gray-100 bg-gray-50/50 rounded-xl font-bold">
                  <SelectValue placeholder="Select color" />
                </SelectTrigger>
                <SelectContent>
                  {metadata.colors.map(c => <SelectItem key={c.id} value={c.color_name}>{c.color_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Design Pattern</Label>
              <Select onValueChange={(val) => setFabricForm({ ...fabricForm, designName: val })}>
                <SelectTrigger className="h-12 border-gray-100 bg-gray-50/50 rounded-xl font-bold">
                  <SelectValue placeholder="Select design" />
                </SelectTrigger>
                <SelectContent>
                  {metadata.designs.map(d => <SelectItem key={d.id} value={d.design_name}>{d.design_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Fabric Quality</Label>
              <Select onValueChange={(val) => setFabricForm({ ...fabricForm, qualityName: val })}>
                <SelectTrigger className="h-12 border-gray-100 bg-gray-50/50 rounded-xl font-bold">
                  <SelectValue placeholder="Select quality" />
                </SelectTrigger>
                <SelectContent>
                  {metadata.qualities.map(q => <SelectItem key={q.id} value={q.quality_name}>{q.quality_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Roll Breakdown (Meters)</Label>
              <div className="flex items-center gap-2">
                <Input
                  placeholder="Quick Add (e.g. 30,50,60...)"
                  className="h-8 text-[10px] w-52 border-gray-100 bg-gray-50/50 rounded-lg font-mono focus:bg-white"
                  value={rollQuickEntry}
                  onChange={(e) => setRollQuickEntry(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleQuickAddRolls()}
                />
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-[10px] font-black uppercase tracking-widest border-indigo-100 text-indigo-600 hover:bg-indigo-50"
                  onClick={handleQuickAddRolls}
                >
                  Add List
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {fabricForm.rolls.map((roll, idx) => (
                <div key={idx} className="relative group">
                  <Input
                    type="number"
                    value={roll || ''}
                    className="h-12 bg-gray-50/30 border-gray-100 rounded-xl font-mono font-bold pl-3 pr-8"
                    placeholder="0.00"
                    onChange={(e) => {
                      const newRolls = [...fabricForm.rolls];
                      const val = parseInt(e.target.value.replace(/[^0-9]/g, '').replace(/^0+/, '')) || 0;
                      newRolls[idx] = val;
                      setFabricForm({ ...fabricForm, rolls: newRolls });
                    }}
                  />
                  <button
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-rose-400 hover:text-rose-600 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => {
                      const newRolls = fabricForm.rolls.filter((_, i) => i !== idx);
                      setFabricForm({ ...fabricForm, rolls: newRolls });
                    }}
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
              {fabricForm.rolls.length === 0 && (
                <div className="col-span-full py-8 border-2 border-dashed border-gray-100 rounded-2xl flex flex-col items-center justify-center bg-gray-50/50">
                  <Package className="w-6 h-6 text-gray-300 mb-2" />
                  <p className="text-[10px] font-bold text-gray-400 uppercase">No rolls added yet</p>
                </div>
              )}
            </div>

            {fabricForm.rolls.length > 0 && (
              <div className="flex items-center gap-4 px-4 py-3 bg-indigo-50/30 border border-indigo-100 rounded-xl">
                <div className="flex flex-col">
                  <span className="text-[9px] font-black text-indigo-400 uppercase tracking-tighter">Total Rolls</span>
                  <span className="text-sm font-black text-indigo-700">{fabricForm.rolls.length}</span>
                </div>
                <div className="w-px h-6 bg-indigo-100" />
                <div className="flex flex-col">
                  <span className="text-[9px] font-black text-indigo-400 uppercase tracking-tighter">Total Length</span>
                  <span className="text-sm font-black text-indigo-700">
                    {fabricForm.rolls.reduce((a, b) => a + (Number(b) || 0), 0).toFixed(1)} m
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between pt-6 border-t border-gray-100 italic text-[10px] text-gray-400 font-medium">
            <p>All rolls will be tracked individually in the master ledger.</p>
            <div className="flex gap-3">
              <Button variant="ghost" className="font-bold text-xs" onClick={() => setIsAddFabricModalOpen(false)}>Cancel</Button>
              <Button onClick={handleAddFabric} className="bg-indigo-600 hover:bg-indigo-700 text-xs font-bold" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="w-3 h-3 animate-spin mr-2" /> : <Plus className="w-3 h-3 mr-2" />}
                Save to Inventory
              </Button>
            </div>
          </div>
        </div>
      </Modal>

      {/* Stock History Modal */}
      <StockHistoryModal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        stockItem={selectedStockForHistory}
      />

      {/* Edit Fabric Modal */}
      <Modal
        isOpen={isEditFabricModalOpen}
        onClose={() => setIsEditFabricModalOpen(false)}
        title="Edit Fabric Details"
        size="md"
      >
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-6">
            <div className="space-y-2">
              <Label>Cloth Type</Label>
              <Select value={fabricEditForm.clothType} onValueChange={(val) => setFabricEditForm({ ...fabricEditForm, clothType: val })}>
                <SelectTrigger className="h-12 border-gray-100 bg-gray-50/50 rounded-xl font-bold">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {metadata.clothTypes.map(t => <SelectItem key={t.id} value={t.type}>{t.type}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Color Variant</Label>
              <Select value={fabricEditForm.colorName} onValueChange={(val) => setFabricEditForm({ ...fabricEditForm, colorName: val })}>
                <SelectTrigger className="h-12 border-gray-100 bg-gray-50/50 rounded-xl font-bold">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {metadata.colors.map(c => <SelectItem key={c.id} value={c.color_name}>{c.color_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Design Pattern</Label>
              <Select value={fabricEditForm.designName} onValueChange={(val) => setFabricEditForm({ ...fabricEditForm, designName: val })}>
                <SelectTrigger className="h-12 border-gray-100 bg-gray-50/50 rounded-xl font-bold">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {metadata.designs.map(d => <SelectItem key={d.id} value={d.design_name}>{d.design_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Fabric Quality</Label>
              <Select value={fabricEditForm.qualityName} onValueChange={(val) => setFabricEditForm({ ...fabricEditForm, qualityName: val })}>
                <SelectTrigger className="h-12 border-gray-100 bg-gray-50/50 rounded-xl font-bold">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {metadata.qualities.map(q => <SelectItem key={q.id} value={q.quality_name}>{q.quality_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Roll Breakdown (Meters)</Label>
              <div className="flex items-center gap-2">
                <Input
                  placeholder="Quick Add (e.g. 30,50,60...)"
                  className="h-8 text-[10px] w-52 border-gray-100 bg-gray-50/50 rounded-lg font-mono focus:bg-white"
                  value={rollQuickEntry}
                  onChange={(e) => setRollQuickEntry(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleQuickAddRollsInEdit()}
                />
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-[10px] font-black uppercase tracking-wider border-indigo-100 text-indigo-600 hover:bg-indigo-50"
                  onClick={handleQuickAddRollsInEdit}
                >
                  Add List
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {fabricEditForm.rolls.map((roll, idx) => (
                <div key={idx} className="relative group">
                  <Input
                    type="number"
                    value={roll || ''}
                    className="h-12 bg-gray-50/30 border-gray-100 rounded-xl font-mono font-bold pl-3 pr-8"
                    placeholder="0.00"
                    onChange={(e) => {
                      const newRolls = [...fabricEditForm.rolls];
                      const rawValue = e.target.value.replace(/[^0-9]/g, '').replace(/^0+/, '');
                      const val = parseInt(rawValue) || 0;
                      newRolls[idx] = val;
                      setFabricEditForm({ ...fabricEditForm, rolls: newRolls });
                    }}
                  />
                  <button
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-rose-400 hover:text-rose-600 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => {
                      const newRolls = fabricEditForm.rolls.filter((_, i) => i !== idx);
                      setFabricEditForm({ ...fabricEditForm, rolls: newRolls });
                    }}
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
              {fabricEditForm.rolls.length === 0 && (
                <div className="col-span-full py-8 border-2 border-dashed border-gray-100 rounded-2xl flex flex-col items-center justify-center bg-gray-50/50">
                  <Package className="w-6 h-6 text-gray-300 mb-2" />
                  <p className="text-[10px] font-bold text-gray-400 uppercase">No rolls found</p>
                </div>
              )}
            </div>

            {fabricEditForm.rolls.length > 0 && (
              <div className="flex items-center gap-4 px-4 py-3 bg-indigo-50/30 border border-indigo-100 rounded-xl">
                <div className="flex flex-col">
                  <span className="text-[9px] font-black text-indigo-400 uppercase tracking-tighter">Total Rolls</span>
                  <span className="text-sm font-black text-indigo-700">{fabricEditForm.rolls.length}</span>
                </div>
                <div className="w-px h-6 bg-indigo-100" />
                <div className="flex flex-col">
                  <span className="text-[9px] font-black text-indigo-400 uppercase tracking-tighter">Total Length</span>
                  <span className="text-sm font-black text-indigo-700">
                    {Math.round(fabricEditForm.rolls.reduce((a, b) => a + (Number(b) || 0), 0))} m
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-6 border-t border-gray-100">
            <Button variant="ghost" onClick={() => setIsEditFabricModalOpen(false)}>Cancel</Button>
            <Button
              className="bg-indigo-600"
              onClick={handleEditFabric}
              disabled={isSubmitting}
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Update Details"}
            </Button>
          </div>
        </div>
      </Modal >

      <Modal
        isOpen={isCuttingModalOpen}
        onClose={() => setIsCuttingModalOpen(false)}
        title="Send Fabric to Production"
        size="md"
      >
        <div className="space-y-6">
          <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-xl">
            <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">Fabric Source</p>
            <h3 className="font-bold text-indigo-900">{selectedFabricForCutting?.cloth_type} • {selectedFabricForCutting?.quality_name}</h3>
            <p className="text-sm text-indigo-700">{selectedFabricForCutting?.color_name} / {selectedFabricForCutting?.design_name}</p>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Select Production Item</Label>
              <Button
                variant="outline"
                className="h-12 w-full justify-between border-gray-100 bg-gray-50/50 rounded-xl font-bold hover:bg-white hover:text-indigo-600"
                onClick={() => setOpenCombobox(true)}
              >
                {cuttingForm.org_dress_id
                  ? (() => {
                    const selected = metadata.dresses.find((d: any) => d.id.toString() === cuttingForm.org_dress_id);
                    if (!selected) return "Search product to make...";
                    return `${selected.item_name}${selected.org_dress_name && selected.org_dress_name !== selected.item_name ? ` • ${selected.org_dress_name}` : ''} (${selected.org_name})`;
                  })()
                  : "Search product to make..."}
                <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>

              <CommandDialog open={openCombobox} onOpenChange={setOpenCombobox}>
                <CommandInput placeholder="Search dress or client..." />
                <CommandList>
                  <CommandEmpty>No product found.</CommandEmpty>
                  <CommandGroup heading="Available Products" className="max-h-[300px] overflow-y-auto">
                    {metadata.dresses.map((d: any) => (
                      <CommandItem
                        key={d.id}
                        value={`${d.item_name} ${d.org_dress_name} ${d.org_name} ${d.id}`}
                        onSelect={() => {
                          setCuttingForm({ ...cuttingForm, org_dress_id: d.id.toString() });
                          setOpenCombobox(false);
                        }}
                        className="cursor-pointer py-3"
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            cuttingForm.org_dress_id === d.id.toString() ? "opacity-100" : "opacity-0"
                          )}
                        />
                        <div className="flex flex-col">
                          <span className="font-bold text-gray-900">
                            {d.item_name}
                            {d.org_dress_name && d.org_dress_name !== d.item_name && (
                              <span className="font-normal text-gray-500 ml-1">• {d.org_dress_name}</span>
                            )}
                            <span className="text-gray-400 text-xs font-normal ml-1">({d.org_name})</span>
                          </span>
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </CommandDialog>
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Assign Cutter</Label>
              <Select onValueChange={(val) => setCuttingForm({ ...cuttingForm, emp_id: val })}>
                <SelectTrigger className="h-12 border-gray-100 bg-gray-50/50 rounded-xl font-bold">
                  <SelectValue placeholder="Select master cutter" />
                </SelectTrigger>
                <SelectContent>
                  {metadata.cutters.map((c: any) => (
                    <SelectItem key={c.id} value={c.id.toString()}>
                      {c.name} ({c.role_name})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="bg-gray-50/50 rounded-2xl border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-6">
              <h5 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Production Size Matrix</h5>
            </div>

            <div className="overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-gray-200">
              <div className="flex gap-3 min-w-max">
                {/* Static Row Labels */}
                <div className="flex flex-col gap-3 pr-4 border-r border-gray-200">
                  <div className="h-10 flex items-center justify-end">
                    <span className="text-xl font-black text-gray-400 italic">S</span>
                  </div>
                  <div className="h-12 flex items-center justify-end gap-1 relative group/bulk">
                    <div className="flex flex-col -gap-1 opacity-0 group-hover/bulk:opacity-100 transition-all">
                      <button
                        onClick={() => {
                          setLocalSizes(prev => prev.map(item => ({ ...item, qty: (item.qty || 0) + 1 })));
                        }}
                        className="p-0.5 hover:bg-indigo-50 rounded text-indigo-400 transition-all"
                        title="Increase all by 1"
                      >
                        <ArrowUp className="w-2.5 h-2.5" />
                      </button>
                      <button
                        onClick={() => {
                          setLocalSizes(prev => prev.map(item => ({ ...item, qty: Math.max(0, (item.qty || 0) - 1) })));
                        }}
                        className="p-0.5 hover:bg-indigo-50 rounded text-indigo-400 transition-all"
                        title="Decrease all by 1"
                      >
                        <ArrowDown className="w-2.5 h-2.5" />
                      </button>
                    </div>
                    <span className="text-xl font-black text-gray-400 italic">Q</span>
                  </div>
                </div>

                {/* Dynamic Size Columns */}
                {localSizes.map((item) => (
                  <div key={item.id} className="flex flex-col gap-3 group relative">
                    {/* Size Name Entry */}
                    <div className="relative">
                      <Input
                        value={item.size}
                        placeholder="SIZE"
                        className="h-10 w-24 text-center font-black uppercase text-[11px] bg-white border-gray-200 rounded-lg focus:border-indigo-300 focus:ring-indigo-500/10"
                        onChange={(e) => {
                          const newSize = e.target.value.toUpperCase();
                          setLocalSizes(prev => prev.map(p => p.id === item.id ? { ...p, size: newSize } : p));
                        }}
                      />
                      <button
                        className="absolute -top-2 -right-2 w-5 h-5 bg-white border border-rose-100 rounded-full flex items-center justify-center text-rose-400 hover:text-rose-600 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity z-10"
                        onClick={() => {
                          setLocalSizes(prev => prev.filter(p => p.id !== item.id));
                        }}
                      >
                        <Trash2 className="w-2.5 h-2.5" />
                      </button>
                    </div>

                    {/* Quantity Entry */}
                    <Input
                      type="text"
                      inputMode="numeric"
                      value={item.qty === 0 ? '' : item.qty}
                      placeholder="0"
                      className="h-12 w-24 text-center font-black text-lg bg-white border-gray-200 rounded-lg focus:border-indigo-300 focus:ring-indigo-500/10"
                      onChange={(e) => {
                        const rawValue = e.target.value.replace(/^0+/, ''); // Remove leading zeros
                        const val = parseInt(rawValue) || 0;
                        setLocalSizes(prev => prev.map(p => p.id === item.id ? { ...p, qty: val } : p));
                      }}
                    />
                  </div>
                ))}

                {/* Inline Add Button Box */}
                <button
                  onClick={() => {
                    setLocalSizes(prev => [
                      ...prev,
                      { id: Date.now().toString(), size: "", qty: 0 }
                    ]);
                  }}
                  className="w-24 h-[100px] border-2 border-dashed border-gray-200 rounded-xl flex items-center justify-center hover:bg-white hover:border-indigo-200 transition-all group shrink-0"
                >
                  <Plus className="w-6 h-6 text-gray-300 group-hover:text-indigo-400 group-hover:scale-110 transition-transform" />
                </button>

                {/* Empty State Instructions */}
                {localSizes.length === 0 && (
                  <div className="flex items-center px-4">
                    <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Click plus to add production sizes</span>
                  </div>
                )}
              </div>
            </div>

            {localSizes.length > 0 && (
              <div className="mt-4 flex items-center justify-end gap-2 text-gray-400">
                <span className="text-[10px] font-black uppercase">Batch Total:</span>
                <span className="text-xl font-black text-gray-900 tracking-tighter">
                  {localSizes.reduce((a, b) => a + (b.qty || 0), 0)}
                </span>
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] font-sans">Pcs</span>
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-6 border-t border-gray-100">
            <Button variant="ghost" className="flex-1 font-bold" onClick={() => setIsCuttingModalOpen(false)}>Cancel</Button>
            <Button
              className="flex-[2] bg-[#e94560] hover:bg-[#d13a52] font-bold shadow-lg shadow-rose-100"
              onClick={handleStartCuttingStock}
              disabled={isSubmitting}
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                <>
                  <Scissors className="w-4 h-4 mr-2" />
                  Initiate Stock Production
                </>
              )}
            </Button>
          </div>
        </div>
      </Modal>
      <StockHistoryModal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        stockItem={selectedStockForHistory}
      />
    </div>
  );
}
