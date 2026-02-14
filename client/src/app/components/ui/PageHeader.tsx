import React from "react";
import { cn } from "./utils.tsx";

interface PageHeaderProps {
    title: string;
    subtitle?: string;
    children?: React.ReactNode;
    className?: string;
}

export function PageHeader({ title, subtitle, children, className }: PageHeaderProps) {
    return (
        <div className={cn("bg-white border-b border-gray-200 px-8 py-6", className)}>
            <div className="flex items-center justify-between max-w-7xl mx-auto">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 tracking-tight">{title}</h1>
                    {subtitle && <p className="text-sm font-medium text-gray-500 mt-1">{subtitle}</p>}
                </div>
                {children && <div className="flex items-center gap-4">{children}</div>}
            </div>
        </div>
    );
}
