import { useState, useEffect } from 'react';
import Card from '../components/Card';
import Table from '../components/Table';
import Modal from '../components/Modal';
import Button from '../components/Button';
import FormInput from '../components/FormInput';
import FormSelect from '../components/FormSelect';
import { cuttingAPI } from '../services/api';

export default function ClothCutting() {
    const [activeTab, setActiveTab] = useState('queue'); // queue, history, recycle_bin
    const [queue, setQueue] = useState([]);
    const [history, setHistory] = useState([]);
    const [deletedItems, setDeletedItems] = useState([]);
    const [clothTypes, setClothTypes] = useState([]);
    const [showAddModal, setShowAddModal] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [formData, setFormData] = useState({
        org_dress_name: '',
        design: '',
        size: '',
        quantity: '',
        cloth_type_id: '',
        cloth_used: '',
    });

    useEffect(() => {
        if (activeTab === 'recycle_bin') {
            fetchDeletedData();
        } else {
            fetchData();
        }
    }, [activeTab]);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [queueRes, clothTypesRes, historyRes] = await Promise.all([
                cuttingAPI.getQueue(),
                cuttingAPI.getClothTypes(),
                cuttingAPI.getHistory(),
            ]);
            setQueue(queueRes.data);
            setClothTypes(clothTypesRes.data);
            setHistory(historyRes.data);
            setError(null);
        } catch (err) {
            console.error('Error fetching cutting data:', err);
            setError('Failed to load cutting data. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const fetchDeletedData = async () => {
        try {
            setLoading(true);
            const response = await cuttingAPI.getRecycleBin();
            setDeletedItems(response.data);
        } catch (err) {
            console.error('Error fetching recycle bin:', err);
            alert('Failed to load deleted items');
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleAddToQueue = async (e) => {
        e.preventDefault();
        try {
            await cuttingAPI.addToQueue({
                ...formData,
                quantity: parseInt(formData.quantity),
                cloth_type_id: parseInt(formData.cloth_type_id),
                cloth_used: parseFloat(formData.cloth_used),
            });
            alert('Item added to cutting queue successfully');
            setShowAddModal(false);
            setFormData({
                org_dress_name: '',
                design: '',
                size: '',
                quantity: '',
                cloth_type_id: '',
                cloth_used: '',
            });
            fetchData();
        } catch (err) {
            console.error('Error adding to queue:', err);
            alert(err.response?.data?.message || 'Failed to add to queue');
        }
    };

    const handleCompleteCutting = async (id) => {
        if (!confirm('Complete this cutting? This will update cloth stock and create cut stock.')) {
            return;
        }
        try {
            await cuttingAPI.completeCutting(id);
            alert('Cutting completed successfully!');
            fetchData();
        } catch (err) {
            console.error('Error completing cutting:', err);
            alert(err.response?.data?.message || 'Failed to complete cutting');
        }
    };

    const handleDeleteFromQueue = async (id) => {
        if (!confirm('Move this item to Recycle Bin?')) {
            return;
        }
        try {
            await cuttingAPI.deleteQueueItem(id);
            alert('Item moved to Recycle Bin');
            fetchData();
        } catch (err) {
            console.error('Error deleting from queue:', err);
            alert(err.response?.data?.message || 'Failed to delete item');
        }
    };

    const handleRestore = async (id) => {
        try {
            await cuttingAPI.restoreQueueItem(id);
            alert('Item restored successfully');
            fetchDeletedData();
        } catch (err) {
            console.error('Restore error:', err);
            alert('Failed to restore item');
        }
    };

    const handlePermanentDelete = async (id) => {
        if (!confirm('Are you sure? This cannot be undone.')) return;
        try {
            await cuttingAPI.permanentDeleteItem(id);
            alert('Item permanently deleted');
            fetchDeletedData();
        } catch (err) {
            console.error('Permanent delete error:', err);
            alert('Failed to delete item permanently');
        }
    };

    const baseColumns = [
        { header: 'Org/Dress Name', key: 'org_dress_name' },
        { header: 'Design', key: 'design' },
        { header: 'Size', key: 'size' },
        { header: 'Quantity', key: 'quantity' },
        { header: 'Cloth Type', key: 'cloth_type' },
        { header: 'Cloth Used (m)', key: 'cloth_used' },
        {
            header: 'Queued Date',
            key: 'queued_date',
            render: (value) => new Date(value).toLocaleString()
        },
    ];

    const historyColumns = [
        ...baseColumns,
        {
            header: 'Status',
            key: 'status',
            render: (value) => (
                <span className={`badge badge-${value === 'completed' ? 'success' : 'warning'}`}>
                    {value}
                </span>
            )
        },
        {
            header: 'Completed Date',
            key: 'completed_date',
            render: (value) => value ? new Date(value).toLocaleString() : '-'
        },
    ];

    const recycleBinColumns = [
        ...baseColumns,
        {
            header: 'Deleted At',
            key: 'deleted_at',
            render: (value) => new Date(value).toLocaleString()
        },
        {
            header: 'Actions',
            key: 'actions',
            render: (_, row) => (
                <div style={{ display: 'flex', gap: '5px' }}>
                    <Button size="sm" variant="success" onClick={() => handleRestore(row.id)}>Restore</Button>
                    <Button size="sm" variant="danger" onClick={() => handlePermanentDelete(row.id)}>Forever</Button>
                </div>
            )
        }
    ];

    if (loading) {
        return <div className="loading">Loading...</div>;
    }

    if (error) { // Add error state variable at top of component: const [error, setError] = useState(null);
        return (
            <div className="empty-state text-danger">
                <h3>Error Loading Data</h3>
                <p>{error}</p>
                <button className="btn btn-primary" onClick={fetchData}>Retry</button>
            </div>
        );
    }

    return (
        <div>
            <div className="page-header flex-between">
                <div>
                    <h1 className="page-title">
                        {activeTab === 'recycle_bin' ? 'Recycle Bin - Cutting' : 'Cloth Cutting'}
                    </h1>
                    <p className="page-subtitle">Manage cutting queue and process</p>
                </div>
                <div className="flex gap-md">
                    <Button
                        variant={activeTab === 'recycle_bin' ? 'primary' : 'secondary'}
                        onClick={() => setActiveTab(activeTab === 'recycle_bin' ? 'queue' : 'recycle_bin')}
                    >
                        {activeTab === 'recycle_bin' ? '← Back to Queue' : '🗑️ Recycle Bin'}
                    </Button>
                    {activeTab !== 'recycle_bin' && (
                        <Button onClick={() => setShowAddModal(true)}>
                            + Add to Queue
                        </Button>
                    )}
                </div>
            </div>

            {/* Tabs */}
            <div className="tabs">
                <button
                    className={`tab ${activeTab === 'queue' ? 'active' : ''}`}
                    onClick={() => setActiveTab('queue')}
                >
                    Queue ({queue.length})
                </button>
                <button
                    className={`tab ${activeTab === 'history' ? 'active' : ''}`}
                    onClick={() => setActiveTab('history')}
                >
                    History
                </button>
            </div>

            {activeTab === 'queue' && (
                <Card title="Cutting Queue">
                    <Table
                        columns={baseColumns}
                        data={queue}
                        actions={(row) => (
                            <>
                                <Button
                                    size="sm"
                                    variant="success"
                                    onClick={() => handleCompleteCutting(row.id)}
                                >
                                    Complete
                                </Button>
                                <Button
                                    size="sm"
                                    variant="danger"
                                    onClick={() => handleDeleteFromQueue(row.id)}
                                >
                                    Remove
                                </Button>
                            </>
                        )}
                    />
                </Card>
            )}

            {activeTab === 'history' && (
                <Card title="Cutting History">
                    <Table columns={historyColumns} data={history} />
                </Card>
            )}

            {activeTab === 'recycle_bin' && (
                <Card title={`Deleted Items (${deletedItems.length})`}>
                    <Table columns={recycleBinColumns} data={deletedItems} />
                </Card>
            )}

            <Modal
                isOpen={showAddModal}
                onClose={() => setShowAddModal(false)}
                title="Add to Cutting Queue"
                footer={
                    <>
                        <Button variant="secondary" onClick={() => setShowAddModal(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" form="add-cutting-form">
                            Add to Queue
                        </Button>
                    </>
                }
            >
                <form id="add-cutting-form" onSubmit={handleAddToQueue}>
                    <FormInput
                        label="Organization / Dress Name"
                        name="org_dress_name"
                        value={formData.org_dress_name}
                        onChange={handleInputChange}
                        required
                        placeholder="e.g., Shirt A"
                    />

                    <FormInput
                        label="Design"
                        name="design"
                        value={formData.design}
                        onChange={handleInputChange}
                        required
                        placeholder="e.g., Casual Check"
                    />

                    <FormInput
                        label="Size"
                        name="size"
                        value={formData.size}
                        onChange={handleInputChange}
                        required
                        placeholder="e.g., M, L, XL"
                    />

                    <FormInput
                        label="Quantity"
                        name="quantity"
                        type="number"
                        value={formData.quantity}
                        onChange={handleInputChange}
                        required
                        min="1"
                    />

                    <FormSelect
                        label="Cloth Type"
                        name="cloth_type_id"
                        value={formData.cloth_type_id}
                        onChange={handleInputChange}
                        required
                        options={clothTypes.map(ct => ({
                            value: ct.id,
                            label: `${ct.name} (Available: ${ct.available_quantity || 0} ${ct.unit || 'meters'})`
                        }))}
                    />

                    <FormInput
                        label="Cloth Used (meters)"
                        name="cloth_used"
                        type="number"
                        value={formData.cloth_used}
                        onChange={handleInputChange}
                        required
                        min="0.1"
                        step="0.1"
                    />
                </form>
            </Modal>
        </div>
    );
}
