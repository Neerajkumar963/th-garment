import { Clock, User, AlertCircle, CheckCircle2, Loader2, ArrowRight, Trash2, Eye, Pencil, Info, Plus } from "lucide-react";
import { cn } from "./ui/utils.tsx";
import { Badge } from "./ui/badge";
import { Progress } from "./ui/progress";
import { useState, useEffect } from "react";
import { api } from "../../services/api";
import toast from "react-hot-toast";
import { Button } from "./ui/button";
import { Modal } from "./ui/modal";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Label } from "./ui/label";
import { Input } from "./ui/input";

interface ProcessingJob {
  id: number;
  worker_name: string;
  org_name: string;
  org_dress_name: string;
  sq: any;
  status: string;
  processing_rate: number;
  stage_name: string;
  created_on: string;
  updated_on: string;
  remarks: string;
  order_id: number;
  stage_id: number;
  cut_stock_id?: number;
  org_dress_id?: number;
}

interface Stage {
  id: number;
  name: string;
  jobs: ProcessingJob[];
}

function JobCardComponent({
  job,
  onRefresh,
  onMove,
  onViewDetails,
  onEditRate,
  isNextAssigned
}: {
  job: ProcessingJob,
  onRefresh: () => void,
  onMove: (job: ProcessingJob) => void,
  onViewDetails: (job: ProcessingJob) => void,
  onEditRate: (job: ProcessingJob) => void,
  isNextAssigned?: boolean
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleComplete = async () => {
    setIsSubmitting(true);
    try {
      await api.put(`/processing/${job.id}/complete-stage`, {});
      toast.success("Stage completed. Available for next assignment.");
      onRefresh();
    } catch (error: any) {
      toast.error(error.message || "Failed to complete stage");
    } finally {
      setIsSubmitting(false);
    }
  };



  // Parse SQ
  const sq = typeof job.sq === 'string' ? JSON.parse(job.sq) : job.sq;
  const totalPieces = Object.entries(sq)
    .filter(([key]) => key !== '_meta')
    .reduce((a: number, [_, qty]: any) => a + (parseInt(qty) || 0), 0);

  const isProcessed = job.status === 'processed';

  return (
    <div className={cn(
      "bg-white rounded-lg border-2 p-4 hover:shadow-md transition-shadow relative group",
      isProcessed ? "border-green-100 bg-green-50/20" : "border-gray-200"
    )}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="flex flex-col">
            <span className="font-mono text-[10px] font-bold text-gray-400 uppercase tracking-tighter">Job ID</span>
            <span className="font-bold text-gray-900 leading-none">#{job.id}</span>
          </div>

        </div>
        <div className="flex gap-1.5">
          <button
            onClick={() => onViewDetails(job)}
            className="p-1.5 text-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"
            title="View cloth details"
          >
            <Eye className="w-3.5 h-3.5" />
          </button>
          <Badge variant="outline" className={cn(
            "text-[10px] h-5 border-gray-200",
            isProcessed ? "bg-green-100 text-green-700 border-green-200" : "text-gray-500"
          )}>
            {isProcessed ? "READY FOR NEXT" : `Order #${job.order_id}`}
          </Badge>
        </div>
      </div>

      {/* Product Info */}
      <div className="mb-3">
        <h4 className="font-bold text-gray-900 text-sm mb-0.5 truncate">{job.org_name}</h4>
        <p className="text-xs text-gray-600 truncate">{job.org_dress_name}</p>
      </div>

      {/* Size Breakdown Snippet */}
      <div className="grid grid-cols-4 gap-1 mb-4">
        {Object.entries(sq).filter(([key]) => key !== '_meta').slice(0, 4).map(([size, qty]) => (
          <div key={size} className="text-center p-1 bg-white/50 rounded border border-gray-100">
            <p className="text-[8px] font-bold text-gray-400 uppercase leading-none">{size}</p>
            <p className="text-[10px] font-bold text-gray-900 leading-none mt-1">{qty as string}</p>
          </div>
        ))}
      </div>

      {/* Worker Info */}
      <div className="flex items-center gap-2 mb-4 p-2 bg-gray-50/50 rounded-lg">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-50 to-indigo-100 border border-indigo-200 flex items-center justify-center shadow-sm">
          <User className="w-4 h-4 text-indigo-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-gray-900 text-[11px] truncate leading-none mb-1">{job.worker_name}</p>
          <div className="flex items-center gap-1.5">
            {!isProcessed && (
              <button
                onClick={() => onEditRate(job)}
                className="group/rate flex items-center gap-1 hover:bg-indigo-50 px-1.5 py-0.5 rounded border border-gray-100 transition-colors"
                title="Edit processing rate"
              >
                <span className="text-[10px] font-bold text-gray-400 group-hover/rate:text-indigo-600">₹{job.processing_rate}/pc</span>
                <Pencil className="w-2.5 h-2.5 text-gray-300 group-hover/rate:text-indigo-400" />
              </button>
            )}
            <span className="text-[10px] text-gray-500">• {totalPieces} items</span>
          </div>
        </div>
      </div>

      {/* Action */}
      {job.stage_id < 8 && (
        isProcessed ? (
          (
            <Button
              size="sm"
              className="w-full h-8 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
              onClick={() => {
                console.log("JobCard Clicked - Job Data:", job); // DEBUG LOG
                if (job.stage_id > 7) {
                  handleComplete();
                } else {
                  onMove(job);
                }
              }}
              disabled={isSubmitting}
            >
              {job.stage_id > 7 ? (
                isSubmitting ? <Loader2 className="w-3 h-3 animate-spin mr-2" /> : "Production Complete"
              ) : (
                <>
                  <ArrowRight className="w-3 h-3 mr-2" />
                  Assign Stage {job.stage_id + 1}
                </>
              )}
            </Button>
          )
        ) : (
          <Button
            size="sm"
            className="w-full h-8 text-xs font-bold bg-green-600 hover:bg-green-700 text-white shadow-sm"
            onClick={handleComplete}
            disabled={isSubmitting}
          >
            {isSubmitting ? <Loader2 className="w-3 h-3 animate-spin mr-2" /> : <CheckCircle2 className="w-3 h-3 mr-2" />}
            Complete Stage
          </Button>
        )
      )}

      {/* Footer Meta */}
      <div className="mt-3 pt-3 border-t border-gray-50 flex items-center justify-between text-[9px] text-gray-400">
        <span className="flex items-center gap-1">
          <Clock className="w-2.5 h-2.5" />
          {new Date(job.created_on).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
        <span className="font-bold uppercase tracking-widest text-indigo-300">{job.stage_name}</span>
      </div>
    </div>
  );
}

// Multi-Employee Assignment Panel Component
interface Assignment {
  emp_id: number;
  sq: Record<string, number>;
  processing_rate: number;
}

function MultiEmployeeAssignmentPanel({
  transitionJob,
  alreadyAssignedSq = {},
  employees,
  onCancel,
  onSubmit,
  isSubmitting,
  stockList = [] // Placeholder
}: {
  transitionJob: ProcessingJob;
  alreadyAssignedSq?: Record<string, number>;
  employees: any[];
  onCancel: () => void;
  onSubmit: (assignments: Assignment[], stockUsed: Record<string, number>) => Promise<void>;
  isSubmitting: boolean;
  stockList?: any[];
}) {
  const rawSq = typeof transitionJob.sq === 'string' ? JSON.parse(transitionJob.sq) : transitionJob.sq;

  // FIXED: Use rawSq directly as availableSq. Job.sq already reflects remaining quantity.
  // We do NOT subtract any "alreadyAssignedSq" because the backend manages the deduction.
  const availableSq: Record<string, number> = {};
  Object.keys(rawSq).forEach(size => {
    if (size !== '_meta') {
      availableSq[size] = Number(rawSq[size]) || 0;
    }
  });

  const sizes = Object.keys(availableSq).filter(k => k !== '_meta');

  // Stock State
  const [matchingStock, setMatchingStock] = useState<any[]>([]);
  const [stockUsed, setStockUsed] = useState<Record<string, number>>({});
  const [loadingStock, setLoadingStock] = useState(false);

  // Assignments State
  const [assignments, setAssignments] = useState<Assignment[]>([
    {
      emp_id: 0,
      sq: sizes.reduce((acc, size) => ({ ...acc, [size]: 0 }), {}),
      processing_rate: 5
    }
  ]);

  const isInternalStock = transitionJob.org_name?.includes("INTERNAL STOCK");

  // Fetch Stock on Mount
  useEffect(() => {
    if (isInternalStock) {
      setMatchingStock([]);
      setLoadingStock(false);
      return;
    }
    const fetchStock = async () => {
      setLoadingStock(true);
      try {
        const data = await api.get('/sales/stock');
        // Filter by org_dress_id if available in transitionJob
        // We need to ensure transitionJob has org_dress_id. 
        // In getKanbanBoard we added cp.org_dress_id
        if (transitionJob.org_dress_id) {
          // Group by size
          const RelevantStock = (data.stock || []).filter((s: any) => String(s.org_dress_id) === String(transitionJob.org_dress_id));

          // IMPORTANT: Only show stock that matches the REQUIRED sizes
          const requiredSizes = sizes.map(s => s.trim().toUpperCase());
          const usableStock = RelevantStock.filter((s: any) =>
            requiredSizes.includes(s.size.trim().toUpperCase())
          );

          setMatchingStock(usableStock);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoadingStock(false);
      }
    }
    fetchStock();
  }, [transitionJob]);

  const addAssignment = () => {
    setAssignments([
      ...assignments,
      {
        emp_id: 0,
        sq: sizes.reduce((acc, size) => ({ ...acc, [size]: 0 }), {}),
        processing_rate: 5
      }
    ]);
  };

  const removeAssignment = (index: number) => {
    if (assignments.length > 1) {
      setAssignments(assignments.filter((_, i) => i !== index));
    }
  };

  const updateAssignment = (index: number, field: keyof Assignment, value: any) => {
    const newAssignments = [...assignments];
    newAssignments[index] = { ...newAssignments[index], [field]: value };
    setAssignments(newAssignments);
  };

  const updateQuantity = (index: number, size: string, value: number) => {
    const newAssignments = [...assignments];
    newAssignments[index].sq = { ...newAssignments[index].sq, [size]: value };
    setAssignments(newAssignments);
  };

  // Stock Usage Update
  const updateStockUsage = (size: string, value: number) => {
    setStockUsed(prev => ({ ...prev, [size]: value }));
  };

  const isFullyFulfilledByStock = sizes.every(size => {
    const required = availableSq[size] || 0;
    const used = stockUsed[size] || 0;
    return used >= required;
  });

  const autoFillStockUsage = () => {
    const newStockUsed: Record<string, number> = {};
    sizes.forEach(size => {
      const required = availableSq[size] || 0;
      const stockItem = matchingStock.find(s => s.size.trim().toUpperCase() === size.trim().toUpperCase());
      const available = stockItem?.available_qty || 0;
      newStockUsed[size] = Math.min(required, available);
    });
    setStockUsed(newStockUsed);
  };

  // Calculate total assigned per size (Employees + Stock)
  const getTotalAssigned = (size: string) => {
    const empAssigned = assignments.reduce((sum, assignment) => sum + (assignment.sq[size] || 0), 0);
    const stock = stockUsed[size] || 0;
    return empAssigned + stock;
  };

  // Check if specific size is over-assigned
  const isOverLimit = (size: string) => {
    const assigned = getTotalAssigned(size);
    const available = availableSq[size] || 0;
    return assigned > available;
  };

  // Check if stock usage exceeds available stock
  const isStockOverLimit = (size: string) => {
    const used = stockUsed[size] || 0;
    const stockItem = matchingStock.find(s => s.size.trim().toUpperCase() === size.trim().toUpperCase());
    const available = stockItem?.available_qty || 0;
    return used > available;
  }

  // Check if any size is over-assigned
  const hasOverAssignment = () => {
    return sizes.some(size => isOverLimit(size) || isStockOverLimit(size));
  };

  // Get remaining quantity for a size
  const getRemaining = (size: string) => {
    const available = availableSq[size] || 0;
    const assigned = getTotalAssigned(size);
    return available - assigned;
  };

  const handleSubmit = () => {
    // Filter out empty assignments
    const validAssignments = assignments.filter(a =>
      a.emp_id > 0 && Object.values(a.sq).some(qty => qty > 0)
    );

    // If stockUsed is present, we allow empty assignments (fully fulfilled by stock)
    const hasStock = Object.values(stockUsed).some(v => v > 0);

    if (validAssignments.length === 0 && !hasStock) {
      toast.error("Add at least one valid assignment or use stock");
      return;
    }

    onSubmit(validAssignments, stockUsed);
  };

  return (
    <div className="space-y-6">
      {/* Job Info */}
      <div className="p-4 bg-indigo-50 rounded-xl border border-indigo-100">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">
              {transitionJob.stage_id > 0 ? 'Next Stage' : 'First Assignment'}
            </p>
            <h3 className="font-bold text-gray-900">{transitionJob.org_name}</h3>
            <p className="text-sm text-gray-600">{transitionJob.org_dress_name}</p>
          </div>
          {/* Stock Availability Card - Only show for first stage assignment */}
          {!isInternalStock && transitionJob.stage_id === 0 && (
            loadingStock ? (
              <div className="bg-gray-50 p-3 rounded-lg border border-gray-100 flex items-center gap-2">
                <Loader2 className="w-3 h-3 animate-spin text-gray-400" />
                <span className="text-[10px] font-bold text-gray-400 uppercase">Synchronizing Warehouse...</span>
              </div>
            ) : matchingStock.length > 0 ? (
              <div className="bg-white p-3 rounded-lg border border-green-200 shadow-sm animate-in fade-in zoom-in duration-300">
                <div className="flex justify-between items-start gap-3 mb-2">
                  <p className="text-[10px] font-black text-green-600 uppercase tracking-widest leading-tight w-24">Available Finished Stock</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 px-3 text-[10px] font-black border-green-600 text-green-700 hover:bg-green-50 rounded-lg shrink-0 shadow-sm"
                    onClick={autoFillStockUsage}
                  >
                    Use All Available Stock
                  </Button>
                </div>
                <div className="flex gap-2">
                  {matchingStock.map(s => (
                    <Badge key={s.size} variant="outline" className="text-[9px] border-green-200 text-green-700 bg-green-50">
                      {s.size}: {s.available_qty}
                    </Badge>
                  ))}
                </div>
              </div>
            ) : (
              <div className="bg-gray-100/50 p-3 rounded-lg border border-gray-100 flex items-center gap-2">
                <AlertCircle className="w-3 h-3 text-gray-300" />
                <span className="text-[10px] font-bold text-gray-400 uppercase">No existing stock for this SKU</span>
              </div>
            )
          )}
        </div>

        {/* Available Quantities */}
        <div className="mt-3 flex flex-wrap gap-2">
          {sizes.map(size => (
            <Badge key={size} variant="outline" className="text-[10px] font-bold bg-white">
              Required {size}: {availableSq[size]}
            </Badge>
          ))}
        </div>
      </div>

      {/* Stock Usage Input Section - Only for first stage */}
      {matchingStock.length > 0 && !isInternalStock && transitionJob.stage_id === 0 && (
        <div className="p-4 bg-green-50/50 rounded-xl border border-green-100">
          <h5 className="text-[10px] font-bold text-green-700 uppercase mb-3 flex items-center gap-2">
            <CheckCircle2 className="w-3 h-3" />
            Use Finished Stock (Optional)
          </h5>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {sizes.map(size => {
              const stockItem = matchingStock.find(s => s.size.trim().toUpperCase() === size.trim().toUpperCase());
              const available = stockItem?.available_qty || 0;
              if (available === 0) return null;

              const isOver = isStockOverLimit(size);

              return (
                <div key={size} className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-500 uppercase flex justify-between">
                    <span>Size {size}</span>
                    <span className="text-green-600">Max: {available}</span>
                  </label>
                  <Input
                    type="number"
                    className={cn("h-8 bg-white", isOver && "border-red-500 text-red-600")}
                    placeholder="0"
                    max={available}
                    value={stockUsed[size] || ''}
                    onChange={e => updateStockUsage(size, Number(e.target.value))}
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Assignment Rows */}
      {isFullyFulfilledByStock ? (
        <div className="p-10 border-2 border-dashed border-green-100 rounded-2xl bg-green-50/20 flex flex-col items-center text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
            <CheckCircle2 className="w-8 h-8 text-green-600" />
          </div>
          <h4 className="text-lg font-black text-green-900 mb-2">Direct Fulfillment Mode</h4>
          <p className="text-sm text-green-700 max-w-sm">
            Quantity requirement matched by available stock. No worker assignment needed for this stage.
          </p>
          <div className="mt-6 p-4 bg-white/50 rounded-xl border border-green-200">
            <p className="text-[10px] font-black text-green-600 uppercase tracking-widest mb-2">Items to be fulfilled</p>
            <div className="flex gap-3">
              {sizes.map(size => (
                <div key={size} className="text-center">
                  <p className="text-[9px] font-bold text-gray-400 uppercase">{size}</p>
                  <p className="text-sm font-black text-gray-900">{availableSq[size]}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="space-y-3 max-h-[400px] overflow-y-auto">
            {assignments.map((assignment, index) => (
              <div key={index} className="p-4 border border-gray-200 rounded-xl bg-gray-50/50 relative">
                {/* Remove button */}
                {assignments.length > 1 && (
                  <button
                    onClick={() => removeAssignment(index)}
                    className="absolute top-2 right-2 p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}

                <div className="space-y-3">
                  {/* Employee Selection */}
                  <div className="space-y-1">
                    <Label className="text-[10px] font-bold text-gray-500 uppercase">Worker #{index + 1}</Label>
                    <Select
                      value={assignment.emp_id.toString()}
                      onValueChange={(val) => updateAssignment(index, 'emp_id', parseInt(val))}
                    >
                      <SelectTrigger className="h-10 bg-white text-sm border-2 border-indigo-100 focus:border-indigo-500">
                        <SelectValue placeholder="Select worker..." />
                      </SelectTrigger>
                      <SelectContent>
                        {employees
                          .filter(emp => transitionJob.stage_id > 0 ? emp.role_name !== 'Fabricator' : true)
                          .map(emp => (
                            <SelectItem key={emp.id} value={emp.id.toString()}>
                              {emp.name} ({emp.role_name})
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Size Quantities */}
                  <div className="space-y-1">
                    <Label className="text-[10px] font-bold text-gray-500 uppercase">Quantities to Produce</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {sizes.map(size => {
                        const isThisSizeOver = isOverLimit(size);
                        return (
                          <div key={size} className={cn(
                            "flex items-center gap-2 p-2 rounded border",
                            isThisSizeOver ? "bg-red-50 border-red-300" : "bg-white border-gray-200"
                          )}>
                            <span className="text-xs font-bold text-gray-500 w-8">{size}:</span>
                            <Input
                              type="number"
                              min="0"
                              placeholder="0"
                              value={assignment.sq[size] === 0 ? '' : assignment.sq[size]}
                              onChange={(e) => updateQuantity(index, size, e.target.value === '' ? 0 : parseInt(e.target.value))}
                              className={cn(
                                "h-8 text-sm flex-1",
                                isThisSizeOver && "border-red-300 text-red-700 font-bold"
                              )}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Processing Rate */}
                  <div className="space-y-1">
                    <Label className="text-[10px] font-bold text-gray-500 uppercase">Rate per piece</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">₹</span>
                      <Input
                        type="number"
                        min="0"
                        step="0.5"
                        value={assignment.processing_rate}
                        onChange={(e) => updateAssignment(index, 'processing_rate', parseFloat(e.target.value) || 0)}
                        className="pl-8 h-10 bg-white text-sm"
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={addAssignment}
            className="w-full border-dashed border-2 text-indigo-600 hover:bg-indigo-50"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Another Worker
          </Button>
        </>
      )}

      {/* Summary */}
      <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
        <h5 className="text-[10px] font-bold text-gray-500 uppercase mb-3">Assignment Summary</h5>
        <div className="space-y-2">
          {sizes.map(size => {
            const available = availableSq[size] || 0;
            const stock = stockUsed[size] || 0;
            const assigned = getTotalAssigned(size); // stock + employees
            const remaining = available - assigned; // Should be 0 when done
            const isOver = remaining < 0;

            return (
              <div key={size} className="flex items-center justify-between text-sm">
                <span className="font-bold text-gray-700">Size {size}:</span>
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-gray-500">Req: {available}</span>
                  {stock > 0 && <span className="text-green-600 font-bold">Stock: {stock}</span>}
                  <span className={cn(
                    "font-bold",
                    isOver ? "text-red-600" : (assigned - stock) > 0 ? "text-indigo-600" : "text-gray-400"
                  )}>
                    Prod: {assigned - stock}
                  </span>
                  <span className={cn(
                    "font-bold",
                    isOver ? "text-red-600" : "text-gray-600"
                  )}>
                    Left: {remaining}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Over-assignment Warning */}
        {hasOverAssignment() && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs font-bold text-red-900">Over-Assignment Detected</p>
              <p className="text-xs text-red-700 mt-1">
                You cannot assign more than required or exceed available stock.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-4 border-t border-gray-200">
        <Button variant="ghost" className="flex-1 font-bold" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          className="flex-[2] bg-indigo-600 hover:bg-indigo-700 font-bold"
          onClick={handleSubmit}
          disabled={
            isSubmitting ||
            hasOverAssignment() ||
            (!isFullyFulfilledByStock && !Object.values(stockUsed).some(v => v > 0) && !assignments.some(a => a.emp_id > 0 && Object.values(a.sq).some(q => q > 0)))
          }
        >
          {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
          {Object.values(stockUsed).some(v => v > 0)
            ? (assignments.some(a => a.emp_id > 0 && Object.values(a.sq).some(q => q > 0)) ? "Confirm Assignment & Use Stock" : "Use Stock & Complete")
            : "Confirm Assignment"
          }
        </Button>
      </div>
    </div>
  );
}

export function ProductionBoard() {
  const [stages, setStages] = useState<Stage[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAssignPanel, setShowAssignPanel] = useState(false);
  const [employees, setEmployees] = useState<any[]>([]);
  const [availableStock, setAvailableStock] = useState<any[]>([]);

  // Transition Modal State
  const [transitionJob, setTransitionJob] = useState<ProcessingJob | null>(null);
  const [selectedEmpId, setSelectedEmpId] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // New States for Details and Rate Edit
  const [viewingJob, setViewingJob] = useState<ProcessingJob | null>(null);
  const [fabricDetails, setFabricDetails] = useState<any[]>([]);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [editingAssignmentJob, setEditingAssignmentJob] = useState<ProcessingJob | null>(null);
  const [newRate, setNewRate] = useState<string>("");
  const [newEmpId, setNewEmpId] = useState<string>("");

  const fetchBoard = async () => {
    try {
      const data = await api.get('/processing/board');
      setStages(data.stages || []);
      // Refresh helpers (stock and employees) alongside board
      fetchHelpers();
    } catch (error) {
      toast.error("Failed to load production board");
    } finally {
      setLoading(false);
    }
  };

  const fetchHelpers = async () => {
    try {
      const empData = await api.get('/employees');
      // Use ALL employees (Fabricators needed for Stage 1)
      setEmployees(empData.employees || []);

      const stockData = await api.get('/processing/available-stock');
      setAvailableStock(stockData.availableStock || []);
    } catch (error) {
      console.error("Failed to load helper data");
    }
  };

  useEffect(() => {
    fetchBoard();
    fetchHelpers();
  }, []);

  const handleAssign = async (stockId: number, empId: number, stageId: number, rate: number, sq: any) => {
    setIsSubmitting(true);
    try {
      await api.post('/processing/assign', {
        cut_stock_id: stockId,
        emp_id: empId,
        stage_id: stageId,
        sq: sq,
        processing_rate: rate
      });
      toast.success("Worker assigned to floor");
      setTransitionJob(null);
      setSelectedEmpId("");
      fetchBoard();
    } catch (error: any) {
      toast.error(error.message || "Assignment failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateAssignment = async () => {
    if (!editingAssignmentJob) return;
    setIsSubmitting(true);
    try {
      await api.put(`/processing/${editingAssignmentJob.id}/assignment`, {
        processing_rate: parseFloat(newRate) || 0,
        emp_id: parseInt(newEmpId) || undefined
      });
      toast.success("Assignment updated successfully");
      setEditingAssignmentJob(null);
      fetchBoard();
    } catch (error: any) {
      toast.error(error.message || "Update failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  const fetchFabricDetails = async (jobId: number) => {
    setIsLoadingDetails(true);
    try {
      const data = await api.get(`/processing/${jobId}/fabric-details`);
      setFabricDetails(data.details || []);
    } catch (error) {
      toast.error("Failed to load fabric details");
    } finally {
      setIsLoadingDetails(false);
    }
  };

  const totalActive = stages.reduce((acc, stage) => acc + stage.jobs.length, 0);

  return (
    <div className="flex-1 overflow-hidden bg-[#f8fafc] flex flex-col">
      {/* Dynamic Header */}
      <div className="bg-white border-b border-gray-200 px-8 py-5 flex items-center justify-between shadow-sm z-10">
        <div>
          <h1 className="text-2xl font-black text-gray-900 flex items-center gap-3">
            <div className="p-2 bg-indigo-600 rounded-lg">
              <ArrowRight className="w-5 h-5 text-white" />
            </div>
            Production Floor
          </h1>
          <p className="text-xs font-bold text-gray-500 mt-1 uppercase tracking-widest">
            Real-time stage tracking • <span className="text-indigo-600">{totalActive} Jobs Active</span>
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" size="sm" onClick={fetchBoard} className="text-xs h-9">
            Refresh Board
          </Button>
          <Button
            className="bg-[#e94560] hover:bg-[#d13a52] text-xs h-9 font-bold px-6"
            onClick={() => setShowAssignPanel(!showAssignPanel)}
          >
            {showAssignPanel ? "Close Assignment" : "Assign New Processing"}
          </Button>
        </div>
      </div>

      {/* Multi-Employee Assignment Panel */}
      {showAssignPanel && (
        <div className="bg-white border-b border-gray-200 p-6 animate-in slide-in-from-top duration-300">
          <h3 className="text-sm font-bold text-gray-900 mb-4 uppercase tracking-widest">Available Stock for Processing</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {availableStock.length === 0 ? (
              <p className="text-xs text-gray-500 italic px-2">No completed cutting jobs available for assignment.</p>
            ) : (
              availableStock.map(stock => (
                <div key={stock.id} className="p-4 border border-gray-100 rounded-xl bg-gray-50 hover:border-indigo-200 transition-colors">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-[10px] font-bold text-gray-400 uppercase">Stock ID #{stock.id}</span>
                    <Badge className="bg-green-100 text-green-700 text-[9px]">Ready</Badge>
                  </div>
                  <p className="font-bold text-gray-900 text-sm mb-1">{stock.org_name}</p>
                  <p className="text-xs text-gray-500 mb-2">{stock.org_dress_name}</p>

                  {/* Size breakdown */}
                  <div className="flex flex-wrap gap-1 mb-4">
                    {Object.entries(typeof stock.sq === 'string' ? JSON.parse(stock.sq) : stock.sq)
                      .filter(([key]: any) => key !== '_meta')
                      .map(([size, qty]: [string, any]) => (
                        <Badge key={size} variant="outline" className="text-[9px]">
                          {size}: {qty}
                        </Badge>
                      ))}
                  </div>

                  <Button
                    size="sm"
                    className="w-full h-8 text-[11px] bg-indigo-600 hover:bg-indigo-700 font-bold"
                    onClick={() => {
                      setTransitionJob({
                        ...stock,
                        id: 0,
                        worker_name: '',
                        status: '',
                        processing_rate: 0,
                        stage_name: '',
                        created_on: '',
                        updated_on: '',
                        remarks: '',
                        order_id: 0,
                        stage_id: 0,
                        cut_stock_id: stock.id
                      });
                    }}
                  >
                    Assign to Stage 1
                  </Button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Kanban Board */}
      <div className="flex-1 overflow-x-auto p-6 flex gap-6">
        {loading ? (
          <div className="min-w-full flex items-center justify-center py-20">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="w-10 h-10 animate-spin text-indigo-600" />
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Loading Floor Data...</p>
            </div>
          </div>
        ) : stages.length === 0 ? (
          <div className="min-w-full flex items-center justify-center py-20 bg-white/50 rounded-2xl border-2 border-dashed border-gray-200">
            <p className="text-gray-400 font-bold uppercase tracking-widest">Floor is empty. Assign workers to start.</p>
          </div>
        ) : (
          stages.map((stage) => (
            <div key={stage.id} className="flex-shrink-0 w-[300px] flex flex-col h-full">
              {/* Column Header */}
              <div className="mb-4 flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.5)]" />
                  <h3 className="font-bold text-gray-800 text-xs uppercase tracking-wider">
                    {stage.name}
                  </h3>
                </div>
                <Badge variant="secondary" className="bg-white text-gray-600 border-gray-100 text-[10px] h-5 px-2">
                  {stage.jobs.length}
                </Badge>
              </div>

              {/* Cards Container */}
              <div className="flex-1 bg-gray-100/30 rounded-xl p-3 space-y-4 overflow-y-auto border border-gray-200/50 hover:bg-gray-100/50 transition-colors scrollbar-hide">
                {stage.jobs.length > 0 ? (
                  stage.jobs.map((job) => {
                    // Logic Simplified:
                    // Backend now DEDUCTS quantity from the current job when assigning to next stage.
                    // So 'isNextAssigned' logic (checking if next stage has total >= current) is no longer needed.
                    // If the current job exists in the list (handled by backend filter), it has remaining quantity.
                    // Therefore, the button should always be visible (isNextAssigned = false).

                    const nextStage = stages.find(s => s.id === stage.id + 1);
                    const isNextAssigned = false;

                    // We keep 'nextStage' var if needed for other logic, but for button visibility, 
                    // we rely on the fact that if this card is here, it has quantity to move.

                    return (
                      <JobCardComponent
                        key={job.id}
                        job={job}
                        onRefresh={fetchBoard}
                        onMove={(job) => setTransitionJob(job)}
                        onViewDetails={(job) => {
                          setViewingJob(job);
                          fetchFabricDetails(job.id);
                        }}
                        onEditRate={(job) => {
                          setEditingAssignmentJob(job);
                          setNewRate(job.processing_rate.toString());
                          setNewEmpId(employees.find(e => e.name === job.worker_name)?.id?.toString() || "");
                        }}
                        isNextAssigned={isNextAssigned}
                      />
                    );
                  })
                ) : (
                  <div className="border-2 border-dashed border-gray-200 rounded-lg p-8 flex flex-col items-center justify-center text-center opacity-40">
                    <User className="w-8 h-8 text-gray-300 mb-2" />
                    <p className="text-[10px] font-bold text-gray-400 uppercase">Wait for assignment</p>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Multi-Employee Assignment Modal */}
      <Modal
        isOpen={!!transitionJob}
        onClose={() => setTransitionJob(null)}
        title={`Assign Workers - Stage ${transitionJob?.stage_id > 0 ? transitionJob.stage_id + 1 : 1}`}
        size="xl"
      >
        {transitionJob && (() => {
          // Logic Simplified:
          // The 'transitionJob.sq' now represents the REMAINING quantity (because backend decrements it).
          // So we don't need to calculate 'alreadyAssignedSq' by looking at the next stage.
          // The 'transitionJob' itself is the source of truth for what is available to assign.

          const alreadyAssignedSq: Record<string, number> = {};

          return <MultiEmployeeAssignmentPanel
            transitionJob={transitionJob}
            alreadyAssignedSq={alreadyAssignedSq}
            employees={employees}
            stockList={[]} // Placeholder, will fetch inside component or parent
            onCancel={() => setTransitionJob(null)}
            onSubmit={async (assignments, stockUsed) => {
              setIsSubmitting(true);
              try {
                // 1. Assign multiple (with stockUsed for the first assignment if needed, or separate call?)
                // The backend 'assignMultipleWorkers' doesn't support stockUsed yet? 
                // Wait, I only updated 'assignWorker' (single).
                // I need to update 'assignMultipleWorkers' in backend too if I want multi-assignment + stock.
                // BUT, user requirement: "If Internal Stock used... Remaining quantity continues...".
                // If we use stock, we likely process it immediately/deduct it.
                // If partial stock + partial production?
                // "Remaining quantity goes directly to Fabricator or Tailor."

                // Simplification: If stock is used, we treat it as a separate "assignment" (auto-completed).
                // The backend 'assignWorker' handles stockUsed.
                // Does 'assignMultipleWorkers'? No.

                // Strategy:
                // If stock matches requirement fully -> Call 'assignWorker' with stockUsed (no emp).
                // If partial ->
                // We need to call 'assignWorker' for the stock part? Or pass stockUsed to one of the assignments?
                // 'assignWorker' takes 'stockUsed' and deducts it.
                // If I use 'assignMultipleWorkers', I need to add stock support there too.

                // Let's stick to 'assignWorker' for now if Stock is being used? 
                // Or update 'assignMultipleWorkers'.

                // I'll update 'assignMultipleWorkers' in backend to accept 'stockUsed' global param.

                console.log("Submitting Assignment Payload:", {
                  cut_stock_id: transitionJob.cut_stock_id || 0,
                  parent_job_id: transitionJob.id,
                  stage_id: transitionJob.stage_id > 0 ? transitionJob.stage_id + 1 : 1,
                  assignments,
                  stockUsed
                });

                await api.post('/processing/assign-multiple', {
                  cut_stock_id: transitionJob.cut_stock_id || 0,
                  parent_job_id: transitionJob.id, // VITAL: Send the specific job ID being moved
                  stage_id: transitionJob.stage_id > 0 ? transitionJob.stage_id + 1 : 1,
                  assignments,
                  stockUsed
                });

                toast.success(`Assignments created successfully`);
                setTransitionJob(null);
                fetchBoard();
                fetchHelpers();
              } catch (error: any) {
                if (error.response?.status === 422) {
                  toast.error(error.response.data.message || "Over-assignment detected");
                } else {
                  toast.error(error.message || "Assignment failed");
                }
              } finally {
                setIsSubmitting(false);
              }
            }}
            isSubmitting={isSubmitting}
          />
        })()}
      </Modal>

      {/* View Details Modal */}
      <Modal
        isOpen={!!viewingJob}
        onClose={() => setViewingJob(null)}
        title="Cloth & Fabric Usage Detail"
        size="lg"
      >
        {viewingJob && (
          <div className="space-y-6">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100">
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Source Job</p>
                <h4 className="font-bold text-gray-900">{viewingJob.org_name}</h4>
                <p className="text-xs text-gray-600">{viewingJob.org_dress_name}</p>
              </div>
              <div className="text-right">
                <Badge className="bg-indigo-600 text-white font-bold uppercase text-[9px]">#{viewingJob.id}</Badge>
              </div>
            </div>

            <div className="space-y-3">
              <h5 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">Cut Fabric Logs</h5>
              {isLoadingDetails ? (
                <div className="py-12 flex flex-col items-center justify-center gap-3">
                  <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
                  <p className="text-[10px] font-bold text-gray-400 uppercase">Fetching usage history...</p>
                </div>
              ) : fabricDetails.length === 0 ? (
                <div className="py-8 text-center bg-gray-50/50 rounded-xl border border-dashed border-gray-200">
                  <p className="text-xs text-gray-400 italic">No fabric logs found for this assignment.</p>
                </div>
              ) : (
                <div className="overflow-hidden rounded-xl border border-gray-100">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-gray-100/50">
                        <th className="px-4 py-3 font-bold text-gray-400 uppercase tracking-tighter">Fabric Type</th>
                        <th className="px-4 py-3 font-bold text-gray-400 uppercase tracking-tighter">Variant</th>
                        <th className="px-4 py-3 font-bold text-gray-400 uppercase tracking-tighter">Used Qty</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {fabricDetails.map((d, i) => (
                        <tr key={i} className="bg-white hover:bg-gray-50/50 transition-colors">
                          <td className="px-4 py-3 mt-1">
                            <p className="font-bold text-gray-900">{d.cloth_type}</p>
                            <p className="text-[10px] text-gray-400">{d.quality_name}</p>
                          </td>
                          <td className="px-4 py-3">
                            <p className="font-bold text-gray-700">{d.color_name}</p>
                            <p className="text-[10px] text-gray-400">{d.design_name}</p>
                          </td>
                          <td className="px-4 py-3 font-mono font-bold text-indigo-600 bg-indigo-50/20">
                            {d.used_qty}m
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="pt-4 flex justify-end">
              <Button onClick={() => setViewingJob(null)} className="h-10 px-8 font-bold">Close Details</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Edit Assignment Modal */}
      <Modal
        isOpen={!!editingAssignmentJob}
        onClose={() => setEditingAssignmentJob(null)}
        title="Update Job Assignment"
        size="md"
      >
        {editingAssignmentJob && (
          <div className="space-y-6">
            <div className="space-y-2">
              <Label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Reassign Worker</Label>
              <Select value={newEmpId} onValueChange={setNewEmpId}>
                <SelectTrigger className="h-12 border-gray-100 bg-gray-50/50 rounded-xl font-bold">
                  <SelectValue placeholder="Select new worker..." />
                </SelectTrigger>
                <SelectContent>
                  {employees.map(emp => (
                    <SelectItem key={emp.id} value={emp.id.toString()}>
                      {emp.name} ({emp.role_name})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Rate (per piece)</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-gray-400">₹</span>
                <Input
                  type="number"
                  value={newRate}
                  onChange={(e) => setNewRate(e.target.value)}
                  className="pl-7 h-12 bg-gray-50/50 border-gray-100 rounded-xl font-bold"
                />
              </div>
            </div>

            <div className="pt-6 border-t border-gray-100 flex gap-3">
              <Button variant="ghost" className="flex-1 font-bold" onClick={() => setEditingAssignmentJob(null)}>Cancel</Button>
              <Button
                className="flex-[2] bg-indigo-600 hover:bg-indigo-700 font-bold"
                onClick={handleUpdateAssignment}
                disabled={isSubmitting || !newRate || !newEmpId}
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Authorize Change"}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div >
  );
}

