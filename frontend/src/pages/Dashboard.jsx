import { useState, useEffect } from 'react';
import Card from '../components/Card';
import Table from '../components/Table';
import { dashboardAPI } from '../services/api';

export default function Dashboard() {
    const [summary, setSummary] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchSummary();
    }, []);

    const fetchSummary = async () => {
        try {
            setLoading(true);
            const response = await dashboardAPI.getSummary();
            setSummary(response.data);
            setError(null);
        } catch (err) {
            setError(err.message);
            console.error('Error fetching dashboard summary:', err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return <div className="loading">Loading dashboard...</div>;
    }

    if (error) {
        return <div className="empty-state text-danger">Error: {error}</div>;
    }

    const processingColumns = [
        { header: 'Org/Dress Name', key: 'org_dress_name' },
        { header: 'Size', key: 'size' },
        { header: 'Quantity', key: 'quantity' },
        { header: 'Current Stage', key: 'current_stage_name' },
        {
            header: 'Last Update',
            key: 'last_stage_update',
            render: (value) => new Date(value).toLocaleDateString()
        },
    ];

    const ordersColumns = [
        { header: 'ID', key: 'id' },
        { header: 'Customer', key: 'customer_name' },
        {
            header: 'Status',
            key: 'status',
            render: (value) => (
                <span className={`badge badge-${getStatusBadge(value)}`}>
                    {value}
                </span>
            )
        },
        { header: 'Quantity', key: 'total_quantity' },
        {
            header: 'Order Date',
            key: 'order_date',
            render: (value) => new Date(value).toLocaleDateString()
        },
    ];

    const getStatusBadge = (status) => {
        switch (status) {
            case 'pending': return 'warning';
            case 'in-process': return 'info';
            case 'ready': return 'success';
            case 'delivered': return 'secondary';
            default: return 'secondary';
        }
    };

    return (
        <div className="dashboard-container">
            <div className="page-header flex-between mb-xl">
                <div>
                    <h1 className="page-title text-gradient">Dashboard</h1>
                    <p className="page-subtitle">Overview of your garment production and inventory</p>
                </div>
                <div className="date-display text-muted font-medium">
                    {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </div>
            </div>

            {/* Stock Summary Cards */}
            <div className="section-title mb-md text-secondary font-semibold uppercase tracking-wider text-xs">Inventory Overview</div>
            <div className="stats-grid mb-xl">
                <div className="stat-card glass-effect">
                    <div className="flex-between mb-sm">
                        <div className="stat-label">Cloth Stock</div>
                        <div className="stat-icon-bg bg-indigo-100 text-indigo-600 p-2 rounded-lg">
                            <span style={{ fontSize: '1.2rem' }}>🧵</span>
                        </div>
                    </div>
                    <div className="stat-value text-indigo-600">{summary?.stocks?.clothStock || 0}</div>
                    <div className="text-muted text-sm">meters available</div>
                </div>

                <div className="stat-card glass-effect">
                    <div className="flex-between mb-sm">
                        <div className="stat-label">Cut Stock</div>
                        <div className="stat-icon-bg bg-pink-100 text-pink-600 p-2 rounded-lg">
                            <span style={{ fontSize: '1.2rem' }}>✂️</span>
                        </div>
                    </div>
                    <div className="stat-value text-pink-500">{summary?.stocks?.cutStock || 0}</div>
                    <div className="text-muted text-sm">items ready</div>
                </div>

                <div className="stat-card glass-effect">
                    <div className="flex-between mb-sm">
                        <div className="stat-label">Selling Stock</div>
                        <div className="stat-icon-bg bg-purple-100 text-purple-600 p-2 rounded-lg">
                            <span style={{ fontSize: '1.2rem' }}>🛍️</span>
                        </div>
                    </div>
                    <div className="stat-value text-purple-600">{summary?.stocks?.sellingStock || 0}</div>
                    <div className="text-muted text-sm">items for sale</div>
                </div>

                <div className="stat-card glass-effect">
                    <div className="flex-between mb-sm">
                        <div className="stat-label">Finished Goods</div>
                        <div className="stat-icon-bg bg-green-100 text-green-600 p-2 rounded-lg">
                            <span style={{ fontSize: '1.2rem' }}>✅</span>
                        </div>
                    </div>
                    <div className="stat-value text-green-600">{summary?.stocks?.finishedGoods || 0}</div>
                    <div className="text-muted text-sm">completed items</div>
                </div>

                <div className="stat-card glass-effect">
                    <div className="flex-between mb-sm">
                        <div className="stat-label">Ready Items</div>
                        <div className="stat-icon-bg bg-blue-100 text-blue-600 p-2 rounded-lg">
                            <span style={{ fontSize: '1.2rem' }}>📦</span>
                        </div>
                    </div>
                    <div className="stat-value text-blue-600">{summary?.stocks?.readyItems || 0}</div>
                    <div className="text-muted text-sm">ready-made</div>
                </div>

                <div className="stat-card glass-effect">
                    <div className="flex-between mb-sm">
                        <div className="stat-label">Dead Stock</div>
                        <div className="stat-icon-bg bg-red-100 text-red-600 p-2 rounded-lg">
                            <span style={{ fontSize: '1.2rem' }}>⚠️</span>
                        </div>
                    </div>
                    <div className="stat-value text-red-600">{summary?.stocks?.deadStock || 0}</div>
                    <div className="text-muted text-sm">lost/damaged</div>
                </div>
            </div>

            {/* Processing, Job Works & Orders Grid */}
            <div className="grid-cols-3 gap-lg mb-xl" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 'var(--spacing-lg)' }}>
                {/* Processing Summary */}
                <div className="card glass-effect">
                    <div className="card-header flex-between">
                        <h3 className="card-title">Processing Status</h3>
                        <span className="badge badge-info">Live</span>
                    </div>
                    <div className="card-body">
                        <div className="flex justify-between items-center mb-md p-md bg-secondary rounded-lg" style={{ padding: 'var(--spacing-md)', backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)' }}>
                            <div>
                                <div className="text-2xl font-bold text-primary">{summary?.processing?.selfProcessing || 0}</div>
                                <div className="text-xs text-muted uppercase tracking-wider">Self Processing</div>
                            </div>
                            <div className="text-right">
                                <div className="text-2xl font-bold text-warning">{summary?.processing?.fabricatorWork || 0}</div>
                                <div className="text-xs text-muted uppercase tracking-wider">With Fabricators</div>
                            </div>
                        </div>
                        <div className="progress-bar-container" style={{ height: '6px', background: 'var(--bg-tertiary)', borderRadius: '10px', overflow: 'hidden' }}>
                            <div className="progress-bar" style={{ width: '65%', height: '100%', background: 'var(--primary-gradient)' }}></div>
                        </div>
                    </div>
                </div>

                {/* Job Works Summary */}
                <div className="card glass-effect">
                    <div className="card-header flex-between">
                        <h3 className="card-title">Job Works</h3>
                        <span className="badge badge-warning">Active</span>
                    </div>
                    <div className="card-body grid grid-cols-3 gap-md" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--spacing-md)' }}>
                        <div className="p-sm rounded-md text-center bg-warning-bg" style={{ backgroundColor: 'var(--warning-bg)', padding: 'var(--spacing-sm)', borderRadius: 'var(--radius-md)' }}>
                            <div className="font-bold text-lg text-warning">{summary?.jobWorks?.active || 0}</div>
                            <div className="text-xs text-muted">Active</div>
                        </div>
                        <div className="p-sm rounded-md text-center bg-info-bg" style={{ backgroundColor: '#e0f2fe', padding: 'var(--spacing-sm)', borderRadius: 'var(--radius-md)' }}>
                            <div className="font-bold text-lg text-info">{summary?.jobWorks?.pending_qty || 0}</div>
                            <div className="text-xs text-muted">Pending</div>
                        </div>
                        <div className="p-sm rounded-md text-center bg-success-bg" style={{ backgroundColor: 'var(--success-bg)', padding: 'var(--spacing-sm)', borderRadius: 'var(--radius-md)' }}>
                            <div className="font-bold text-lg text-success">{summary?.jobWorks?.completed || 0}</div>
                            <div className="text-xs text-muted">Done</div>
                        </div>
                    </div>
                </div>

                {/* Orders Summary */}
                <div className="card glass-effect">
                    <div className="card-header flex-between">
                        <h3 className="card-title">Order Statistics</h3>
                        <span className="badge badge-warning">Today</span>
                    </div>
                    <div className="card-body grid grid-cols-2 gap-md" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-md)' }}>
                        <div className="p-sm rounded-md text-center bg-warning-bg" style={{ backgroundColor: 'var(--warning-bg)', padding: 'var(--spacing-sm)', borderRadius: 'var(--radius-md)' }}>
                            <div className="font-bold text-lg text-warning">{summary?.orders?.pending || 0}</div>
                            <div className="text-xs text-muted">Pending</div>
                        </div>
                        <div className="p-sm rounded-md text-center bg-info-bg" style={{ backgroundColor: '#e0f2fe', padding: 'var(--spacing-sm)', borderRadius: 'var(--radius-md)' }}>
                            <div className="font-bold text-lg text-info">{summary?.orders?.inProcess || 0}</div>
                            <div className="text-xs text-muted">Process</div>
                        </div>
                        <div className="p-sm rounded-md text-center bg-success-bg" style={{ backgroundColor: 'var(--success-bg)', padding: 'var(--spacing-sm)', borderRadius: 'var(--radius-md)' }}>
                            <div className="font-bold text-lg text-success">{summary?.orders?.delivered || 0}</div>
                            <div className="text-xs text-muted">Delivered</div>
                        </div>
                        <div className="p-sm rounded-md text-center bg-secondary-bg" style={{ backgroundColor: 'var(--bg-tertiary)', padding: 'var(--spacing-sm)', borderRadius: 'var(--radius-md)' }}>
                            <div className="font-bold text-lg text-secondary">{summary?.orders?.total || 0}</div>
                            <div className="text-xs text-muted">Total</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Recent Activity */}
            <div className="recent-activity-section" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 'var(--spacing-lg)' }}>
                <Card title="Recent Processing Activity">
                    {summary?.recentActivity?.processing?.length > 0 ? (
                        <Table
                            columns={processingColumns}
                            data={summary.recentActivity.processing}
                        />
                    ) : (
                        <div className="empty-state">No recent processing activity</div>
                    )}
                </Card>

                <Card title="Recent Orders">
                    {summary?.recentActivity?.orders?.length > 0 ? (
                        <Table
                            columns={ordersColumns}
                            data={summary.recentActivity.orders}
                        />
                    ) : (
                        <div className="empty-state">No recent orders</div>
                    )}
                </Card>
            </div>
        </div>
    );
}
