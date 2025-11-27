// I-Vender Phase-4 Seed Data Population Engine
// Handles database population and reset operations

const { query } = require('./db');
const seedData = require('./seed-data');

class SeedEngine {
  constructor() {
    this.stats = {
      vendors: 0,
      projects: 0,
      team_members: 0,
      institutions: 0,
      requests: 0,
      documents: 0,
      total: 0,
    };
  }

  async resetDatabase() {
    console.log('🔄 Resetting database...');
    try {
      // Delete in reverse order of foreign key dependencies
      await query('TRUNCATE TABLE documents CASCADE');
      await query('TRUNCATE TABLE requests CASCADE');
      await query('TRUNCATE TABLE team_members CASCADE');
      await query('TRUNCATE TABLE projects CASCADE');
      await query('TRUNCATE TABLE institutions CASCADE');
      await query('TRUNCATE TABLE vendors CASCADE');
      console.log('✅ Database reset successfully');
      return true;
    } catch (err) {
      console.error('❌ Error resetting database:', err.message);
      throw err;
    }
  }

  async populateVendors() {
    console.log('📝 Populating vendors...');
    try {
      for (const vendor of seedData.vendors) {
        await query(
          `INSERT INTO vendors (id, name, email, status, industry, website, description, 
           contact_person, phone, budget_range_min, budget_range_max, verified, 
           established_year, team_size, metadata) 
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
          [
            vendor.id,
            vendor.name,
            vendor.email,
            vendor.status,
            vendor.industry,
            vendor.website,
            vendor.description,
            vendor.contact_person,
            vendor.phone,
            vendor.budget_range_min,
            vendor.budget_range_max,
            vendor.verified,
            vendor.established_year,
            vendor.team_size,
            JSON.stringify(vendor.metadata),
          ]
        );
      }
      this.stats.vendors = seedData.vendors.length;
      console.log(`✅ Populated ${seedData.vendors.length} vendors`);
    } catch (err) {
      console.error('❌ Error populating vendors:', err.message);
      throw err;
    }
  }

  async populateProjects() {
    console.log('📝 Populating projects...');
    try {
      for (const project of seedData.projects) {
        await query(
          `INSERT INTO projects (id, title, description, vendor_id, budget, timeline_weeks, status, 
           difficulty, required_skills, tags, deliverables, team_requirements, start_date, end_date, metadata) 
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
          [
            project.id,
            project.title,
            project.description,
            project.vendor_id,
            project.budget,
            project.timeline_weeks,
            project.status,
            project.difficulty,
            JSON.stringify(project.required_skills),
            JSON.stringify(project.tags),
            JSON.stringify(project.deliverables),
            project.team_requirements,
            project.start_date,
            project.end_date,
            JSON.stringify(project.metadata),
          ]
        );
      }
      this.stats.projects = seedData.projects.length;
      console.log(`✅ Populated ${seedData.projects.length} projects`);
    } catch (err) {
      console.error('❌ Error populating projects:', err.message);
      throw err;
    }
  }

  async populateTeamMembers() {
    console.log('📝 Populating team members...');
    try {
      for (const member of seedData.team_members) {
        await query(
          `INSERT INTO team_members (id, name, title, company, email, phone, experience_years, 
           hourly_rate, skills, specialization, bio, rating, total_projects, github, linkedin, verified, metadata) 
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)`,
          [
            member.id,
            member.name,
            member.title,
            member.company,
            member.email,
            member.phone,
            member.experience_years,
            member.hourly_rate,
            JSON.stringify(member.skills),
            member.specialization,
            member.bio,
            member.rating,
            member.total_projects,
            member.github,
            member.linkedin,
            member.verified,
            JSON.stringify(member.metadata),
          ]
        );
      }
      this.stats.team_members = seedData.team_members.length;
      console.log(`✅ Populated ${seedData.team_members.length} team members`);
    } catch (err) {
      console.error('❌ Error populating team members:', err.message);
      throw err;
    }
  }

