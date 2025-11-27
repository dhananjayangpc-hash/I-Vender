-- I-Vendor: AI-Powered Project Vending Platform
-- Complete Database Schema
-- Created: November 2025

-- ============================================
-- EXTENSIONS
-- ============================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- CORE TABLES
-- ============================================

-- Departments
CREATE TABLE departments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL UNIQUE,
    description text,
    image_url text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Users
CREATE TABLE users (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    email text NOT NULL UNIQUE,
    password_hash text NOT NULL,
    name text NOT NULL,
    role text NOT NULL CHECK (role IN ('student', 'mentor', 'alumni', 'vendor', 'admin', 'staff')),
    department_id uuid REFERENCES departments(id),
    avatar_url text,
    phone text,
    bio text,
    verified boolean DEFAULT false,
    status text DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
    metadata jsonb,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Institutions
CREATE TABLE institutions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL UNIQUE,
    type text NOT NULL CHECK (type IN ('engineering_college', 'polytechnic', 'university')),
    location text,
    website text,
    email text,
    phone text,
    metadata jsonb,
    created_at timestamptz DEFAULT now()
);

-- ============================================
-- PROJECT VENDING: IDEAS & RECOMMENDATIONS
-- ============================================

-- Idea Sources (AI-generated, Alumni, Industry)
CREATE TABLE idea_sources (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL UNIQUE,
    type text NOT NULL CHECK (type IN ('ai_generated', 'alumni_suggested', 'industry_trend')),
    description text,
    created_at timestamptz DEFAULT now()
);

-- AI Models/Embeddings metadata
CREATE TABLE ai_models (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    version text,
    description text,
    embedding_dimension integer,
    tags jsonb,
    metadata jsonb,
    created_at timestamptz DEFAULT now()
);

-- Project Ideas (Core)
CREATE TABLE ideas (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    title text NOT NULL,
    problem_statement text,
    concept_overview text,
    department_id uuid REFERENCES departments(id),
    source_id uuid REFERENCES idea_sources(id),
    created_by_user_id uuid REFERENCES users(id),
    difficulty text CHECK (difficulty IN ('beginner', 'intermediate', 'advanced', 'expert')),
    required_skills jsonb,
    required_components jsonb,
    estimated_time_weeks integer,
    estimated_cost numeric,
    category text,
    industry_tags jsonb,
    three_d_model_url text,
    research_papers jsonb,
    step_by_step_outline jsonb,
    mentor_availability boolean DEFAULT true,
    material_availability boolean DEFAULT true,
    popularity_score numeric DEFAULT 0,
    ai_confidence_score numeric,
    budget_min numeric,
    budget_max numeric,
    time_min_weeks integer,
    time_max_weeks integer,
    status text DEFAULT 'active' CHECK (status IN ('active', 'archived', 'trending')),
    view_count integer DEFAULT 0,
    selection_count integer DEFAULT 0,
    metadata jsonb,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Project Instances (when student selects an idea)
CREATE TABLE project_instances (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    idea_id uuid NOT NULL REFERENCES ideas(id),
    student_id uuid NOT NULL REFERENCES users(id),
    title text NOT NULL,
    description text,
    status text DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'abandoned', 'submitted')),
    start_date date,
    expected_completion_date date,
    completion_date date,
    mentor_id uuid REFERENCES users(id),
    total_budget numeric,
    budget_spent numeric DEFAULT 0,
    materials_ordered_count integer DEFAULT 0,
    materials_received_count integer DEFAULT 0,
    metadata jsonb,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Project Milestones
CREATE TABLE milestones (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    project_instance_id uuid NOT NULL REFERENCES project_instances(id),
    title text NOT NULL,
    description text,
    status text DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
    due_date date,
    completed_date date,
    progress_percentage numeric DEFAULT 0,
    metadata jsonb,
    created_at timestamptz DEFAULT now()
);

-- ============================================
-- MATERIAL VENDORS & COMPONENTS
-- ============================================

-- Material Vendors (Shops & Alumni)
CREATE TABLE material_vendors (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES users(id),
    name text NOT NULL,
    shop_type text CHECK (shop_type IN ('electronics', 'mechanical', 'fabrication', 'software', 'tools', 'general')),
    description text,
    location text,
    contact_email text,
    contact_phone text,
    website text,
    verified boolean DEFAULT false,
    commission_percentage numeric DEFAULT 10,
    total_earnings numeric DEFAULT 0,
    total_orders integer DEFAULT 0,
    rating numeric DEFAULT 0,
    status text DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'verified', 'suspended')),
    metadata jsonb,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Materials/Components Available
