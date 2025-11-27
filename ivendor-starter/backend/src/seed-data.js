// I-Vendor Platform: Comprehensive Seed Data
// 35 project ideas, 8 mentors, 10 vendors, 40+ materials, RBVM integration, rewards system

const seedData = {
  ideas: [
    { title: 'Automated Water Dispenser with IoT', problem_statement: 'Manual water dispensing is inefficient', department_name: 'Mechanical Engineering', source_name: 'Industry Trends', difficulty: 'intermediate', estimated_cost: 3500, estimated_time_weeks: 4, category: 'IoT', budget_min: 2000, budget_max: 5000 },
    { title: 'Solar-Powered Conveyor System', problem_statement: 'Conveyors consume excessive electricity', department_name: 'Mechanical Engineering', source_name: 'Industry Trends', difficulty: 'advanced', estimated_cost: 8500, estimated_time_weeks: 8, category: 'Renewable Energy', budget_min: 6000, budget_max: 12000 },
    { title: 'CNC-Controlled Mini Lathe Machine', problem_statement: 'Manual lathe operations are time-consuming', department_name: 'Mechanical Engineering', source_name: 'Alumni Suggestions', difficulty: 'advanced', estimated_cost: 12000, estimated_time_weeks: 10, category: 'Fabrication', budget_min: 10000, budget_max: 15000 },
    { title: 'Robotic Arm with 6 Degrees of Freedom', problem_statement: 'Manual assembly is inefficient', department_name: 'Mechanical Engineering', source_name: 'AI Generated', difficulty: 'expert', estimated_cost: 15000, estimated_time_weeks: 12, category: 'Robotics', budget_min: 12000, budget_max: 20000 },
    { title: 'Vertical Farming with Automated Watering', problem_statement: 'Urban farming needs compact systems', department_name: 'Mechanical Engineering', source_name: 'Industry Trends', difficulty: 'intermediate', estimated_cost: 5500, estimated_time_weeks: 6, category: 'Agriculture', budget_min: 4000, budget_max: 8000 },
    { title: 'Smart Grid Load Balancer', problem_statement: 'Grid instability during peak loads', department_name: 'Electrical Engineering', source_name: 'Industry Trends', difficulty: 'advanced', estimated_cost: 9500, estimated_time_weeks: 8, category: 'Power Systems', budget_min: 8000, budget_max: 12000 },
    { title: 'EV Charging Station DIY', problem_statement: 'EV adoption needs infrastructure', department_name: 'Electrical Engineering', source_name: 'AI Generated', difficulty: 'advanced', estimated_cost: 18000, estimated_time_weeks: 10, category: 'EV Technology', budget_min: 15000, budget_max: 25000 },
    { title: 'Wireless Power Transfer System', problem_statement: 'Wired charging is inconvenient', department_name: 'Electrical Engineering', source_name: 'Alumni Suggestions', difficulty: 'advanced', estimated_cost: 7500, estimated_time_weeks: 9, category: 'Wireless Technology', budget_min: 5000, budget_max: 10000 },
    { title: 'Home Automation with Voice Control', problem_statement: 'Automation is expensive', department_name: 'Electrical Engineering', source_name: 'AI Generated', difficulty: 'intermediate', estimated_cost: 4500, estimated_time_weeks: 6, category: 'Smart Home', budget_min: 3000, budget_max: 6500 },
    { title: 'Energy Harvesting from Vibrations', problem_statement: 'Wasted vibration energy', department_name: 'Electrical Engineering', source_name: 'Industry Trends', difficulty: 'intermediate', estimated_cost: 3800, estimated_time_weeks: 5, category: 'Energy Harvesting', budget_min: 2500, budget_max: 5500 },
    { title: 'Motion Capture System Using IMUs', problem_statement: 'Professional motion capture is expensive', department_name: 'Electronics Engineering', source_name: 'AI Generated', difficulty: 'advanced', estimated_cost: 8000, estimated_time_weeks: 9, category: 'Motion Capture', budget_min: 6000, budget_max: 10000 },
    { title: 'Real-Time ECG Monitor', problem_statement: 'Healthcare monitoring needs portability', department_name: 'Electronics Engineering', source_name: 'Alumni Suggestions', difficulty: 'advanced', estimated_cost: 5500, estimated_time_weeks: 8, category: 'Healthcare', budget_min: 4000, budget_max: 7500 },
    { title: 'Autonomous Drone with Tracking', problem_statement: 'Commercial drones are expensive', department_name: 'Electronics Engineering', source_name: 'Industry Trends', difficulty: 'expert', estimated_cost: 15000, estimated_time_weeks: 12, category: 'Drones', budget_min: 12000, budget_max: 20000 },
    { title: 'AI Security System with Facial Recognition', problem_statement: 'Security needs intelligent detection', department_name: 'Electronics Engineering', source_name: 'AI Generated', difficulty: 'advanced', estimated_cost: 6500, estimated_time_weeks: 7, category: 'Security', budget_min: 5000, budget_max: 8500 },
    { title: 'Gesture Recognition Control', problem_statement: 'Devices need gesture-based control', department_name: 'Electronics Engineering', source_name: 'Alumni Suggestions', difficulty: 'intermediate', estimated_cost: 3500, estimated_time_weeks: 5, category: 'HCI', budget_min: 2500, budget_max: 5000 },
    { title: 'Blockchain Supply Chain Verification', problem_statement: 'Product authenticity is difficult', department_name: 'Computer Science & Engineering', source_name: 'Industry Trends', difficulty: 'advanced', estimated_cost: 2500, estimated_time_weeks: 8, category: 'Blockchain', budget_min: 1000, budget_max: 4000 },
    { title: 'AI-Powered Code Review Tool', problem_statement: 'Code review is time-consuming', department_name: 'Computer Science & Engineering', source_name: 'AI Generated', difficulty: 'advanced', estimated_cost: 2000, estimated_time_weeks: 7, category: 'DevOps', budget_min: 1000, budget_max: 3500 },
    { title: 'Distributed Consensus Algorithm', problem_statement: 'Distributed systems need consensus', department_name: 'Computer Science & Engineering', source_name: 'Alumni Suggestions', difficulty: 'expert', estimated_cost: 1500, estimated_time_weeks: 10, category: 'Distributed Systems', budget_min: 500, budget_max: 3000 },
    { title: 'Collaborative Drawing App', problem_statement: 'Remote collaboration needs low-latency', department_name: 'Computer Science & Engineering', source_name: 'AI Generated', difficulty: 'intermediate', estimated_cost: 1000, estimated_time_weeks: 5, category: 'Web Development', budget_min: 500, budget_max: 2000 },
    { title: 'Quantum Algorithm Simulator', problem_statement: 'Learning quantum is difficult', department_name: 'Computer Science & Engineering', source_name: 'Industry Trends', difficulty: 'intermediate', estimated_cost: 1200, estimated_time_weeks: 6, category: 'Quantum Computing', budget_min: 500, budget_max: 2500 },
    { title: 'Self-Balancing Robot with PID', problem_statement: 'Need practical control examples', department_name: 'Mechatronics', source_name: 'AI Generated', difficulty: 'intermediate', estimated_cost: 3200, estimated_time_weeks: 5, category: 'Robotics', budget_min: 2000, budget_max: 4500 },
    { title: 'Automated Traffic Light System', problem_statement: 'Traffic needs intelligent management', department_name: 'Mechatronics', source_name: 'Industry Trends', difficulty: 'intermediate', estimated_cost: 4200, estimated_time_weeks: 6, category: 'Smart City', budget_min: 3000, budget_max: 6000 },
    { title: 'Prosthetic Limb with EMG Control', problem_statement: 'Prosthetics need gesture control', department_name: 'Mechatronics', source_name: 'Alumni Suggestions', difficulty: 'expert', estimated_cost: 12000, estimated_time_weeks: 11, category: 'Biomedical', budget_min: 10000, budget_max: 15000 },
    { title: 'Warehouse Automation System', problem_statement: 'Warehouses need automated picking', department_name: 'Mechatronics', source_name: 'Industry Trends', difficulty: 'advanced', estimated_cost: 18000, estimated_time_weeks: 10, category: 'Warehouse Automation', budget_min: 15000, budget_max: 25000 },
    { title: 'Autonomous Delivery Robot', problem_statement: 'Campus delivery is manual', department_name: 'Robotics & Automation', source_name: 'AI Generated', difficulty: 'advanced', estimated_cost: 20000, estimated_time_weeks: 10, category: 'Autonomous Systems', budget_min: 18000, budget_max: 25000 },
    { title: 'Line Following Robot with ML', problem_statement: 'Robots need adaptive learning', department_name: 'Robotics & Automation', source_name: 'Alumni Suggestions', difficulty: 'intermediate', estimated_cost: 3000, estimated_time_weeks: 6, category: 'Robotics', budget_min: 2000, budget_max: 4500 },
    { title: 'Human-Robot Collaboration', problem_statement: 'Industry needs safe collaboration', department_name: 'Robotics & Automation', source_name: 'Industry Trends', difficulty: 'expert', estimated_cost: 22000, estimated_time_weeks: 12, category: 'Industrial Robotics', budget_min: 20000, budget_max: 30000 },
    { title: 'Swarm Robotics Platform', problem_statement: 'Multi-robot coordination is complex', department_name: 'Robotics & Automation', source_name: 'AI Generated', difficulty: 'expert', estimated_cost: 25000, estimated_time_weeks: 11, category: 'Robotics', budget_min: 20000, budget_max: 35000 },
    { title: 'Disease Prediction Model', problem_statement: 'Early detection is critical', department_name: 'AI & Machine Learning', source_name: 'Industry Trends', difficulty: 'advanced', estimated_cost: 1500, estimated_time_weeks: 7, category: 'Healthcare AI', budget_min: 1000, budget_max: 3000 },
    { title: 'Crop Disease Detection', problem_statement: 'Farmers need real-time identification', department_name: 'AI & Machine Learning', source_name: 'Alumni Suggestions', difficulty: 'intermediate', estimated_cost: 2500, estimated_time_weeks: 8, category: 'Agricultural AI', budget_min: 1500, budget_max: 4000 },
    { title: 'NLP Customer Support Chatbot', problem_statement: 'Support needs 24/7 automation', department_name: 'AI & Machine Learning', source_name: 'AI Generated', difficulty: 'intermediate', estimated_cost: 1200, estimated_time_weeks: 6, category: 'NLP', budget_min: 500, budget_max: 2500 }
  ],

  mentors: [
    { name: 'Arjun Sharma', email: 'arjun.sharma@alumni.com', specializations: ['Robotics', 'IoT'], experience_years: 7, hourly_rate: 500 },
    { name: 'Priya Patel', email: 'priya.patel@alumni.com', specializations: ['AI/ML', 'Computer Vision'], experience_years: 5, hourly_rate: 600 },
    { name: 'Rajesh Kumar', email: 'rajesh.kumar@alumni.com', specializations: ['Power Electronics', 'Solar Energy'], experience_years: 8, hourly_rate: 550 },
    { name: 'Neha Gupta', email: 'neha.gupta@alumni.com', specializations: ['Blockchain', 'Web3'], experience_years: 4, hourly_rate: 700 },
    { name: 'Vikram Singh', email: 'vikram.singh@alumni.com', specializations: ['Drones', 'Autonomous Systems'], experience_years: 6, hourly_rate: 550 },
    { name: 'Anjali Reddy', email: 'anjali.reddy@alumni.com', specializations: ['Biomedical Electronics', 'Wearables'], experience_years: 6, hourly_rate: 600 },
    { name: 'Sanjay Nair', email: 'sanjay.nair@alumni.com', specializations: ['CNC', 'Fabrication'], experience_years: 9, hourly_rate: 450 },
    { name: 'Divya Sinha', email: 'divya.sinha@alumni.com', specializations: ['Sustainability', 'Green Energy'], experience_years: 5, hourly_rate: 500 }
  ],

  vendors: [
    { name: 'ElectroHub Electronics', shop_type: 'electronics', location: 'Tech Park', commission_percentage: 10 },
    { name: 'MechaniX Hardware', shop_type: 'mechanical', location: 'Industrial Estate', commission_percentage: 12 },
    { name: '3D Print Pro', shop_type: 'fabrication', location: 'Innovation Hub', commission_percentage: 15 },
    { name: 'Software Solutions Ltd', shop_type: 'software', location: 'Tech City', commission_percentage: 8 },
    { name: 'Campus Tools & Kits', shop_type: 'tools', location: 'Near Campus', commission_percentage: 10 },
    { name: 'Arjun\'s Robotics Kits', shop_type: 'tools', location: 'Alumni Network', commission_percentage: 20 },
    { name: 'Priya\'s AI Lab', shop_type: 'software', location: 'Alumni Network', commission_percentage: 15 },
    { name: 'Rajesh\'s Solar Equipment', shop_type: 'electronics', location: 'Alumni Network', commission_percentage: 18 },
    { name: 'Vikram\'s Drone Components', shop_type: 'electronics', location: 'Alumni Network', commission_percentage: 20 },
    { name: 'Sanjay\'s Fabrication', shop_type: 'fabrication', location: 'Alumni Network', commission_percentage: 22 }
  ],

  students: [
    { name: 'Rahul Patel', email: 'rahul@student.com', department_name: 'Computer Science & Engineering' },
    { name: 'Anjali Kumar', email: 'anjali@student.com', department_name: 'Electronics Engineering' },
    { name: 'Vikrant Singh', email: 'vikrant@student.com', department_name: 'Mechanical Engineering' },
    { name: 'Priya Desai', email: 'priya.d@student.com', department_name: 'AI & Machine Learning' },
    { name: 'Arjun Kumar', email: 'arjun.k@student.com', department_name: 'Robotics & Automation' },
    { name: 'Deepika Sharma', email: 'deepika@student.com', department_name: 'Electrical Engineering' },
    { name: 'Nikhil Joshi', email: 'nikhil@student.com', department_name: 'Mechatronics' },
    { name: 'Ravi Verma', email: 'ravi@student.com', department_name: 'Civil Engineering' }
  ]
};

module.exports = seedData;
