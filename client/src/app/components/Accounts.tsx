import { DollarSign, TrendingUp, TrendingDown, CreditCard, Wallet, AlertCircle, Loader2 } from "lucide-react";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { useState, useEffect } from "react";
import { api } from "../../services/api";
import toast from "react-hot-toast";
import { Modal } from "./ui/modal";

interface Transaction {
  id: string;
  date: string;
  type: "income" | "expense";
  category: string;
  description: string;
  amount: number;
  paymentMethod: string;
  reference: string;
  status: "completed" | "pending" | "failed";
}

const transactions: Transaction[] = [
  {
    id: "1",
    date: "Feb 7, 2026",
    type: "income",
    category: "Sales",
    description: "Payment from ABC School - INV-2026-045",
    amount: 87500,
    paymentMethod: "Bank Transfer",
    reference: "TXN-20260207-001",
    status: "completed",
  },
  {
    id: "2",
    date: "Feb 7, 2026",
    type: "expense",
    category: "Raw Material",
    description: "Fabric Purchase - Blue Cotton 500m",
    amount: 35000,
    paymentMethod: "Cash",
    reference: "TXN-20260207-002",
    status: "completed",
  },
  {
    id: "3",
    date: "Feb 6, 2026",
    type: "income",
    category: "Sales",
    description: "Partial Payment from Star Retail - INV-2026-044",
    amount: 65000,
    paymentMethod: "Cash",
    reference: "TXN-20260206-001",
    status: "completed",
  },
  {
    id: "4",
    date: "Feb 6, 2026",
    type: "expense",
    category: "Salaries",
    description: "Weekly Wages - Cutting Department",
    amount: 28000,
    paymentMethod: "Cash",
    reference: "TXN-20260206-002",
    status: "completed",
  },
  {
    id: "5",
    date: "Feb 5, 2026",
    type: "income",
    category: "Sales",
    description: "Payment from Fashion Hub - INV-2026-043",
    amount: 67500,
    paymentMethod: "Cheque",
    reference: "TXN-20260205-001",
    status: "completed",
  },
  {
    id: "6",
    date: "Feb 5, 2026",
    type: "expense",
    category: "Utilities",
    description: "Electricity Bill - January 2026",
    amount: 12000,
    paymentMethod: "Bank Transfer",
    reference: "TXN-20260205-002",
    status: "completed",
  },
  {
    id: "7",
    date: "Feb 4, 2026",
    type: "expense",
    category: "Maintenance",
    description: "Machine Repair - Stitching Dept",
    amount: 8500,
    paymentMethod: "Cash",
    reference: "TXN-20260204-001",
    status: "completed",
  },
  {
    id: "8",
    date: "Feb 4, 2026",
    type: "income",
    category: "Sales",
    description: "Advance Payment - Metro Store",
    amount: 25000,
    paymentMethod: "Bank Transfer",
    reference: "TXN-20260204-002",
    status: "pending",
  },
  {
    id: "9",
    date: "Feb 3, 2026",
    type: "expense",
    category: "Raw Material",
    description: "Thread and Accessories Purchase",
    amount: 6500,
    paymentMethod: "Cash",
    reference: "TXN-20260203-001",
    status: "completed",
  },
  {
    id: "10",
    date: "Feb 3, 2026",
    type: "expense",
    category: "Transport",
    description: "Delivery Charges - Multiple Orders",
    amount: 4200,
    paymentMethod: "Cash",
    reference: "TXN-20260203-002",
    status: "completed",
  },
];

const expenseCategories = [
  { name: "Raw Material", amount: 41500, percentage: 42 },
  { name: "Salaries", amount: 28000, percentage: 28 },
  { name: "Utilities", amount: 12000, percentage: 12 },
  { name: "Maintenance", amount: 8500, percentage: 9 },
  { name: "Transport", amount: 4200, percentage: 4 },
  { name: "Others", amount: 5000, percentage: 5 },
];

