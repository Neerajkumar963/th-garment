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
        <div>
            <div className="page-header">
                <h1 className="page-title">Dashboard</h1>
                <p className="page-subtitle">Overview of your garment production and inventory</p>
            </div>

            {/* Stock Summary Cards */}
            <div className="stats-grid mb-xl">
                <div className="stat-card">
                    <div className="stat-label">Cloth Stock</div>
                    <div className="stat-value">{summary?.stocks?.clothStock || 0}</div>
                    <div className="text-muted" style={{ fontSize: '0.75rem' }}>meters</div>
                </div>

                <div className="stat-card">
                    <div className="stat-label">Cut Stock</div>
                    <div className="stat-value">{summary?.stocks?.cutStock || 0}</div>
                    <div className="text-muted" style={{ fontSize: '0.75rem' }}>items</div>
                </div>

                <div className="stat-card">
                    <div className="stat-label">Selling Stock</div>
                    <div className="stat-value">{summary?.stocks?.sellingStock || 0}</div>
                    <div className="text-muted" style={{ fontSize: '0.75rem' }}>items</div>
                </div>
            </div>

            {/* Processing Summary Cards */}
            <div className="stats-grid mb-xl">
                <div className="stat-card">
                    <div className="stat-label">Processing Items</div>
                    <div className="stat-value">{summary?.processing?.active || 0}</div>
                    <div className="text-muted" style={{ fontSize: '0.75rem' }}>in progress</div>
                </div>

                <div className="stat-card">
                    <div className="stat-label">Delivered Items</div>
                    <div className="stat-value">{summary?.processing?.delivered || 0}</div>
                    <div className="text-muted" style={{ fontSize: '0.75rem' }}>completed</div>
                </div>
            </div>

            {/* Orders Summary Cards */}
            <div className="stats-grid mb-xl">
                <div className="stat-card">
                    <div className="stat-label">Pending Orders</div>
                    <div className="stat-value">{summary?.orders?.pending || 0}</div>
                </div>

                <div className="stat-card">
                    <div className="stat-label">In-Process Orders</div>
                    <div className="stat-value">{summary?.orders?.inProcess || 0}</div>
                </div>

                <div className="stat-card">
                    <div className="stat-label">Delivered Orders</div>
                    <div className="stat-value">{summary?.orders?.delivered || 0}</div>
                </div>

                <div className="stat-card">
                    <div className="stat-label">Total Orders</div>
                    <div className="stat-value">{summary?.orders?.total || 0}</div>
                </div>
            </div>

            {/* Recent Activity */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-lg)' }}>
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
