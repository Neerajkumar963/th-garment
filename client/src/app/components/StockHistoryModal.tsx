
import { useEffect, useState } from "react";
import { Modal } from "./ui/modal";
import { api } from "../../services/api";
import { Loader2, Package, Info, Tag, Layers, Database } from "lucide-react";
import { Badge } from "./ui/badge";

interface StockHistoryModalProps {
    isOpen: boolean;
    onClose: () => void;
    stockItem: any | null;
}

export function StockHistoryModal({ isOpen, onClose, stockItem }: StockHistoryModalProps) {
    const [metadata, setMetadata] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        if (isOpen && stockItem) {
            fetchInfo();
        } else {
            setMetadata(null);
        }
    }, [isOpen, stockItem]);

    const fetchInfo = async () => {
        setLoading(true);
        setError("");
        try {
            const url = `/sales/stock/${stockItem.org_dress_id}/history${stockItem.size ? `?size=${stockItem.size}` : ''}`;
            const res = await api.get(url);
            setMetadata(res.metadata);
        } catch (e: any) {
            setError(e.message || "Failed to load info");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Product Information"
            size="md"
        >
            <div className="pb-6">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-12">
                        <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mb-2" />
                        <p className="text-[10px] font-black text-indigo-300 uppercase tracking-widest">Loading Details...</p>
                    </div>
                ) : error ? (
                    <div className="text-center py-8 text-rose-500 bg-rose-50 rounded-2xl border border-rose-100 p-6">
                        <Info className="w-8 h-8 mx-auto mb-2 opacity-20" />
                        <p className="text-sm font-bold">{error}</p>
                    </div>
                ) : metadata ? (
                    <div className="space-y-6">
                        {/* Header Section */}
                        <div className="bg-indigo-600 rounded-2xl p-6 text-white shadow-lg">
                            <span className="text-[10px] font-black uppercase tracking-widest opacity-60 block mb-1">Product Identity</span>
                            <h3 className="text-2xl font-black tracking-tight">{metadata.item_name}</h3>
                            <p className="text-indigo-200 font-bold text-sm mt-1">{metadata.org_dress_name}</p>
                            <div className="mt-4 flex flex-wrap gap-2">
                                <Badge className="bg-white/20 text-white border-0">{metadata.color_name}</Badge>
                                <Badge className="bg-white/20 text-white border-0 uppercase">{metadata.item_type?.replace('_', ' ')}</Badge>
                            </div>
                        </div>

                        {/* Info Grid */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
                                <div className="flex items-center gap-2 mb-2">
                                    <Tag className="w-3.5 h-3.5 text-indigo-400" />
                                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Size</span>
                                </div>
                                <p className="text-2xl font-black text-gray-900">{stockItem?.size || "N/A"}</p>
                            </div>
                            <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
                                <div className="flex items-center gap-2 mb-2">
                                    <Database className="w-3.5 h-3.5 text-indigo-400" />
                                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Quantity</span>
                                </div>
                                <p className="text-2xl font-black text-gray-900">{Math.round(stockItem?.available_qty || 0)} <span className="text-xs font-bold text-gray-400">PCS</span></p>
                            </div>
                        </div>

                        {/* Details List */}
                        <div className="space-y-3">
                            <div className="flex justify-between items-center py-3 border-b border-gray-100">
                                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Client / Org</span>
                                <span className="text-sm font-black text-gray-900">{metadata.org_name}</span>
                            </div>
                            <div className="flex justify-between items-center py-3 border-b border-gray-100">
                                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">SKU Code</span>
                                <span className="text-sm font-black text-indigo-600">#{stockItem?.org_dress_id}</span>
                            </div>
                            {stockItem?.brand && (
                                <div className="flex justify-between items-center py-3 border-b border-gray-100">
                                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Brand Label</span>
                                    <span className="text-sm font-black text-gray-900">{stockItem.brand}</span>
                                </div>
                            )}
                            {stockItem?.remarks && stockItem?.remarks !== 'Produced' && (
                                <div className="pt-2">
                                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1">Additional Remarks</span>
                                    <p className="text-sm text-gray-600 italic bg-gray-50 p-3 rounded-xl border border-gray-100">"{stockItem.remarks}"</p>
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="text-center py-12">
                        <Package className="w-12 h-12 mx-auto text-gray-200 mb-4" />
                        <p className="text-gray-400 font-medium">No information available.</p>
                    </div>
                )}
            </div>
        </Modal>
    );
}
