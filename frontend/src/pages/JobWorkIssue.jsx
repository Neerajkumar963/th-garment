import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '../components/Card';
import Button from '../components/Button';
import Modal from '../components/Modal';
import { jobWorksAPI, fabricatorsAPI, stockAPI } from '../services/api';

export default function JobWorkIssue() {
    const navigate = useNavigate();
    const [fabricators, setFabricators] = useState([]);
    const [clothTypes, setClothTypes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);

    const [formData, setFormData] = useState({
        fabricator_id: '',
        cloth_type_id: '',
        org_dress_name: '',
        design: '',
        cloth_used_per_piece: '',
        notes: ''
    });

    const [sizes, setSizes] = useState([
        { size: '22', quantity: 0 },
        { size: '24', quantity: 0 },
        { size: '26', quantity: 0 },
        { size: '28', quantity: 0 },
        { size: '30', quantity: 0 },
        { size: '32', quantity: 0 },
    ]);

    const [clothStock, setClothStock] = useState({});

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [fabricatorsRes, clothTypesRes, clothStockRes] = await Promise.all([
                fabricatorsAPI.getAll('active'),
                stockAPI.getClothTypes(),
                stockAPI.getClothStock()
            ]);

            setFabricators(fabricatorsRes.data.data);
            setClothTypes(clothTypesRes.data.data);

            // Create cloth stock lookup
            const stockLookup = {};
            clothStockRes.data.data.forEach(item => {
                stockLookup[item.cloth_type_id] = item.quantity;
            });
            setClothStock(stockLookup);
        } catch (error) {
            console.error('Error fetching data:', error);
            alert('Failed to fetch data');
        } finally {
            setLoading(false);
        }
    };

    const calculateTotals = () => {
        const totalQty = sizes.reduce((sum, s) => sum + (parseInt(s.quantity) || 0), 0);
        const clothPerPiece = parseFloat(formData.cloth_used_per_piece) || 0;
        const totalCloth = totalQty * clothPerPiece;
        const availableCloth = parseFloat(clothStock[formData.cloth_type_id]) || 0;

        return { totalQty, totalCloth, availableCloth };
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Validation
        if (!formData.fabricator_id || !formData.cloth_type_id || !formData.org_dress_name || !formData.design) {
            alert('Please fill all required fields');
            return;
        }

        if (!formData.cloth_used_per_piece || parseFloat(formData.cloth_used_per_piece) <= 0) {
            alert('Please enter valid cloth used per piece');
            return;
        }

        const { totalQty, totalCloth, availableCloth } = calculateTotals();

        if (totalQty === 0) {
            alert('Please enter at least one size quantity');
            return;
        }

        if (totalCloth > availableCloth) {
            alert(`Insufficient cloth stock! Required: ${totalCloth.toFixed(2)} meters, Available: ${availableCloth.toFixed(2)} meters`);
            return;
        }

        // Filter out sizes with zero quantity
        const sizesWithQty = sizes.filter(s => parseInt(s.quantity) > 0);

        const payload = {
            ...formData,
            cloth_used_per_piece: parseFloat(formData.cloth_used_per_piece),
            sizes: sizesWithQty.map(s => ({
                size: s.size,
                quantity: parseInt(s.quantity)
            }))
        };

        try {
            const response = await jobWorksAPI.issue(payload);
            alert(`Job work issued successfully! Job Number: ${response.data.data.job_number}`);
            resetForm();
            setShowModal(false);
        } catch (error) {
            console.error('Error issuing job work:', error);
            alert(error.response?.data?.error || 'Failed to issue job work');
        }
    };

    const resetForm = () => {
        setFormData({
            fabricator_id: '',
            cloth_type_id: '',
            org_dress_name: '',
            design: '',
            cloth_used_per_piece: '',
            notes: ''
        });
        setSizes([
            { size: '22', quantity: 0 },
            { size: '24', quantity: 0 },
            { size: '26', quantity: 0 },
            { size: '28', quantity: 0 },
            { size: '30', quantity: 0 },
            { size: '32', quantity: 0 },
        ]);
    };

    const handleSizeChange = (index, value) => {
        const newSizes = [...sizes];
        newSizes[index].quantity = value;
        setSizes(newSizes);
    };

    const addCustomSize = () => {
        const sizeValue = prompt('Enter size value:');
        if (sizeValue && sizeValue.trim()) {
            setSizes([...sizes, { size: sizeValue.trim(), quantity: 0 }]);
        }
    };

    const { totalQty, totalCloth, availableCloth } = calculateTotals();
    const isClothSufficient = totalCloth <= availableCloth;

    if (loading) {
        return <div className="loading">Loading...</div>;
    }

    return (
        <div className="page-container">
            <div className="page-header flex-between mb-xl">
                <div>
                    <h1 className="page-title text-gradient">Issue Job Work</h1>
                    <p className="page-subtitle">Send cloth to fabricator for processing</p>
                </div>
                <div className="flex gap-md">
                    <Button variant="secondary" onClick={() => navigate('/job-works')}>
                        ← Back to Job Works
                    </Button>
                    <Button onClick={() => setShowModal(true)}>
                        + Issue New Job Work
                    </Button>
                </div>
            </div>

            <div className="grid-cols-3 gap-lg mb-lg">
                <Card title="Active Fabricators">
                    <div className="stat-value text-primary">{fabricators.length}</div>
                </Card>
                <Card title="Cloth Types">
                    <div className="stat-value text-info">{clothTypes.length}</div>
                </Card>
                <Card title="Total Cloth Stock">
                    <div className="stat-value text-success">
                        {(Object.values(clothStock).reduce((sum, qty) => sum + (parseFloat(qty) || 0), 0)).toFixed(2)} m
                    </div>
                </Card>
            </div>

            <Card>
                <div className="empty-state">
                    <p>Click "Issue New Job Work" to send cloth to a fabricator</p>
                    <p className="text-muted text-sm mt-sm">
                        You can track issued, received, and pending quantities size-wise
                    </p>
                </div>
            </Card>

            <Modal
                isOpen={showModal}
                onClose={() => {
                    setShowModal(false);
                    resetForm();
                }}
                title="Issue Job Work to Fabricator"
                size="large"
            >
                <form onSubmit={handleSubmit} className="form">
                    <div className="grid-cols-2 gap-md">
                        <div className="form-group">
                            <label className="form-label required">Fabricator</label>
                            <select
                                className="form-input"
                                value={formData.fabricator_id}
                                onChange={(e) => setFormData({ ...formData, fabricator_id: e.target.value })}
                                required
                            >
                                <option value="">Select Fabricator</option>
                                {fabricators.map(fab => (
                                    <option key={fab.id} value={fab.id}>
                                        {fab.name} {fab.contact_person && `(${fab.contact_person})`}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="form-group">
                            <label className="form-label required">Cloth Type</label>
                            <select
                                className="form-input"
                                value={formData.cloth_type_id}
                                onChange={(e) => setFormData({ ...formData, cloth_type_id: e.target.value })}
                                required
                            >
                                <option value="">Select Cloth Type</option>
                                {clothTypes.map(cloth => (
                                    <option key={cloth.id} value={cloth.id}>
                                        {cloth.name} ({clothStock[cloth.id] || 0} meters available)
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="grid-cols-2 gap-md">
                        <div className="form-group">
                            <label className="form-label required">Org/Dress Name</label>
                            <input
                                type="text"
                                className="form-input"
                                value={formData.org_dress_name}
                                onChange={(e) => setFormData({ ...formData, org_dress_name: e.target.value })}
                                placeholder="e.g., Kurta, Shirt"
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label required">Design</label>
                            <input
                                type="text"
                                className="form-input"
                                value={formData.design}
                                onChange={(e) => setFormData({ ...formData, design: e.target.value })}
                                placeholder="e.g., Printed, Plain"
                                required
                            />
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="form-label required">Cloth Used Per Piece (meters)</label>
                        <input
                            type="number"
                            step="0.01"
                            className="form-input"
                            value={formData.cloth_used_per_piece}
                            onChange={(e) => setFormData({ ...formData, cloth_used_per_piece: e.target.value })}
                            placeholder="e.g., 2.5"
                            required
                        />
                    </div>

                    <div className="form-group">
                        <div className="flex-between mb-sm">
                            <label className="form-label required">Size-wise Quantity</label>
                            <Button type="button" variant="secondary" size="small" onClick={addCustomSize}>
                                + Add Custom Size
                            </Button>
                        </div>
                        <div className="grid-cols-3 gap-sm">
                            {sizes.map((sizeItem, index) => (
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

                    {/* Summary Box */}
                    <div className={`p-md rounded-lg ${isClothSufficient ? 'bg-success-bg' : 'bg-danger-bg'} mb-md`}>
                        <div className="grid-cols-3 gap-md">
                            <div>
                                <div className="text-xs text-muted uppercase mb-xs">Total Quantity</div>
                                <div className="font-bold text-lg">{totalQty} pieces</div>
                            </div>
                            <div>
                                <div className="text-xs text-muted uppercase mb-xs">Total Cloth Required</div>
                                <div className="font-bold text-lg">{totalCloth.toFixed(2)} meters</div>
                            </div>
                            <div>
                                <div className="text-xs text-muted uppercase mb-xs">Available Cloth</div>
                                <div className={`font-bold text-lg ${isClothSufficient ? 'text-success' : 'text-danger'}`}>
                                    {availableCloth.toFixed(2)} meters
                                </div>
                            </div>
                        </div>
                        {!isClothSufficient && totalQty > 0 && (
                            <div className="text-danger text-sm mt-sm font-semibold">
                                ⚠️ Insufficient cloth stock! Short by {(totalCloth - availableCloth).toFixed(2)} meters
                            </div>
                        )}
                    </div>

                    <div className="form-group">
                        <label className="form-label">Notes</label>
                        <textarea
                            className="form-input"
                            value={formData.notes}
                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                            rows="3"
                            placeholder="Any special instructions or notes"
                        />
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
                        <Button type="submit" disabled={!isClothSufficient || totalQty === 0}>
                            Issue Job Work
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
