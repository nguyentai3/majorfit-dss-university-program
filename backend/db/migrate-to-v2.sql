-- ================================================================
--  MajorFit — Migrate legacy DB (majorfit_legacy) → current DB (majorfit)
-- ================================================================
--
--  Usage (from MAMP phpMyAdmin or mysql CLI):
--    1. Tạo database mới:  CREATE DATABASE majorfit;
--    2. Đổi DATABASE_URL trong .env sang majorfit
--    3. Chạy:  npx prisma db push --schema db/prisma/schema.prisma
--    4. Chạy script này:  mysql -u root < db/migrate-to-v2.sql
--
--  Script này copy dữ liệu từ majorfit_legacy sang majorfit
--  với mapping cột đã đổi tên.
-- ================================================================

SET FOREIGN_KEY_CHECKS = 0;

-- ─── 1. admins (old table: admin) ───────────────────────────
INSERT INTO `majorfit`.`admins`
  (`id`, `username`, `email`, `password`, `first_name`, `last_name`,
   `role`, `is_active`, `created_at`, `updated_at`)
SELECT
   `id`, `username`, `email`, `password`, `firstName`, `lastName`,
   `role`, `isActive`, `createdAt`, `updatedAt`
FROM `majorfit_legacy`.`admin`;

-- ─── 2. users (renamed columns) ─────────────────────────────
INSERT INTO `majorfit`.`users`
  (`id`, `email`, `password`, `role`, `first_name`, `last_name`,
   `avatar_url`, `created_at`, `updated_at`)
SELECT
   `id`, `email`, `password`, `role`, `firstName`, `lastName`,
   `avatar_url`, `createdAt`, `updatedAt`
FROM `majorfit_legacy`.`users`;

-- ─── 3. profiles (dropped: skills, experience, preferences) ─
INSERT INTO `majorfit`.`profiles`
  (`id`, `email`, `full_name`, `avatar_url`, `bio`, `phone`, `location`,
   `date_of_birth`, `education_level`, `school_name`, `student_code`,
   `class_code`, `grade_level`, `academic_year`, `current_semester`,
   `field_of_interest`, `career_goal`, `linkedin_url`, `github_url`,
   `portfolio_url`, `created_at`, `updated_at`)
SELECT
   `id`, `email`, `full_name`, `avatar_url`, `bio`, `phone`, `location`,
   `date_of_birth`, `education_level`, `school_name`, `student_code`,
   `class_code`, `grade_level`, `academic_year`, `current_semester`,
   `field_of_interest`, `career_goal`, `linkedin_url`, `github_url`,
   `portfolio_url`,
   COALESCE(`created_at`, NOW()), COALESCE(`updated_at`, NOW())
FROM `majorfit_legacy`.`profiles`;

-- ─── 4. universities ────────────────────────────────────────
INSERT INTO `majorfit`.`universities`
  (`id`, `code`, `name`, `short_name`, `city`, `state`, `country`,
   `website`, `overview`, `featured`, `created_at`, `updated_at`)
SELECT
   `id`, `code`, `name`, `short_name`, `city`, `state`, `country`,
   `website`, `overview`, `featured`, `created_at`, `updated_at`
FROM `majorfit_legacy`.`universities`;

-- ─── 5. programs ────────────────────────────────────────────
INSERT INTO `majorfit`.`programs`
  (`id`, `university_id`, `code`, `slug`, `name`, `degree_level`,
   `department`, `focus_area`, `summary`, `source_url`, `duration_years`,
   `status`, `featured`, `created_at`, `updated_at`)
SELECT
   `id`, `university_id`, `code`, `slug`, `name`, `degree_level`,
   `department`, `focus_area`, `summary`, `source_url`, `duration_years`,
   `status`, `featured`, `created_at`, `updated_at`
FROM `majorfit_legacy`.`programs`;

-- ─── 6. program_curriculums ─────────────────────────────────
INSERT INTO `majorfit`.`program_curriculums`
  (`id`, `program_id`, `version`, `source_type`, `source_url`,
   `file_name`, `title`, `curriculum_text`, `extracted_text`,
   `objectives_json`, `course_list_json`, `notes`, `status`,
   `created_at`, `updated_at`)
