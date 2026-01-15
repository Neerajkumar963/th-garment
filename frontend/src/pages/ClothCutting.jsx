import { useState, useEffect } from 'react';
import Card from '../components/Card';
import Table from '../components/Table';
import Modal from '../components/Modal';
import Button from '../components/Button';
import FormInput from '../components/FormInput';
import FormSelect from '../components/FormSelect';
import { cuttingAPI } from '../services/api';

export default function ClothCutting() {
    const [queue, setQueue] = useState([]);
    const [history, setHistory] = useState([]);
    const [clothTypes, setClothTypes] = useState([]);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showHistory, setShowHistory] = useState(false);
    const [loading, setLoading] = useState(true);
    const [formData, setFormData] = useState({
        org_dress_name: '',
        design: '',
        size: '',
        quantity: '',
        cloth_type_id: '',
        cloth_used: '',
    });

    useEffect(() => {
        fetchData();
    }, []);

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
        } catch (err) {
            console.error('Error fetching cutting data:', err);
            alert('Failed to load cutting data');
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
        if (!confirm('Remove this item from the queue?')) {
            return;
        }
        try {
            await cuttingAPI.deleteFromQueue(id);
            alert('Item removed from queue');
            fetchData();
        } catch (err) {
            console.error('Error deleting from queue:', err);
            alert(err.response?.data?.message || 'Failed to delete item');
        }
    };

    const queueColumns = [
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
        ...queueColumns,
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

    if (loading) {
        return <div className="loading">Loading...</div>;
    }

    return (
        <div>
            <div className="page-header flex-between">
                <div>
                    <h1 className="page-title">Cloth Cutting</h1>
                    <p className="page-subtitle">Manage cutting queue and process</p>
                </div>
                <div className="flex gap-md">
                    <Button variant="secondary" onClick={() => setShowHistory(!showHistory)}>
                        {showHistory ? 'Show Queue' : 'View History'}
                    </Button>
                    <Button onClick={() => setShowAddModal(true)}>
                        + Add to Queue
                    </Button>
                </div>
            </div>

            {!showHistory ? (
                <Card title={`Cutting Queue (${queue.length} items)`}>
                    <Table
                        columns={queueColumns}
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
            ) : (
                <Card title="Cutting History">
                    <Table columns={historyColumns} data={history} />
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
