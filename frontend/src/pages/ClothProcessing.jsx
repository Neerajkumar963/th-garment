import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '../components/Card';
import Button from '../components/Button';
import { stockAPI } from '../services/api';

export default function ClothProcessing() {
    const navigate = useNavigate();
    const [clothStock, setClothStock] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedCloth, setSelectedCloth] = useState(null);

    useEffect(() => {
        fetchClothStock();
    }, []);

    const fetchClothStock = async () => {
        try {
            setLoading(true);
            const response = await stockAPI.getClothStock();
            setClothStock(response.data.data);
        } catch (error) {
            console.error('Error fetching cloth stock:', error);
            alert('Failed to fetch cloth stock');
        } finally {
            setLoading(false);
        }
    };

    const handleSelfProcessing = () => {
        // Navigate to existing Cutting page
        navigate('/cutting');
    };

    const handleFabricatorWork = () => {
        // Navigate to Job Work Issue page
        navigate('/job-works/issue');
    };

    const handleSellAsFabric = () => {
        // Navigate to a sales page (future implementation)
        alert('Sell as Fabric feature - Coming soon!');
    };

    if (loading) {
        return <div className="loading">Loading cloth stock...</div>;
    }

    return (
        <div className="page-container">
            <div className="page-header mb-xl">
                <h1 className="page-title text-gradient">Cloth Processing</h1>
                <p className="page-subtitle">Choose how to process your raw cloth inventory</p>
            </div>

            {/* Cloth Stock Overview */}
            <div className="mb-xl">
                <h2 className="text-lg font-semibold mb-md">Available Raw Cloth Stock</h2>
                <div className="grid-cols-3 gap-lg">
                    {clothStock.length > 0 ? (
                        clothStock.map((cloth) => (
                            <Card key={cloth.id}>
                                <div className="flex-between mb-sm">
                                    <h3 className="font-bold text-primary">{cloth.cloth_type}</h3>
                                    <span className={`badge ${cloth.quantity > 50 ? 'badge-success' : cloth.quantity > 20 ? 'badge-warning' : 'badge-danger'}`}>
                                        {cloth.quantity} {cloth.unit || 'meters'}
                                    </span>
                                </div>
                                {cloth.description && (
                                    <p className="text-sm text-muted mb-md">{cloth.description}</p>
                                )}
                                <div className="flex gap-sm">
                                    <Button
                                        variant={selectedCloth?.id === cloth.id ? 'primary' : 'secondary'}
                                        size="small"
                                        onClick={() => setSelectedCloth(cloth)}
                                    >
                                        {selectedCloth?.id === cloth.id ? '✓ Selected' : 'Select'}
                                    </Button>
                                </div>
                            </Card>
                        ))
                    ) : (
                        <div className="col-span-3">
                            <Card>
                                <div className="empty-state">
                                    No cloth stock available. Add cloth stock from Stock Management.
                                </div>
                            </Card>
                        </div>
                    )}
                </div>
            </div>

            {/* Processing Decision Section */}
            {selectedCloth && (
                <div className="mb-xl">
                    <Card>
                        <div className="bg-info-bg p-md rounded-lg mb-lg">
                            <div className="flex items-center gap-md">
                                <div className="text-3xl">📦</div>
                                <div>
                                    <div className="font-bold text-lg">Selected: {selectedCloth.cloth_type}</div>
                                    <div className="text-sm text-muted">
                                        Available: {selectedCloth.quantity} {selectedCloth.unit || 'meters'}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <h3 className="font-bold text-lg mb-md">Choose Processing Path</h3>
                        <p className="text-muted text-sm mb-lg">
                            Decide how you want to process this cloth. You can send it for self-processing (cutting → in-house production) or send it to external fabricators.
                        </p>

                        <div className="grid-cols-3 gap-lg">
                            {/* Option 1: Self Processing */}
                            <div className="border rounded-lg p-lg hover:border-primary transition-all cursor-pointer">
                                <div className="flex flex-col h-full">
                                    <div className="text-center mb-md">
                                        <div className="text-4xl mb-sm">✂️</div>
                                        <h4 className="font-bold text-lg mb-sm">Self Processing</h4>
                                        <p className="text-sm text-muted mb-md">
                                            In-house production through cutting, tailoring, and finishing
                                        </p>
                                    </div>
                                    <div className="bg-secondary p-sm rounded-md mb-md text-xs">
                                        <div className="font-semibold mb-xs">Process Flow:</div>
                                        <div className="text-muted">
                                            Cutting → Tailor → Regi + Button → Press + Pack → Selling Stock
                                        </div>
                                    </div>
                                    <Button
                                        onClick={handleSelfProcessing}
                                        className="mt-auto"
                                    >
                                        Start Cutting →
                                    </Button>
                                </div>
                            </div>

                            {/* Option 2: Fabricator Work */}
                            <div className="border rounded-lg p-lg hover:border-warning transition-all cursor-pointer">
                                <div className="flex flex-col h-full">
                                    <div className="text-center mb-md">
                                        <div className="text-4xl mb-sm">🏭</div>
                                        <h4 className="font-bold text-lg mb-sm">Fabricator Job Work</h4>
                                        <p className="text-sm text-muted mb-md">
                                            Send to external fabricators for processing with size-wise tracking
                                        </p>
                                    </div>
                                    <div className="bg-warning-bg p-sm rounded-md mb-md text-xs">
                                        <div className="font-semibold mb-xs">Process Flow:</div>
                                        <div className="text-muted">
                                            Issue → Fabricator → Receive (size-wise) → Finished Goods
                                        </div>
                                    </div>
                                    <Button
                                        variant="warning"
                                        onClick={handleFabricatorWork}
                                        className="mt-auto"
                                    >
                                        Issue to Fabricator →
                                    </Button>
                                </div>
                            </div>

                            {/* Option 3: Sell as Fabric */}
                            <div className="border rounded-lg p-lg hover:border-success transition-all cursor-pointer">
                                <div className="flex flex-col h-full">
                                    <div className="text-center mb-md">
                                        <div className="text-4xl mb-sm">💰</div>
                                        <h4 className="font-bold text-lg mb-sm">Sell as Fabric</h4>
                                        <p className="text-sm text-muted mb-md">
                                            Sell the raw cloth directly without processing
                                        </p>
                                    </div>
                                    <div className="bg-success-bg p-sm rounded-md mb-md text-xs">
                                        <div className="font-semibold mb-xs">Process Flow:</div>
                                        <div className="text-muted">
                                            Direct Sale → Customer → Revenue (no processing)
                                        </div>
                                    </div>
                                    <Button
                                        variant="success"
                                        onClick={handleSellAsFabric}
                                        className="mt-auto"
                                    >
                                        Sell Fabric →
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </Card>
                </div>
            )}

            {/* Help Section */}
            <Card>
                <div className="flex items-start gap-md">
                    <div className="text-2xl">💡</div>
                    <div>
                        <h4 className="font-bold mb-sm">How to Use This Screen</h4>
                        <ol className="text-sm text-muted list-decimal list-inside space-y-1">
                            <li>Select the cloth type you want to process from the cards above</li>
                            <li>Choose one of the three processing options based on your needs</li>
                            <li>You'll be redirected to the appropriate workflow screen</li>
                            <li>Track your inventory through the dashboard and stock pages</li>
                        </ol>
                    </div>
                </div>
            </Card>
        </div>
    );
}
