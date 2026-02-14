import { useState, useEffect } from "react";
import { ArrowUpRight, ArrowDownRight, Clock, CheckCircle2, AlertCircle, Package } from "lucide-react";
import { Badge } from "./ui/badge";
import { api } from "../../services/api";
import { toast } from "sonner";

export function Dashboard() {
    const [stats, setStats] = useState({
        pendingOrders: 0,
        inProduction: 0,
        completedToday: 0,
        lowStockItems: 0
    });
    const [recentOrders, setRecentOrders] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                const [statsData, ordersData] = await Promise.all([
                    api.get('/dashboard/stats'),
                    api.get('/dashboard/recent-orders')
                ]);

                setStats({
                    pendingOrders: statsData.stats?.pendingOrders || 0,
                    inProduction: statsData.stats?.inProduction || 0,
                    completedToday: statsData.stats?.completedToday || 0,
                    lowStockItems: statsData.stats?.lowStock || 0
                });
                // Filter out internal stock from recent orders display
                const displayOrders = (ordersData.orders || []).filter((o: any) => o.org_name !== 'INTERNAL STOCK PRODUCTION');
                setRecentOrders(displayOrders);
            } catch (error: any) {
                toast.error(error.message || "Failed to load dashboard data");
            } finally {
                setLoading(false);
            }
        };
        fetchDashboardData();
    }, []);

    const statCards = [
        {
            label: "Pending Orders",
            value: stats.pendingOrders.toString(),
            change: "Active orders",
            trend: "neutral",
            icon: "📋",
            color: "from-blue-500 to-blue-600",
        },
        {
            label: "In Production",
            value: stats.inProduction.toString(),
            change: "Processing",
            trend: "neutral",
            icon: "⚙️",
            color: "from-orange-500 to-orange-600",
        },
        {
            label: "Completed Today",
            value: stats.completedToday.toString(),
            change: "Finished jobs",
            trend: "neutral",
            icon: "✅",
            color: "from-green-500 to-green-600",
        },
        {
            label: "Low Stock Items",
            value: stats.lowStockItems.toString(),
            change: "Needs attention",
            trend: "neutral",
            icon: "📦",
            color: "from-red-500 to-red-600",
        },
    ];

    const activityFeed = [
        { action: "System Live", detail: "ERP Backend Connected", time: "Just now", icon: Package },
        { action: "Stock Monitor", detail: "Fabric levels synced", time: "Real-time", icon: CheckCircle2 },
    ];

    return (
        <div className="flex-1 overflow-auto">
            {/* Header */}
            <div className="bg-white border-b border-gray-200 px-8 py-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
                        <div className="flex items-center gap-2 mt-1">
                            <p className="text-sm text-gray-600 font-medium">Welcome back! Here's your overview.</p>
                            <span className="w-1 h-1 rounded-full bg-gray-300" />
                            <p className="text-sm text-gray-400 font-bold uppercase tracking-tight">
                                {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="p-8">
                {/* Stat Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    {statCards.map((card, index) => (
                        <div
                            key={index}
                            className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow"
                        >
                            <div className="flex items-start justify-between mb-4">
                                <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${card.color} flex items-center justify-center text-2xl shadow-lg`}>
                                    {card.icon}
                                </div>
                            </div>
                            <p className="text-xs uppercase tracking-wider text-gray-500 mb-1">{card.label}</p>
                            <p className="text-3xl font-bold text-gray-900 mb-2">{card.value}</p>
                            <div className="flex items-center gap-1 text-xs">
                                {card.trend === "up" && <ArrowUpRight className="w-3 h-3 text-green-600" />}
                                {card.trend === "down" && <ArrowDownRight className="w-3 h-3 text-red-600" />}
                                <span className={card.trend === "up" ? "text-green-600" : card.trend === "down" ? "text-red-600" : "text-gray-600"}>
                                    {card.change}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Recent Orders */}
                    <div className="lg:col-span-2">
                        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
                            <div className="px-6 py-4 border-b border-gray-200">
                                <h2 className="text-lg font-bold text-gray-900">Recent Orders</h2>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-gray-50 border-b border-gray-200">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Order ID</th>
                                            <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Client</th>
                                            <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Details</th>
                                            <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Status</th>
                                            <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Date</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200">
                                        {loading ? (
                                            <tr><td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">Loading orders...</td></tr>
                                        ) : recentOrders.length === 0 ? (
                                            <tr><td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">No recent orders found</td></tr>
                                        ) : recentOrders.map((order: any) => (
                                            <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-mono text-sm font-medium text-gray-900">ORD-{order.id}</span>
                                                        {order.order_type === "Urgent" && (
                                                            <span className="px-2 py-0.5 text-xs font-bold text-red-600 bg-red-50 rounded">URGENT</span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="text-sm font-medium text-gray-900">{order.org_name}</div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="text-sm text-gray-900">{order.total_pieces} Pieces</div>
                                                    <div className="text-xs text-gray-500">{order.branch}</div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <Badge
                                                        variant={
                                                            order.status === "Completed"
                                                                ? "default"
                                                                : order.status === "Processing"
                                                                    ? "secondary"
                                                                    : "outline"
                                                        }
                                                        className={
                                                            order.status === "Completed"
                                                                ? "bg-green-100 text-green-700 border-green-200"
                                                                : order.status === "Processing"
                                                                    ? "bg-blue-100 text-blue-700 border-blue-200"
                                                                    : "bg-yellow-100 text-yellow-700 border-yellow-200"
                                                        }
                                                    >
                                                        {order.status.toUpperCase()}
                                                    </Badge>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                    {new Date(order.date || order.created_on).toLocaleDateString()}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    {/* Activity Feed */}
                    <div className="lg:col-span-1">
                        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
                            <div className="px-6 py-4 border-b border-gray-200">
                                <h2 className="text-lg font-bold text-gray-900">Recent Activity</h2>
                            </div>
                            <div className="p-6 space-y-4">
                                {activityFeed.map((activity, index) => {
                                    const Icon = activity.icon;
                                    return (
                                        <div key={index} className="flex gap-3">
                                            <div className="flex-shrink-0">
                                                <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                                                    <Icon className="w-4 h-4 text-gray-600" />
                                                </div>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-gray-900">{activity.action}</p>
                                                <p className="text-xs text-gray-500 mt-0.5">{activity.detail}</p>
                                                <p className="text-xs text-gray-400 mt-1">{activity.time}</p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