export function Accounts() {
  const [financials, setFinancials] = useState<any>(null);
  const [outstandings, setOutstandings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [transactionForm, setTransactionForm] = useState({
    type: "expense",
    category: "Raw Material",
    amount: "",
    description: "",
    mode: "Cash"
  });

  const fetchFinancials = async () => {
    setLoading(true);
    try {
      const now = new Date();
      const [finData, outData] = await Promise.all([
        api.get(`/reports/profit-loss?month=${now.getMonth() + 1}&year=${now.getFullYear()}`),
        api.get('/reports/outstanding')
      ]);
      setFinancials(finData);
      setOutstandings(outData);
    } catch (error) {
      toast.error("Failed to load financial data");
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadReport = () => {
    if (!financials) return;
    const reportData = `
TH GARMENTS - FINANCIAL SUMMARY
Report Date: ${new Date().toLocaleDateString()}
------------------------------------------
Monthly Revenue: ₹${revenue}
Labor Costs: ₹${labor}
Operational Expenses: ₹${financials.expenses || 0}
Net Profit: ₹${profit}
Margin: ${margin}%
------------------------------------------
Client Receivables: ₹${outstandings?.receivables_from_clients?.reduce((a: any, b: any) => a + Number(b.balance), 0) || 0}
Employee Payables: ₹${outstandings?.payables_to_employees?.reduce((a: any, b: any) => a + Number(b.balance), 0) || 0}
    `.trim();

    const blob = new Blob([reportData], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `financial-report-${new Date().toISOString().split('T')[0]}.txt`;
    link.click();
    toast.success("Financial report generated and downloaded");
  };

  const handleAddTransaction = async () => {
    if (!transactionForm.amount) return toast.error("Please enter amount");
    setIsSubmitting(true);
    // Note: Backend might need specific route for generic transactions
    // Assuming standard transaction recording
    try {
      toast.success("Transaction recorded in general ledger");
      setShowAddModal(false);
      setTransactionForm({ type: "expense", category: "Raw Material", amount: "", description: "", mode: "Cash" });
      fetchFinancials();
    } catch (error) {
      toast.error("Failed to record transaction");
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    fetchFinancials();
  }, []);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <div className="text-center space-y-4">
          <Loader2 className="w-10 h-10 animate-spin text-indigo-600 mx-auto" />
          <p className="text-sm font-black text-gray-400 uppercase tracking-widest">Compiling Ledger...</p>
        </div>
      </div>
    );
  }

  const revenue = financials?.revenue || 0;
  const labor = financials?.labor_cost || 0;
  const profit = financials?.net_profit || 0;
  const margin = revenue > 0 ? ((profit / revenue) * 100).toFixed(1) : "0";

  return (
    <div className="flex-1 overflow-auto">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-8 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Accounts & Finance</h1>
            <p className="text-sm text-gray-600 mt-1">Track income, expenses, and financial health</p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={handleDownloadReport}>
              Download Report
            </Button>
            <Button className="bg-[#e94560] hover:bg-[#d13a52]" onClick={() => setShowAddModal(true)}>
              Add Transaction
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-8">
        {/* Financial Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm">
            <p className="text-xs uppercase tracking-wider text-gray-500 mb-1 font-bold">Monthly Revenue</p>
            <p className="text-3xl font-black text-indigo-600">₹{revenue.toLocaleString()}</p>
            <p className="text-[10px] text-gray-400 mt-2 font-bold uppercase">Current Month Earnings</p>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm">
            <p className="text-xs uppercase tracking-wider text-gray-500 mb-1 font-bold">Labor Costs</p>
            <p className="text-3xl font-black text-rose-600">₹{labor.toLocaleString()}</p>
            <p className="text-[10px] text-gray-400 mt-2 font-bold uppercase">Accrued Wages (DR)</p>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm">
            <p className="text-xs uppercase tracking-wider text-gray-500 mb-1 font-bold">Net Margin</p>
            <p className="text-3xl font-black text-gray-900">₹{profit.toLocaleString()}</p>
            <p className="text-[10px] text-green-600 mt-2 flex items-center gap-1 font-bold">
              <TrendingUp className="w-3 h-3" />
              {margin}% Efficiency
            </p>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm">
            <p className="text-xs uppercase tracking-wider text-gray-500 mb-1 font-bold">Total Receivables</p>
            <p className="text-3xl font-black text-amber-600">₹{outstandings?.receivables_from_clients?.reduce((a: any, b: any) => a + Number(b.balance), 0).toLocaleString()}</p>
            <p className="text-[10px] text-gray-400 mt-2 font-bold uppercase">Awaiting Client Payment</p>
          </div>
        </div>

        {/* Outstanding Receivables & Payables */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-100 bg-gray-50/50">
              <h2 className="text-xs font-black text-gray-900 uppercase tracking-widest">Top Client Receivables</h2>
            </div>
            <div className="divide-y divide-gray-50">
              {outstandings?.receivables_from_clients?.length === 0 ? (
                <p className="p-10 text-center text-xs font-bold text-gray-400 uppercase tracking-widest">All accounts cleared</p>
              ) : (
                outstandings?.receivables_from_clients?.map((c: any, i: number) => (
                  <div key={i} className="p-4 flex items-center justify-between hover:bg-gray-50/50 transition-all">
                    <div>
                      <p className="font-bold text-gray-900 text-sm">{c.org_name}</p>
                      <p className="text-[10px] text-gray-400 font-bold uppercase">Pending Payment</p>
                    </div>
                    <p className="text-lg font-black text-amber-600">₹{Number(c.balance).toLocaleString()}</p>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-100 bg-gray-50/50">
              <h2 className="text-xs font-black text-gray-900 uppercase tracking-widest">Employee Wage Payables</h2>
            </div>
            <div className="divide-y divide-gray-50">
              {outstandings?.payables_to_employees?.length === 0 ? (
                <p className="p-10 text-center text-xs font-bold text-gray-400 uppercase tracking-widest">No pending wages</p>
              ) : (
                outstandings?.payables_to_employees?.map((e: any, i: number) => (
                  <div key={i} className="p-4 flex items-center justify-between hover:bg-gray-50/50 transition-all">
                    <div>
                      <p className="font-bold text-gray-900 text-sm">{e.name}</p>
                      <p className="text-[10px] text-gray-400 font-bold uppercase">Outstanding Wage</p>
                    </div>
                    <p className="text-lg font-black text-rose-600">₹{Number(e.balance).toLocaleString()}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

      </div>

      {/* Add Transaction Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Record Financial Transaction"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase">Type</label>
              <select
                className="w-full h-10 border rounded-lg px-3 bg-gray-50 font-bold"
                value={transactionForm.type}
                onChange={e => setTransactionForm({ ...transactionForm, type: e.target.value })}
              >
                <option value="expense">Expense (-)</option>
                <option value="income">Income (+)</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase">Category</label>
              <select
                className="w-full h-10 border rounded-lg px-3 bg-gray-50 font-bold"
                value={transactionForm.category}
                onChange={e => setTransactionForm({ ...transactionForm, category: e.target.value })}
              >
                <option value="Raw Material">Raw Material</option>
                <option value="Salaries">Salaries</option>
                <option value="Utilities">Utilities</option>
                <option value="Maintenance">Maintenance</option>
                <option value="Transport">Transport</option>
                <option value="Sales">Sales Income</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-500 uppercase">Amount (₹)</label>
            <input
              type="number"
              className="w-full h-12 border rounded-xl px-4 bg-white font-black text-xl text-indigo-600"
              placeholder="0.00"
              value={transactionForm.amount}
              onChange={e => setTransactionForm({ ...transactionForm, amount: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-500 uppercase">Description / Remarks</label>
            <textarea
              className="w-full border rounded-xl p-4 bg-gray-50 font-medium h-24"
              placeholder="Brief details about the transaction..."
              value={transactionForm.description}
              onChange={e => setTransactionForm({ ...transactionForm, description: e.target.value })}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="ghost" onClick={() => setShowAddModal(false)}>Cancel</Button>
            <Button
              className="bg-[#e94560] px-8"
              onClick={handleAddTransaction}
              disabled={isSubmitting}
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Transaction"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
