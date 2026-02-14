import { Scissors, Clock, AlertCircle, CheckCircle2, User, Loader2, Plus, Ruler, Package } from "lucide-react";
import { Badge } from "./ui/badge";
import { Progress } from "./ui/progress";
import { Button } from "./ui/button";
import { useState, useEffect } from "react";
import { api } from "../../services/api";
import toast from "react-hot-toast";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Modal } from "./ui/modal";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { RecordFabricModal } from "./modals/RecordFabricModal";

interface CuttingJob {
  id: number;
  order_id: number;
  org_dress_id: number;
  org_name: string;
  org_dress_name: string;
  sq: any; // JSON object {S: 10, M: 20...}
  status: string;
  cutter_name: string;
  created_on: string;
  fabric_usage_logs?: any[];
  remarks?: string;
}

function CuttingJobCard({ job, onRefresh, fabrics }: { job: CuttingJob, onRefresh: () => void, fabrics: any[] }) {
  const [isRecording, setIsRecording] = useState(false);
  const [fabricUsed, setFabricUsed] = useState("");
  const [selectedFabricId, setSelectedFabricId] = useState<string>("");
  const [rollId, setRollId] = useState("");
  const [rolls, setRolls] = useState<any[]>([]);
  const [loadingRolls, setLoadingRolls] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);

  const [fabricLocked, setFabricLocked] = useState(false);

  // Parse SQ to get total pieces
  const sq = typeof job.sq === 'string' ? JSON.parse(job.sq) : job.sq;
  const totalPieces = Object.values(sq).reduce((a: any, b: any) => a + (parseInt(b) || 0), 0) as number;

  const hasFabricRecorded = job.fabric_usage_logs && job.fabric_usage_logs.length > 0;
  const progress = job.status === 'Completed' ? 100 : (hasFabricRecorded ? 50 : 10);

  // Fetch rolls when fabric is selected
  useEffect(() => {
    const fetchRolls = async () => {
      if (!selectedFabricId) {
        setRolls([]);
        return;
      }
      setLoadingRolls(true);
      try {
        const data = await api.get(`/fabric/${selectedFabricId}`);
        if (data.success && data.rolls) {
          // Filter out empty rolls if necessary, but here we show all with balance
          setRolls(data.rolls);
        }
      } catch (error) {
        toast.error("Failed to load rolls");
      } finally {
        setLoadingRolls(false);
      }
    };
    fetchRolls();
  }, [selectedFabricId]);

  useEffect(() => {
    if (job.remarks && job.remarks.startsWith("Planned Fabric ID: ")) {
      const parts = job.remarks.split("|");
      if (parts.length > 0) {
        const idPart = parts[0].replace("Planned Fabric ID: ", "").trim();
        if (idPart) {
          setSelectedFabricId(idPart);
          setFabricLocked(true);
        }
      }
    }
  }, [job.remarks]);

  const handleRecordFabric = async () => {
    if (!fabricUsed) {
      toast.error("Please enter Fabric Quantity");
      return;
    }
    if (!rollId || rollId === "auto") {
      toast.error("Please select a specific Roll");
      return;
    }

    setIsSubmitting(true);
    try {
      const entries = [{
        cloth_quantity_id: parseInt(rollId),
        fabric_used: parseInt(fabricUsed) || 0,
        cut_type: "Standard",
        cut_rate: 0
      }];

      await api.put(`/cutting/${job.id}/fabric-usage`, {
        fabric_entries: entries
      });
      toast.success("Fabric usage recorded");
      setIsRecording(false);
      setSelectedFabricId("");
      setFabricLocked(false);
      setRollId("");
      setFabricUsed("");
      onRefresh();
    } catch (error: any) {
      toast.error(error.message || "Failed to record fabric");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleComplete = async () => {
    setIsSubmitting(true);
    try {
      await api.put(`/cutting/${job.id}/complete`, {});
      toast.success("Cutting job completed and moved to Stock");
      onRefresh();
    } catch (error: any) {
      toast.error(error.message || "Failed to complete job");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border-2 border-gray-200 p-6 hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-sm">
            <Scissors className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="font-mono text-xs font-bold text-gray-400 uppercase tracking-tighter">Job ID</span>
            <p className="font-bold text-gray-900 leading-none">#{job.id}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge
            className={
              job.status === "Completed"
                ? "bg-green-100 text-green-700 border-green-200"
                : "bg-blue-100 text-blue-700 border-blue-200"
            }
          >
            {job.status.toUpperCase()}
          </Badge>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs text-gray-600 hover:text-gray-900"
            onClick={() => setShowDetailModal(true)}
          >
            <Package className="w-3.5 h-3.5 mr-1" />
            Details
          </Button>
        </div>
      </div>

      {/* Job Info */}
      <div className="mb-4">
        <h3 className="font-bold text-gray-900 mb-1">
          {job.org_name}
        </h3>
        <p className="text-sm text-gray-600">{job.org_dress_name}</p>
      </div>

      {/* Progress */}
      <div className="bg-gray-50 rounded-lg p-4 mb-4 border border-gray-100">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-gray-500 uppercase">Status</span>
          <span className="text-sm font-bold text-gray-900">
            {totalPieces} Pieces
          </span>
        </div>
        <Progress value={progress} className="h-1.5 mb-2" />
        <p className="text-[10px] text-gray-400">Targeting sizes: {Object.keys(typeof sq === 'string' ? JSON.parse(sq) : sq).filter((k: string) => k !== '_meta').join(", ")}</p>
      </div>

      {/* Record Fabric Modal */}
      <RecordFabricModal
        isOpen={isRecording}
        onClose={() => setIsRecording(false)}
        jobId={job.id}
        orgDressId={job.org_dress_id}
        onSuccess={() => {
          onRefresh();
        }}
        fabrics={fabrics}
        initialFabricId={selectedFabricId}
        targetSq={sq}
      />

      {/* Action Area */}
      {job.status !== "Completed" && (
        <div className="space-y-4">
          <div className={`${job.org_name === 'INTERNAL STOCK PRODUCTION' ? 'grid grid-cols-2' : 'flex'} gap-2`}>
            {/* Show Record Fabric for all jobs now as per new UI, or just Stock? 
                  The prompt implies "Record Fabric" button is available. 
                  Let's make it available for all active jobs if not recorded yet.
               */}
            {!hasFabricRecorded && (
              <Button
                variant="outline"
                size="sm"
                className="text-xs border-blue-200 text-blue-700 hover:bg-blue-50 flex-1"
                onClick={() => setIsRecording(true)}
              >
                <Ruler className="w-3 h-3 mr-1.5" />
                Record Fabric
              </Button>
            )}
            <Button
              size="sm"
              className={`text-xs bg-green-600 hover:bg-green-700 ${!hasFabricRecorded ? 'flex-1' : 'w-full'}`}
              onClick={handleComplete}
              disabled={!hasFabricRecorded || isSubmitting}
            >
              {isSubmitting ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3 mr-1.5" />}
              Complete
            </Button>
          </div>
        </div>
      )}



      {/* Footer Info */}
      <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-[10px] font-bold text-gray-600">
            {job.cutter_name?.[0]}
          </div>
          <span className="text-xs text-gray-600">{job.cutter_name}</span>
        </div>
        <div className="flex items-center gap-1 text-[10px] text-gray-400">
          <Clock className="w-3 h-3" />
          <span>{new Date(job.created_on).toLocaleDateString()}</span>
        </div>
      </div>

      {/* Detail Modal */}
      <Modal
        isOpen={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        title={`Job #${job.id} - Details`}
        size="lg"
      >
        <div className="space-y-6">
          {/* Job Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs text-gray-500 uppercase font-bold">Order ID</Label>
              <p className="text-sm font-semibold text-gray-900">#{job.order_id}</p>
            </div>
            <div>
              <Label className="text-xs text-gray-500 uppercase font-bold">Status</Label>
              <p className="text-sm font-semibold text-gray-900">{job.status}</p>
            </div>
            <div>
              <Label className="text-xs text-gray-500 uppercase font-bold">Client</Label>
              <p className="text-sm font-semibold text-gray-900">{job.org_name}</p>
            </div>
            <div>
              <Label className="text-xs text-gray-500 uppercase font-bold">Product</Label>
              <p className="text-sm font-semibold text-gray-900">{job.org_dress_name}</p>
            </div>
            <div>
              <Label className="text-xs text-gray-500 uppercase font-bold">Cutter</Label>
              <p className="text-sm font-semibold text-gray-900">{job.cutter_name}</p>
            </div>
            <div>
              <Label className="text-xs text-gray-500 uppercase font-bold">Created On</Label>
              <p className="text-sm font-semibold text-gray-900">{new Date(job.created_on).toLocaleString()}</p>
            </div>
          </div>

          {/* Quantity Breakdown */}
          <div>
            <Label className="text-xs text-gray-500 uppercase font-bold mb-2 block">Quantity Breakdown</Label>
            <div className="flex gap-2 flex-wrap">
              {Object.entries(typeof sq === 'string' ? JSON.parse(sq) : sq).filter(([key]) => key !== '_meta').map(([size, qty]: any) => (
                <Badge key={size} className="bg-blue-100 text-blue-700 border-blue-200">
                  {size}: {qty} pcs
                </Badge>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-2">Total: {totalPieces} pieces</p>
          </div>

          {/* Fabric Usage Logs */}
          {job.fabric_usage_logs && job.fabric_usage_logs.length > 0 && (
            <div>
              <Label className="text-xs text-gray-500 uppercase font-bold mb-2 block">Fabric Usage</Label>
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-700">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-bold">Roll ID</th>
                      <th className="px-3 py-2 text-left text-xs font-bold">Fabric Type</th>
                      <th className="px-3 py-2 text-left text-xs font-bold">Color</th>
                      <th className="px-3 py-2 text-left text-xs font-bold">Design</th>
                      <th className="px-3 py-2 text-left text-xs font-bold">Quality</th>
                      <th className="px-3 py-2 text-left text-xs font-bold">Used</th>
                      <th className="px-3 py-2 text-left text-xs font-bold">Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {job.fabric_usage_logs.map((log: any, idx: number) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-3 py-2 text-xs font-mono">#{log.cloth_quantity_id}</td>
                        <td className="px-3 py-2 text-xs font-semibold">{log.cloth_type}</td>
                        <td className="px-3 py-2 text-xs">{log.color_name}</td>
                        <td className="px-3 py-2 text-xs">{log.design_name}</td>
                        <td className="px-3 py-2 text-xs">{log.quality_name}</td>
                        <td className="px-3 py-2 text-xs font-semibold text-red-600">
                          {(() => {
                            // Try to find usage in sq._meta.fabric
                            let used = 0;
                            let metaFabric: any = {};

                            try {
                              const sqObj = typeof job.sq === 'string' ? JSON.parse(job.sq) : job.sq;
                              if (sqObj && sqObj._meta && sqObj._meta.fabric) {
                                metaFabric = sqObj._meta.fabric;
                              }
                            } catch (e) {
                              // ignore parse error
                            }

                            // Lookup with loose comparison (string/number)
                            used = metaFabric[log.cloth_quantity_id] || metaFabric[String(log.cloth_quantity_id)];

                            // Fallback to old calculation only if NOT found in meta (used is undefined)
                            if (used === undefined || used === null) {
                              // Double check if it's a legacy record without meta
                              // If meta exists but key is missing, maybe it really is 0?
                              // But here we default to fallback if undefined.
                              used = parseFloat(log.original_roll_length) - parseFloat(log.bal_cloth);
                            }

                            return used ? `${Number(used).toFixed(2)}m` : '-';
                          })()}
                        </td>
                        <td className="px-3 py-2 text-xs font-semibold text-green-600">{log.bal_cloth}m</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Remarks */}
          {job.remarks && (
            <div>
              <Label className="text-xs text-gray-500 uppercase font-bold mb-2 block">Remarks</Label>
              <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded border border-gray-200">{job.remarks}</p>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}




// New Info Card for Pending Order Item
function PendingOrderItem({ order, item, employees, onAssign }: { order: any, item: any, employees: any[], onAssign: (empId: string) => void }) {
  const [selectedEmpId, setSelectedEmpId] = useState("");
  const [isAssigning, setIsAssigning] = useState(false);

  // Auto-select if only one emp
  useEffect(() => {
    if (employees.length === 1) {
      setSelectedEmpId(employees[0].id.toString());
    }
  }, [employees]);

  const handleAssign = async () => {
    if (!selectedEmpId) {
      toast.error("Please select a tailor first");
      return;
    }
    setIsAssigning(true);
    await onAssign(selectedEmpId);
    setIsAssigning(false);
  };

  return (
    <div className="p-4 border border-gray-100 rounded-lg bg-gray-50/50 flex flex-col justify-between h-full hover:shadow-md transition-shadow">
      <div>
        <div className="flex justify-between items-start mb-2">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Order #{order.id}</p>
          {/* If fabric is locked/assigned, show badge */}
          {item.assigned_fabric_id && (
            <Badge variant="outline" className="text-[10px] bg-rose-50 text-rose-600 border-rose-200">Fabric Locked</Badge>
          )}
        </div>
        <p className="font-bold text-gray-900 mb-1">{order.org_name}</p>
        <p className="text-xs text-gray-500 mb-4">{item.org_dress_name} ({Object.values(typeof item.sq === 'string' ? JSON.parse(item.sq) : item.sq).reduce((a: any, b: any) => a + b, 0)} pcs)</p>
      </div>

      <div className="space-y-2 mt-auto">
        <Select value={selectedEmpId} onValueChange={setSelectedEmpId}>
          <SelectTrigger className="h-9 text-xs bg-white">
            <SelectValue placeholder="Tailor selection" />
          </SelectTrigger>
          <SelectContent>
            {employees.map(emp => (
              <SelectItem key={emp.id} value={emp.id.toString()}>{emp.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          className="w-full h-9 text-xs bg-slate-900 hover:bg-slate-800"
          onClick={handleAssign}
          disabled={!selectedEmpId || isAssigning}
        >
          {isAssigning ? <Loader2 className="w-3 h-3 animate-spin" /> : "Select"}
        </Button>
      </div>
    </div>
  );
}

export function Cutting() {
  const [jobs, setJobs] = useState<CuttingJob[]>([]);
  const [fabrics, setFabrics] = useState<any[]>([]);
  const [pendingOrders, setPendingOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewJobModal, setShowNewJobModal] = useState(false);
  const [employees, setEmployees] = useState<any[]>([]);

  const fetchFabrics = async () => {
    try {
      const data = await api.get('/fabric');
      setFabrics(data.fabrics || []);
    } catch (error) {
      console.error("Failed to fetch fabrics");
    }
  };

  const fetchEmployees = async () => {
    try {
      const data = await api.get('/employees');
      // Filter out Fabricators for cutting assignments
      const filtered = (data.employees || []).filter(
        (e: any) => e.role_name?.toLowerCase() !== 'fabricator'
      );
      setEmployees(filtered);
    } catch (error) {
      console.error("Failed to fetch employees");
    }
  };

  const fetchJobs = async () => {
    try {
      const data = await api.get('/cutting');
      setJobs(data.jobs || []);
    } catch (error) {
      toast.error("Failed to load cutting jobs");
    } finally {
      setLoading(false);
    }
  };

  const fetchPending = async () => {
    try {
      const data = await api.get('/cutting/pending-orders');
      setPendingOrders(data.pending_orders || []);
    } catch (error) {
      console.error("Failed to load pending orders");
    }
  };

  useEffect(() => {
    fetchJobs();
    fetchPending();
    fetchEmployees();
    fetchFabrics();
  }, []);

  const handleStartJob = async (orderId: number, item: any, empId: string) => {
    try {
      await api.post('/cutting', {
        order_id: orderId,
        org_dress_id: item.org_dress_id,
        pattern_series: "Standard",
        assignments: [{
          emp_id: parseInt(empId),
          sq: typeof item.sq === 'string' ? JSON.parse(item.sq) : item.sq,
          // No fabric assigned initially
        }]
      });

      toast.success(`Job assigned successfully`);
      fetchJobs();
      fetchPending();
    } catch (error: any) {
      toast.error(error.message || "Failed to start job");
    }
  };


  const activeJobs = jobs.filter(j => j.status !== 'Completed').length;
  const completedToday = jobs.filter(j => j.status === 'Completed').length;

  return (
    <div className="flex-1 overflow-auto bg-background">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-8 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Cutting Department</h1>
            <p className="text-sm text-gray-600 mt-1">Monitor and manage fabric cutting operations</p>
          </div>
          <Button
            className="bg-[#e94560] hover:bg-[#d13a52]"
            onClick={() => setShowNewJobModal(!showNewJobModal)}
          >
            {showNewJobModal ? "Close Panel" : (
              <>
                <Scissors className="w-4 h-4 mr-2" />
                Pending Orders for Cutting
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="p-8">
        {/* New Job Assignment Panel (Inline for better UX) */}
        {showNewJobModal && (
          <div className="mb-8 p-6 bg-white rounded-xl border-2 border-primary/20 shadow-lg animate-in slide-in-from-top duration-300">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
              <Plus className="w-5 h-5 mr-2 text-primary" />
              Pending Orders for Cutting
            </h2>
            {pendingOrders.length === 0 ? (
              <p className="text-gray-500 text-sm italic">No pending orders available for cutting.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {pendingOrders.flatMap((order) =>
                  order.items.map((item: any, idx: number) => (
                    <PendingOrderItem
                      key={`${order.id}-${item.id || idx}`}
                      order={order}
                      item={item}
                      employees={employees}
                      onAssign={(empId) => handleStartJob(order.id, item, empId)}
                    />
                  ))
                )}
              </div>
            )}
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg">
                <Scissors className="w-6 h-6 text-white" />
              </div>
            </div>
            <p className="text-xs uppercase tracking-wider text-gray-500 mb-1">Active Jobs</p>
            <p className="text-3xl font-bold text-blue-600">{activeJobs}</p>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center shadow-lg">
                <CheckCircle2 className="w-6 h-6 text-white" />
              </div>
            </div>
            <p className="text-xs uppercase tracking-wider text-gray-500 mb-1">Finished Jobs</p>
            <p className="text-3xl font-bold text-green-600">{completedToday}</p>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center shadow-lg">
                <Clock className="w-6 h-6 text-white" />
              </div>
            </div>
            <p className="text-xs uppercase tracking-wider text-gray-500 mb-1">Queue Size</p>
            <p className="text-3xl font-bold text-gray-900">{pendingOrders.length}</p>
          </div>
        </div>

        {/* Jobs Grid */}
        <div>
          <h2 className="text-lg font-bold text-gray-900 mb-4">Production Floor</h2>
          {loading ? (
            <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
          ) : jobs.length === 0 ? (
            <div className="text-center py-20 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
              <Scissors className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No cutting jobs on the floor.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {jobs.map((job) => (
                <CuttingJobCard key={job.id} job={job} onRefresh={fetchJobs} fabrics={fabrics} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
