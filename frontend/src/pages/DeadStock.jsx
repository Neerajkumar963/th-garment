import { useState, useEffect } from 'react';
import Card from '../components/Card';
import Table from '../components/Table';
import Button from '../components/Button';
import { stockAPI } from '../services/api';

export default function DeadStock() {
    const [deadStock, setDeadStock] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all'); // all, self_processing, job_work, cutting, other

    useEffect(() => {
        fetchDeadStock();
    }, []);

    const fetchDeadStock = async () => {
        try {
            setLoading(true);
            const response = await stockAPI.getDeadStock();
            setDeadStock(response.data.data);
        } catch (error) {
            console.error('Error fetching dead stock:', error);
            alert('Failed to fetch dead stock');
        } finally {
            setLoading(false);
        }
    };

    const getFilteredData = () => {
        if (filter === 'all') return deadStock;
        return deadStock.filter(item => item.source === filter);
    };

    const getSourceStats = () => {
        const stats = {
            all: deadStock.length,
            self_processing: 0,
            job_work: 0,
            cutting: 0,
            other: 0,
            total_qty: 0
        };

        deadStock.forEach(item => {
            const source = item.source || 'other';
            if (stats[source] !== undefined) stats[source]++;
            stats.total_qty += item.quantity;
        });

        return stats;
    };

    const stats = getSourceStats();
    const filteredData = getFilteredData();

    const columns = [
        { header: 'Item Name', key: 'item_name' },
        { header: 'Size', key: 'size' },
        {
            header: 'Quantity',
            key: 'quantity',
            render: (value) => <span className="font-semibold text-danger">{value}</span>
        },
        {
            header: 'Source',
            key: 'source',
            render: (value) => {
                const colors = {
                    'self_processing': 'info',
                    'job_work': 'warning',
                    'cutting': 'secondary',
                    'ready_item': 'primary',
                    'other': 'secondary'
                };
                const labels = {
                    'self_processing': 'Self Processing',
                    'job_work': 'Job Work',
                    'cutting': 'Cutting',
                    'ready_item': 'Ready Item',
                    'other': 'Other'
                };
                return (
                    <span className={`badge badge-${colors[value] || 'secondary'}`}>
                        {labels[value] || value}
                    </span>
                );
            }
        },
        {
            header: 'Reason',
            key: 'reason',
            render: (value) => <span className="text-sm text-muted">{value || 'No reason provided'}</span>
        },
        {
            header: 'Moved Date',
            key: 'moved_date',
            render: (value) => new Date(value).toLocaleDateString()
        }
    ];

    if (loading) {
        return <div className="loading">Loading dead stock...</div>;
    }

    return (
        <div className="page-container">
            <div className="page-header mb-xl">
                <h1 className="page-title text-gradient">Dead / Loss Stock</h1>
                <p className="page-subtitle">Items marked as damaged, lost, or unusable</p>
            </div>

            {/* Statistics Cards */}
            <div className="grid-cols-5 gap-lg mb-lg">
                <Card>
                    <div className="stat-label">Total Items</div>
                    <div className="stat-value text-danger">{stats.all}</div>
                    <div className="text-xs text-muted">{stats.total_qty} pieces</div>
                </Card>
                <Card>
                    <div className="stat-label">Self Processing</div>
                    <div className="stat-value text-info">{stats.self_processing}</div>
                </Card>
                <Card>
                    <div className="stat-label">Job Work</div>
                    <div className="stat-value text-warning">{stats.job_work}</div>
                </Card>
                <Card>
                    <div className="stat-label">Cutting</div>
                    <div className="stat-value text-secondary">{stats.cutting}</div>
                </Card>
                <Card>
                    <div className="stat-label">Other</div>
                    <div className="stat-value text-muted">{stats.other}</div>
                </Card>
            </div>

            {/* Filter Buttons */}
            <div className="flex gap-md mb-md">
                <Button
                    variant={filter === 'all' ? 'primary' : 'secondary'}
                    size="small"
                    onClick={() => setFilter('all')}
                >
                    All ({stats.all})
                </Button>
                <Button
                    variant={filter === 'self_processing' ? 'primary' : 'secondary'}
                    size="small"
                    onClick={() => setFilter('self_processing')}
                >
                    Self Processing ({stats.self_processing})
                </Button>
                <Button
                    variant={filter === 'job_work' ? 'primary' : 'secondary'}
                    size="small"
                    onClick={() => setFilter('job_work')}
                >
                    Job Work ({stats.job_work})
                </Button>
                <Button
                    variant={filter === 'cutting' ? 'primary' : 'secondary'}
                    size="small"
                    onClick={() => setFilter('cutting')}
                >
                    Cutting ({stats.cutting})
                </Button>
                <Button
                    variant={filter === 'other' ? 'primary' : 'secondary'}
                    size="small"
                    onClick={() => setFilter('other')}
                >
                    Other ({stats.other})
                </Button>
            </div>

            <Card>
                {filteredData.length > 0 ? (
                    <>
                        <div className="bg-danger-bg p-sm rounded-lg mb-md text-sm">
                            <strong>⚠️ Note:</strong> Dead stock items are permanently removed from circulation and cannot be recovered.
                        </div>
                        <Table columns={columns} data={filteredData} />
                    </>
                ) : (
                    <div className="empty-state">
                        {filter === 'all'
                            ? 'No dead stock items found. Great job!'
                            : `No dead stock from ${filter.replace('_', ' ')} found.`}
                    </div>
                )}
            </Card>
        </div>
    );
}
