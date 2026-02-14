-- Improvements for Frequent Lookups
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_processing_status_stage ON processing(status, stage_id);
CREATE INDEX idx_sales_date ON sales_history(created_on);

-- Account Lookups
CREATE INDEX idx_org_account_org ON org_account(org_id);
CREATE INDEX idx_emp_account_emp ON emp_account(emp_id);

-- Attendance Date
CREATE INDEX idx_attendance_date ON attendance_log(created_on);