CREATE TABLE materials (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    vendor_id uuid NOT NULL REFERENCES material_vendors(id),
    name text NOT NULL,
    description text,
    category text,
    unit_price numeric NOT NULL,
    stock_quantity integer NOT NULL,
    unit text,
    sku text UNIQUE,
    image_url text,
    specifications jsonb,
    compatible_projects jsonb,
    rating numeric DEFAULT 0,
    status text DEFAULT 'active',
    metadata jsonb,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Service Bundles (kits, renting services, machinery time)
CREATE TABLE service_bundles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    vendor_id uuid NOT NULL REFERENCES material_vendors(id),
    name text NOT NULL,
    description text,
    service_type text CHECK (service_type IN ('kit', 'machinery_rental', 'lab_access', 'fabrication', 'printing_3d', 'testing')),
    price numeric NOT NULL,
    duration_days integer,
    includes_items jsonb,
    image_url text,
    status text DEFAULT 'active',
    metadata jsonb,
    created_at timestamptz DEFAULT now()
);

-- Material Orders
CREATE TABLE material_orders (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id uuid NOT NULL REFERENCES users(id),
    project_instance_id uuid REFERENCES project_instances(id),
    vendor_id uuid NOT NULL REFERENCES material_vendors(id),
    order_items jsonb NOT NULL,
    total_amount numeric NOT NULL,
    commission_amount numeric,
    vendor_payment_status text DEFAULT 'pending' CHECK (vendor_payment_status IN ('pending', 'paid', 'failed')),
    order_status text DEFAULT 'pending' CHECK (order_status IN ('pending', 'confirmed', 'shipped', 'delivered', 'cancelled')),
    delivery_date date,
    payment_method text,
    tracking_number text,
    notes text,
    metadata jsonb,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Commission Tracking
CREATE TABLE commissions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    vendor_id uuid NOT NULL REFERENCES material_vendors(id),
    order_id uuid REFERENCES material_orders(id),
    session_id uuid,
    commission_type text CHECK (commission_type IN ('material_sale', 'service_provision', 'mentorship_session')),
    commission_percentage numeric,
    commission_amount numeric NOT NULL,
    status text DEFAULT 'pending' CHECK (status IN ('pending', 'processed', 'failed')),
    payment_date date,
    notes text,
    metadata jsonb,
    created_at timestamptz DEFAULT now()
);

-- ============================================
-- MENTORSHIP SYSTEM
-- ============================================

-- Mentors
CREATE TABLE mentors (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL UNIQUE REFERENCES users(id),
    specializations jsonb,
    experience_years integer,
    bio text,
    hourly_rate numeric,
    availability jsonb,
    total_sessions integer DEFAULT 0,
    rating numeric DEFAULT 0,
    verification_status text DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'rejected')),
    metadata jsonb,
    created_at timestamptz DEFAULT now()
);

-- Mentor Sessions
CREATE TABLE mentor_sessions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    mentor_id uuid NOT NULL REFERENCES mentors(id),
    student_id uuid NOT NULL REFERENCES users(id),
    project_instance_id uuid REFERENCES project_instances(id),
    session_type text CHECK (session_type IN ('chat', 'video', 'in_person')),
    title text,
    description text,
    scheduled_start_time timestamptz,
    scheduled_end_time timestamptz,
    actual_start_time timestamptz,
    actual_end_time timestamptz,
    status text DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled')),
    notes text,
    feedback_student text,
    feedback_mentor text,
    rating_by_student numeric,
    duration_minutes integer,
    cost numeric,
    payment_status text DEFAULT 'pending',
    recording_url text,
    metadata jsonb,
    created_at timestamptz DEFAULT now()
);

-- ============================================
-- ATTENDANCE SYSTEM
-- ============================================

-- Attendance Logs
CREATE TABLE attendance_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES users(id),
    attendance_date date NOT NULL,
    check_in_time timestamptz,
    check_out_time timestamptz,
    attendance_mode text CHECK (attendance_mode IN ('rfid', 'facial', 'fingerprint', 'qr_code', 'manual')),
    status text DEFAULT 'present' CHECK (status IN ('present', 'absent', 'late', 'leave')),
    device_id text,
    location text,
    is_proxy_detected boolean DEFAULT false,
    offline_synced boolean DEFAULT false,
    metadata jsonb,
    created_at timestamptz DEFAULT now()
);

