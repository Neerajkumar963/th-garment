import { useState, useEffect } from 'react';
import Card from '../components/Card';
import Table from '../components/Table';
import Modal from '../components/Modal';
import Button from '../components/Button';
import FormInput from '../components/FormInput';
import FormSelect from '../components/FormSelect';
import { stockAPI } from '../services/api';

export default function Stock() {
    const [activeTab, setActiveTab] = useState('cloth');
    const [clothStock, setClothStock] = useState([]);
    const [cutStock, setCutStock] = useState([]);
    const [sellingStock, setSellingStock] = useState([]);
    const [deadStock, setDeadStock] = useState([]);
    const [clothTypes, setClothTypes] = useState([]);
    const [showAddClothModal, setShowAddClothModal] = useState(false);
    const [showAddDeadModal, setShowAddDeadModal] = useState(false);
    const [loading, setLoading] = useState(true);
    const [clothFormData, setClothFormData] = useState({
        cloth_type_id: '',
        quantity: '',
    });
    const [deadFormData, setDeadFormData] = useState({
        item_name: '',
        size: '',
        quantity: '',
        reason: '',
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            console.log('Fetching stock data...');
            setLoading(true);
            const [clothRes, cutRes, sellingRes, deadRes, typesRes] = await Promise.all([
                stockAPI.getClothStock(),
                stockAPI.getCutStock(),
                stockAPI.getSellingStock(),
                stockAPI.getDeadStock(),
                stockAPI.getClothTypes(),
            ]);
            console.log('Cloth stock data received:', clothRes.data);
            setClothStock(clothRes.data);
            setCutStock(cutRes.data);
            setSellingStock(sellingRes.data);
            setDeadStock(deadRes.data);
            setClothTypes(typesRes.data);
            console.log('State updated successfully');
        } catch (err) {
            console.error('Error fetching stock data:', err);
            alert('Failed to load stock data');
        } finally {
            setLoading(false);
        }
    };

    const handleAddClothStock = async (e) => {
        e.preventDefault();
        try {
            await stockAPI.addClothStock({
                cloth_type_id: parseInt(clothFormData.cloth_type_id),
                quantity: parseFloat(clothFormData.quantity),
            });
            setShowAddClothModal(false);
            setClothFormData({ cloth_type_id: '', quantity: '' });
            await fetchData();
            alert('Cloth stock added successfully!');
        } catch (err) {
            console.error('Error adding cloth stock:', err);
            alert(err.response?.data?.message || 'Failed to add cloth stock');
        }
    };

    const handleAddDeadStock = async (e) => {
        e.preventDefault();
        try {
            await stockAPI.addDeadStock({
                item_name: deadFormData.item_name,
                size: deadFormData.size || null,
                quantity: parseInt(deadFormData.quantity),
                reason: deadFormData.reason || null,
            });
            setShowAddDeadModal(false);
            setDeadFormData({ item_name: '', size: '', quantity: '', reason: '' });
            await fetchData();
            alert('Item added to dead stock');
        } catch (err) {
            console.error('Error adding dead stock:', err);
            alert(err.response?.data?.message || 'Failed to add dead stock');
        }
    };

    const clothColumns = [
        { header: 'Cloth Type', key: 'cloth_type' },
        { header: 'Description', key: 'description' },
        {
            header: 'Quantity',
            key: 'quantity',
            render: (value, row) => `${value} ${row.unit}`
        },
        {
            header: 'Last Updated',
            key: 'last_updated',
            render: (value) => new Date(value).toLocaleString()
        },
    ];

    const cutColumns = [
        { header: 'Org/Dress Name', key: 'org_dress_name' },
        { header: 'Design', key: 'design' },
        { header: 'Size', key: 'size' },
        { header: 'Quantity', key: 'quantity' },
        {
            header: 'Status',
            key: 'status',
            render: (value) => (
                <span className={`badge badge-${value === 'available' ? 'success' : value === 'in_processing' ? 'info' : 'secondary'}`}>
                    {value.replace('_', ' ')}
                </span>
            )
        },
        {
            header: 'Created',
            key: 'created_at',
            render: (value) => new Date(value).toLocaleDateString()
        },
    ];

    const sellingColumns = [
        { header: 'Org/Dress Name', key: 'org_dress_name' },
        { header: 'Design', key: 'design' },
        { header: 'Size', key: 'size' },
        { header: 'Quantity', key: 'quantity' },
        {
            header: 'Status',
            key: 'status',
            render: (value) => (
                <span className={`badge badge-${value === 'available' ? 'success' : value === 'reserved' ? 'warning' : 'secondary'}`}>
                    {value}
                </span>
            )
        },
        {
            header: 'Created',
            key: 'created_at',
            render: (value) => new Date(value).toLocaleDateString()
        },
    ];

    const deadColumns = [
        { header: 'Item Name', key: 'item_name' },
        { header: 'Size', key: 'size' },
        { header: 'Quantity', key: 'quantity' },
        { header: 'Reason', key: 'reason' },
        {
            header: 'Moved Date',
            key: 'moved_date',
            render: (value) => new Date(value).toLocaleDateString()
        },
    ];

    if (loading) {
        return <div className="loading">Loading...</div>;
    }

    return (
        <div>
            <div className="page-header flex-between">
                <div>
                    <h1 className="page-title">Stock Management</h1>
                    <p className="page-subtitle">Monitor and manage all inventory</p>
                </div>
                <div className="flex gap-md">
                    {activeTab === 'cloth' && (
                        <Button onClick={() => setShowAddClothModal(true)}>
                            + Add Cloth Stock
                        </Button>
                    )}
                    {activeTab === 'dead' && (
                        <Button onClick={() => setShowAddDeadModal(true)}>
                            + Add Dead Stock
                        </Button>
                    )}
                </div>
            </div>

            {/* Tabs */}
            <div className="tabs">
                <button
                    className={`tab ${activeTab === 'cloth' ? 'active' : ''}`}
                    onClick={() => setActiveTab('cloth')}
                >
                    Cloth Stock
                </button>
                <button
                    className={`tab ${activeTab === 'cut' ? 'active' : ''}`}
                    onClick={() => setActiveTab('cut')}
                >
                    Cut Stock
                </button>
                <button
                    className={`tab ${activeTab === 'selling' ? 'active' : ''}`}
                    onClick={() => setActiveTab('selling')}
                >
                    Selling Stock
                </button>
                <button
                    className={`tab ${activeTab === 'dead' ? 'active' : ''}`}
                    onClick={() => setActiveTab('dead')}
                >
                    Dead Stock
                </button>
            </div>

            {/* Tab Content */}
            {activeTab === 'cloth' && (
                <Card title={`Cloth Stock (${clothStock.length} types)`}>
                    <Table columns={clothColumns} data={clothStock} />
                </Card>
            )}

            {activeTab === 'cut' && (
                <Card title={`Cut Stock (${cutStock.length} items)`}>
                    <Table columns={cutColumns} data={cutStock} />
                </Card>
            )}

            {activeTab === 'selling' && (
                <Card title={`Selling Stock (${sellingStock.length} items)`}>
                    <Table columns={sellingColumns} data={sellingStock} />
                </Card>
            )}

            {activeTab === 'dead' && (
                <Card title={`Dead Stock (${deadStock.length} items)`}>
                    <Table columns={deadColumns} data={deadStock} />
                </Card>
            )}

            {/* Add Cloth Stock Modal */}
            <Modal
                isOpen={showAddClothModal}
                onClose={() => setShowAddClothModal(false)}
                title="Add Cloth Stock"
                footer={
                    <>
                        <Button variant="secondary" onClick={() => setShowAddClothModal(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" form="add-cloth-form">
                            Add Stock
                        </Button>
                    </>
                }
            >
                <form id="add-cloth-form" onSubmit={handleAddClothStock}>
                    <FormSelect
                        label="Cloth Type"
                        name="cloth_type_id"
                        value={clothFormData.cloth_type_id}
                        onChange={(e) => setClothFormData(prev => ({ ...prev, cloth_type_id: e.target.value }))}
                        required
                        options={clothTypes.map(ct => ({
                            value: ct.id,
                            label: ct.name
                        }))}
                    />

                    <FormInput
                        label="Quantity (meters)"
                        name="quantity"
                        type="number"
                        value={clothFormData.quantity}
                        onChange={(e) => setClothFormData(prev => ({ ...prev, quantity: e.target.value }))}
                        required
                        min="0.1"
                        step="0.1"
                    />
                </form>
            </Modal>

            {/* Add Dead Stock Modal */}
            <Modal
                isOpen={showAddDeadModal}
                onClose={() => setShowAddDeadModal(false)}
                title="Add to Dead Stock"
                footer={
                    <>
                        <Button variant="secondary" onClick={() => setShowAddDeadModal(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" form="add-dead-form">
                            Add to Dead Stock
                        </Button>
                    </>
                }
            >
                <form id="add-dead-form" onSubmit={handleAddDeadStock}>
                    <FormInput
                        label="Item Name"
                        name="item_name"
                        value={deadFormData.item_name}
                        onChange={(e) => setDeadFormData(prev => ({ ...prev, item_name: e.target.value }))}
                        required
                        placeholder="e.g., Shirt X"
                    />

                    <FormInput
                        label="Size"
                        name="size"
                        value={deadFormData.size}
                        onChange={(e) => setDeadFormData(prev => ({ ...prev, size: e.target.value }))}
                        placeholder="e.g., M, L (optional)"
                    />

                    <FormInput
                        label="Quantity"
                        name="quantity"
                        type="number"
                        value={deadFormData.quantity}
                        onChange={(e) => setDeadFormData(prev => ({ ...prev, quantity: e.target.value }))}
                        required
                        min="1"
                    />

                    <div className="form-group">
                        <label className="form-label" htmlFor="reason">Reason</label>
                        <textarea
                            id="reason"
                            name="reason"
                            value={deadFormData.reason}
                            onChange={(e) => setDeadFormData(prev => ({ ...prev, reason: e.target.value }))}
                            className="form-textarea"
                            placeholder="e.g., Defective stitching"
                        />
                    </div>
                </form>
            </Modal>
        </div>
    );
}
