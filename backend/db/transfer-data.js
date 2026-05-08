/**
 * Transfer data from a legacy MajorFit MySQL database
 * to the current local MajorFit database.
 *
 * Run: node db/transfer-data.js
 */
const mysql = require('mysql2/promise');

const OLD_DB = { host: '127.0.0.1', port: 3306, user: 'root', database: 'majorfit_legacy' };
const NEW_DB = { host: '127.0.0.1', port: 8889, user: 'root', password: 'root', database: 'majorfit' };

const TABLES = [
  {
    name: 'admins',
    query: `SELECT id, username, email, password, firstName AS first_name, lastName AS last_name,
            role, isActive AS is_active, createdAt AS created_at, updatedAt AS updated_at FROM \`admin\``,
  },
  {
    name: 'users',
    query: `SELECT id, email, password, role, firstName AS first_name, lastName AS last_name,
            avatar_url, createdAt AS created_at, updatedAt AS updated_at FROM users`,
  },
  {
    name: 'profiles',
    query: `SELECT id, email, full_name, avatar_url, bio, phone, location,
            date_of_birth, education_level, school_name, student_code,
            class_code, grade_level, academic_year, current_semester,
            field_of_interest, career_goal, linkedin_url, github_url,
            portfolio_url, COALESCE(created_at, NOW()) AS created_at,
            COALESCE(updated_at, NOW()) AS updated_at FROM profiles`,
  },
  { name: 'universities', query: 'SELECT * FROM universities' },
  { name: 'programs', query: 'SELECT * FROM programs' },
  { name: 'program_curriculums', query: 'SELECT * FROM program_curriculums' },
  {
    name: 'program_profiles',
    query: `SELECT id, program_id, curriculum_id, source_type, prompt_version,
            model_name, riasec_scores_json, skill_vector_json,
            extracted_skills_json, summary_json, ai_summary, reasoning,
            evidence_json, review_notes, confidence_score, review_status,
            is_published, published_at, created_at, updated_at FROM program_profiles`,
  },
  {
    name: 'program_analysis_runs',
    query: `SELECT id, program_id, curriculum_id, generated_profile_id, mode,
            provider, model, prompt_version, response_version,
            system_prompt, prompt_text, ai_response_text,
            parsed_result_json, evidence_json, review_notes, status,
            error_message, created_at, updated_at, reviewed_at FROM program_analysis_runs`,
  },
  { name: 'assessment_campaigns', query: 'SELECT * FROM assessment_campaigns' },
  {
    name: 'riasec_questions',
    query: `SELECT id, code, prompt, dimension, \`order\`, active, version,
            createdAt AS created_at, updatedAt AS updated_at FROM riasec_questions`,
  },
  {
    name: 'riasec_attempts',
    query: `SELECT id, userId AS user_id, campaign_id, question_version,
            holland_code, scores_json, normalized_scores_json,
            skill_vector_json, summary_json, grade_level, academic_year,
            semester, attempt_label, status, started_at, submitted_at,
            completed_at, duration_seconds, created_at FROM riasec_attempts`,
  },
  { name: 'riasec_answers', query: 'SELECT * FROM riasec_answers' },
  {
    name: 'user_riasec_profiles',
    query: 'SELECT * FROM user_riasec_profile',
  },
  { name: 'matching_runs', query: 'SELECT * FROM matching_runs' },
  { name: 'match_results', query: 'SELECT * FROM match_results' },
  { name: 'saved_programs', query: 'SELECT * FROM saved_programs' },
];

async function main() {
  const oldConn = await mysql.createConnection(OLD_DB);
  const newConn = await mysql.createConnection(NEW_DB);
  await newConn.query('SET FOREIGN_KEY_CHECKS = 0');

  for (const { name, query } of TABLES) {
    const [rows] = await oldConn.query(query);
    if (!rows.length) {
      console.log(`  ${name}: 0 rows (skip)`);
      continue;
    }
    const cols = Object.keys(rows[0]);
    const placeholders = cols.map(() => '?').join(',');
    const colList = cols.map((c) => '`' + c + '`').join(',');
    const sql = `INSERT INTO \`${name}\` (${colList}) VALUES (${placeholders})`;

    let inserted = 0;
    for (const row of rows) {
      const values = cols.map((c) => row[c] ?? null);
      await newConn.query(sql, values);
      inserted++;
    }
    console.log(`  ${name}: ${inserted} rows`);
  }

  await newConn.query('SET FOREIGN_KEY_CHECKS = 1');
  await oldConn.end();
  await newConn.end();
  console.log('\nDone! Data transferred to the current MajorFit database.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
