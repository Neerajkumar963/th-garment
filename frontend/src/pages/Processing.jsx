import { useState, useEffect } from 'react';
import Card from '../components/Card';
import Table from '../components/Table';
import Modal from '../components/Modal';
import Button from '../components/Button';
import FormSelect from '../components/FormSelect';
import { processingAPI } from '../services/api';

const STAGE_ORDER = [
    'Design & Cut',
    'Stitching',
    'Kaj Button',
    'Washing',
    'Thread Cutting',
    'Press & Packing',
    'Label Tag',
    'Fabrication',
    'Processed'
];

export default function Processing() {
    const [activeItems, setActiveItems] = useState([]);
    const [deliveredItems, setDeliveredItems] = useState([]);
    const [cutStock, setCutStock] = useState([]);
    const [showDelivered, setShowDelivered] = useState(false);
    const [showStartModal, setShowStartModal] = useState(false);
    const [loading, setLoading] = useState(true);
    const [selectedCutStock, setSelectedCutStock] = useState('');

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [activeRes, deliveredRes, cutStockRes] = await Promise.all([
                processingAPI.getActive(),
                processingAPI.getDelivered(),
                processingAPI.getAvailableCutStock(),
            ]);
            setActiveItems(activeRes.data);
            setDeliveredItems(deliveredRes.data);
            setCutStock(cutStockRes.data);
        } catch (err) {
            console.error('Error fetching processing data:', err);
            alert('Failed to load processing data');
        } finally {
            setLoading(false);
        }
    };

    const handleStartProcessing = async (e) => {
        e.preventDefault();
        try {
            await processingAPI.startProcessing({ cut_stock_id: parseInt(selectedCutStock) });
            alert('Processing started successfully!');
            setShowStartModal(false);
            setSelectedCutStock('');
            fetchData();
        } catch (err) {
            console.error('Error starting processing:', err);
            alert(err.response?.data?.message || 'Failed to start processing');
        }
    };

    const handleAdvanceStage = async (id, currentStage) => {
        if (!confirm(`Move to next stage?`)) {
            return;
        }
        try {
            await processingAPI.advanceStage(id);
            alert('Advanced to next stage successfully!');
            fetchData();
        } catch (err) {
            console.error('Error advancing stage:', err);
            alert(err.response?.data?.message || 'Failed to advance stage');
        }
    };

    const handleCompleteProcessing = async (id) => {
        if (!confirm('Complete processing? This will move the item to selling stock.')) {
            return;
        }
        try {
            await processingAPI.completeProcessing(id);
            alert('Processing completed! Item moved to selling stock.');
            fetchData();
        } catch (err) {
            console.error('Error completing processing:', err);
            alert(err.response?.data?.message || 'Failed to complete processing');
        }
    };

    const processingColumns = [
        { header: 'Org/Dress Name', key: 'org_dress_name' },
        { header: 'Size', key: 'size' },
        { header: 'Quantity', key: 'quantity' },
        {
            header: 'Current Stage',
            key: 'current_stage_name',
            render: (value, row) => (
                <span className="badge badge-info">
                    {value} (Stage {row.stage_order}/9)
                </span>
            )
        },
        {
            header: 'Date Given',
            key: 'date_given',
            render: (value) => new Date(value).toLocaleDateString()
        },
        {
            header: 'Last Update',
            key: 'last_stage_update',
            render: (value) => new Date(value).toLocaleDateString()
        },
    ];

    const deliveredColumns = [
        { header: 'Org/Dress Name', key: 'org_dress_name' },
        { header: 'Size', key: 'size' },
        { header: 'Quantity', key: 'quantity' },
        { header: 'Final Stage', key: 'current_stage_name' },
        {
            header: 'Completed Date',
            key: 'last_stage_update',
            render: (value) => new Date(value).toLocaleDateString()
        },
    ];

    // Group active items by stage
    const groupedByStage = activeItems.reduce((acc, item) => {
        const stageName = item.current_stage_name;
        if (!acc[stageName]) {
            acc[stageName] = [];
        }
        acc[stageName].push(item);
        return acc;
    }, {});

    if (loading) {
        return <div className="loading">Loading...</div>;
    }

    return (
        <div>
            <div className="page-header flex-between">
                <div>
                    <h1 className="page-title">Processing</h1>
                    <p className="page-subtitle">Track items through production stages</p>
                </div>
                <div className="flex gap-md">
                    <Button variant="secondary" onClick={() => setShowDelivered(!showDelivered)}>
                        {showDelivered ? 'Show Active' : 'View Delivered'}
                    </Button>
                    <Button onClick={() => setShowStartModal(true)}>
                        + Start Processing
                    </Button>
                </div>
            </div>

            {!showDelivered ? (
                <>
                    {activeItems.length === 0 ? (
                        <Card>
                            <div className="empty-state">No active processing items</div>
                        </Card>
                    ) : (
                        <>
                            {STAGE_ORDER.map((stageName) => {
                                const stageItems = groupedByStage[stageName] || [];
                                if (stageItems.length === 0) return null;

                                return (
                                    <Card key={stageName} title={`${stageName} (${stageItems.length})`} className="mb-lg">
                                        <Table
                                            columns={processingColumns}
                                            data={stageItems}
                                            actions={(row) => (
                                                <>
                                                    {row.stage_order < 9 ? (
                                                        <Button
                                                            size="sm"
                                                            variant="primary"
                                                            onClick={() => handleAdvanceStage(row.id, row.current_stage_name)}
                                                        >
                                                            Next Stage
                                                        </Button>
                                                    ) : (
                                                        <Button
                                                            size="sm"
                                                            variant="success"
                                                            onClick={() => handleCompleteProcessing(row.id)}
                                                        >
                                                            Complete
                                                        </Button>
                                                    )}
                                                </>
                                            )}
                                        />
                                    </Card>
                                );
                            })}
                        </>
                    )}
                </>
            ) : (
                <Card title={`Delivered Items (${deliveredItems.length})`}>
                    <Table columns={deliveredColumns} data={deliveredItems} />
                </Card>
            )}

            <Modal
                isOpen={showStartModal}
                onClose={() => setShowStartModal(false)}
                title="Start Processing"
                footer={
                    <>
                        <Button variant="secondary" onClick={() => setShowStartModal(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" form="start-processing-form">
                            Start Processing
                        </Button>
                    </>
                }
            >
                <form id="start-processing-form" onSubmit={handleStartProcessing}>
                    <p className="text-muted mb-md">
                        Select a cut stock item to start processing. It will begin at "Design & Cut" stage.
                    </p>

                    <FormSelect
                        label="Cut Stock Item"
                        name="cut_stock_id"
                        value={selectedCutStock}
                        onChange={(e) => setSelectedCutStock(e.target.value)}
                        required
                        options={cutStock.map(item => ({
                            value: item.id,
                            label: `${item.org_dress_name} - ${item.design} - Size: ${item.size} - Qty: ${item.quantity}`
                        }))}
                        placeholder="Select cut stock item..."
                    />

                    {cutStock.length === 0 && (
                        <p className="text-danger" style={{ fontSize: '0.875rem' }}>
                            No available cut stock. Complete a cutting process first.
                        </p>
                    )}
                </form>
            </Modal>
        </div>
    );
}