SELECT
   `id`, `program_id`, `version`, `source_type`, `source_url`,
   `file_name`, `title`, `curriculum_text`, `extracted_text`,
   `objectives_json`, `course_list_json`, `notes`, `status`,
   `created_at`, `updated_at`
FROM `majorfit_legacy`.`program_curriculums`;

-- ─── 7. program_profiles (column order differs) ─────────────
INSERT INTO `majorfit`.`program_profiles`
  (`id`, `program_id`, `curriculum_id`, `source_type`, `prompt_version`,
   `model_name`, `riasec_scores_json`, `skill_vector_json`,
   `extracted_skills_json`, `summary_json`, `ai_summary`, `reasoning`,
   `evidence_json`, `review_notes`, `confidence_score`, `review_status`,
   `is_published`, `published_at`, `created_at`, `updated_at`)
SELECT
   `id`, `program_id`, `curriculum_id`, `source_type`, `prompt_version`,
   `model_name`, `riasec_scores_json`, `skill_vector_json`,
   `extracted_skills_json`, `summary_json`, `ai_summary`, `reasoning`,
   `evidence_json`, `review_notes`, `confidence_score`, `review_status`,
   `is_published`, `published_at`, `created_at`, `updated_at`
FROM `majorfit_legacy`.`program_profiles`;

-- ─── 8. program_analysis_runs ───────────────────────────────
INSERT INTO `majorfit`.`program_analysis_runs`
  (`id`, `program_id`, `curriculum_id`, `generated_profile_id`, `mode`,
   `provider`, `model`, `prompt_version`, `response_version`,
   `system_prompt`, `prompt_text`, `ai_response_text`,
   `parsed_result_json`, `evidence_json`, `review_notes`, `status`,
   `error_message`, `created_at`, `updated_at`, `reviewed_at`)
SELECT
   `id`, `program_id`, `curriculum_id`, `generated_profile_id`, `mode`,
   `provider`, `model`, `prompt_version`, `response_version`,
   `system_prompt`, `prompt_text`, `ai_response_text`,
   `parsed_result_json`, `evidence_json`, `review_notes`, `status`,
   `error_message`, `created_at`, `updated_at`, `reviewed_at`
FROM `majorfit_legacy`.`program_analysis_runs`;

-- ─── 9. assessment_campaigns ────────────────────────────────
INSERT INTO `majorfit`.`assessment_campaigns`
  (`id`, `name`, `description`, `grade_level`, `academic_year`,
   `semester`, `class_code`, `school_name`, `attempt_label_default`,
   `starts_at`, `ends_at`, `status`, `created_at`, `updated_at`)
SELECT
   `id`, `name`, `description`, `grade_level`, `academic_year`,
   `semester`, `class_code`, `school_name`, `attempt_label_default`,
   `starts_at`, `ends_at`, `status`, `created_at`, `updated_at`
FROM `majorfit_legacy`.`assessment_campaigns`;

-- ─── 10. riasec_questions (renamed columns) ─────────────────
INSERT INTO `majorfit`.`riasec_questions`
  (`id`, `code`, `prompt`, `dimension`, `order`, `active`, `version`,
   `created_at`, `updated_at`)
SELECT
   `id`, `code`, `prompt`, `dimension`, `order`, `active`, `version`,
   `createdAt`, `updatedAt`
FROM `majorfit_legacy`.`riasec_questions`;

-- ─── 11. riasec_attempts (renamed: userId → user_id) ────────
INSERT INTO `majorfit`.`riasec_attempts`
  (`id`, `user_id`, `campaign_id`, `question_version`,
   `holland_code`, `scores_json`, `normalized_scores_json`,
   `skill_vector_json`, `summary_json`, `grade_level`, `academic_year`,
   `semester`, `attempt_label`, `status`, `started_at`, `submitted_at`,
   `completed_at`, `duration_seconds`, `created_at`)
SELECT
   `id`, `userId`, `campaign_id`, `question_version`,
   `holland_code`, `scores_json`, `normalized_scores_json`,
   `skill_vector_json`, `summary_json`, `grade_level`, `academic_year`,
   `semester`, `attempt_label`, `status`, `started_at`, `submitted_at`,
   `completed_at`, `duration_seconds`, `created_at`
