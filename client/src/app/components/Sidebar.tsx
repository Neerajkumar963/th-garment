import {
  LayoutDashboard,
  Package,
  Shirt,
  Users,
  ShoppingCart,
  DollarSign,
  Scissors,
  Layers,
  UserCircle,
  Calendar,
  Wallet,
  BarChart3,
  Factory,
} from "lucide-react";
import { cn } from "./ui/utils.tsx";

interface SidebarProps {
  currentPage: string;
  onNavigate: (page: string) => void;
}

const navItems = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "fabric-stock", label: "Fabric Stock", icon: Package },
  { id: "cutting", label: "Cutting", icon: Scissors },
  { id: "processing", label: "Processing", icon: Layers },
  { id: "fabricator", label: "Fabricator", icon: Factory },
  { id: "orders", label: "Orders", icon: ShoppingCart },
  { id: "items-master", label: "Items Master", icon: Shirt },
  { id: "clients", label: "Clients", icon: Users },
  { id: "employees", label: "Employees", icon: UserCircle },
  { id: "attendance", label: "Attendance", icon: Calendar },
  { id: "sales", label: "Sales", icon: DollarSign, disabled: true },
  { id: "accounts", label: "Accounts", icon: Wallet },
  { id: "analytics", label: "Analytics", icon: BarChart3 },
];

export function Sidebar({ currentPage, onNavigate }: SidebarProps) {
  return (
    <div className="w-64 bg-[#1a1a2e] text-white h-full flex flex-col relative">
      {/* Logo */}
      <div className="p-6 border-b border-white/10">
        <h1 className="text-2xl font-bold text-white">TH Garments</h1>
        <p className="text-xs text-white/60 mt-1">Management System</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto custom-scrollbar">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;
          const isDisabled = (item as any).disabled;

          return (
            <button
              key={item.id}
              onClick={() => !isDisabled && onNavigate(item.id)}
              disabled={isDisabled}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all",
                isActive
                  ? "bg-[#e94560] text-white shadow-lg"
                  : "text-white/70 hover:bg-white/10 hover:text-white",
                isDisabled && "opacity-50 cursor-not-allowed hover:bg-transparent hover:text-white/70"
              )}
            >
              <Icon className="w-5 h-5" />
              <span className="text-sm">{item.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
