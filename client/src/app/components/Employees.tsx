import { useState, useEffect } from "react";
import { Plus, Search, Mail, Phone, Edit, Trash2, Award, Loader2, DollarSign, ArrowRightLeft, UserCheck } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import { api } from "../../services/api";
import toast from "react-hot-toast";
import { cn } from "./ui/utils.tsx";
import { Modal } from "./ui/modal";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Label } from "./ui/label";

interface Employee {
  id: number;
  name: string;
  role_name: string;
  phone: string;
  adhaar: string;
  current_balance: number;
  status: "active" | "inactive";
}

interface LedgerEntry {
  id: number;
  datetime: string;
  transaction: "DR" | "CR";
  amount: number;
  balance: number;
  mode: string;
  remarks: string;
}

export function Employees() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmp, setSelectedEmp] = useState<Employee | null>(null);
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [ledgerLoading, setLedgerLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Modals state
  const [showOnboardModal, setShowOnboardModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showRateModal, setShowRateModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [roles, setRoles] = useState<any[]>([]);
  const [rateForm, setRateForm] = useState({ daily_rate: "", per_piece_rate: "" });

  // Form states
  const [newEmp, setNewEmp] = useState({ name: "", phone: "", adhaar: "", role_id: "" });
  const [payment, setPayment] = useState({ amount: "", mode: "Cash", remarks: "" });

  const fetchEmployees = async () => {
    try {
      const data = await api.get('/employees');
      setEmployees(data.employees || []);
      if (data.employees?.length > 0 && !selectedEmp) {
        setSelectedEmp(data.employees[0]);
      }
    } catch (error) {
      toast.error("Failed to load employees");
    } finally {
      setLoading(false);
    }
  };

  const fetchLedger = async (empId: number) => {
    setLedgerLoading(true);
    try {
      const data = await api.get(`/employees/${empId}/account`);
      setLedger(data.ledger || []);
    } catch (error) {
      toast.error("Failed to load ledger history");
    } finally {
      setLedgerLoading(false);
    }
  };

  const fetchRoles = async () => {
    try {
      const data = await api.get('/employees/roles');
      setRoles(data.roles || []);
    } catch (e) {
      console.error("Failed to load roles");
    }
  };

  useEffect(() => {
    fetchEmployees();
    fetchRoles();
  }, []);

  useEffect(() => {
    if (selectedEmp) {
      fetchLedger(selectedEmp.id);
    }
  }, [selectedEmp?.id]);

  const handleOnboard = async () => {
    if (!newEmp.name || !newEmp.role_id) return toast.error("Name and Role are required");
    setIsSubmitting(true);
    try {
      await api.post('/employees', newEmp);
      toast.success("Employee onboarded successfully");
      setShowOnboardModal(false);
      setNewEmp({ name: "", phone: "", adhaar: "", role_id: "" });
      fetchEmployees();
    } catch (error: any) {
      toast.error(error.message || "Failed to onboard employee");
    } finally {
      setIsSubmitting(true);
    }
  };

  const handleUpdateRate = async () => {
    if (!selectedEmp) return;
    setIsSubmitting(true);
    try {
      await api.put(`/employees/${selectedEmp.id}`, rateForm);
      toast.success("Employee rate updated!");
      setShowRateModal(false);
      fetchEmployees();
    } catch (error: any) {
      toast.error(error.message || "Failed to update rate");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePayment = async () => {
    if (!selectedEmp || !payment.amount) return toast.error("Select employee and enter amount");
    setIsSubmitting(true);
    try {
      await api.post(`/employees/${selectedEmp.id}/payment`, payment);
      toast.success("Payment recorded and ledger updated");
      setShowPaymentModal(false);
      setPayment({ amount: "", mode: "Cash", remarks: "" });
      fetchEmployees(); // to refresh balance
      fetchLedger(selectedEmp.id);
    } catch (error: any) {
      toast.error(error.message || "Failed to record payment");
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredEmployees = employees.filter(e =>
    e.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.role_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalLiability = employees.reduce((a, b) => a + Number(b.current_balance), 0);

  return (
    <div className="flex-1 overflow-auto bg-[#f8fafc]">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-8 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black text-gray-900">Staff Management</h1>
            <p className="text-sm font-bold text-gray-500 mt-1 uppercase tracking-widest">Directory, Payrolls and Liability Tracking</p>
          </div>
          <Button
            className="bg-[#e94560] hover:bg-[#d13a52] font-bold px-6"
            onClick={() => setShowOnboardModal(true)}
          >
            <Plus className="w-4 h-4 mr-2" />
            Onboard Employee
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex h-[calc(100vh-140px)]">
        {/* Left Sidebar */}
        <div className="w-96 bg-white border-r border-gray-200 flex flex-col">
          <div className="p-4 border-b border-gray-200">
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                placeholder="Search staff..."
                className="pl-9 h-11 bg-gray-50 border-none"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="py-20 text-center flex flex-col items-center gap-2">
                <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Syncing Staff...</span>
              </div>
            ) : filteredEmployees.length === 0 ? (
              <p className="py-20 text-center text-xs font-bold text-gray-400 uppercase">No employees found</p>
            ) : (
              filteredEmployees.map((emp) => (
                <div
                  key={emp.id}
                  onClick={() => setSelectedEmp(emp)}
                  className={cn(
                    "p-5 border-b border-gray-50 cursor-pointer transition-all hover:bg-indigo-50/30",
                    selectedEmp?.id === emp.id && "bg-indigo-50 border-l-4 border-l-indigo-600 shadow-sm"
                  )}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center text-indigo-600 font-bold text-sm">
                      {emp.name.charAt(0)}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-gray-900 text-sm">{emp.name}</h3>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">{emp.role_name}</p>
                    </div>
                    <div className="text-right">
                      <p className={cn("text-sm font-black", emp.current_balance > 0 ? "text-rose-600" : "text-green-600")}>
                        ₹{Math.abs(emp.current_balance)}
                      </p>
                      <p className="text-[9px] font-bold text-gray-400 uppercase">{emp.current_balance > 0 ? 'Payable' : 'Clear'}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Detail Panel */}
        <div className="flex-1 overflow-y-auto bg-[#f8fafc]">
          {selectedEmp ? (
            <div className="p-8 max-w-6xl mx-auto space-y-6">
              {/* Top Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-100">
                      <UserCheck className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="text-lg font-black text-gray-900">{selectedEmp.name}</h4>
                      <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest">{selectedEmp.role_name}</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs font-bold text-gray-500">
                      <Phone className="w-3.5 h-3.5" /> {selectedEmp.phone}
                    </div>
                    <div className="flex items-center gap-2 text-xs font-bold text-gray-500">
                      <Award className="w-3.5 h-3.5" /> Adhaar: {selectedEmp.adhaar}
                    </div>
                  </div>
                </div>

                <div className="bg-indigo-600 p-6 rounded-2xl shadow-lg shadow-indigo-100 relative overflow-hidden group">
                  <DollarSign className="absolute -right-4 -bottom-4 w-24 h-24 text-white/10" />
                  <p className="text-[10px] font-black text-indigo-100 uppercase tracking-widest mb-1">Outstanding Balance</p>
                  <p className="text-3xl font-black text-white">₹{selectedEmp.current_balance.toLocaleString()}</p>
                  <p className="text-[10px] font-bold text-indigo-200 mt-2">TOTAL UNPAID EARNINGS</p>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 border-b border-gray-50 pb-2">Quick Actions</p>
                  <div className="grid grid-cols-2 gap-3">
                    <Button variant="outline" size="sm" className="font-bold text-xs h-9 bg-gray-50" onClick={() => setShowRateModal(true)}>Manage Rate</Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="font-bold text-xs h-9 bg-rose-50 text-rose-600 border-rose-100 hover:bg-rose-100"
                      onClick={() => setShowPaymentModal(true)}
                    >
                      Record Payment
                    </Button>
                  </div>
                </div>
              </div>

              {/* Ledger */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-gray-50 flex items-center justify-between">
                  <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest flex items-center gap-2">
                    <ArrowRightLeft className="w-4 h-4 text-indigo-600" /> Payroll Ledger History
                  </h3>
                  <Badge className="bg-gray-100 text-gray-500 font-bold border-none uppercase text-[9px]">Last 100 entries</Badge>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50/50">
                      <tr>
                        <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Date / Time</th>
                        <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                        <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Particulars</th>
                        <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Amount</th>
                        <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Running Bal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {ledgerLoading ? (
                        <tr>
                          <td colSpan={5} className="py-20 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-indigo-200" /></td>
                        </tr>
                      ) : ledger.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-20 text-center text-xs font-bold text-gray-400 uppercase">No transactions recorded</td>
                        </tr>
                      ) : (
                        ledger.map(entry => (
                          <tr key={entry.id} className="hover:bg-gray-50/50 transition-colors">
                            <td className="px-6 py-4 text-xs font-bold text-gray-600">
                              {new Date(entry.datetime).toLocaleDateString()}
                              <p className="text-[9px] text-gray-400 font-medium">{new Date(entry.datetime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                            </td>
                            <td className="px-6 py-4">
                              <Badge className={cn("text-[9px] font-black uppercase tracking-tighter", entry.transaction === 'DR' ? "bg-rose-50 text-rose-600" : "bg-green-50 text-green-600 animate-pulse")}>
                                {entry.transaction === 'DR' ? 'Earning' : 'Payment'}
                              </Badge>
                            </td>
                            <td className="px-6 py-4">
                              <p className="text-xs font-black text-gray-900">{entry.remarks || entry.mode || 'Work Recorded'}</p>
                              <p className="text-[10px] font-medium text-gray-400 italic">ID: TRN-{entry.id}</p>
                            </td>
                            <td className="px-6 py-4">
                              <p className={cn("text-xs font-black", entry.transaction === 'DR' ? "text-rose-600" : "text-green-600")}>
                                {entry.transaction === 'DR' ? `+₹${entry.amount}` : `-₹${entry.amount}`}
                              </p>
                            </td>
                            <td className="px-6 py-4 text-xs font-black text-gray-900">₹{entry.balance}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center opacity-40">
              <UserCheck className="w-20 h-20 text-indigo-200 mb-4" />
              <p className="text-sm font-black text-gray-400 uppercase tracking-widest">Select an employee to manage</p>
            </div>
          )}
        </div>
      </div>

      {/* Onboarding Modal */}
      <Modal
        isOpen={showOnboardModal}
        onClose={() => setShowOnboardModal(false)}
        title="Staff Onboarding"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Full Name</Label>
              <Input
                placeholder="e.g. John Doe"
                value={newEmp.name}
                onChange={e => setNewEmp({ ...newEmp, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Designation / Role</Label>
              <Select onValueChange={val => setNewEmp({ ...newEmp, role_id: val })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  {roles.map(r => <SelectItem key={r.id} value={r.id.toString()}>{r.role}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Phone Number</Label>
              <Input
                placeholder="10 digit mobile"
                value={newEmp.phone}
                onChange={e => setNewEmp({ ...newEmp, phone: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Adhaar / ID</Label>
              <Input
                placeholder="12 digit number"
                value={newEmp.adhaar}
                onChange={e => setNewEmp({ ...newEmp, adhaar: e.target.value })}
              />
            </div>
          </div>
          <div className="pt-4 flex gap-3">
            <Button variant="ghost" className="flex-1" onClick={() => setShowOnboardModal(false)}>Cancel</Button>
            <Button className="flex-1 bg-indigo-600" onClick={handleOnboard}>Complete Onboarding</Button>
          </div>
        </div>
      </Modal>

      {/* Payment Modal */}
      <Modal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        title="Record Payment"
      >
        {selectedEmp && (
          <div className="space-y-4">
            <div className="p-4 bg-gray-50 rounded-xl mb-4">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Paying to</p>
              <p className="text-xl font-black text-gray-900">{selectedEmp.name}</p>
              <p className="text-xs text-indigo-600 font-bold">Outstanding: ₹{selectedEmp.current_balance}</p>
            </div>
            <div className="space-y-2">
              <Label>Payment Amount (₹)</Label>
              <Input
                type="number"
                placeholder="0.00"
                value={payment.amount}
                onChange={e => setPayment({ ...payment, amount: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Payment Mode</Label>
                <Select defaultValue="Cash" onValueChange={val => setPayment({ ...payment, mode: val })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Cash">Cash</SelectItem>
                    <SelectItem value="UPI">UPI / Online</SelectItem>
                    <SelectItem value="Bank">Bank Transfer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Reference / Remarks</Label>
                <Input
                  placeholder="e.g. Adv, Feb Sal"
                  value={payment.remarks}
                  onChange={e => setPayment({ ...payment, remarks: e.target.value })}
                />
              </div>
            </div>
            <div className="pt-4 flex gap-3">
              <Button variant="ghost" className="flex-1" onClick={() => setShowPaymentModal(false)}>Cancel</Button>
              <Button className="flex-1 bg-rose-600" onClick={handlePayment}>Record Payment</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Rate Modal */}
      <Modal isOpen={showRateModal} onClose={() => setShowRateModal(false)} title="Update Employee Rate">
        {selectedEmp && (
          <div className="space-y-4">
            <div className="p-4 bg-gray-50 rounded-xl">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Updating rate for</p>
              <p className="text-xl font-black text-gray-900">{selectedEmp.name}</p>
              <p className="text-xs text-indigo-600 font-bold">{selectedEmp.role_name}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Daily Rate (₹)</Label>
                <Input type="number" placeholder="0.00" value={rateForm.daily_rate} onChange={e => setRateForm({ ...rateForm, daily_rate: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Per Piece Rate (₹)</Label>
                <Input type="number" placeholder="0.00" value={rateForm.per_piece_rate} onChange={e => setRateForm({ ...rateForm, per_piece_rate: e.target.value })} />
              </div>
            </div>
            <div className="pt-4 flex gap-3">
              <Button variant="ghost" className="flex-1" onClick={() => setShowRateModal(false)}>Cancel</Button>
              <Button className="flex-1 bg-indigo-600" onClick={handleUpdateRate} disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Rate"}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