FROM `majorfit_legacy`.`riasec_attempts`;

-- ─── 12. riasec_answers ─────────────────────────────────────
INSERT INTO `majorfit`.`riasec_answers`
  (`id`, `attempt_id`, `question_id`, `question_code`,
   `question_prompt`, `dimension`, `answer_value`, `score`, `created_at`)
SELECT
   `id`, `attempt_id`, `question_id`, `question_code`,
   `question_prompt`, `dimension`, `answer_value`, `score`, `created_at`
FROM `majorfit_legacy`.`riasec_answers`;

-- ─── 13. user_riasec_profiles (old table: user_riasec_profile)
INSERT INTO `majorfit`.`user_riasec_profiles`
  (`user_id`, `latest_attempt_id`, `latest_holland_code`,
   `latest_scores_json`, `normalized_scores_json`,
   `latest_skill_vector_json`, `stable_scores_json`,
   `stable_skill_vector_json`, `trend_json`, `growth_json`,
   `confidence_score`, `first_assessed_at`, `last_assessed_at`,
   `created_at`, `updated_at`)
SELECT
   `user_id`, `latest_attempt_id`, `latest_holland_code`,
   `latest_scores_json`, `normalized_scores_json`,
   `latest_skill_vector_json`, `stable_scores_json`,
   `stable_skill_vector_json`, `trend_json`, `growth_json`,
   `confidence_score`, `first_assessed_at`, `last_assessed_at`,
   `created_at`, `updated_at`
FROM `majorfit_legacy`.`user_riasec_profile`;

-- ─── 14. matching_runs ──────────────────────────────────────
INSERT INTO `majorfit`.`matching_runs`
  (`id`, `user_id`, `latest_attempt_id`, `scope`, `focus_area`,
   `algorithm_version`, `weights_json`, `profile_snapshot_json`,
   `stable_scores_json`, `stable_skill_vector_json`, `growth_json`,
   `comparison_json`, `ai_comparison_json`, `confidence_score`,
   `total_programs`, `created_at`, `updated_at`)
SELECT
   `id`, `user_id`, `latest_attempt_id`, `scope`, `focus_area`,
   `algorithm_version`, `weights_json`, `profile_snapshot_json`,
   `stable_scores_json`, `stable_skill_vector_json`, `growth_json`,
   `comparison_json`, `ai_comparison_json`, `confidence_score`,
   `total_programs`, `created_at`, `updated_at`
FROM `majorfit_legacy`.`matching_runs`;

-- ─── 15. match_results ──────────────────────────────────────
INSERT INTO `majorfit`.`match_results`
  (`id`, `matching_run_id`, `program_id`, `program_profile_id`,
   `rank`, `final_score`, `riasec_score`, `skill_score`, `growth_score`,
   `confidence_score`, `fit_level`, `strengths_json`, `gaps_json`,
   `diagnostics_json`, `explanation_json`, `ai_explanation`,
   `created_at`, `updated_at`)
SELECT
   `id`, `matching_run_id`, `program_id`, `program_profile_id`,
   `rank`, `final_score`, `riasec_score`, `skill_score`, `growth_score`,
   `confidence_score`, `fit_level`, `strengths_json`, `gaps_json`,
   `diagnostics_json`, `explanation_json`, `ai_explanation`,
   `created_at`, `updated_at`
FROM `majorfit_legacy`.`match_results`;

-- ─── 16. saved_programs ─────────────────────────────────────
INSERT INTO `majorfit`.`saved_programs`
  (`id`, `user_id`, `program_id`, `notes`, `created_at`, `updated_at`)
SELECT
   `id`, `user_id`, `program_id`, `notes`, `created_at`, `updated_at`
FROM `majorfit_legacy`.`saved_programs`;

SET FOREIGN_KEY_CHECKS = 1;

-- ================================================================
--  Done! Verify:
--    SELECT COUNT(*) FROM majorfit.users;
--    SELECT COUNT(*) FROM majorfit.riasec_attempts;
--    SELECT COUNT(*) FROM majorfit.programs;
-- ================================================================
