import { useState, useRef, useEffect } from "react";
import { LogOut, ChevronDown, User, Shield } from "lucide-react";
import { cn } from "./ui/utils.tsx";
import { useAuth } from "../../contexts/AuthContext";

export function UserMenu() {
    const { user, logout } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
        <div className="fixed top-6 right-8 z-[100]" ref={menuRef}>
            {/* Trigger Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={cn(
                    "flex items-center gap-2.5 p-1 pr-3.5 rounded-full transition-all border shadow-sm backdrop-blur-md",
                    isOpen
                        ? "bg-[#1a1a2e] border-[#e94560]/50 shadow-[#e94560]/20 text-white"
                        : "bg-white/90 border-gray-200 hover:border-[#e94560]/30 text-[#1a1a2e]"
                )}
            >
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#e94560] to-[#ff6b88] flex items-center justify-center text-[9px] font-black text-white shadow-md">
                    {user?.name?.substring(0, 2).toUpperCase() || "AD"}
                </div>
                <div className="text-left hidden sm:block">
                    <p className="text-[11px] font-bold leading-none">{user?.name || "Admin"}</p>
                </div>
                <ChevronDown className={cn("w-3 h-3 opacity-30 transition-transform duration-300", isOpen && "rotate-180")} />
            </button>

            {/* Dropdown Menu */}
            {isOpen && (
                <div className="absolute top-full right-0 mt-3 w-60 bg-[#1a1a2e] border border-white/10 rounded-2xl shadow-2xl p-1.5 animate-in fade-in zoom-in-95 duration-200 overflow-hidden">
                    <div className="p-3.5 pb-3">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center">
                                <Shield className="w-4 h-4 text-[#e94560]" />
                            </div>
                            <div>
                                <p className="text-xs font-bold text-white mb-0.5">{user?.name}</p>
                                <p className="text-[9px] font-black text-[#e94560] uppercase tracking-widest">{user?.role || "Administrator"}</p>
                            </div>
                        </div>
                        <div className="bg-white/5 rounded-xl p-2.5">
                            <p className="text-[10px] font-medium text-white/50 truncate flex items-center gap-2">
                                <span className="w-1 h-1 rounded-full bg-[#e94560]" />
                                {user?.email}
                            </p>
                        </div>
                    </div>

                    <div className="px-1.5 pb-1.5">
                        <button
                            onClick={() => {
                                setIsOpen(false);
                                logout();
                            }}
                            className="w-full flex items-center gap-3 px-3 py-2.5 text-[#e94560] hover:bg-[#e94560]/10 rounded-xl transition-all group"
                        >
                            <div className="w-8 h-8 rounded-lg bg-[#e94560]/10 flex items-center justify-center group-hover:bg-[#e94560]/20 transition-colors">
                                <LogOut className="w-3.5 h-3.5" />
                            </div>
                            <div className="text-left">
                                <p className="text-xs font-bold">Log out</p>
                                <p className="text-[9px] font-black opacity-30 uppercase tracking-tighter">Exit System</p>
                            </div>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
