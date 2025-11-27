// Seed Population Engine for I-Vendor Platform
const seedData = require('./seed-data');

class SeedEngine {
  constructor(pool) {
    this.pool = pool;
  }

  async populate() {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      
      // Get department IDs
      const deptResult = await client.query('SELECT id, name FROM departments');
      const deptMap = {};
      deptResult.rows.forEach(d => deptMap[d.name] = d.id);

      // Get idea source IDs
      const sourceResult = await client.query('SELECT id, name FROM idea_sources');
      const sourceMap = {};
      sourceResult.rows.forEach(s => sourceMap[s.name] = s.id);

      // Seed ideas
      for (const idea of seedData.ideas) {
        await client.query(
          `INSERT INTO ideas (title, problem_statement, concept_overview, department_id, source_id, 
           difficulty, estimated_time_weeks, estimated_cost, budget_min, budget_max, 
           time_min_weeks, time_max_weeks, category, status)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
          [
            idea.title,
            idea.problem_statement,
            idea.problem_statement,
            deptMap[idea.department_name],
            sourceMap[idea.source_name] || sourceMap['AI Generated'],
            idea.difficulty,
            idea.estimated_time_weeks,
            idea.estimated_cost,
            idea.budget_min,
            idea.budget_max,
            idea.estimated_time_weeks - 2,
            idea.estimated_time_weeks + 2,
            idea.category,
            'active'
          ]
        );
      }

      // Seed mentors
      for (const mentor of seedData.mentors) {
        // Create a user record for the mentor (password is a seeded placeholder)
        const userRes = await client.query(
          `INSERT INTO users (name, email, password_hash, department_id, role, status)
           VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
          [
            mentor.name,
            mentor.email,
            'seeded_password',
            deptMap[mentor.department_name] || null,
            'mentor',
            'active'
          ]
        );
        const userId = userRes.rows[0].id;

        await client.query(
          `INSERT INTO mentors (user_id, specializations, experience_years, bio, hourly_rate, verification_status)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            userId,
            JSON.stringify(mentor.specializations),
            mentor.experience_years,
            mentor.bio || null,
            mentor.hourly_rate,
            'verified'
          ]
        );
      }

      // Seed material vendors
      const vendorIds = {};
      for (const vendor of seedData.vendors) {
        const result = await client.query(
          `INSERT INTO material_vendors (name, shop_type, location, commission_percentage, verified)
           VALUES ($1, $2, $3, $4, $5) RETURNING id`,
          [
            vendor.name,
            vendor.shop_type,
            vendor.location,
            vendor.commission_percentage,
            true
          ]
        );
        vendorIds[vendor.name] = result.rows[0].id;
      }

      // Seed materials
      const materials = [
        { name: 'Arduino Uno', category: 'Microcontroller', price: 400, qty: 50, vendor: 'ElectroHub Electronics' },
        { name: 'Raspberry Pi 4', category: 'SBC', price: 4500, qty: 30, vendor: 'ElectroHub Electronics' },
        { name: 'DHT22 Sensor', category: 'Sensor', price: 250, qty: 200, vendor: 'ElectroHub Electronics' },
        { name: 'DC Motor 12V', category: 'Motor', price: 350, qty: 100, vendor: 'MechaniX Hardware' },
        { name: 'Servo Motor', category: 'Actuator', price: 600, qty: 75, vendor: 'MechaniX Hardware' },
        { name: 'Stepper Motor NEMA 23', category: 'Motor', price: 2500, qty: 40, vendor: 'MechaniX Hardware' },
        { name: 'CNC Router Bit', category: 'Tooling', price: 1500, qty: 50, vendor: '3D Print Pro' },
        { name: '3D Filament PLA', category: 'Consumables', price: 800, qty: 200, vendor: '3D Print Pro' },
        { name: 'Solar Panel 100W', category: 'Energy', price: 8000, qty: 15, vendor: 'Rajesh\'s Solar Equipment' },
        { name: 'Li-Po Battery Pack', category: 'Battery', price: 1200, qty: 100, vendor: 'ElectroHub Electronics' },
        { name: 'Webcam HD', category: 'Sensor', price: 2000, qty: 40, vendor: 'ElectroHub Electronics' },
        { name: 'Drone Frame Kit', category: 'Drones', price: 8500, qty: 20, vendor: 'Vikram\'s Drone Components' },
        { name: 'Flight Controller', category: 'Electronics', price: 3500, qty: 30, vendor: 'Vikram\'s Drone Components' }
      ];

      for (const material of materials) {
        await client.query(
          `INSERT INTO materials (name, category, unit_price, stock_quantity, vendor_id, status)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            material.name,
            material.category,
            material.price,
            material.qty,
            vendorIds[material.vendor],
            'active'
          ]
        );
      }

