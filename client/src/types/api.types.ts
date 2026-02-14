// Basic Identifiers
export interface User {
    id: number;
    username: string;
    email: string;
    name: string;
    role: string;
}

// Client Types
export interface Organization {
    id: number;
    org_name: string;
    phone: string;
    email: string;
    gstin: string;
    adhaar: string;
    branch: string;
    org_type: string;
}

// Order Types
export interface Order {
    id: number;
    org_id: number;
    org_name?: string; // Optional joined field
    branch: string;
    date: string;
    order_type: string;
    advance: number;
    status: string;
    eta: string;
    remarks: string;
    total_pieces?: number;
}

export interface OrderDetail {
    id: number;
    order_id: number;
    org_dress_id: number;
    sq: { [size: string]: number };
    customization: string;
    remarks: string;
}

// Product Types (mapping client to items)
export interface OrgDress {
    id: number;
    org_id: number;
    item_id: number;
    org_dress_name: string;
}

// Fabric Types
export interface ClothDetail {
    id: number;
    cloth_type: string;
    color: string;
    design: string;
    quality: string;
    total_quantity: number;
}

export interface ClothRoll {
    id: number;
    cloth_detail_id: number;
    roll_length: number;
    received_on: string;
}

// Employee Types
export interface Employee {
    id: number;
    name: string;
    adhaar: string;
    role_id: number;
    role_name?: string;
    phone: string;
    current_balance: number;
}

// Production Types
export interface ProductionJob {
    id: number;
    order_detail_id: number;
    stage_id: number;
    emp_id: number;
    stage_rate: number;
    pieces_completed: number;
    status: string;
    updated_on: string;
}

export interface CutStock {
    id: number;
    order_detail_id: number;
    size: string;
    total_qty: number;
    available_qty: number;
}

// Sales
export interface SalesHistory {
    id: number;
    org_id: number;
    org_name?: string;
    total: number;
    created_on: string;
}