  async populateInstitutions() {
    console.log('📝 Populating institutions...');
    try {
      for (const institution of seedData.institutions) {
        await query(
          `INSERT INTO institutions (id, name, type, location, website, email, phone, established_year, 
           student_count, faculty_count, accreditation, specializations, partnerships, metadata) 
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
          [
            institution.id,
            institution.name,
            institution.type,
            institution.location,
            institution.website,
            institution.email,
            institution.phone,
            institution.established_year,
            institution.student_count,
            institution.faculty_count,
            institution.accreditation,
            JSON.stringify(institution.specializations),
            JSON.stringify(institution.partnerships),
            JSON.stringify(institution.metadata),
          ]
        );
      }
      this.stats.institutions = seedData.institutions.length;
      console.log(`✅ Populated ${seedData.institutions.length} institutions`);
    } catch (err) {
      console.error('❌ Error populating institutions:', err.message);
      throw err;
    }
  }

  async populateRequests() {
    console.log('📝 Populating requests...');
    try {
      for (const request of seedData.requests) {
        await query(
          `INSERT INTO requests (id, institution_id, project_id, vendor_id, requested_by, status, 
           request_type, created_at, updated_at, proposal_details, budget_allocated, 
           timeline_approved, metadata) 
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
          [
            request.id,
            request.institution_id,
            request.project_id,
            request.vendor_id,
            request.requested_by,
            request.status,
            request.request_type,
            request.created_at,
            request.updated_at,
            request.proposal_details,
            request.budget_allocated,
            request.timeline_approved,
            JSON.stringify(request.metadata),
          ]
        );
      }
      this.stats.requests = seedData.requests.length;
      console.log(`✅ Populated ${seedData.requests.length} requests`);
    } catch (err) {
      console.error('❌ Error populating requests:', err.message);
      throw err;
    }
  }

  async populateDocuments() {
    console.log('📝 Populating documents...');
    try {
      for (const document of seedData.documents) {
        await query(
          `INSERT INTO documents (id, vendor_id, document_type, filename, s3_key, status, 
           uploaded_at, verified_at, verified_by, file_size, checksum, metadata) 
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
          [
            document.id,
            document.vendor_id,
            document.document_type,
            document.filename,
            document.s3_key,
            document.status,
            document.uploaded_at,
            document.verified_at,
            document.verified_by,
            document.file_size,
            document.checksum,
            JSON.stringify(document.metadata),
          ]
        );
      }
      this.stats.documents = seedData.documents.length;
      console.log(`✅ Populated ${seedData.documents.length} documents`);
    } catch (err) {
      console.error('❌ Error populating documents:', err.message);
      throw err;
    }
  }

  async populate() {
    console.log('\n╔════════════════════════════════════════╗');
    console.log('║   I-VENDER PHASE-4 SEED DATA ENGINE   ║');
    console.log('╚════════════════════════════════════════╝\n');

    const startTime = Date.now();

    try {
      await this.populateVendors();
      await this.populateProjects();
      await this.populateTeamMembers();
      await this.populateInstitutions();
      await this.populateRequests();
      await this.populateDocuments();

      this.stats.total =
        this.stats.vendors +
        this.stats.projects +
        this.stats.team_members +
        this.stats.institutions +
        this.stats.requests +
        this.stats.documents;

      const duration = ((Date.now() - startTime) / 1000).toFixed(2);

      console.log('\n✅ SEED DATA POPULATION COMPLETE\n');
      console.log('📊 Summary:');
      console.log(`   • Vendors: ${this.stats.vendors}`);
      console.log(`   • Projects: ${this.stats.projects}`);
      console.log(`   • Team Members: ${this.stats.team_members}`);
      console.log(`   • Institutions: ${this.stats.institutions}`);
      console.log(`   • Requests: ${this.stats.requests}`);
      console.log(`   • Documents: ${this.stats.documents}`);
      console.log(`   ─────────────────────────────`);
      console.log(`   • TOTAL RECORDS: ${this.stats.total}`);
      console.log(`   • Time: ${duration}s\n`);

      return this.stats;
    } catch (err) {
      console.error('\n❌ Seed population failed:', err.message);
      throw err;
    }
  }

  async getStatus() {
    try {
      const status = {
        timestamp: new Date().toISOString(),
        tables: {},
      };

      const tables = ['vendors', 'projects', 'team_members', 'institutions', 'requests', 'documents'];

      for (const table of tables) {
        const result = await query(`SELECT COUNT(*) as count FROM ${table}`);
        status.tables[table] = parseInt(result.rows[0].count);
      }

      status.total_records = Object.values(status.tables).reduce((a, b) => a + b, 0);

      return status;
    } catch (err) {
      console.error('Error getting seed status:', err.message);
      throw err;
    }
  }
}

module.exports = SeedEngine;