      // Seed service bundles
      const bundles = [
        { name: 'Robotics Kit', description: 'Complete beginner', price: 15000, type: 'kit' },
        { name: 'IoT Sensor Kit', description: 'IoT prototyping', price: 5000, type: 'kit' },
        { name: 'CNC Service', description: 'Professional cutting', price: 8000, type: 'fabrication' },
        { name: '3D Printing', description: 'Professional printing', price: 5000, type: 'printing_3d' },
        { name: 'Lab Access', description: '1 month rental', price: 10000, type: 'lab_access' }
      ];

      // Choose a default vendor for bundles (fallback to first vendor)
      const defaultVendorId = vendorIds['Campus Tools & Kits'] || Object.values(vendorIds)[0];

      for (const bundle of bundles) {
        await client.query(
          `INSERT INTO service_bundles (vendor_id, name, description, price, service_type, status)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            defaultVendorId,
            bundle.name,
            bundle.description,
            bundle.price,
            bundle.type,
            'active'
          ]
        );
      }

      // Seed RBVM machines
      for (let i = 1; i <= 5; i++) {
        const code = `RBVM-00${i}`;
        await client.query(
          `INSERT INTO rbvm_machines (location, model, status, metadata)
           VALUES ($1, $2, $3, $4)`,
          [
            ['Main Entrance', 'Cafeteria', 'Library', 'Sports', 'Tech Center'][i-1],
            'RBVM-Model-A',
            'active',
            JSON.stringify({ machine_code: code, points_per_bottle: 5 })
          ]
        );
      }

      // Seed rewards
      const rewards = [
        { name: 'T-Shirt', description: 'Branded shirt', points: 100, qty: 50 },
        { name: 'Water Bottle', description: 'Eco bottle', points: 150, qty: 100 },
        { name: 'Headphones', description: 'Wireless', points: 500, qty: 20 },
        { name: 'Gift Card ₹1000', description: 'Amazon card', points: 600, qty: 30 },
        { name: 'Free Mentor Session', description: '1-hour session', points: 250, qty: 100 }
      ];

      // Add canteen voucher and cash/fee refund options so students can convert points
      rewards.push({ name: 'Canteen Voucher ₹50', description: 'Redeemable at college canteen', points: 200, qty: 500 });
      rewards.push({ name: 'Fee Refund (Partial)', description: 'Apply as partial fee refund', points: 2000, qty: 50 });

      for (const reward of rewards) {
        // Map reward types to schema's allowed values
        const type = reward.name.includes('Gift Card') ? 'coupon' : (reward.name.includes('Mentor') ? 'lab_access' : 'merchandise');
        await client.query(
          `INSERT INTO rewards_catalog (title, description, reward_type, points_required, max_redemptions, status)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            reward.name,
            reward.description,
            type,
            reward.points,
            reward.qty,
            'active'
          ]
        );
      }

      // Seed users
      for (const student of seedData.students) {
        const deptId = deptMap[student.department_name];
        const userRes = await client.query(
          `INSERT INTO users (name, email, password_hash, department_id, role, status)
           VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
          [
            student.name,
            student.email,
            'seeded_password',
            deptId,
            'student',
            'active'
          ]
        );

        await client.query(
          `INSERT INTO rewards_wallet (student_id, total_points, available_points, current_tier)
           VALUES ($1, $2, $3, $4)`,
          [
            userRes.rows[0].id,
            Math.floor(Math.random() * 1000) + 200,
            Math.floor(Math.random() * 800) + 100,
            'bronze'
          ]
        );
      }

      await client.query('COMMIT');
      console.log('✓ Database seeded successfully');
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('✗ Seed error:', err.message);
      throw err;
    } finally {
      client.release();
    }
  }
}

module.exports = SeedEngine;
