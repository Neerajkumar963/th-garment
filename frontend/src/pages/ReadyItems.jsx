import { useState, useEffect } from 'react';
import Card from '../components/Card';
import Table from '../components/Table';
import Button from '../components/Button';
import Modal from '../components/Modal';
import { readyItemsAPI } from '../services/api';

export default function ReadyItems() {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showItemModal, setShowItemModal] = useState(false);
    const [showStockModal, setShowStockModal] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [selectedItem, setSelectedItem] = useState(null);

    const [itemFormData, setItemFormData] = useState({
        item_name: '',
        category: '',
        description: ''
    });

    const [stockSizes, setStockSizes] = useState([
        { size: '22', quantity: 0 },
        { size: '24', quantity: 0 },
        { size: '26', quantity: 0 },
        { size: '28', quantity: 0 },
        { size: '30', quantity: 0 },
        { size: '32', quantity: 0 },
    ]);

    useEffect(() => {
        fetchItems();
    }, []);

    const fetchItems = async () => {
        try {
            setLoading(true);
            const response = await readyItemsAPI.getAll();
            setItems(response.data.data);
        } catch (error) {
            console.error('Error fetching ready items:', error);
            alert('Failed to fetch ready items');
        } finally {
            setLoading(false);
        }
    };

    const handleItemSubmit = async (e) => {
        e.preventDefault();

        if (!itemFormData.item_name.trim()) {
            alert('Item name is required');
            return;
        }

        try {
            if (editingId) {
                await readyItemsAPI.update(editingId, itemFormData);
                alert('Ready item updated successfully');
            } else {
                await readyItemsAPI.create(itemFormData);
                alert('Ready item created successfully');
            }

            setShowItemModal(false);
            resetItemForm();
            fetchItems();
        } catch (error) {
            console.error('Error saving ready item:', error);
            alert(error.response?.data?.error || 'Failed to save ready item');
        }
    };

    const handleStockSubmit = async (e) => {
        e.preventDefault();

        const sizesWithQty = stockSizes.filter(s => parseInt(s.quantity) > 0);

        if (sizesWithQty.length === 0) {
            alert('Please enter at least one size quantity');
            return;
        }

        try {
            await readyItemsAPI.addStock(selectedItem.id, {
                sizes: sizesWithQty.map(s => ({
                    size: s.size,
                    quantity: parseInt(s.quantity)
                }))
            });

            alert('Stock added successfully!');
            setShowStockModal(false);
            resetStockForm();
            fetchItems();
        } catch (error) {
            console.error('Error adding stock:', error);
            alert(error.response?.data?.error || 'Failed to add stock');
        }
    };

    const handleEdit = async (id) => {
        try {
            const response = await readyItemsAPI.getById(id);
            const item = response.data.data;
            setItemFormData({
                item_name: item.item_name,
                category: item.category || '',
                description: item.description || ''
            });
            setEditingId(id);
            setShowItemModal(true);
        } catch (error) {
            console.error('Error fetching item:', error);
            alert('Failed to fetch item details');
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Are you sure you want to delete this ready item?')) {
            return;
        }

        try {
            await readyItemsAPI.delete(id);
            alert('Ready item deleted successfully');
            fetchItems();
        } catch (error) {
            console.error('Error deleting item:', error);
            alert(error.response?.data?.error || 'Failed to delete item');
        }
    };

    const handleAddStock = async (item) => {
        setSelectedItem(item);
        resetStockForm();
        setShowStockModal(true);
    };

    const resetItemForm = () => {
        setItemFormData({
            item_name: '',
            category: '',
            description: ''
        });
        setEditingId(null);
    };

    const resetStockForm = () => {
        setStockSizes([
            { size: '22', quantity: 0 },
            { size: '24', quantity: 0 },
            { size: '26', quantity: 0 },
            { size: '28', quantity: 0 },
            { size: '30', quantity: 0 },
            { size: '32', quantity: 0 },
        ]);
    };

    const handleSizeChange = (index, value) => {
        const newSizes = [...stockSizes];
        newSizes[index].quantity = value;
        setStockSizes(newSizes);
    };

    const columns = [
        { header: 'Item Name', key: 'item_name' },
        { header: 'Category', key: 'category' },
        {
            header: 'Total Stock',
            key: 'total_stock',
            render: (value) => <span className="font-semibold text-primary">{value || 0}</span>
        },
        {
            header: 'Actions',
            key: 'id',
            render: (value, row) => (
                <div className="flex gap-sm">
                    <Button variant="primary" size="small" onClick={() => handleAddStock(row)}>
                        Add Stock
                    </Button>
                    <Button variant="secondary" size="small" onClick={() => handleEdit(value)}>
                        Edit
                    </Button>
                    <Button variant="danger" size="small" onClick={() => handleDelete(value)}>
                        Delete
                    </Button>
                </div>
            )
        }
    ];

    if (loading) {
        return <div className="loading">Loading ready items...</div>;
    }

    return (
        <div className="page-container">
            <div className="page-header flex-between mb-xl">
                <div>
                    <h1 className="page-title text-gradient">Ready Items</h1>
                    <p className="page-subtitle">Manage ready-made items that bypass processing</p>
                </div>
                <Button onClick={() => setShowItemModal(true)}>
                    + Add Ready Item
                </Button>
            </div>

            <Card>
                {items.length > 0 ? (
                    <Table columns={columns} data={items} />
                ) : (
                    <div className="empty-state">
                        No ready items found. Click "Add Ready Item" to create one.
                    </div>
                )}
            </Card>

            {/* Add/Edit Item Modal */}
            <Modal
                isOpen={showItemModal}
                onClose={() => {
                    setShowItemModal(false);
                    resetItemForm();
                }}
                title={editingId ? 'Edit Ready Item' : 'Add New Ready Item'}
            >
                <form onSubmit={handleItemSubmit} className="form">
                    <div className="form-group">
                        <label className="form-label required">Item Name</label>
                        <input
                            type="text"
                            className="form-input"
                            value={itemFormData.item_name}
                            onChange={(e) => setItemFormData({ ...itemFormData, item_name: e.target.value })}
                            placeholder="e.g., Men's Shirt, Ladies Kurta"
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Category</label>
                        <input
                            type="text"
                            className="form-input"
                            value={itemFormData.category}
                            onChange={(e) => setItemFormData({ ...itemFormData, category: e.target.value })}
                            placeholder="e.g., Formal, Casual"
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Description</label>
                        <textarea
                            className="form-input"
                            value={itemFormData.description}
                            onChange={(e) => setItemFormData({ ...itemFormData, description: e.target.value })}
                            rows="3"
                            placeholder="Item description"
                        />
                    </div>

                    <div className="flex gap-md justify-end mt-lg">
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={() => {
                                setShowItemModal(false);
                                resetItemForm();
                            }}
                        >
                            Cancel
                        </Button>
                        <Button type="submit">
                            {editingId ? 'Update' : 'Create'}
                        </Button>
                    </div>
                </form>
            </Modal>

            {/* Add Stock Modal */}
            <Modal
                isOpen={showStockModal}
                onClose={() => {
                    setShowStockModal(false);
                    resetStockForm();
                }}
                title={`Add Stock - ${selectedItem?.item_name}`}
                size="large"
            >
                <form onSubmit={handleStockSubmit} className="form">
                    <div className="form-group">
                        <label className="form-label required">Size-wise Quantity</label>
                        <div className="grid-cols-3 gap-sm">
                            {stockSizes.map((sizeItem, index) => (
                                <div key={index} className="flex items-center gap-sm">
                                    <label className="form-label mb-0" style={{ minWidth: '40px' }}>
                                        Size {sizeItem.size}:
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        className="form-input"
                                        value={sizeItem.quantity}
                                        onChange={(e) => handleSizeChange(index, e.target.value)}
                                        placeholder="Qty"
                                    />
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="bg-info-bg p-md rounded-lg">
                        <div className="text-sm">
                            <span className="text-muted">Total Quantity:</span>
                            <span className="font-bold text-lg ml-sm text-primary">
                                {stockSizes.reduce((sum, s) => sum + (parseInt(s.quantity) || 0), 0)} pieces
                            </span>
                        </div>
                    </div>

                    <div className="flex gap-md justify-end mt-lg">
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={() => {
                                setShowStockModal(false);
                                resetStockForm();
                            }}
                        >
                            Cancel
                        </Button>
                        <Button type="submit">
                            Add Stock
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
