import { useState, useEffect } from 'react';
import Card from '../components/Card';
import Table from '../components/Table';
import Modal from '../components/Modal';
import Button from '../components/Button';
import FormInput from '../components/FormInput';
import FormSelect from '../components/FormSelect';
import { stockAPI } from '../services/api';
import { useToast } from '../context/ToastContext';
import { useModal } from '../context/ModalContext';

export default function Stock() {
    const [activeTab, setActiveTab] = useState('cloth');
    const [clothStock, setClothStock] = useState([]);
    const [cutStock, setCutStock] = useState([]);
    const [sellingStock, setSellingStock] = useState([]);
    const [deadStock, setDeadStock] = useState([]);
    const [clothTypes, setClothTypes] = useState([]);

    const { showToast } = useToast();
    const { showConfirm } = useModal();

    // Recycle Bin State
    const [showRecycleBin, setShowRecycleBin] = useState(false);
    const [deletedItems, setDeletedItems] = useState([]);

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
        if (showRecycleBin) {
            fetchDeletedData();
        } else {
            fetchData();
        }
    }, [activeTab, showRecycleBin]);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [clothRes, cutRes, sellingRes, deadRes, typesRes] = await Promise.all([
                stockAPI.getClothStock(),
                stockAPI.getCutStock(),
                stockAPI.getSellingStock(),
                stockAPI.getDeadStock(),
                stockAPI.getClothTypes(),
            ]);
            setClothStock(clothRes.data);
            setCutStock(cutRes.data);
            setSellingStock(sellingRes.data);
            setDeadStock(deadRes.data);
            setClothTypes(typesRes.data);
        } catch (err) {
            console.error('Error fetching stock data:', err);
            showToast('Failed to load stock data', 'error');
        } finally {
            setLoading(false);
        }
    };

    const fetchDeletedData = async () => {
        try {
            setLoading(true);
            const response = await stockAPI.getStockRecycleBin(activeTab);
            setDeletedItems(response.data);
        } catch (err) {
            console.error('Error fetching deleted stock:', err);
            showToast('Failed to load recycle bin', 'error');
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
            showToast('Cloth stock added successfully!', 'success');
        } catch (err) {
            console.error('Error adding cloth stock:', err);
            showToast(err.response?.data?.message || 'Failed to add cloth stock', 'error');
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
            showToast('Item added to dead stock', 'success');
        } catch (err) {
            console.error('Error adding dead stock:', err);
            showToast(err.response?.data?.message || 'Failed to add dead stock', 'error');
        }
    };

    const handleDelete = (id, type = activeTab) => {
        showConfirm('Move this item to Recycle Bin?', async () => {
            try {
                await stockAPI.deleteStock(type, id);
                showToast('Item moved to Recycle Bin', 'success');
                fetchData();
            } catch (err) {
                console.error('Delete error:', err);
                showToast('Failed to delete item', 'error');
            }
        });
    };

    const handleRestore = async (id) => {
        try {
            await stockAPI.restoreStock(activeTab, id);
            showToast('Item restored successfully', 'success');
            fetchDeletedData();
        } catch (err) {
            console.error('Restore error:', err);
            showToast('Failed to restore item', 'error');
        }
    };

    const handlePermanentDelete = (id) => {
        showConfirm('Are you sure? This cannot be undone.', async () => {
            try {
                await stockAPI.permanentDeleteStock(activeTab, id);
                showToast('Item permanently deleted', 'success');
                fetchDeletedData();
            } catch (err) {
                console.error('Permanent delete error:', err);
                showToast('Failed to delete item permanently', 'error');
            }
        }, 'Delete Permanently');
    };

    // Columns for Active View
    const getColumns = () => {
        const commonActions = {
            header: 'Actions',
            key: 'actions',
            render: (_, row) => (
                <Button size="sm" variant="danger" onClick={() => handleDelete(row.id)}>Delete</Button>
            )
        };

        switch (activeTab) {
            case 'cloth':
                return [
                    { header: 'Cloth Type', key: showRecycleBin ? 'cloth_type' : 'cloth_type' }, // Handle join name
                    { header: 'Description', key: 'description' },
                    { header: 'Quantity', key: 'quantity', render: (v, r) => `${v} ${r.unit || 'meters'}` },
                    { header: 'Last Updated', key: showRecycleBin ? 'deleted_at' : 'last_updated', render: (v) => new Date(v).toLocaleString() },
                    !showRecycleBin && commonActions
                ].filter(Boolean);
            case 'cut':
                return [
                    { header: 'Org/Dress Name', key: 'org_dress_name' },
                    { header: 'Design', key: 'design' },
                    { header: 'Size', key: 'size' },
                    { header: 'Quantity', key: 'quantity' },
                    { header: 'Status', key: 'status' },
                    { header: showRecycleBin ? 'Deleted At' : 'Created', key: showRecycleBin ? 'deleted_at' : 'created_at', render: (v) => new Date(v).toLocaleDateString() },
                    !showRecycleBin && commonActions
                ].filter(Boolean);
            case 'selling':
                return [
                    { header: 'Org/Dress Name', key: 'org_dress_name' },
                    { header: 'Design', key: 'design' },
                    { header: 'Size', key: 'size' },
                    { header: 'Quantity', key: 'quantity' },
                    { header: 'Status', key: 'status' },
                    { header: showRecycleBin ? 'Deleted At' : 'Created', key: showRecycleBin ? 'deleted_at' : 'created_at', render: (v) => new Date(v).toLocaleDateString() },
                    !showRecycleBin && commonActions
                ].filter(Boolean);
            case 'dead':
                return [
                    { header: 'Item Name', key: 'item_name' },
                    { header: 'Size', key: 'size' },
                    { header: 'Quantity', key: 'quantity' },
                    { header: 'Reason', key: 'reason' },
                    { header: showRecycleBin ? 'Deleted At' : 'Date', key: showRecycleBin ? 'deleted_at' : 'moved_date', render: (v) => new Date(v).toLocaleDateString() },
                    !showRecycleBin && commonActions
                ].filter(Boolean);
            default: return [];
        }
    };

    // Columns for Recycle Bin View (with Restore actions)
    const getRecycleBinColumns = () => {
        const baseColumns = getColumns();
        // Remove the standard actions column if present
        const columns = baseColumns.filter(col => col.key !== 'actions');

        // Add Restore/Delete Forever actions
        columns.push({
            header: 'Actions',
            key: 'actions',
            render: (_, row) => (
                <div style={{ display: 'flex', gap: '5px' }}>
                    <Button size="sm" variant="success" onClick={() => handleRestore(row.id)}>Restore</Button>
                    <Button size="sm" variant="danger" onClick={() => handlePermanentDelete(row.id)}>Forever</Button>
                </div>
            )
        });
        return columns;
    };

    if (loading) return <div className="loading">Loading...</div>;

    const currentData = showRecycleBin ? deletedItems : (
        activeTab === 'cloth' ? clothStock :
            activeTab === 'cut' ? cutStock :
                activeTab === 'selling' ? sellingStock :
                    activeTab === 'dead' ? deadStock : []
    );

    return (
        <div>
            <div className="page-header flex-between">
                <div>
                    <h1 className="page-title">{showRecycleBin ? `Recycle Bin - ${activeTab.toUpperCase()}` : 'Stock Management'}</h1>
                    <p className="page-subtitle">{showRecycleBin ? 'Manage deleted items' : 'Monitor and manage all inventory'}</p>
                </div>
                <div className="flex gap-md">
                    <Button
                        variant={showRecycleBin ? 'primary' : 'secondary'}
                        onClick={() => { setShowRecycleBin(!showRecycleBin); setDeletedItems([]); }}
                    >
                        {showRecycleBin ? '← Back to Stock' : '🗑️ Recycle Bin'}
                    </Button>
                    {!showRecycleBin && activeTab === 'cloth' && (
                        <Button onClick={() => setShowAddClothModal(true)}>+ Add Cloth Stock</Button>
                    )}
                    {!showRecycleBin && activeTab === 'dead' && (
                        <Button onClick={() => setShowAddDeadModal(true)}>+ Add Dead Stock</Button>
                    )}
                </div>
            </div>

            {/* Tabs */}
            <div className="tabs">
                {['cloth', 'cut', 'selling', 'dead'].map(tab => (
                    <button
                        key={tab}
                        className={`tab ${activeTab === tab ? 'active' : ''}`}
                        onClick={() => setActiveTab(tab)}
                    >
                        {tab.charAt(0).toUpperCase() + tab.slice(1)} Stock
                    </button>
                ))}
            </div>

            <Card title={`${showRecycleBin ? 'Deleted' : ''} ${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Stock (${currentData.length})`}>
                <Table
                    columns={showRecycleBin ? getRecycleBinColumns() : getColumns()}
                    data={currentData}
                />
            </Card>

            {/* Add Cloth Stock Modal */}
            <Modal
                isOpen={showAddClothModal}
                onClose={() => setShowAddClothModal(false)}
                title="Add Cloth Stock"
                footer={
                    <>
                        <Button variant="secondary" onClick={() => setShowAddClothModal(false)}>Cancel</Button>
                        <Button type="submit" form="add-cloth-form">Add Stock</Button>
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
                        options={clothTypes.map(ct => ({ value: ct.id, label: ct.name }))}
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
                        <Button variant="secondary" onClick={() => setShowAddDeadModal(false)}>Cancel</Button>
                        <Button type="submit" form="add-dead-form">Add to Dead Stock</Button>
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
