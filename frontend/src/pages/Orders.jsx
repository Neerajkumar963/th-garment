import { useState, useEffect } from 'react';
import Card from '../components/Card';
import Table from '../components/Table';
import Modal from '../components/Modal';
import Button from '../components/Button';
import FormInput from '../components/FormInput';
import FormSelect from '../components/FormSelect';
import { ordersAPI } from '../services/api';

export default function Orders() {
    const [orders, setOrders] = useState([]);
    const [filterStatus, setFilterStatus] = useState('');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [loading, setLoading] = useState(true);
    const [orderFormData, setOrderFormData] = useState({
        customer_name: '',
        customer_phone: '',
        customer_address: '',
        remarks: '',
        items: [
            { org_dress_name: '', design: '', size: '', quantity: '' }
        ],
    });

    useEffect(() => {
        fetchOrders();
    }, [filterStatus]);

    const fetchOrders = async () => {
        try {
            setLoading(true);
            const response = await ordersAPI.getAll(filterStatus);
            setOrders(response.data);
        } catch (err) {
            console.error('Error fetching orders:', err);
            alert('Failed to load orders');
        } finally {
            setLoading(false);
        }
    };

    const handleCreateOrder = async (e) => {
        e.preventDefault();
        try {
            // Validate items
            const validItems = orderFormData.items.filter(item =>
                item.org_dress_name && item.design && item.size && item.quantity
            );

            if (validItems.length === 0) {
                alert('Please add at least one valid item');
                return;
            }

            await ordersAPI.create({
                ...orderFormData,
                items: validItems.map(item => ({
                    ...item,
                    quantity: parseInt(item.quantity)
                }))
            });

            alert('Order created successfully!');
            setShowCreateModal(false);
            resetForm();
            fetchOrders();
        } catch (err) {
            console.error('Error creating order:', err);
            alert(err.response?.data?.message || 'Failed to create order');
        }
    };

    const handleUpdateStatus = async (id, newStatus) => {
        try {
            await ordersAPI.updateStatus(id, newStatus);
            alert('Order status updated successfully');
            fetchOrders();
        } catch (err) {
            console.error('Error updating status:', err);
            alert(err.response?.data?.message || 'Failed to update status');
        }
    };

    const handleDeleteOrder = async (id) => {
        if (!confirm('Delete this order?')) {
            return;
        }
        try {
            await ordersAPI.delete(id);
            alert('Order deleted successfully');
            fetchOrders();
        } catch (err) {
            console.error('Error deleting order:', err);
            alert(err.response?.data?.message || 'Failed to delete order');
        }
    };

    const handleViewDetails = async (order) => {
        try {
            const response = await ordersAPI.getById(order.id);
            setSelectedOrder(response.data);
            setShowDetailsModal(true);
        } catch (err) {
            console.error('Error fetching order details:', err);
            alert('Failed to load order details');
        }
    };

    const resetForm = () => {
        setOrderFormData({
            customer_name: '',
            customer_phone: '',
            customer_address: '',
            remarks: '',
            items: [{ org_dress_name: '', design: '', size: '', quantity: '' }],
        });
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setOrderFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleItemChange = (index, field, value) => {
        const newItems = [...orderFormData.items];
        newItems[index][field] = value;
        setOrderFormData(prev => ({ ...prev, items: newItems }));
    };

    const addItem = () => {
        setOrderFormData(prev => ({
            ...prev,
            items: [...prev.items, { org_dress_name: '', design: '', size: '', quantity: '' }]
        }));
    };

    const removeItem = (index) => {
        if (orderFormData.items.length === 1) {
            alert('At least one item is required');
            return;
        }
        const newItems = orderFormData.items.filter((_, i) => i !== index);
        setOrderFormData(prev => ({ ...prev, items: newItems }));
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case 'pending': return 'warning';
            case 'in-process': return 'info';
            case 'ready': return 'success';
            case 'delivered': return 'secondary';
            default: return 'secondary';
        }
    };

    const orderColumns = [
        { header: 'ID', key: 'id' },
        { header: 'Customer', key: 'customer_name' },
        { header: 'Phone', key: 'customer_phone' },
        {
            header: 'Status',
            key: 'status',
            render: (value) => (
                <span className={`badge badge-${getStatusBadge(value)}`}>
                    {value}
                </span>
            )
        },
        { header: 'Total Qty', key: 'total_quantity' },
        {
            header: 'Order Date',
            key: 'order_date',
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
                    <h1 className="page-title">Orders</h1>
                    <p className="page-subtitle">Manage customer orders</p>
                </div>
                <Button onClick={() => setShowCreateModal(true)}>
                    + Create Order
                </Button>
            </div>

            {/* Filter Tabs */}
            <div className="tabs">
                <button
                    className={`tab ${filterStatus === '' ? 'active' : ''}`}
                    onClick={() => setFilterStatus('')}
                >
                    All Orders
                </button>
                <button
                    className={`tab ${filterStatus === 'pending' ? 'active' : ''}`}
                    onClick={() => setFilterStatus('pending')}
                >
                    Pending
                </button>
                <button
                    className={`tab ${filterStatus === 'in-process' ? 'active' : ''}`}
                    onClick={() => setFilterStatus('in-process')}
                >
                    In-Process
                </button>
                <button
                    className={`tab ${filterStatus === 'ready' ? 'active' : ''}`}
                    onClick={() => setFilterStatus('ready')}
                >
                    Ready
                </button>
                <button
                    className={`tab ${filterStatus === 'delivered' ? 'active' : ''}`}
                    onClick={() => setFilterStatus('delivered')}
                >
                    Delivered
                </button>
            </div>

            <Card title={`Orders (${orders.length})`}>
                <Table
                    columns={orderColumns}
                    data={orders}
                    actions={(row) => (
                        <>
                            <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => handleViewDetails(row)}
                            >
                                View
                            </Button>
                            {row.status !== 'delivered' && (
                                <FormSelect
                                    name="status"
                                    value={row.status}
                                    onChange={(e) => handleUpdateStatus(row.id, e.target.value)}
                                    options={[
                                        { value: 'pending', label: 'Pending' },
                                        { value: 'in-process', label: 'In-Process' },
                                        { value: 'ready', label: 'Ready' },
                                        { value: 'delivered', label: 'Delivered' },
                                    ]}
                                />
                            )}
                            <Button
                                size="sm"
                                variant="danger"
                                onClick={() => handleDeleteOrder(row.id)}
                            >
                                Delete
                            </Button>
                        </>
                    )}
                />
            </Card>

            {/* Create Order Modal */}
            <Modal
                isOpen={showCreateModal}
                onClose={() => { setShowCreateModal(false); resetForm(); }}
                title="Create New Order"
                footer={
                    <>
                        <Button variant="secondary" onClick={() => { setShowCreateModal(false); resetForm(); }}>
                            Cancel
                        </Button>
                        <Button type="submit" form="create-order-form">
                            Create Order
                        </Button>
                    </>
                }
            >
                <form id="create-order-form" onSubmit={handleCreateOrder}>
                    <FormInput
                        label="Customer Name"
                        name="customer_name"
                        value={orderFormData.customer_name}
                        onChange={handleInputChange}
                        required
                        placeholder="Enter customer name"
                    />

                    <FormInput
                        label="Customer Phone"
                        name="customer_phone"
                        value={orderFormData.customer_phone}
                        onChange={handleInputChange}
                        placeholder="Enter phone number"
                    />

                    <div className="form-group">
                        <label className="form-label" htmlFor="customer_address">Customer Address</label>
                        <textarea
                            id="customer_address"
                            name="customer_address"
                            value={orderFormData.customer_address}
                            onChange={handleInputChange}
                            className="form-textarea"
                            placeholder="Enter address"
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label" htmlFor="remarks">Remarks</label>
                        <textarea
                            id="remarks"
                            name="remarks"
                            value={orderFormData.remarks}
                            onChange={handleInputChange}
                            className="form-textarea"
                            placeholder="Any special notes"
                        />
                    </div>

                    <hr style={{ margin: 'var(--spacing-lg) 0', borderColor: 'var(--border-color)' }} />

                    <h4 style={{ marginBottom: 'var(--spacing-md)' }}>Order Items</h4>

                    {orderFormData.items.map((item, index) => (
                        <div key={index} style={{
                            padding: 'var(--spacing-md)',
                            backgroundColor: 'var(--bg-secondary)',
                            borderRadius: 'var(--radius-md)',
                            marginBottom: 'var(--spacing-md)'
                        }}>
                            <div className="flex-between mb-sm">
                                <strong>Item {index + 1}</strong>
                                {orderFormData.items.length > 1 && (
                                    <Button size="sm" variant="danger" onClick={() => removeItem(index)}>
                                        Remove
                                    </Button>
                                )}
                            </div>

                            <FormInput
                                label="Org/Dress Name"
                                name={`item_name_${index}`}
                                value={item.org_dress_name}
                                onChange={(e) => handleItemChange(index, 'org_dress_name', e.target.value)}
                                required
                                placeholder="e.g., Shirt A"
                            />

                            <FormInput
                                label="Design"
                                name={`item_design_${index}`}
                                value={item.design}
                                onChange={(e) => handleItemChange(index, 'design', e.target.value)}
                                required
                                placeholder="e.g., Casual Check"
                            />

                            <FormInput
                                label="Size"
                                name={`item_size_${index}`}
                                value={item.size}
                                onChange={(e) => handleItemChange(index, 'size', e.target.value)}
                                required
                                placeholder="e.g., M, L"
                            />

                            <FormInput
                                label="Quantity"
                                name={`item_quantity_${index}`}
                                type="number"
                                value={item.quantity}
                                onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                                required
                                min="1"
                            />
                        </div>
                    ))}

                    <Button type="button" variant="secondary" onClick={addItem}>
                        + Add Another Item
                    </Button>
                </form>
            </Modal>

            {/* Order Details Modal */}
            <Modal
                isOpen={showDetailsModal}
                onClose={() => setShowDetailsModal(false)}
                title={`Order #${selectedOrder?.id} Details`}
                footer={
                    <Button onClick={() => setShowDetailsModal(false)}>
                        Close
                    </Button>
                }
            >
                {selectedOrder && (
                    <div>
                        <div className="form-group">
                            <label className="form-label">Customer Name</label>
                            <p>{selectedOrder.customer_name}</p>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Phone</label>
                            <p>{selectedOrder.customer_phone || 'N/A'}</p>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Address</label>
                            <p>{selectedOrder.customer_address || 'N/A'}</p>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Status</label>
                            <p>
                                <span className={`badge badge-${getStatusBadge(selectedOrder.status)}`}>
                                    {selectedOrder.status}
                                </span>
                            </p>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Remarks</label>
                            <p>{selectedOrder.remarks || 'None'}</p>
                        </div>

                        <hr style={{ margin: 'var(--spacing-lg) 0', borderColor: 'var(--border-color)' }} />

                        <h4 style={{ marginBottom: 'var(--spacing-md)' }}>Items</h4>
                        <div className="table-container">
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th>Org/Dress Name</th>
                                        <th>Design</th>
                                        <th>Size</th>
                                        <th>Quantity</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {selectedOrder.items?.map((item, index) => (
                                        <tr key={index}>
                                            <td>{item.org_dress_name}</td>
                                            <td>{item.design}</td>
                                            <td>{item.size}</td>
                                            <td>{item.quantity}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
}
