import { useState, useEffect } from 'react';
import Card from '../components/Card';
import Table from '../components/Table';
import Button from '../components/Button';
import Modal from '../components/Modal';
import { fabricatorsAPI } from '../services/api';

export default function Fabricators() {
    const [fabricators, setFabricators] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        contact_person: '',
        phone: '',
        address: '',
        status: 'active'
    });

    useEffect(() => {
        fetchFabricators();
    }, []);

    const fetchFabricators = async () => {
        try {
            setLoading(true);
            const response = await fabricatorsAPI.getAll();
            setFabricators(response.data.data);
        } catch (error) {
            console.error('Error fetching fabricators:', error);
            alert('Failed to fetch fabricators');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.name.trim()) {
            alert('Fabricator name is required');
            return;
        }

        try {
            if (editingId) {
                await fabricatorsAPI.update(editingId, formData);
                alert('Fabricator updated successfully');
            } else {
                await fabricatorsAPI.create(formData);
                alert('Fabricator created successfully');
            }

            setShowModal(false);
            resetForm();
            fetchFabricators();
        } catch (error) {
            console.error('Error saving fabricator:', error);
            alert(error.response?.data?.error || 'Failed to save fabricator');
        }
    };

    const handleEdit = async (id) => {
        try {
            const response = await fabricatorsAPI.getById(id);
            const fabricator = response.data.data;
            setFormData({
                name: fabricator.name,
                contact_person: fabricator.contact_person || '',
                phone: fabricator.phone || '',
                address: fabricator.address || '',
                status: fabricator.status
            });
            setEditingId(id);
            setShowModal(true);
        } catch (error) {
            console.error('Error fetching fabricator:', error);
            alert('Failed to fetch fabricator details');
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Are you sure you want to delete this fabricator? This will fail if there are active job works.')) {
            return;
        }

        try {
            await fabricatorsAPI.delete(id);
            alert('Fabricator deleted successfully');
            fetchFabricators();
        } catch (error) {
            console.error('Error deleting fabricator:', error);
            alert(error.response?.data?.error || 'Failed to delete fabricator');
        }
    };

    const resetForm = () => {
        setFormData({
            name: '',
            contact_person: '',
            phone: '',
            address: '',
            status: 'active'
        });
        setEditingId(null);
    };

    const handleOpenModal = () => {
        resetForm();
        setShowModal(true);
    };

    const columns = [
        { header: 'Name', key: 'name' },
        { header: 'Contact Person', key: 'contact_person' },
        { header: 'Phone', key: 'phone' },
        {
            header: 'Status',
            key: 'status',
            render: (value) => (
                <span className={`badge badge-${value === 'active' ? 'success' : 'secondary'}`}>
                    {value}
                </span>
            )
        },
        {
            header: 'Actions',
            key: 'id',
            render: (value, row) => (
                <div className="flex gap-sm">
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
        return <div className="loading">Loading fabricators...</div>;
    }

    return (
        <div className="page-container">
            <div className="page-header flex-between mb-xl">
                <div>
                    <h1 className="page-title text-gradient">Fabricators Management</h1>
                    <p className="page-subtitle">Manage external fabricators and vendors</p>
                </div>
                <Button onClick={handleOpenModal}>
                    + Add Fabricator
                </Button>
            </div>

            <Card>
                {fabricators.length > 0 ? (
                    <Table columns={columns} data={fabricators} />
                ) : (
                    <div className="empty-state">
                        No fabricators found. Click "Add Fabricator" to create one.
                    </div>
                )}
            </Card>

            <Modal
                isOpen={showModal}
                onClose={() => {
                    setShowModal(false);
                    resetForm();
                }}
                title={editingId ? 'Edit Fabricator' : 'Add New Fabricator'}
            >
                <form onSubmit={handleSubmit} className="form">
                    <div className="form-group">
                        <label className="form-label required">Fabricator Name</label>
                        <input
                            type="text"
                            className="form-input"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Contact Person</label>
                        <input
                            type="text"
                            className="form-input"
                            value={formData.contact_person}
                            onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Phone</label>
                        <input
                            type="tel"
                            className="form-input"
                            value={formData.phone}
                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Address</label>
                        <textarea
                            className="form-input"
                            value={formData.address}
                            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                            rows="3"
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Status</label>
                        <select
                            className="form-input"
                            value={formData.status}
                            onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                        >
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                        </select>
                    </div>

                    <div className="flex gap-md justify-end mt-lg">
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={() => {
                                setShowModal(false);
                                resetForm();
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
        </div>
    );
}
