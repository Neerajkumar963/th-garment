import { useState, useEffect } from 'react';
import Card from '../components/Card';
import Table from '../components/Table';
import Button from '../components/Button';
import { jobWorksAPI } from '../services/api';
import { useNavigate } from 'react-router-dom';

export default function JobWorks() {
    const [allJobWorks, setAllJobWorks] = useState([]); // Store ALL job works
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all'); // all, issued, partially_received, completed
    const navigate = useNavigate();

    useEffect(() => {
        fetchJobWorks();
    }, []); // Fetch only once on mount

    const fetchJobWorks = async () => {
        try {
            setLoading(true);
            const response = await jobWorksAPI.getAll(); // Fetch ALL job works
            setAllJobWorks(response.data.data);
        } catch (error) {
            console.error('Error fetching job works:', error);
            alert('Failed to fetch job works');
        } finally {
            setLoading(false);
        }
    };

    // Calculate statistics from ALL job works (never changes)
    const getStatusStats = () => {
        const stats = {
            all: allJobWorks.length,
            issued: 0,
            partially_received: 0,
            completed: 0,
            total_pending: 0
        };

        allJobWorks.forEach(job => {
            if (job.status === 'issued') stats.issued++;
            if (job.status === 'partially_received') stats.partially_received++;
            if (job.status === 'completed') stats.completed++;
            stats.total_pending += job.total_pending_qty;
        });

        return stats;
    };

    const stats = getStatusStats();

    // Filter job works for display only
    const filteredJobWorks = filter === 'all'
        ? allJobWorks
        : allJobWorks.filter(job => job.status === filter);

    const columns = [
        {
            header: 'Job Number',
            key: 'job_number',
            render: (value) => <span className="font-mono font-semibold text-primary">{value}</span>
        },
        { header: 'Fabricator', key: 'fabricator_name' },
        { header: 'Item', key: 'org_dress_name' },
        { header: 'Design', key: 'design' },
        { header: 'Cloth', key: 'cloth_name' },
        {
            header: 'Status',
            key: 'status',
            render: (value) => {
                const colors = {
                    'issued': 'warning',
                    'partially_received': 'info',
                    'completed': 'success'
                };
                return (
                    <span className={`badge badge-${colors[value] || 'secondary'}`}>
                        {value.replace('_', ' ')}
                    </span>
                );
            }
        },
        {
            header: 'Issued',
            key: 'total_issued_qty',
            render: (value) => <span className="font-semibold">{value}</span>
        },
        {
            header: 'Received',
            key: 'total_received_qty',
            render: (value) => <span className="text-success font-semibold">{value}</span>
        },
        {
            header: 'Dead',
            key: 'total_dead_qty',
            render: (value) => value > 0 ? <span className="text-danger font-semibold">{value}</span> : value
        },
        {
            header: 'Pending',
            key: 'total_pending_qty',
            render: (value) => <span className="text-warning font-semibold">{value}</span>
        },
        {
            header: 'Issue Date',
            key: 'issue_date',
            render: (value) => new Date(value).toLocaleDateString()
        }
    ];

    if (loading) {
        return <div className="loading">Loading job works...</div>;
    }

    return (
        <div className="page-container">
            <div className="page-header flex-between mb-xl">
                <div>
                    <h1 className="page-title text-gradient">Job Works Management</h1>
                    <p className="page-subtitle">Track cloth issued to fabricators and received items</p>
                </div>
                <div className="flex gap-md">
                    <Button variant="secondary" onClick={() => navigate('/job-works/receive')}>
                        Receive Items
                    </Button>
                    <Button onClick={() => navigate('/job-works/issue')}>
                        Issue Job Work
                    </Button>
                </div>
            </div>

            {/* Statistics Cards */}
            <div className="grid-cols-4 gap-lg mb-lg">
                <Card>
                    <div className="stat-label">Total Job Works</div>
                    <div className="stat-value text-primary">{stats.all}</div>
                </Card>
                <Card>
                    <div className="stat-label">Active (Issued)</div>
                    <div className="stat-value text-warning">{stats.issued}</div>
                </Card>
                <Card>
                    <div className="stat-label">Partially Received</div>
                    <div className="stat-value text-info">{stats.partially_received}</div>
                </Card>
                <Card>
                    <div className="stat-label">Completed</div>
                    <div className="stat-value text-success">{stats.completed}</div>
                </Card>
            </div>

            {/* Filter Tabs */}
            <div className="flex gap-md mb-md">
                <Button
                    variant={filter === 'all' ? 'primary' : 'secondary'}
                    size="small"
                    onClick={() => setFilter('all')}
                >
                    All ({stats.all})
                </Button>
                <Button
                    variant={filter === 'issued' ? 'primary' : 'secondary'}
                    size="small"
                    onClick={() => setFilter('issued')}
                >
                    Issued ({stats.issued})
                </Button>
                <Button
                    variant={filter === 'partially_received' ? 'primary' : 'secondary'}
                    size="small"
                    onClick={() => setFilter('partially_received')}
                >
                    Partial ({stats.partially_received})
                </Button>
                <Button
                    variant={filter === 'completed' ? 'primary' : 'secondary'}
                    size="small"
                    onClick={() => setFilter('completed')}
                >
                    Completed ({stats.completed})
                </Button>
            </div>

            <Card>
                {filteredJobWorks.length > 0 ? (
                    <Table columns={columns} data={filteredJobWorks} />
                ) : (
                    <div className="empty-state">
                        {filter === 'all'
                            ? 'No job works found. Click "Issue New Job Work" to get started.'
                            : `No ${filter.replace('_', ' ')} job works found.`}
                    </div>
                )}
            </Card>
        </div>
    );
}
