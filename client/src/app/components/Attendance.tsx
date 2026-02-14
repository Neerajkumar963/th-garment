import { Calendar, Clock, CheckCircle2, XCircle, AlertCircle, Loader2, Save } from "lucide-react";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { useState, useEffect } from "react";
import { api } from "../../services/api";
import toast from "react-hot-toast";
import { Modal } from "./ui/modal";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { cn } from "./ui/utils.tsx";

interface Attendance {
  id: number;
  emp_id: number;
  name: string;
  role_name: string;
  attendance_details: string;
  day_rate: number;
  remarks: string;
  created_on: string;
}

export function Attendance() {
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  // Mark Attendance State
  const [showMarkModal, setShowMarkModal] = useState(false);
  const [markingDate, setMarkingDate] = useState(new Date().toISOString().split('T')[0]);
  const [attendanceEntries, setAttendanceEntries] = useState<Record<number, { status: string, rate: string, remarks: string }>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchAttendance = async () => {
    setLoading(true);
    try {
      const data = await api.get(`/attendance?date=${selectedDate}`);
      setAttendance(data.attendance || []);
    } catch (error) {
      toast.error("Failed to load attendance for " + selectedDate);
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      const data = await api.get('/employees');
      const emps = data.employees || [];
      setEmployees(emps);

      // Initialize entries
      const initial: any = {};
      emps.forEach((e: any) => {
        initial[e.id] = { status: "Present", rate: "0", remarks: "" };
      });
      setAttendanceEntries(initial);
    } catch (e) {
      console.error("Failed to fetch employees for attendance");
    }
  };

  useEffect(() => {
    fetchAttendance();
  }, [selectedDate]);

  useEffect(() => {
    fetchEmployees();
  }, []);

  const handleMarkAttendance = async () => {
    setIsSubmitting(true);
    try {
      const entries = Object.entries(attendanceEntries).map(([empId, data]) => ({
        emp_id: parseInt(empId),
        attendance_details: data.status,
        day_rate: parseFloat(data.rate),
        remarks: data.remarks,
        date: markingDate
      }));

      await api.post('/attendance', { entries });
      toast.success("Attendance marked and ledger updated");
      setShowMarkModal(false);
      fetchAttendance();
    } catch (error: any) {
      toast.error(error.message || "Failed to mark attendance");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex-1 overflow-auto">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-8 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Attendance Management</h1>
            <p className="text-sm text-gray-600 mt-1">Track employee attendance and work hours</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right flex items-center gap-4">
              <div>
                <p className="text-xs text-gray-600">Viewing Date</p>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={e => setSelectedDate(e.target.value)}
                  className="text-sm font-bold text-gray-900 bg-transparent border-none focus:ring-0 p-0"
                />
              </div>
            </div>
            <Button
              className="bg-[#e94560] hover:bg-[#d13a52] font-bold px-6"
              onClick={() => {
                setMarkingDate(selectedDate);
                setShowMarkModal(true);
              }}
            >
              <Calendar className="w-4 h-4 mr-2" />
              Mark Attendance
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-8">
        {/* Today's Stats */}
        <div className="mb-8">
          <h2 className="text-lg font-bold text-gray-900 mb-4 uppercase tracking-widest text-xs">Day Statistics</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
              <p className="text-xs uppercase tracking-wider text-gray-500 mb-1">Present</p>
              <p className="text-3xl font-black text-green-600">{attendance.filter(a => a.attendance_details === 'Present').length}</p>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
              <p className="text-xs uppercase tracking-wider text-gray-500 mb-1">Absent</p>
              <p className="text-3xl font-black text-rose-600">{attendance.filter(a => a.attendance_details === 'Absent').length}</p>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
              <p className="text-xs uppercase tracking-wider text-gray-500 mb-1">Half Day</p>
              <p className="text-3xl font-black text-blue-600">{attendance.filter(a => a.attendance_details === 'Half Day').length}</p>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
              <p className="text-xs uppercase tracking-wider text-gray-500 mb-1">On Leave</p>
              <p className="text-3xl font-black text-amber-600">{attendance.filter(a => a.attendance_details === 'Leave').length}</p>
            </div>
          </div>
        </div>


        {/* Attendance Table */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
            <h2 className="text-sm font-black text-gray-900 uppercase tracking-widest">Attendance Registry</h2>
            <Badge className="bg-indigo-50 text-indigo-600 border-none font-bold uppercase text-[9px]">{attendance.length} Employees Logged</Badge>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50/50 border-b border-gray-100">
                <tr>
                  <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Employee</th>
                  <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Designation</th>
                  <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                  <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Day Wage</th>
                  <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loading ? (
                  <tr><td colSpan={5} className="py-20 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-indigo-400" /></td></tr>
                ) : attendance.length === 0 ? (
                  <tr><td colSpan={5} className="py-20 text-center text-xs font-bold text-gray-400 uppercase">No records for this date</td></tr>
                ) : (
                  attendance.map((record) => (
                    <tr key={record.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <p className="font-bold text-gray-900 text-sm">{record.name}</p>
                        <p className="text-[10px] text-gray-400 font-mono">ID: EMP-{record.emp_id}</p>
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant="outline" className="text-[9px] font-bold uppercase border-gray-200">
                          {record.role_name}
                        </Badge>
                      </td>
                      <td className="px-6 py-4">
                        <Badge className={cn(
                          "text-[9px] font-black uppercase",
                          record.attendance_details === 'Present' ? "bg-green-50 text-green-700" :
                            record.attendance_details === 'Absent' ? "bg-rose-50 text-rose-700" :
                              "bg-amber-50 text-amber-700"
                        )}>
                          {record.attendance_details}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-sm font-black text-gray-900">
                        ₹{record.day_rate}
                      </td>
                      <td className="px-6 py-4 text-xs font-medium text-gray-500 italic">
                        {record.remarks || "—"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Mark Attendance Modal */}
      <Modal
        isOpen={showMarkModal}
        onClose={() => setShowMarkModal(false)}
        title="Mark Staff Attendance"
        size="lg"
      >
        <div className="space-y-6">
          <div className="flex items-center gap-4 p-4 bg-indigo-50 rounded-xl border border-indigo-100 mb-6">
            <div className="space-y-1 flex-1">
              <Label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Select Attendance Date</Label>
              <input
                type="date"
                value={markingDate}
                onChange={e => setMarkingDate(e.target.value)}
                className="w-full bg-white h-10 px-3 rounded-lg border-indigo-200 text-sm font-bold"
              />
            </div>
            <div className="p-3 bg-white rounded-lg border border-indigo-100 text-center min-w-[120px]">
              <p className="text-[10px] font-black text-gray-400 uppercase">Staff Count</p>
              <p className="text-xl font-black text-indigo-600">{employees.length}</p>
            </div>
          </div>

          <div className="max-h-[50vh] overflow-y-auto px-1 space-y-3">
            {employees.map(emp => (
              <div key={emp.id} className="p-4 bg-gray-50 rounded-xl border border-gray-100 flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center font-bold text-indigo-600 border border-indigo-50">
                  {emp.name.charAt(0)}
                </div>
                <div className="w-40">
                  <p className="font-bold text-gray-900 text-xs">{emp.name}</p>
                  <p className="text-[9px] font-black text-gray-400 uppercase">{emp.role_name}</p>
                </div>

                <Select
                  defaultValue="Present"
                  onValueChange={val => setAttendanceEntries(prev => ({
                    ...prev, [emp.id]: { ...prev[emp.id], status: val }
                  }))}
                >
                  <SelectTrigger className="w-32 h-9 text-[11px] font-bold bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Present">Present</SelectItem>
                    <SelectItem value="Absent">Absent</SelectItem>
                    <SelectItem value="Half Day">Half Day</SelectItem>
                    <SelectItem value="Leave">Leave (Paid)</SelectItem>
                  </SelectContent>
                </Select>

                <div className="relative w-24">
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-gray-400">₹</span>
                  <Input
                    placeholder="Day Wage"
                    className="h-9 pl-5 text-[11px] font-bold bg-white"
                    type="number"
                    value={attendanceEntries[emp.id]?.rate}
                    onChange={e => setAttendanceEntries(prev => ({
                      ...prev, [emp.id]: { ...prev[emp.id], rate: e.target.value }
                    }))}
                  />
                </div>

                <Input
                  placeholder="Notes..."
                  className="h-9 flex-1 text-[11px] font-bold bg-white"
                  value={attendanceEntries[emp.id]?.remarks}
                  onChange={e => setAttendanceEntries(prev => ({
                    ...prev, [emp.id]: { ...prev[emp.id], remarks: e.target.value }
                  }))}
                />
              </div>
            ))}
          </div>

          <div className="pt-6 border-t border-gray-100 flex gap-3">
            <Button variant="ghost" className="flex-1 font-bold" onClick={() => setShowMarkModal(false)}>Cancel</Button>
            <Button
              className="flex-1 bg-indigo-600 hover:bg-indigo-700 font-bold"
              onClick={handleMarkAttendance}
              disabled={isSubmitting}
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Commit Attendance Log
                </>
              )}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

