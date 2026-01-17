import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '../components/Card';
import Table from '../components/Table';
import Button from '../components/Button';
import Modal from '../components/Modal';
import { jobWorksAPI } from '../services/api';

export default function JobWorkReceive() {
    const navigate = useNavigate();
    const [jobWorks, setJobWorks] = useState([]);
    const [selectedJob, setSelectedJob] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showReceiveModal, setShowReceiveModal] = useState(false);
    const [showDeadModal, setShowDeadModal] = useState(false);
    const [receivedItems, setReceivedItems] = useState([]);
    const [deadItems, setDeadItems] = useState([]);
    const [deadReason, setDeadReason] = useState('');

    useEffect(() => {
        fetchPendingJobs();
    }, []);

    const fetchPendingJobs = async () => {
        try {
            setLoading(true);
            const response = await jobWorksAPI.getPending();
            setJobWorks(response.data.data);
        } catch (error) {
            console.error('Error fetching job works:', error);
            alert('Failed to fetch job works');
        } finally {
            setLoading(false);
        }
    };

    const handleReceiveClick = async (jobId) => {
        try {
            const response = await jobWorksAPI.getById(jobId);
            setSelectedJob(response.data.data);

            // Initialize received items with pending sizes
            const items = response.data.data.sizes.map(s => ({
                size: s.size,
                issued_qty: s.issued_qty,
                received_qty: s.received_qty,
                pending_qty: s.pending_qty,
                receiving_now: 0
            }));
            setReceivedItems(items);
            setShowReceiveModal(true);
        } catch (error) {
            console.error('Error fetching job details:', error);
            alert('Failed to fetch job details');
        }
    };

    const handleMarkDeadClick = async (jobId) => {
        try {
            const response = await jobWorksAPI.getById(jobId);
            setSelectedJob(response.data.data);

            // Initialize dead items with pending sizes
            const items = response.data.data.sizes
                .filter(s => s.pending_qty > 0)
                .map(s => ({
                    size: s.size,
                    pending_qty: s.pending_qty,
                    marking_dead: 0
                }));
            setDeadItems(items);
            setDeadReason('');
            setShowDeadModal(true);
        } catch (error) {
            console.error('Error fetching job details:', error);
            alert('Failed to fetch job details');
        }
    };

    const handleReceiveSubmit = async (e) => {
        e.preventDefault();

        const itemsToReceive = receivedItems
            .filter(item => parseInt(item.receiving_now) > 0)
            .map(item => ({
                size: item.size,
                quantity: parseInt(item.receiving_now)
            }));

        if (itemsToReceive.length === 0) {
            alert('Please enter at least one receiving quantity');
            return;
        }

        // Validation: Cannot over-receive
        for (const item of receivedItems) {
            if (parseInt(item.receiving_now) > item.pending_qty) {
                alert(`Cannot receive ${item.receiving_now} pieces of size ${item.size}. Only ${item.pending_qty} pending.`);
                return;
            }
        }

        try {
            await jobWorksAPI.receive(selectedJob.id, { received_items: itemsToReceive });
            alert('Items received successfully!');
            setShowReceiveModal(false);
            fetchPendingJobs();
        } catch (error) {
            console.error('Error receiving items:', error);
            alert(error.response?.data?.error || 'Failed to receive items');
        }
    };

    const handleMarkDeadSubmit = async (e) => {
        e.preventDefault();

        if (!deadReason.trim()) {
            alert('Please provide a reason for marking items as dead');
            return;
        }

        const itemsToMarkDead = deadItems
            .filter(item => parseInt(item.marking_dead) > 0)
            .map(item => ({
                size: item.size,
                quantity: parseInt(item.marking_dead)
            }));

        if (itemsToMarkDead.length === 0) {
            alert('Please enter at least one quantity to mark as dead');
            return;
        }

        // Validation
        for (const item of deadItems) {
            if (parseInt(item.marking_dead) > item.pending_qty) {
                alert(`Cannot mark ${item.marking_dead} pieces of size ${item.size} as dead. Only ${item.pending_qty} pending.`);
                return;
            }
        }

        try {
            await jobWorksAPI.markDead(selectedJob.id, {
                dead_items: itemsToMarkDead,
                reason: deadReason
            });
            alert('Items marked as dead successfully!');
            setShowDeadModal(false);
            fetchPendingJobs();
        } catch (error) {
            console.error('Error marking dead:', error);
            alert(error.response?.data?.error || 'Failed to mark items as dead');
        }
    };

    const columns = [
        { header: 'Job Number', key: 'job_number' },
        { header: 'Fabricator', key: 'fabricator_name' },
        { header: 'Item', key: 'org_dress_name' },
        { header: 'Design', key: 'design' },
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
            header: 'Pending',
            key: 'total_pending_qty',
            render: (value) => <span className="text-warning font-semibold">{value}</span>
        },
        {
            header: 'Actions',
            key: 'id',
            render: (value, row) => (
                <div className="flex gap-sm">
                    <Button
                        variant="primary"
                        size="small"
                        onClick={() => handleReceiveClick(value)}
                        disabled={row.total_pending_qty === 0}
                    >
                        Receive
                    </Button>
                    <Button
                        variant="danger"
                        size="small"
                        onClick={() => handleMarkDeadClick(value)}
                        disabled={row.total_pending_qty === 0}
                    >
                        Mark Dead
                    </Button>
                </div>
            )
        }
    ];

    if (loading) {
        return <div className="loading">Loading job works...</div>;
    }

    return (
        <div className="page-container">
            <div className="page-header flex-between mb-xl">
                <div>
                    <h1 className="page-title text-gradient">Receive Job Work</h1>
                    <p className="page-subtitle">Receive items from fabricators and track pending quantities</p>
                </div>
                <Button variant="secondary" onClick={() => navigate('/job-works')}>
                    ← Back to Job Works
                </Button>
            </div>

            <Card>
                {jobWorks.length > 0 ? (
                    <Table columns={columns} data={jobWorks} />
                ) : (
                    <div className="empty-state">
                        No pending job works found. All items have been received!
                    </div>
                )}
            </Card>

            {/* Receive Modal */}
            <Modal
                isOpen={showReceiveModal}
                onClose={() => setShowReceiveModal(false)}
                title={`Receive Items - ${selectedJob?.job_number}`}
                size="large"
            >
                {selectedJob && (
                    <div>
                        <div className="bg-secondary p-md rounded-lg mb-md">
                            <div className="grid-cols-3 gap-md text-sm">
                                <div>
                                    <span className="text-muted">Fabricator:</span>
                                    <div className="font-semibold">{selectedJob.fabricator_name}</div>
                                </div>
                                <div>
                                    <span className="text-muted">Item:</span>
                                    <div className="font-semibold">{selectedJob.org_dress_name}</div>
                                </div>
                                <div>
                                    <span className="text-muted">Design:</span>
                                    <div className="font-semibold">{selectedJob.design}</div>
                                </div>
                            </div>
                        </div>

                        <form onSubmit={handleReceiveSubmit} className="form">
                            <div className="form-group">
                                <label className="form-label">Size-wise Receiving</label>
                                <table className="table">
                                    <thead>
                                        <tr>
                                            <th>Size</th>
                                            <th>Issued</th>
                                            <th>Already Received</th>
                                            <th>Pending</th>
                                            <th>Receiving Now</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {receivedItems.map((item, index) => (
                                            <tr key={index}>
                                                <td className="font-semibold">{item.size}</td>
                                                <td>{item.issued_qty}</td>
                                                <td className="text-success">{item.received_qty}</td>
                                                <td className="text-warning font-semibold">{item.pending_qty}</td>
                                                <td>
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        max={item.pending_qty}
                                                        className="form-input"
                                                        value={item.receiving_now}
                                                        onChange={(e) => {
                                                            const newItems = [...receivedItems];
                                                            newItems[index].receiving_now = e.target.value;
                                                            setReceivedItems(newItems);
                                                        }}
                                                        placeholder="0"
                                                    />
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot>
                                        <tr className="font-bold">
                                            <td>Total</td>
                                            <td>{receivedItems.reduce((sum, i) => sum + i.issued_qty, 0)}</td>
                                            <td className="text-success">{receivedItems.reduce((sum, i) => sum + i.received_qty, 0)}</td>
                                            <td className="text-warning">{receivedItems.reduce((sum, i) => sum + i.pending_qty, 0)}</td>
                                            <td className="text-primary">
                                                {receivedItems.reduce((sum, i) => sum + (parseInt(i.receiving_now) || 0), 0)}
                                            </td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>

                            <div className="flex gap-md justify-end mt-lg">
                                <Button type="button" variant="secondary" onClick={() => setShowReceiveModal(false)}>
                                    Cancel
                                </Button>
                                <Button type="submit">
                                    Confirm Receive
                                </Button>
                            </div>
                        </form>
                    </div>
                )}
            </Modal>

            {/* Mark Dead Modal */}
            <Modal
                isOpen={showDeadModal}
                onClose={() => setShowDeadModal(false)}
                title={`Mark Items as Dead/Loss - ${selectedJob?.job_number}`}
                size="large"
            >
                {selectedJob && (
                    <div>
                        <div className="bg-danger-bg p-md rounded-lg mb-md">
                            <p className="text-danger font-semibold mb-xs">⚠️ Warning: This action is irreversible</p>
                            <p className="text-sm text-muted">
                                Items marked as dead will be moved to dead stock and cannot be received later.
                            </p>
                        </div>

                        <form onSubmit={handleMarkDeadSubmit} className="form">
                            <div className="form-group">
                                <label className="form-label">Size-wise Dead Quantity</label>
                                <table className="table">
                                    <thead>
                                        <tr>
                                            <th>Size</th>
                                            <th>Pending</th>
                                            <th>Mark as Dead</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {deadItems.map((item, index) => (
                                            <tr key={index}>
                                                <td className="font-semibold">{item.size}</td>
                                                <td className="text-warning font-semibold">{item.pending_qty}</td>
                                                <td>
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        max={item.pending_qty}
                                                        className="form-input"
                                                        value={item.marking_dead}
                                                        onChange={(e) => {
                                                            const newItems = [...deadItems];
                                                            newItems[index].marking_dead = e.target.value;
                                                            setDeadItems(newItems);
                                                        }}
                                                        placeholder="0"
                                                    />
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            <div className="form-group">
                                <label className="form-label required">Reason</label>
                                <textarea
                                    className="form-input"
                                    value={deadReason}
                                    onChange={(e) => setDeadReason(e.target.value)}
                                    rows="3"
                                    placeholder="e.g., Fabric damage during stitching, Quality issues"
                                    required
                                />
                            </div>

                            <div className="flex gap-md justify-end mt-lg">
                                <Button type="button" variant="secondary" onClick={() => setShowDeadModal(false)}>
                                    Cancel
                                </Button>
                                <Button type="submit" variant="danger">
                                    Mark as Dead
                                </Button>
                            </div>
                        </form>
                    </div>
                )}
            </Modal>
        </div>
    );
}