-- Attendance Configuration
CREATE TABLE attendance_config (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id uuid REFERENCES institutions(id),
    enable_rfid boolean DEFAULT true,
    enable_facial boolean DEFAULT true,
    enable_fingerprint boolean DEFAULT true,
    enable_qr boolean DEFAULT true,
    anti_proxy_enabled boolean DEFAULT true,
    parent_notification_enabled boolean DEFAULT true,
    parent_notification_email text,
    late_threshold_minutes integer DEFAULT 15,
    metadata jsonb,
    created_at timestamptz DEFAULT now()
);

-- ============================================
-- CLEANLINESS MONITORING
-- ============================================

-- Cleanliness Reports
CREATE TABLE cleanliness_reports (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id uuid NOT NULL REFERENCES users(id),
    location text NOT NULL,
    issue_type text NOT NULL CHECK (issue_type IN ('garbage', 'spill', 'broken_equipment', 'unsafe_area', 'other')),
    description text,
    photo_url text,
    severity text CHECK (severity IN ('low', 'medium', 'high')),
    assigned_staff_id uuid REFERENCES users(id),
    status text DEFAULT 'open' CHECK (status IN ('open', 'assigned', 'in_progress', 'resolved', 'closed')),
    resolved_date date,
    resolution_notes text,
    reward_points_earned numeric DEFAULT 5,
    metadata jsonb,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- ============================================
-- RBVM (REVERSE BOTTLE VENDING MACHINE)
-- ============================================

-- RBVM Machines
CREATE TABLE rbvm_machines (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    location text NOT NULL,
    model text,
    status text DEFAULT 'active',
    total_bottles_collected integer DEFAULT 0,
    metadata jsonb,
    created_at timestamptz DEFAULT now()
);

-- RBVM Transactions
CREATE TABLE rbvm_transactions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id uuid NOT NULL REFERENCES users(id),
    machine_id uuid NOT NULL REFERENCES rbvm_machines(id),
    bottles_count integer NOT NULL,
    points_earned numeric NOT NULL,
    carbon_footprint_saved_kg numeric,
    transaction_timestamp timestamptz DEFAULT now(),
    metadata jsonb,
    created_at timestamptz DEFAULT now()
);

-- ============================================
-- REWARDS & LOYALTY
-- ============================================

-- Rewards Catalog
CREATE TABLE rewards_catalog (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    title text NOT NULL,
    description text,
    reward_type text CHECK (reward_type IN ('coupon', 'certificate', 'fee_refund', 'lab_access', 'merchandise')),
    points_required numeric NOT NULL,
    max_redemptions integer,
    image_url text,
    status text DEFAULT 'active',
    metadata jsonb,
    created_at timestamptz DEFAULT now()
);

-- Student Rewards Wallet
CREATE TABLE rewards_wallet (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id uuid NOT NULL UNIQUE REFERENCES users(id),
    total_points numeric DEFAULT 0,
    available_points numeric DEFAULT 0,
    locked_points numeric DEFAULT 0,
    lifetime_points numeric DEFAULT 0,
    current_tier text DEFAULT 'bronze' CHECK (current_tier IN ('bronze', 'silver', 'gold', 'platinum')),
    streak_count integer DEFAULT 0,
    last_activity_date date,
    metadata jsonb,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Rewards Transactions (earning & redemption)
CREATE TABLE rewards_transactions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id uuid NOT NULL REFERENCES users(id),
    transaction_type text NOT NULL CHECK (transaction_type IN ('earn', 'redeem')),
    reason text NOT NULL,
    points_change numeric NOT NULL,
    reference_id uuid,
    reference_type text CHECK (reference_type IN ('attendance', 'project_milestone', 'cleanliness_report', 'rbvm_transaction', 'mentor_session', 'material_purchase', 'reward_redemption')),
    metadata jsonb,
    created_at timestamptz DEFAULT now()
);

-- Reward Redemptions
CREATE TABLE reward_redemptions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id uuid NOT NULL REFERENCES users(id),
    reward_id uuid NOT NULL REFERENCES rewards_catalog(id),
    status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'distributed', 'cancelled')),
    redemption_date date,
    distributed_date date,
    notes text,
    metadata jsonb,
    created_at timestamptz DEFAULT now()
);

-- ============================================
-- ADMIN & SYSTEM
-- ============================================

-- Documents (verification, certificates, etc)
CREATE TABLE documents (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES users(id),
    document_type text NOT NULL,
    filename text NOT NULL,
    file_url text,
    status text DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'rejected')),
    verified_by_user_id uuid REFERENCES users(id),
    verified_date date,
    notes text,
    metadata jsonb,
    created_at timestamptz DEFAULT now()
);

