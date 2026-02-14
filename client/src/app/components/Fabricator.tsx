import { useState, useEffect } from "react";
import { Search, Loader2, Package, CheckCircle2, Factory, ArrowRight } from "lucide-react";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { api } from "../../services/api";
import { toast } from "sonner";
import { cn } from "./ui/utils.tsx";
import { Modal } from "./ui/modal";

export function Fabricator() {
    const [jobs, setJobs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [receiveModalOpen, setReceiveModalOpen] = useState(false);
    const [selectedJob, setSelectedJob] = useState<any>(null);
    const [receivedQty, setReceivedQty] = useState<{ [key: string]: number }>({});
    const [submitting, setSubmitting] = useState(false);

    const fetchJobs = async () => {
        try {
            const { jobs } = await api.get('/processing/fabricator');
            setJobs(jobs || []);
        } catch (error) {
            toast.error("Failed to load fabricator jobs");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchJobs();
    }, []);

    const handleOpenReceive = (job: any) => {
        setSelectedJob(job);
        setReceivedQty({});
        setReceiveModalOpen(true);
    };

    const handleReceive = async () => {
        if (!selectedJob) return;
        setSubmitting(true);
        try {
            await api.put(`/processing/${selectedJob.id}/receive`, { receivedQty });
            toast.success("Received successfully");
            setReceiveModalOpen(false);
            fetchJobs();
        } catch (error: any) {
            toast.error(error.message || "Failed to update");
        } finally {
            setSubmitting(false);
        }
    };

    const parseSq = (sq: any) => {
        try {
            return typeof sq === 'string' ? JSON.parse(sq) : sq;
        } catch {
            return {};
        }
    };

    return (
        <div className="flex-1 overflow-auto bg-[#f8fafc]">
            {/* Header */}
            <div className="bg-white border-b border-gray-200 px-8 py-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-black text-gray-900">Fabricator Tracking</h1>
                        <p className="text-sm font-bold text-gray-500 mt-1 uppercase tracking-widest">External Processing Management</p>
                    </div>
                </div>
            </div>

            <div className="p-8 max-w-7xl mx-auto">
                {loading ? (
                    <div className="py-20 text-center">
                        <Loader2 className="w-10 h-10 animate-spin mx-auto text-indigo-600 mb-4" />
                        <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Loading Fabricator Data...</p>
                    </div>
                ) : jobs.length === 0 ? (
                    <div className="text-center py-20 border-2 border-dashed border-gray-200 rounded-2xl">
                        <Factory className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                        <p className="text-sm font-bold text-gray-400">No active fabricator jobs</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {jobs.map(job => {
                            const sq = parseSq(job.sq);
                            const received = sq._meta?.received || {};
                            // Filter out _meta for sent calculation
                            const sentSizes = Object.entries(sq).filter(([k]) => k !== '_meta');
                            const totalSent: number = sentSizes.reduce((a, [_, q]: any) => a + Number(q), 0);
                            const totalReceived: number = Object.values(received).reduce((a: number, b: any) => a + Number(b), 0);
                            const remaining: number = totalSent - totalReceived;

                            return (
                                <div key={job.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 hover:shadow-md transition-shadow">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-lg bg-orange-50 flex items-center justify-center text-orange-600">
                                                <Factory className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <p className="text-xs font-black text-gray-400 uppercase tracking-wider">{job.worker_name}</p>
                                                <p className="text-[10px] text-gray-400">Order #{job.order_branch}</p>
                                            </div>
                                        </div>
                                        <Badge variant="outline" className={cn("text-[10px] uppercase font-black tracking-widest", remaining === 0 ? "bg-green-50 text-green-600 border-green-100" : "bg-blue-50 text-blue-600 border-blue-100")}>
                                            {remaining === 0 ? "Completed" : "In Progress"}
                                        </Badge>
                                    </div>

                                    <h3 className="text-lg font-black text-gray-900 mb-1">{job.org_dress_name}</h3>
                                    <p className="text-xs font-bold text-gray-500 mb-6">{job.org_name}</p>

                                    <div className="grid grid-cols-3 gap-2 mb-6">
                                        <div className="bg-gray-50 rounded-lg p-2 text-center">
                                            <p className="text-[9px] font-black text-gray-400 uppercase">Sent</p>
                                            <p className="text-lg font-black text-gray-900">{totalSent}</p>
                                        </div>
                                        <div className="bg-green-50 rounded-lg p-2 text-center">
                                            <p className="text-[9px] font-black text-green-600 uppercase">Received</p>
                                            <p className="text-lg font-black text-green-700">{totalReceived}</p>
                                        </div>
                                        <div className="bg-orange-50 rounded-lg p-2 text-center">
                                            <p className="text-[9px] font-black text-orange-600 uppercase">Pending</p>
                                            <p className="text-lg font-black text-orange-700">{remaining}</p>
                                        </div>
                                    </div>

                                    <Button
                                        className="w-full font-bold"
                                        onClick={() => handleOpenReceive(job)}
                                        disabled={remaining === 0}
                                    >
                                        {remaining === 0 ? "Fully Received" : "Update Receipt"}
                                    </Button>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            <Modal
                isOpen={receiveModalOpen}
                onClose={() => setReceiveModalOpen(false)}
                title="Record Receipt from Fabricator"
            >
                {selectedJob && (
                    <div className="space-y-6">
                        <div>
                            <p className="text-xs font-bold text-gray-500 uppercase">Item</p>
                            <h3 className="text-lg font-black text-gray-900">{selectedJob.org_dress_name}</h3>
                        </div>

                        <div className="space-y-4">
                            {(() => {
                                const sq = parseSq(selectedJob.sq);
                                const entries = Object.entries(sq).filter(([size]) => size !== '_meta');
                                const pendingRows = entries.filter(([size, sent]) => {
                                    const prevRecv = sq._meta?.received?.[size] || 0;
                                    return (Number(sent) - Number(prevRecv)) > 0;
                                });

                                if (pendingRows.length === 0) {
                                    return <p className="text-center text-xs font-bold text-green-600 bg-green-50 py-2 rounded-lg">All items fully received!</p>;
                                }

                                return pendingRows.map(([size, sent]: [string, any]) => {
                                    const prevRecv = sq._meta?.received?.[size] || 0;
                                    const currentRecv = receivedQty[size] || 0;
                                    const maxRecv = Number(sent) - Number(prevRecv);

                                    return (
                                        <div key={size} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center font-black text-gray-700 text-xs border border-gray-200">
                                                    {size}
                                                </div>
                                                <div>
                                                    <p className="text-xs font-bold text-gray-900">Sent: {sent}</p>
                                                    <p className="text-[10px] font-bold text-gray-400">Received So Far: {prevRecv}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Input
                                                    type="number"
                                                    className="w-20 h-9 bg-white font-bold text-center"
                                                    placeholder="0"
                                                    max={maxRecv}
                                                    value={currentRecv || ''}
                                                    onChange={(e) => {
                                                        const val = Math.min(Number(e.target.value), maxRecv);
                                                        setReceivedQty(prev => ({ ...prev, [size]: val }));
                                                    }}
                                                />
                                                <span className="text-xs font-bold text-gray-400">/ {maxRecv}</span>
                                            </div>
                                        </div>
                                    );
                                });
                            })()}
                        </div>

                        <div className="flex justify-end gap-3 pt-4 border-t">
                            <Button variant="ghost" onClick={() => setReceiveModalOpen(false)}>Cancel</Button>
                            <Button
                                onClick={handleReceive}
                                disabled={submitting || Object.values(receivedQty).every(v => !v || v <= 0)}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white"
                            >
                                {submitting ? <Loader2 className="animate-spin w-4 h-4" /> : "Confirm Receipt"}
                            </Button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
}
