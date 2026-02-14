import { useState, useEffect } from "react";
import {
    Plus,
    Search,
    Filter,
    MoreVertical,
    Eye,
    Printer,
    ClipboardCheck,
    ShoppingCart,
    Clock,
    Shirt,
    Calendar,
    Building2,
    Loader2,
    Package,
    Truck,
    CheckCircle2,
    Scissors
} from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import { Label } from "./ui/label";
import { api } from "../../services/api";
import { toast } from "sonner";
import { Modal } from "./ui/modal";
import { OrderForm } from "./OrderForm";

interface Order {
    id: number;
    org_id: number;
    org_name: string;
    branch: string;
    date: string;
    order_type: string;
    status: string;
    created_on: string;
    items: any[];
    stage_breakdown?: { stage_id: number; stage_name: string; total_pieces: number }[];
    all_completed?: boolean;
    completed_pieces?: number;
    stats?: {
        total: number;
        processing: number;
        completed: number;
        packed: number;
        delivered: number;
    };
}

export function OrderManagement() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [isNewOrderModalOpen, setIsNewOrderModalOpen] = useState(false);
    const [filterStatus, setFilterStatus] = useState("All");

    // View Details State
    const [selectedOrder, setSelectedOrder] = useState<any>(null);
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [detailsLoading, setDetailsLoading] = useState(false);

    // Direct Print State
    const [printData, setPrintData] = useState<any>(null);
    const [isPrinting, setIsPrinting] = useState(false);

    // Breakdown Modal State
    const [breakdownOrder, setBreakdownOrder] = useState<Order | null>(null);
    const [isBreakdownModalOpen, setIsBreakdownModalOpen] = useState(false);

    const fetchOrders = async () => {
        setLoading(true);
        try {
            const data = await api.get('/orders');
            // Filter out internal stock from the pipeline tracking
            const displayOrders = (data.orders || []).filter((o: any) => o.org_name !== 'INTERNAL STOCK PRODUCTION');
            setOrders(displayOrders);
        } catch (error) {
            toast.error("Failed to load orders");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOrders();
    }, []);

    const handleView = async (orderId: number) => {
        setDetailsLoading(true);
        setIsViewModalOpen(true);
        try {
            const data = await api.get(`/orders/${orderId}`);
            setSelectedOrder(data.order);
        } catch (error) {
            toast.error("Failed to load order details");
            setIsViewModalOpen(false);
        } finally {
            setDetailsLoading(false);
        }
    };

    const handleDirectPrint = async (orderId: number) => {
        setIsPrinting(true);
        try {
            const data = await api.get(`/orders/${orderId}`);
            setPrintData(data.order);
            // The useEffect will trigger window.print()
        } catch (error) {
            toast.error("Failed to prepare print");
            setIsPrinting(false);
        }
    };

    // Auto-print effect for direct print
    useEffect(() => {
        if (printData && isPrinting) {
            const timer = setTimeout(() => {
                window.print();
                setPrintData(null);
                setIsPrinting(false);
            }, 600);
            return () => clearTimeout(timer);
        }
    }, [printData, isPrinting]);

    const handleDispatchUpdate = async (orderId: number, status: string) => {
        try {
            await api.put(`/orders/${orderId}/dispatch`, { dispatch_status: status });
            toast.success(`Order marked as ${status}`);

            // If we are in the breakdown modal, refresh that specific order to update the view
            if (breakdownOrder && breakdownOrder.id === orderId) {
                const data = await api.get(`/orders/${orderId}`);
                if (data.order) {
                    setBreakdownOrder(data.order);
                    // Also refresh main list in background
                    fetchOrders();
                }
            } else {
                fetchOrders();
            }
        } catch (error) {
            toast.error(`Failed to update dispatch status`);
        }
    };

    const filteredOrders = orders.filter(order => {
        const matchesSearch =
            order.org_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            `ORD-${order.id}`.toLowerCase().includes(searchQuery.toLowerCase());

        let matchesStatus = filterStatus === "All" || order.status === filterStatus;

        // Smart matching for "Processing" filter to catch dynamic stages (Cutting, Stitching, etc.)
        if (filterStatus === "Processing") {
            const s = (order.status || '').toLowerCase();
            matchesStatus = s !== 'pending' && s !== 'completed' && s !== 'processed' && s !== 'stock' && s !== 'packed' && s !== 'delivered';
        }

        // Dispatch filter catches anything ready for or in the dispatch process
        if (filterStatus === "Dispatch") {
            const s = (order.status || '').toLowerCase();
            matchesStatus = s === 'completed' || s === 'packed' || s === 'delivered';
        }

        return matchesSearch && matchesStatus;
    });

    const getStatusColor = (status: string) => {
        const s = status.toLowerCase();
        if (s === 'completed' || s === 'processed') return 'bg-green-50 text-green-600 border-green-100 shadow-sm shadow-green-50';
        if (s === 'packed') return 'bg-indigo-50 text-indigo-600 border-indigo-100 shadow-sm shadow-indigo-50';
        if (s === 'delivered') return 'bg-slate-900 text-white border-slate-800 shadow-lg shadow-slate-200';
        if (s === 'pending') return 'bg-yellow-100 text-yellow-700 border-yellow-200 shadow-sm shadow-yellow-100';
        if (s === 'cutting') return 'bg-orange-100 text-orange-700 border-orange-200';
        if (s === 'partial cutting') return 'bg-orange-50 text-orange-600 border-orange-200 shadow-sm shadow-orange-50';
        if (s === 'cutting done') return 'bg-indigo-100 text-indigo-700 border-indigo-200';
        // Professional Blue for any active production stage (Stitching, Overlock, etc.)
        return 'bg-blue-50 text-blue-600 border-blue-100 shadow-sm shadow-blue-50';
    };

    return (
        <div className="flex-1 overflow-auto bg-[#f8fafc]">
            {/* Global Print Styles to hide everything else */}
            <style>{`
                @media print {
                    /* Hide everything by default */
                    body * {
                        visibility: hidden;
                    }
                    /* Show only the print root and its children */
                    #print-root, #print-root * {
                        visibility: visible;
                    }
                    /* Position print root at top-left of page */
                    #print-root {
                        position: absolute;
                        left: 0;
                        top: 0;
                        width: 100%;
                        display: block !important;
                    }
                    /* Remove any extra margins/padding from body that might break layout */
                    body {
                        margin: 0;
                        padding: 0;
                        background: white;
                    }
                }
            `}</style>

            {/* Header */}
            <div className="bg-white border-b border-gray-200 px-8 py-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-black text-gray-900 tracking-tight">Order Pipeline</h1>
                        <p className="text-sm font-bold text-gray-500 mt-1 uppercase tracking-widest leading-none">Track and manage customer commitments</p>
                    </div>
                    <Button
                        onClick={() => setIsNewOrderModalOpen(true)}
                        className="bg-[#e94560] hover:bg-[#d13a52] font-black px-6 h-12 rounded-xl shadow-lg shadow-rose-200 transition-all hover:scale-[1.02] active:scale-[0.98]"
                    >
                        <Plus className="w-5 h-5 mr-2" />
                        New Customer Order
                    </Button>
                </div>
            </div>

            {/* Tracking Content */}
            <div className="p-8 max-w-7xl mx-auto">
                {/* Filters Bar */}
                <div className="flex flex-col md:flex-row gap-4 mb-8">
                    <div className="relative flex-1">
                        <Search className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
                        <Input
                            placeholder="Search by client or Order ID (e.g. ORD-1)..."
                            className="pl-12 h-14 bg-white border-gray-100 shadow-sm rounded-2xl text-lg font-medium ring-offset-rose-500 focus-visible:ring-rose-500"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <div className="flex gap-2">
                        {["All", "Pending", "Processing", "Dispatch", "Completed"].map(status => (
                            <Button
                                key={status}
                                variant={filterStatus === status ? "default" : "outline"}
                                onClick={() => setFilterStatus(status)}
                                className={`h-14 px-6 rounded-2xl font-bold transition-all ${filterStatus === status
                                    ? "bg-slate-900 border-slate-900 text-white shadow-xl shadow-slate-200"
                                    : "bg-white border-gray-100 text-gray-500 hover:bg-gray-50"
                                    }`}
                            >
                                {status}
                            </Button>
                        ))}
                    </div>
                </div>

                {/* Orders Table */}
                <div className="bg-white rounded-3xl border border-gray-100 shadow-xl shadow-slate-100 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-slate-50/50 border-b border-gray-100">
                                    <th className="px-8 py-5 text-left text-[11px] font-black text-gray-400 uppercase tracking-widest">Order Identity</th>
                                    <th className="px-8 py-5 text-left text-[11px] font-black text-gray-400 uppercase tracking-widest">Client / Origin</th>
                                    <th className="px-8 py-5 text-left text-[11px] font-black text-gray-400 uppercase tracking-widest">Job Details</th>
                                    <th className="px-8 py-5 text-left text-[11px] font-black text-gray-400 uppercase tracking-widest">Timeline</th>
                                    <th className="px-8 py-5 text-left text-[11px] font-black text-gray-400 uppercase tracking-widest text-center">Current Status</th>
                                    <th className="px-8 py-5 text-right text-[11px] font-black text-gray-400 uppercase tracking-widest">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {loading ? (
                                    <tr>
                                        <td colSpan={6} className="py-20 text-center">
                                            <div className="flex flex-col items-center gap-3">
                                                <Loader2 className="w-10 h-10 animate-spin text-rose-500 opacity-20" />
                                                <span className="text-xs font-black text-gray-300 uppercase tracking-widest">Retrieving Pipeline...</span>
                                            </div>
                                        </td>
                                    </tr>
                                ) : filteredOrders.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="py-24 text-center">
                                            <div className="flex flex-col items-center gap-3 opacity-30">
                                                <ShoppingCart className="w-16 h-16 text-gray-400" />
                                                <p className="text-sm font-black text-gray-500 uppercase tracking-widest">No matching orders in system</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    filteredOrders.map((order) => (
                                        <tr key={order.id} className="hover:bg-rose-50/10 transition-colors group">
                                            <td className="px-8 py-6">
                                                <div className="flex flex-col">
                                                    <span className="font-mono text-lg font-black text-slate-900 group-hover:text-rose-600 transition-colors tracking-tight line-clamp-1">ORD-{order.id}</span>
                                                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-tighter">{order.order_type} Workflow</span>
                                                </div>
                                            </td>
                                            <td className="px-8 py-6">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 group-hover:bg-rose-100 group-hover:text-rose-600 transition-all">
                                                        <Building2 className="w-5 h-5" />
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="text-sm font-black text-slate-800 leading-tight">{order.org_name}</span>
                                                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">{order.branch || 'Main Site'}</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-8 py-6">
                                                <div className="flex flex-col gap-1">
                                                    <div className="flex items-center gap-2 text-sm font-bold text-slate-700">
                                                        <Shirt className="w-4 h-4 text-gray-400" />
                                                        <span>{order.items?.length || 0} Products</span>
                                                    </div>
                                                    <p className="text-[10px] text-gray-400 font-bold truncate max-w-[150px]">
                                                        {order.items?.map((i: any) => i.org_dress_name).join(', ')}
                                                    </p>
                                                </div>
                                            </td>
                                            <td className="px-8 py-6">
                                                <div className="flex items-center gap-3">
                                                    <div className="flex flex-col">
                                                        <span className="text-xs font-black text-slate-700 uppercase tracking-wider">Booked</span>
                                                        <span className="text-[11px] font-bold text-gray-400">{new Date(order.date || order.created_on).toLocaleDateString()}</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-8 py-6 text-center">
                                                <Badge
                                                    className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border border-transparent shadow-sm ${getStatusColor(order.status)} ${order.stage_breakdown && order.stage_breakdown.length > 0 ? 'cursor-pointer hover:scale-105 transition-transform' : ''
                                                        }`}
                                                    onClick={() => {
                                                        if (order.stage_breakdown && order.stage_breakdown.length > 0) {
                                                            setBreakdownOrder(order);
                                                            setIsBreakdownModalOpen(true);
                                                        }
                                                    }}
                                                >
                                                    {order.status === 'Delivered' ? 'Delivered' :
                                                        order.status === 'Packed' ? 'Packed' :
                                                            order.all_completed ? 'Completed' :
                                                                order.stage_breakdown && order.stage_breakdown.length > 0 ? 'In Progress' :
                                                                    order.status}
                                                </Badge>
                                            </td>
                                            <td className="px-8 py-6 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-10 w-10 rounded-xl hover:bg-rose-100 hover:text-rose-600 transition-all"
                                                        onClick={() => handleView(order.id)}
                                                    >
                                                        <Eye className="w-5 h-5" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-10 w-10 rounded-xl hover:bg-slate-100 text-slate-400 transition-all"
                                                        onClick={() => handleDirectPrint(order.id)}
                                                    >
                                                        {isPrinting && printData?.id === order.id ? (
                                                            <Loader2 className="w-4 h-4 animate-spin" />
                                                        ) : (
                                                            <Printer className="w-5 h-5" />
                                                        )}
                                                    </Button>

                                                    {/* Dispatch Actions */}
                                                    {/* Pack Action: Show ONLY if order is Fully Completed AND has items to pack */}
                                                    {order.all_completed && (order.stats?.completed || 0) > 0 && (
                                                        <Button
                                                            variant="outline"
                                                            size="icon"
                                                            className="h-10 w-10 rounded-xl border-indigo-100 hover:bg-indigo-50 text-indigo-600 transition-all"
                                                            onClick={() => handleDispatchUpdate(order.id, 'Packed')}
                                                            title="Mark as Packed"
                                                        >
                                                            <Package className="w-5 h-5" />
                                                        </Button>
                                                    )}

                                                    {/* Dispatch Action: Show if there are packed pieces waiting to be delivered */}
                                                    {(order.stats?.packed || 0) > 0 && (
                                                        <Button
                                                            variant="outline"
                                                            size="icon"
                                                            className="h-10 w-10 rounded-xl border-slate-200 hover:bg-slate-900 hover:text-white text-slate-900 transition-all"
                                                            onClick={() => handleDispatchUpdate(order.id, 'Delivered')}
                                                            title="Mark as Delivered"
                                                        >
                                                            <Truck className="w-5 h-5" />
                                                        </Button>
                                                    )}

                                                    {/* Delivered State - Show Checkmark if fully delivered */}
                                                    {order.status.toLowerCase() === 'delivered' && (
                                                        <div className="w-10 h-10 flex items-center justify-center">
                                                            <CheckCircle2 className="w-6 h-6 text-green-500" />
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* New Order Modal */}
            <Modal
                isOpen={isNewOrderModalOpen}
                onClose={() => setIsNewOrderModalOpen(false)}
                title="Establish New Production Commitment"
                size="xl"
            >
                <div className="h-[90vh] -mx-6 -mt-6">
                    <OrderForm
                        onSuccess={() => {
                            setIsNewOrderModalOpen(false);
                            fetchOrders();
                        }}
                        onCancel={() => setIsNewOrderModalOpen(false)}
                    />
                </div>
            </Modal>
            {/* Detail View Modal */}
            <Modal
                isOpen={isViewModalOpen}
                onClose={() => setIsViewModalOpen(false)}
                title={selectedOrder ? `Order Details: ORD-${selectedOrder.id}` : "Loading Details..."}
                size="lg"
            >
                {detailsLoading ? (
                    <div className="py-20 flex flex-col items-center gap-3">
                        <Loader2 className="w-10 h-10 animate-spin text-rose-500" />
                        <span className="text-xs font-black text-gray-400 uppercase tracking-widest">Fetching full record...</span>
                    </div>
                ) : selectedOrder && (
                    <div className="space-y-6 print:p-0">
                        {/* Summary Header */}
                        <div className="grid grid-cols-2 gap-4 pb-6 border-b border-gray-100">
                            <div className="space-y-1">
                                <Label className="text-[10px] font-black uppercase text-gray-400">Client Information</Label>
                                <p className="text-lg font-black text-slate-900">{selectedOrder.org_name}</p>
                                <p className="text-sm font-bold text-gray-500">{selectedOrder.branch || 'Main Branch'}</p>
                                <p className="text-xs text-gray-400 font-mono">{selectedOrder.phone}</p>
                            </div>
                            <div className="text-right space-y-1">
                                <Label className="text-[10px] font-black uppercase text-gray-400">Logistics Info</Label>
                                <p className="text-sm font-bold text-slate-700">Type: <span className="font-black text-rose-500">{selectedOrder.order_type}</span></p>
                                <p className="text-sm font-bold text-slate-700">Booked: {new Date(selectedOrder.date).toLocaleDateString()}</p>
                                <p className="text-sm font-bold text-slate-700">Due: {selectedOrder.eta && !selectedOrder.eta.startsWith('0000') && !selectedOrder.eta.startsWith('1899') && new Date(selectedOrder.eta).getFullYear() > 1900 ? new Date(selectedOrder.eta).toLocaleDateString() : 'TBD'}</p>
                            </div>
                        </div>

                        {/* Items Table */}
                        <div className="space-y-4">
                            <h3 className="text-xs font-black uppercase tracking-widest text-gray-400">Product Breakdown</h3>
                            <div className="border border-gray-100 rounded-2xl overflow-hidden bg-slate-50/50">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-gray-100">
                                            <th className="px-4 py-3 text-left font-black text-gray-500">Item Name</th>
                                            <th className="px-4 py-3 text-center font-black text-gray-500">Sizing Breakdown</th>
                                            <th className="px-4 py-3 text-right font-black text-gray-500">Subtotal</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 bg-white">
                                        {selectedOrder.items.map((item: any, idx: number) => {
                                            const sq = typeof item.sq === 'string' ? JSON.parse(item.sq) : item.sq;
                                            return (
                                                <tr key={idx}>
                                                    <td className="px-4 py-3">
                                                        <p className="font-bold text-slate-800">{item.org_dress_name}</p>
                                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">{item.remarks || 'Standard Production'}</p>
                                                    </td>
                                                    <td className="px-4 py-4 text-center">
                                                        <div className="flex items-center justify-center gap-2">
                                                            {Object.entries(sq).filter(([key]) => key !== '_meta').map(([size, qty]: any) => qty > 0 && (
                                                                <Badge key={size} variant="outline" className="text-[10px] font-black py-0 px-2 border-gray-100 bg-slate-50">
                                                                    {size}:{qty}
                                                                </Badge>
                                                            ))}
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3 text-right font-black text-slate-900">
                                                        {(Object.entries(sq).filter(([key]) => key !== '_meta').map(([, v]) => v) as number[]).reduce((a, b) => a + b, 0)} Pcs
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Financial Footer */}
                        <div className="bg-slate-900 rounded-2xl p-6 text-white grid grid-cols-2 gap-4 shadow-xl shadow-slate-200">
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase text-slate-400">Financial Summary</Label>
                                <div className="space-y-1">
                                    <p className="text-xs flex justify-between"><span>Advance Received:</span> <span className="font-black text-green-400">₹{selectedOrder.advance}</span></p>
                                    <p className="text-xs flex justify-between text-slate-400"><span>Payment Status:</span> <span className="uppercase font-black">{selectedOrder.status === 'Completed' ? 'Fully Paid' : 'Pending Accounting'}</span></p>
                                </div>
                            </div>
                            <div className="flex flex-col items-end justify-center">
                                <Button
                                    className="bg-white text-slate-900 hover:bg-slate-100 font-black px-8 h-12 rounded-xl"
                                    onClick={() => window.print()}
                                >
                                    <Printer className="w-4 h-4 mr-2" />
                                    Generate Invoice
                                </Button>
                            </div>
                        </div>
                    </div>
                )}
            </Modal>

            {/* Stage Breakdown Modal */}
            <Modal
                isOpen={isBreakdownModalOpen}
                onClose={() => setIsBreakdownModalOpen(false)}
                title={breakdownOrder ? `Production Progress - ORD-${breakdownOrder.id}` : "Progress Details"}
                size="md"
            >
                {breakdownOrder && (
                    <div className="space-y-4">
                        <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                            <div className="flex items-center justify-between mb-3">
                                <Label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Client</Label>
                                <p className="text-sm font-black text-slate-900">{breakdownOrder.org_name}</p>
                            </div>
                        </div>

                        {/* PACKED BUT NOT DELIVERED SECTION */}
                        {breakdownOrder.stats && breakdownOrder.stats.packed > 0 && (
                            <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center">
                                            <Package className="w-4 h-4 text-white" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-black text-indigo-900">Packed / Ready</p>
                                            <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-wide">Waiting for Dispatch</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <Button
                                            size="sm"
                                            className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs"
                                            onClick={() => {
                                                handleDispatchUpdate(breakdownOrder.id, 'Delivered');
                                                // setIsBreakdownModalOpen(false); // REMOVED to keep popup open
                                            }}
                                        >
                                            <Truck className="w-4 h-4 mr-2" />
                                            Dispatch
                                        </Button>
                                        <div className="text-right">
                                            <p className="text-2xl font-black text-indigo-900 leading-none">{breakdownOrder.stats.packed}</p>
                                            <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mt-1">PIECES</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Completed Pieces Section */}
                        {breakdownOrder.completed_pieces && breakdownOrder.completed_pieces > 0 && (
                            <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-green-500 flex items-center justify-center">
                                            <span className="text-white text-lg">✓</span>
                                        </div>
                                        <div>
                                            <p className="text-sm font-black text-green-900">Completed</p>
                                            <p className="text-[10px] font-bold text-green-600 uppercase tracking-wide">
                                                {breakdownOrder.all_completed ? "All Stages Done" : "Partially Completed"}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        {/* Show Packed Button for ANY partial completion */}
                                        {breakdownOrder.status !== 'Packed' && breakdownOrder.status !== 'Delivered' && (
                                            <Button
                                                size="sm"
                                                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs"
                                                onClick={() => {
                                                    handleDispatchUpdate(breakdownOrder.id, 'Packed');
                                                }}
                                            >
                                                <Package className="w-4 h-4 mr-2" />
                                                Pack {breakdownOrder.completed_pieces}
                                            </Button>
                                        )}

                                        <div className="text-right">
                                            <p className="text-2xl font-black text-green-900 leading-none">{breakdownOrder.completed_pieces}</p>
                                            <p className="text-[10px] font-black text-green-600 uppercase tracking-widest mt-1">PIECES</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Delivered Section */}
                        {breakdownOrder.status === 'Delivered' && (
                            <div className="bg-slate-900 rounded-xl p-4 text-white">
                                <div className="flex items-center gap-3">
                                    <CheckCircle2 className="w-8 h-8 text-green-400" />
                                    <div>
                                        <p className="text-lg font-black">Order Delivered</p>
                                        <p className="text-xs text-slate-400">All items have been dispatched to the client.</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="space-y-3">
                            <Label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">In Progress</Label>
                            {breakdownOrder.stage_breakdown && breakdownOrder.stage_breakdown.filter(s => s.total_pieces > 0).length > 0 ? (
                                <div className="space-y-2">
                                    {breakdownOrder.stage_breakdown.filter(s => s.total_pieces > 0).map((stage) => (
                                        <div key={stage.stage_id} className="flex items-center justify-between p-4 bg-white border border-gray-100 rounded-xl hover:border-blue-200 transition-colors">
                                            <div className="flex items-center gap-3">
                                                {stage.stage_id === 999 ? (
                                                    <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center">
                                                        <Scissors className="w-4 h-4 text-amber-600" />
                                                    </div>
                                                ) : (
                                                    <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                                                        <span className="text-xs font-black text-blue-600">{stage.stage_id}</span>
                                                    </div>
                                                )}
                                                <div>
                                                    <p className="text-sm font-black text-slate-900">{stage.stage_name}</p>
                                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">
                                                        {stage.stage_id === 999 ? "External Processing" : "Processing Stage"}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-2xl font-black text-slate-900 leading-none">{stage.total_pieces}</p>
                                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">PIECES</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-sm text-gray-500 italic py-6 text-center">No active processing stages</p>
                            )}
                        </div>

                        <div className="pt-4 border-t border-gray-100">
                            <Button
                                className="w-full bg-slate-900 hover:bg-slate-800 font-black"
                                onClick={() => setIsBreakdownModalOpen(false)}
                            >
                                Close
                            </Button>
                        </div>
                    </div>
                )}
            </Modal>
            {/* Hidden Direct Print Area (Rendered only during print via global style) */}
            {printData && (
                <div id="print-root" className="fixed inset-0 z-[9999] bg-white p-12 overflow-visible">
                    <div className="max-w-4xl mx-auto space-y-8">
                        {/* Summary Header */}
                        <div className="flex justify-between items-start border-b-2 border-slate-900 pb-8">
                            <div>
                                <h1 className="text-4xl font-black text-slate-900 mb-2 tracking-tighter uppercase italic">TH GARMENTS</h1>
                                <p className="text-sm font-black text-slate-400 uppercase tracking-[0.3em] leading-none">Production Invoice / Memo</p>
                            </div>
                            <div className="text-right">
                                <span className="inline-block px-4 py-1 bg-rose-600 text-white font-black text-xl rounded-lg mb-2">ORD-{printData.id}</span>
                                <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">{new Date().toLocaleDateString()}</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-12 py-8 border-b border-slate-100">
                            <div className="space-y-6">
                                <div>
                                    <Label className="text-[10px] font-black uppercase text-rose-500 tracking-[0.2em] mb-2 block">Customer Record</Label>
                                    <p className="text-2xl font-black text-slate-900 leading-none">{printData.org_name}</p>
                                    <p className="text-sm font-bold text-slate-500 mt-2">{printData.branch || 'Headquarters'}</p>
                                    <p className="text-xs font-black text-slate-400 font-mono mt-1">+91 {printData.phone}</p>
                                </div>
                                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
                                    <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1 block">Customer Reference</Label>
                                    <p className="text-sm font-bold text-slate-700 whitespace-pre-wrap leading-relaxed">{printData.customer_details || 'No special reference tracking provided'}</p>
                                </div>
                            </div>
                            <div className="space-y-6">
                                <div className="grid grid-cols-2 gap-6">
                                    <div className="space-y-3">
                                        <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Workflow Info</Label>
                                        <div className="space-y-1">
                                            <p className="text-sm font-bold">Category: <span className="font-black text-slate-900">{printData.order_type}</span></p>
                                            <p className="text-sm font-bold">Booked: <span className="font-black text-slate-900">{new Date(printData.date).toLocaleDateString()}</span></p>
                                            <p className="text-sm font-bold">Expected: <span className="font-black text-rose-600">{printData.eta && !printData.eta.startsWith('0000') && new Date(printData.eta).getFullYear() > 1900 ? new Date(printData.eta).toLocaleDateString() : 'ASAP'}</span></p>
                                        </div>
                                    </div>
                                    <div className="space-y-1 text-right">
                                        <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Financial Stat</Label>
                                        <div className="flex flex-col items-end">
                                            <p className="text-[10px] font-black text-green-600 uppercase">Advance Paid</p>
                                            <p className="font-black text-slate-900 text-3xl tracking-tighter mt-1">₹{printData.advance}</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="bg-slate-900 text-white p-5 rounded-2xl shadow-lg shadow-slate-200">
                                    <Label className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-1 block">Internal Remarks</Label>
                                    <p className="text-sm font-bold text-slate-200 italic leading-relaxed">"{printData.remarks || 'Proceed with standard production guidelines as per pattern master'}"</p>
                                </div>
                            </div>
                        </div>

                        {/* Items Table */}
                        <div className="space-y-4">
                            <Label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.3em] ml-2">Job Breakdown</Label>
                            <div className="border-2 border-slate-900 rounded-[2rem] overflow-hidden">
                                <table className="w-full">
                                    <thead className="bg-slate-950 text-white">
                                        <tr>
                                            <th className="px-8 py-5 text-left font-black uppercase tracking-widest text-[11px]">Product Details</th>
                                            <th className="px-8 py-5 text-center font-black uppercase tracking-widest text-[11px]">Sizing Inventory</th>
                                            <th className="px-8 py-5 text-right font-black uppercase tracking-widest text-[11px]">Subtotal</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y-2 divide-slate-100">
                                        {printData.items.map((item: any, idx: number) => {
                                            const sq = typeof item.sq === 'string' ? JSON.parse(item.sq) : item.sq;
                                            return (
                                                <tr key={idx} className="bg-white">
                                                    <td className="px-8 py-6">
                                                        <p className="font-black text-slate-900 text-xl tracking-tighter uppercase">{item.org_dress_name}</p>
                                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">{item.remarks || 'Official Production'}</p>
                                                    </td>
                                                    <td className="px-8 py-6">
                                                        <div className="flex items-center justify-center gap-3">
                                                            {Object.entries(sq).filter(([key]) => key !== '_meta').map(([size, qty]: any) => qty > 0 && (
                                                                <div key={size} className="flex flex-col items-center bg-slate-50 border border-slate-200 rounded-xl px-4 py-2">
                                                                    <span className="text-[10px] font-black text-slate-400 leading-none mb-1 uppercase tracking-tighter">{size}</span>
                                                                    <span className="text-lg font-black text-slate-900 leading-none">{qty}</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </td>
                                                    <td className="px-8 py-6 text-right">
                                                        <p className="font-black text-3xl text-slate-900 tracking-tighter leading-none">
                                                            {(Object.entries(sq).filter(([key]) => key !== '_meta').map(([, v]) => v) as number[]).reduce((a, b) => a + b, 0)}
                                                        </p>
                                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">PIECES</p>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Signature Area */}
                        <div className="pt-32 grid grid-cols-2 gap-16">
                            <div className="text-center">
                                <div className="h-px bg-slate-900 w-full mb-3" />
                                <p className="text-[10px] font-black text-slate-900 uppercase tracking-[0.3em]">Verified By (TH Garments)</p>
                            </div>
                            <div className="text-center">
                                <div className="h-px bg-slate-900 w-full mb-3" />
                                <p className="text-[10px] font-black text-slate-900 uppercase tracking-[0.3em]">Client Acceptance (Sign/Seal)</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