-- Audit Logs
CREATE TABLE audit_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid,
    action text NOT NULL,
    entity_type text,
    entity_id uuid,
    old_values jsonb,
    new_values jsonb,
    ip_address text,
    metadata jsonb,
    created_at timestamptz DEFAULT now()
);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

-- Users indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_department ON users(department_id);

-- Ideas indexes
CREATE INDEX idx_ideas_department ON ideas(department_id);
CREATE INDEX idx_ideas_difficulty ON ideas(difficulty);
CREATE INDEX idx_ideas_status ON ideas(status);
CREATE INDEX idx_ideas_created_by ON ideas(created_by_user_id);
CREATE INDEX idx_ideas_popularity ON ideas(popularity_score);

-- Project instances indexes
CREATE INDEX idx_project_instances_student ON project_instances(student_id);
CREATE INDEX idx_project_instances_idea ON project_instances(idea_id);
CREATE INDEX idx_project_instances_mentor ON project_instances(mentor_id);
CREATE INDEX idx_project_instances_status ON project_instances(status);

-- Material indexes
CREATE INDEX idx_materials_vendor ON materials(vendor_id);
CREATE INDEX idx_materials_category ON materials(category);

-- Orders indexes
CREATE INDEX idx_material_orders_student ON material_orders(student_id);
CREATE INDEX idx_material_orders_vendor ON material_orders(vendor_id);
CREATE INDEX idx_material_orders_status ON material_orders(order_status);

-- Mentorship indexes
CREATE INDEX idx_mentor_sessions_mentor ON mentor_sessions(mentor_id);
CREATE INDEX idx_mentor_sessions_student ON mentor_sessions(student_id);
CREATE INDEX idx_mentor_sessions_status ON mentor_sessions(status);

-- Attendance indexes
CREATE INDEX idx_attendance_logs_user_date ON attendance_logs(user_id, attendance_date);
CREATE INDEX idx_attendance_logs_date ON attendance_logs(attendance_date);

-- Cleanliness indexes
CREATE INDEX idx_cleanliness_reports_student ON cleanliness_reports(student_id);
CREATE INDEX idx_cleanliness_reports_status ON cleanliness_reports(status);
CREATE INDEX idx_cleanliness_reports_location ON cleanliness_reports(location);

-- RBVM indexes
CREATE INDEX idx_rbvm_transactions_student ON rbvm_transactions(student_id);
CREATE INDEX idx_rbvm_transactions_machine ON rbvm_transactions(machine_id);

-- Rewards indexes
CREATE INDEX idx_rewards_wallet_student ON rewards_wallet(student_id);
CREATE INDEX idx_rewards_transactions_student ON rewards_transactions(student_id);
CREATE INDEX idx_rewards_transactions_type ON rewards_transactions(transaction_type);

-- ============================================
-- CONSTRAINTS & TRIGGERS
-- ============================================

-- Create audit trigger function
CREATE OR REPLACE FUNCTION audit_log_changes()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO audit_logs (user_id, action, entity_type, entity_id, new_values, created_at)
    VALUES (NULL, TG_OP, TG_TABLE_NAME, NEW.id, row_to_json(NEW), now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- INITIAL DATA INSERTS (Departments)
-- ============================================

INSERT INTO departments (name, description) VALUES
('Mechanical Engineering', 'Mechanical engineering department'),
('Electrical Engineering', 'Electrical engineering department'),
('Electronics Engineering', 'Electronics engineering department'),
('Civil Engineering', 'Civil engineering department'),
('Computer Science & Engineering', 'Computer science and engineering department'),
('Mechatronics', 'Mechatronics department'),
('Robotics & Automation', 'Robotics and automation department'),
('AI & Machine Learning', 'Artificial intelligence and machine learning department'),
('Electrical & Electronics', 'Electrical and electronics department'),
('Biomedical Engineering', 'Biomedical engineering department')
ON CONFLICT (name) DO NOTHING;

-- Create Idea Sources
INSERT INTO idea_sources (name, type, description) VALUES
('AI Generated', 'ai_generated', 'Ideas generated by AI based on department and trends'),
('Alumni Suggestions', 'alumni_suggested', 'Project ideas suggested by alumni'),
('Industry Trends', 'industry_trend', 'Latest trends in IoT, AI, Robotics, EV, and more')
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- END OF SCHEMA
-- ============================================
