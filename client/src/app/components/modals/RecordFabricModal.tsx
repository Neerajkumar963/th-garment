import { useState, useEffect } from "react";
import { Modal } from "../ui/modal";
import { Button } from "../ui/button";
import { Label } from "../ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Input } from "../ui/input";
import { Loader2, Package, CheckCircle2 } from "lucide-react";
import { api } from "../../../services/api";
import { toast } from "sonner";
import { Badge } from "../ui/badge";

interface RecordFabricModalProps {
    isOpen: boolean;
    onClose: () => void;
    jobId: number;
    orgDressId: number;
    onSuccess: () => void;
    fabrics: any[];
    initialFabricId?: string; // If fabric is locked/already known
    targetSq?: any; // Target sizes for the job
}

export function RecordFabricModal({ isOpen, onClose, jobId, orgDressId, onSuccess, fabrics, initialFabricId, targetSq }: RecordFabricModalProps) {
    const [selectedFabricId, setSelectedFabricId] = useState<string>(initialFabricId || "");
    const [rollId, setRollId] = useState("");
    const [fabricUsed, setFabricUsed] = useState("");
    const [rolls, setRolls] = useState<any[]>([]);

    // Stock Logic
    const [availableStocks, setAvailableStocks] = useState<any[]>([]);
    const [stockDetailsUsed, setStockDetailsUsed] = useState<Record<string, string>>({});
    const [selectedStockId, setSelectedStockId] = useState("");

    const [loadingRolls, setLoadingRolls] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (isOpen) {
            // Reset state when opening
            setSelectedFabricId(initialFabricId || "");
            setRollId("");
            setFabricUsed("");
            setStockDetailsUsed({});
            setSelectedStockId("");
            setAvailableStocks([]);
        }
    }, [isOpen, initialFabricId]);

    // Fetch Rolls & Stock when Fabric Selected
    useEffect(() => {
        const fetchData = async () => {
            if (!selectedFabricId) {
                setRolls([]);
                setAvailableStocks([]);
                return;
            }
            setLoadingRolls(true);
            try {
                const [rollsData, stockData] = await Promise.all([
                    api.get(`/fabric/${selectedFabricId}`),
                    api.get(`/cutting/internal-stock?org_dress_id=${orgDressId}`)
                ]);

                if (rollsData.success && rollsData.rolls) {
                    setRolls(rollsData.rolls);
                }

                if (stockData.success && stockData.stock) {
                    // Filter stock matching current selected fabric
                    // stock item has cloth_detail_id
                    const relevantStock = stockData.stock.filter((s: any) => s.cloth_detail_id.toString() === selectedFabricId.toString());
                    setAvailableStocks(relevantStock);

                    // Auto-select first stock if available?
                    if (relevantStock.length > 0) {
                        setSelectedStockId(relevantStock[0].id.toString());
                    }
                }
            } catch (error) {
                toast.error("Failed to load fabric details");
            } finally {
                setLoadingRolls(false);
            }
        };

        if (isOpen && selectedFabricId) {
            fetchData();
        }
    }, [selectedFabricId, isOpen, orgDressId]);

    const handleSubmit = async () => {
        // Validation
        const hasFabric = rollId && fabricUsed;
        const hasStock = selectedStockId && Object.keys(stockDetailsUsed).length > 0;

        if (!hasFabric && !hasStock) {
            toast.error("Please enter either Fabric usage OR Stock usage");
            return;
        }

        if (hasFabric) {
            const selectedRoll = rolls.find(r => r.id.toString() === rollId);
            if (selectedRoll) {
                const avail = parseFloat(selectedRoll.roll_length);
                const used = parseFloat(fabricUsed);
                if (used > avail) {
                    toast.error(`Insufficient fabric. Available: ${avail}, Requested: ${used}`);
                    return;
                }
            }
        }

        let totalStockUsed = 0;
        if (hasStock) {
            const stock = availableStocks.find(s => s.id.toString() === selectedStockId);
            if (stock) {
                const stockSq = typeof stock.sq === 'string' ? JSON.parse(stock.sq) : stock.sq;
                // Validate per size
                for (const [size, qty] of Object.entries(stockDetailsUsed)) {
                    const req = Number(qty);
                    const avail = Number(stockSq[size] || 0);
                    if (req > avail) {
                        toast.error(`Insufficient stock for size ${size} (Max: ${avail})`);
                        return;
                    }
                    totalStockUsed += req;
                }

                if (totalStockUsed === 0) {
                    toast.error("Please enter quantity to use from stock");
                    return;
                }
            }
        }


        setIsSubmitting(true);
        try {
            const payload: any = {};

            if (hasFabric) {
                payload.fabric_entries = [{
                    cloth_quantity_id: parseInt(rollId),
                    fabric_used: parseFloat(fabricUsed) || 0,
                    cut_type: "primary",
                    cut_rate: 0
                }];
            }

            if (hasStock) {
                payload.stock_entries = [{
                    cut_stock_id: parseInt(selectedStockId),
                    used_qty: totalStockUsed,
                    used_sq: stockDetailsUsed // Send map: { "24": "10", "32": "5" }
                }];
            }

            await api.put(`/cutting/${jobId}/fabric-usage`, payload);

            toast.success("Usage recorded merged successfully");
            onSuccess();
            onClose();
        } catch (error: any) {
            toast.error(error.message || "Failed to record fabric");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={`Record Fabric & Stock for Job #${jobId}`}
            size="md"
        >
            <div className="space-y-6">
                <div className="space-y-4">
                    {/* Fabric Selection */}
                    <div className="space-y-2">
                        <Label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Select Fabric</Label>
                        <Select
                            value={selectedFabricId}
                            onValueChange={(val) => {
                                setSelectedFabricId(val);
                                setRollId(""); // Reset roll when fabric changes
                            }}
                            disabled={!!initialFabricId}
                        >
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder="Choose fabric type..." />
                            </SelectTrigger>
                            <SelectContent>
                                {fabrics.map(f => (
                                    <SelectItem key={f.id} value={f.id.toString()}>
                                        {f.cloth_type} • {f.color_name} • {f.design_name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Stock Availability Section */}
                    {availableStocks.length > 0 && selectedFabricId && (
                        <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-3 animate-in fade-in zoom-in">
                            <div className="flex items-center gap-2 mb-2">
                                <Package className="w-4 h-4 text-indigo-600" />
                                <h4 className="text-sm font-bold text-indigo-900">Available Cut Stock</h4>
                            </div>

                            {availableStocks.map(stock => {
                                let stockSq = {};
                                try {
                                    stockSq = typeof stock.sq === 'string' ? JSON.parse(stock.sq) : stock.sq;
                                } catch (e) { console.error("SQ Parse Error", e); }

                                // Filter out _meta for display and total calc
                                // ALSO FILTER BY TARGET SQ if provided
                                const sizes = Object.entries(stockSq).filter(([k, v]) => {
                                    if (k === '_meta') return false;
                                    if (Number(v) <= 0) return false;

                                    // NEW: Filter by targetSq if available
                                    if (targetSq) {
                                        // If size is NOT in targetSq, hide it
                                        if (!targetSq[k]) return false;
                                    }
                                    return true;
                                });

                                const total = sizes.reduce((a, [_, qty]) => a + Number(qty), 0);
                                const isSelected = selectedStockId === stock.id.toString();

                                if (sizes.length === 0) {
                                    return (
                                        <div key={stock.id} className="mb-2 p-2 border border-dashed rounded text-xs text-gray-400">
                                            Stock #{stock.id} available but no matching sizes for this job.
                                        </div>
                                    );
                                }

                                return (
                                    <div key={stock.id} className={`mb-3 p-3 rounded-lg border transition-all ${isSelected ? 'bg-white border-indigo-200 shadow-sm' : 'bg-transparent border-transparent hover:bg-white/50'}`}>
                                        <div className="flex justify-between items-start mb-2">
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm font-bold text-indigo-900">Stock #{stock.id}</span>
                                                    <Badge variant="outline" className="bg-white text-indigo-600 border-indigo-200 font-mono">
                                                        {sizes.length} Matching Sizes
                                                    </Badge>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-3 gap-2 mt-2">
                                            {sizes.map(([size, availableQty]) => {
                                                const requiredQty = targetSq ? Number(targetSq[size] || 0) : 0;
                                                const maxAllowed = targetSq ? Math.min(Number(availableQty), requiredQty) : Number(availableQty);

                                                return (
                                                    <div key={size} className="space-y-1">
                                                        <div className="flex justify-between items-center text-[10px] uppercase font-bold text-gray-500">
                                                            <span>Size {size}</span>
                                                            <div className="flex flex-col items-end leading-tight">
                                                                <span className="text-indigo-600">Need: {requiredQty}</span>
                                                                <span className="text-gray-400">Stock: {availableQty as React.ReactNode}</span>
                                                            </div>
                                                        </div>
                                                        <Input
                                                            type="number"
                                                            placeholder="0"
                                                            min="0"
                                                            max={maxAllowed}
                                                            className={`h-8 text-xs font-bold text-center ${isSelected && stockDetailsUsed[size] ? 'border-indigo-500 ring-1 ring-indigo-500 text-indigo-700' : 'bg-white'}`}
                                                            value={isSelected ? (stockDetailsUsed[size] || "") : ""}
                                                            onChange={(e) => {
                                                                const val = Number(e.target.value);

                                                                // Validation 1: Check against Required
                                                                if (targetSq && val > requiredQty) {
                                                                    toast.error(`Cannot exceed required quantity: ${requiredQty}`);
                                                                    return;
                                                                }

                                                                // Validation 2: Check against Stock
                                                                if (val > Number(availableQty)) {
                                                                    toast.error(`Insufficient stock. Max: ${availableQty}`);
                                                                    return;
                                                                }

                                                                // If switching stock, clear others
                                                                if (selectedStockId !== stock.id.toString()) {
                                                                    setSelectedStockId(stock.id.toString());
                                                                    setStockDetailsUsed({ [size]: e.target.value });
                                                                } else {
                                                                    setStockDetailsUsed(prev => ({ ...prev, [size]: e.target.value }));
                                                                }
                                                            }}
                                                        />
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    </div>
                                );
                            })}
                            <div className="mt-2 pt-2 border-t border-indigo-100">
                                <p className="text-[10px] text-indigo-400 flex items-center gap-1">
                                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-indigo-400" />
                                    Enter quantity for each size to deduct.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Dynamic UI: Hide Roll Selection if Stock Covers Everything */}
                    {(() => {
                        // Calculate if fully satisfied
                        let isFullySatisfied = false;
                        if (targetSq && Object.keys(targetSq).length > 0) {
                            const totalRequired = Object.values(targetSq).reduce((a: number, b: any) => a + Number(b), 0);
                            const totalSelected = Object.values(stockDetailsUsed).reduce((a: number, b: any) => a + Number(b), 0);
                            isFullySatisfied = totalSelected >= totalRequired;
                        }

                        if (isFullySatisfied) {
                            return (
                                <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3 animate-in fade-in slide-in-from-bottom-2">
                                    <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                                        <CheckCircle2 className="w-5 h-5 text-green-600" />
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-bold text-green-900">Requirements Met!</h4>
                                        <p className="text-xs text-green-700">
                                            Selected stock covers the entire job. No fresh fabric needed.
                                        </p>
                                    </div>
                                </div>
                            );
                        }

                        return (
                            <>
                                <div className="relative">
                                    <div className="absolute inset-0 flex items-center">
                                        <span className="w-full border-t border-gray-200" />
                                    </div>
                                    <div className="relative flex justify-center text-xs uppercase">
                                        <span className="bg-white px-2 text-gray-500">AND / OR</span>
                                    </div>
                                </div>

                                {/* Roll Selection */}
                                <div className="space-y-2">
                                    <Label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Select Roll (Fresh Cut)</Label>
                                    <Select value={rollId} onValueChange={setRollId} disabled={!selectedFabricId}>
                                        <SelectTrigger className="w-full">
                                            <SelectValue placeholder={!selectedFabricId ? "Select fabric first" : loadingRolls ? "Loading rolls..." : "Choose roll..."} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {rolls.map(r => (
                                                <SelectItem key={r.id} value={r.id.toString()}>
                                                    Roll #{r.id} ({parseFloat(r.roll_length).toFixed(2)}m available)
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Meters Used from Roll</Label>
                                    <Input
                                        type="number"
                                        placeholder="e.g. 50"
                                        value={fabricUsed}
                                        onChange={(e) => setFabricUsed(e.target.value)}
                                        disabled={!rollId}
                                    />
                                </div>
                            </>
                        );
                    })()}
                </div>

                <div className="flex gap-3 justify-end pt-4">
                    <Button variant="outline" onClick={onClose} disabled={isSubmitting}>Cancel</Button>
                    {(() => {
                        let isFullySatisfied = false;
                        if (targetSq && Object.keys(targetSq).length > 0) {
                            const totalRequired = Object.values(targetSq).reduce((a: number, b: any) => a + Number(b), 0);
                            const totalSelected = Object.values(stockDetailsUsed).reduce((a: number, b: any) => a + Number(b), 0);
                            isFullySatisfied = totalSelected >= totalRequired;
                        }

                        return (
                            <Button
                                onClick={async () => {
                                    // Wrap handleSubmit to include completion if needed
                                    await handleSubmit();
                                    if (isFullySatisfied) {
                                        try {
                                            await api.put(`/cutting/${jobId}/complete`, {});
                                            toast.success("Job auto-completed!");
                                            // onSuccess is already called in handleSubmit, but maybe we need to refresh again?
                                            // handleSubmit calls onSuccess. 
                                            // If we want to ensure refresh catches the 'Completed' status, we might relying on the parent refresh.
                                        } catch (e) {
                                            console.error("Auto-complete failed", e);
                                            toast.error("Usage saved, but failed to auto-complete job.");
                                        }
                                    }
                                }}
                                disabled={isSubmitting}
                                className={isFullySatisfied ? "bg-green-600 hover:bg-green-700 text-white" : ""}
                            >
                                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> :
                                    (isFullySatisfied ? <CheckCircle2 className="w-4 h-4 mr-2" /> : null)
                                }
                                {isFullySatisfied ? "Save & Complete" : "Save Entry"}
                            </Button>
                        );
                    })()}
                </div>
            </div>
        </Modal>
    );
}
