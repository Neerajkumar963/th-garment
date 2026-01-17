import { useState, useEffect } from 'react';
import Card from '../components/Card';
import Table from '../components/Table';
import Button from '../components/Button';
import Modal from '../components/Modal';
import FormInput from '../components/FormInput';
import { salesAPI } from '../services/api';
import { useToast } from '../context/ToastContext';

export default function DirectSales() {
    const [activeTab, setActiveTab] = useState('shop'); // shop | history
    const [availableStock, setAvailableStock] = useState([]);
    const [salesHistory, setSalesHistory] = useState([]);
    const [cart, setCart] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCheckoutModal, setShowCheckoutModal] = useState(false);
    const { showToast } = useToast();

    // Checkout Form
    const [checkoutData, setCheckoutData] = useState({
        customer_name: '',
        notes: ''
    });

    useEffect(() => {
        if (activeTab === 'shop') {
            fetchStock();
        } else {
            fetchHistory();
        }
    }, [activeTab]);

    const fetchStock = async () => {
        try {
            setLoading(true);
            const response = await salesAPI.getAvailable();
            setAvailableStock(response.data.data);
        } catch (error) {
            console.error('Error fetching stock:', error);
            showToast('Failed to load available stock', 'error');
        } finally {
            setLoading(false);
        }
    };

    const fetchHistory = async () => {
        try {
            setLoading(true);
            const response = await salesAPI.getHistory();
            setSalesHistory(response.data.data);
        } catch (error) {
            console.error('Error fetching history:', error);
            showToast('Failed to load sales history', 'error');
        } finally {
            setLoading(false);
        }
    };

    const addToCart = (item) => {
        // Check if item is already in cart
        const existing = cart.find(c => c.stock_id === item.stock_id && c.stock_type === item.stock_type);

        if (existing) {
            if (existing.quantity >= item.quantity) {
                showToast(`Only ${item.quantity} available in stock`, 'warning');
                return;
            }
            setCart(cart.map(c =>
                (c.stock_id === item.stock_id && c.stock_type === item.stock_type)
                    ? { ...c, quantity: c.quantity + 1 }
                    : c
            ));
        } else {
            setCart([...cart, { ...item, quantity: 1, price: 0 }]); // Price editable? Assuming 0 for now as current app has no pricing
        }
        showToast('Item added to cart', 'success');
    };

    const updateCartQuantity = (index, newQty) => {
        const item = cart[index];
        const stockItem = availableStock.find(s => s.stock_id === item.stock_id && s.stock_type === item.stock_type);

        if (newQty > stockItem.quantity) {
            showToast(`Only ${stockItem.quantity} available in stock`, 'warning');
            return;
        }

        if (newQty < 1) {
            removeFromCart(index);
            return;
        }

        const newCart = [...cart];
        newCart[index].quantity = parseInt(newQty);
        setCart(newCart);
    };

    const removeFromCart = (index) => {
        const newCart = cart.filter((_, i) => i !== index);
        setCart(newCart);
    };

    const handleCheckout = async (e) => {
        e.preventDefault();
        try {
            await salesAPI.create({
                customer_name: checkoutData.customer_name,
                notes: checkoutData.notes,
                items: cart
            });

            showToast('Sale completed successfully!', 'success');
            setShowCheckoutModal(false);
            setCart([]);
            setCheckoutData({ customer_name: '', notes: '' });
            fetchStock(); // Refresh stock
        } catch (error) {
            console.error('Checkout error:', error);
            showToast(error.response?.data?.error || 'Failed to complete sale', 'error');
        }
    };

    const shopColumns = [
        { header: 'Item Name', key: 'item_name' },
        { header: 'Category', key: 'category', render: (v) => <span className="badge badge-info">{v}</span> },
        { header: 'Size', key: 'size' },
        { header: 'Available Qty', key: 'quantity', render: (v) => <span className="font-bold text-primary">{v}</span> },
        {
            header: 'Actions',
            key: 'action',
            render: (_, row) => (
                <Button size="sm" onClick={() => addToCart(row)} disabled={row.quantity < 1}>
                    {row.quantity < 1 ? 'Out of Stock' : 'Add to Cart'}
                </Button>
            )
        }
    ];

    const historyColumns = [
        { header: 'Sale ID', key: 'id' },
        { header: 'Date', key: 'sale_date', render: (v) => new Date(v).toLocaleString() },
        { header: 'Customer', key: 'customer_name' },
        { header: 'Notes', key: 'notes' }
    ];

    return (
        <div className="page-container">
            <div className="page-header flex-between">
                <div>
                    <h1 className="page-title">Direct Sales</h1>
                    <p className="page-subtitle">Sell items directly from inventory - Point of Sale</p>
                </div>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    {cart.length > 0 && (
                        <div className="bg-white p-sm rounded shadow-sm border border-primary flex items-center gap-md">
                            <span className="font-bold">{cart.reduce((sum, i) => sum + i.quantity, 0)} Items in Cart</span>
                            <Button variant="primary" onClick={() => setShowCheckoutModal(true)}>
                                Checkout
                            </Button>
                        </div>
                    )}
                </div>
            </div>

            <div className="tabs mb-lg">
                <button
                    className={`tab ${activeTab === 'shop' ? 'active' : ''}`}
                    onClick={() => setActiveTab('shop')}
                >
                    Shop Floor
                </button>
                <button
                    className={`tab ${activeTab === 'history' ? 'active' : ''}`}
                    onClick={() => setActiveTab('history')}
                >
                    Sales History
                </button>
            </div>

            {activeTab === 'shop' ? (
                <div className="grid-cols-3 gap-md">
                    <div className="col-span-2">
                        <Card title="Available Inventory">
                            {loading ? <div className="loading">Loading stock...</div> : (
                                <Table
                                    columns={shopColumns}
                                    data={availableStock}
                                />
                            )}
                        </Card>
                    </div>

                    {/* Cart Sidebar */}
                    <div className="col-span-1">
                        <Card title="Current Cart">
                            {cart.length === 0 ? (
                                <div className="text-center text-muted p-lg">
                                    Cart is empty
                                </div>
                            ) : (
                                <div className="flex flex-col gap-sm">
                                    {cart.map((item, index) => (
                                        <div key={index} className="p-sm border rounded bg-gray-50 flex-between">
                                            <div>
                                                <div className="font-bold">{item.item_name}</div>
                                                <div className="text-sm text-muted">Size: {item.size}</div>
                                            </div>
                                            <div className="flex items-center gap-sm">
                                                <input
                                                    type="number"
                                                    className="form-input py-xs px-sm"
                                                    style={{ width: '60px' }}
                                                    value={item.quantity}
                                                    onChange={(e) => updateCartQuantity(index, e.target.value)}
                                                    min="1"
                                                />
                                                <button
                                                    className="text-danger hover:text-danger-dark"
                                                    onClick={() => removeFromCart(index)}
                                                >
                                                    ✕
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                    <div className="mt-md pt-md border-t">
                                        <Button className="w-full" onClick={() => setShowCheckoutModal(true)}>
                                            Proceed to Checkout
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </Card>
                    </div>
                </div>
            ) : (
                <Card title="Sales History">
                    {loading ? <div className="loading">Loading history...</div> : (
                        <Table
                            columns={historyColumns}
                            data={salesHistory}
                        />
                    )}
                </Card>
            )}

            {/* Checkout Modal */}
            <Modal
                isOpen={showCheckoutModal}
                onClose={() => setShowCheckoutModal(false)}
                title="Complete Sale"
            >
                <form onSubmit={handleCheckout}>
                    <FormInput
                        label="Customer Name"
                        value={checkoutData.customer_name}
                        onChange={(e) => setCheckoutData({ ...checkoutData, customer_name: e.target.value })}
                        placeholder="e.g. Walk-in, or specific name"
                    />

                    <div className="form-group">
                        <label className="form-label">Notes</label>
                        <textarea
                            className="form-textarea"
                            value={checkoutData.notes}
                            onChange={(e) => setCheckoutData({ ...checkoutData, notes: e.target.value })}
                            placeholder="Optional notes about this sale"
                        />
                    </div>

                    <div className="bg-gray-50 p-md rounded mb-lg">
                        <h4 className="mb-sm">Order Summary</h4>
                        <ul className="text-sm">
                            {cart.map((item, i) => (
                                <li key={i} className="flex-between mb-xs">
                                    <span>{item.quantity}x {item.item_name} ({item.size})</span>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div className="flex justify-end gap-md">
                        <Button type="button" variant="secondary" onClick={() => setShowCheckoutModal(false)}>
                            Cancel
                        </Button>
                        <Button type="submit">
                            Confirm Sale
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
