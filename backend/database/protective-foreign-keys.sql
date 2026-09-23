-- Align every application foreign key with the no-hard-delete policy.
-- This migration adds nullable bilingual-name columns when missing and changes constraints.
-- It does not update or delete existing application data.
ALTER TABLE advisors ADD COLUMN IF NOT EXISTS full_name_thai VARCHAR;
ALTER TABLE students ADD COLUMN IF NOT EXISTS full_name_thai VARCHAR;

DO $$
DECLARE
  fk RECORD;
BEGIN
  FOR fk IN
    SELECT * FROM (VALUES
      ('advisors', 'advisors_user_id_fkey', 'user_id', 'users', 'user_id'),
      ('students', 'students_user_id_fkey', 'user_id', 'users', 'user_id'),
      ('students', 'students_advisor_id_fkey', 'advisor_id', 'advisors', 'advisor_id'),
      ('student_study_extensions', 'student_study_extensions_student_id_fkey', 'student_id', 'students', 'student_id'),
      ('student_study_extensions', 'student_study_extensions_granted_by_fkey', 'granted_by', 'users', 'user_id'),
      ('student_study_extensions', 'student_study_extensions_cancelled_by_fkey', 'cancelled_by', 'users', 'user_id'),
      ('student_co_advisors', 'student_co_advisors_student_id_fkey', 'student_id', 'students', 'student_id'),
      ('student_co_advisors', 'student_co_advisors_advisor_id_fkey', 'advisor_id', 'advisors', 'advisor_id'),
      ('student_milestones', 'student_milestones_student_id_fkey', 'student_id', 'students', 'student_id'),
      ('student_milestones', 'student_milestones_milestone_id_fkey', 'milestone_id', 'milestone_templates', 'milestone_id'),
      ('student_milestones', 'student_milestones_reviewed_by_fkey', 'reviewed_by', 'advisors', 'advisor_id'),
      ('notifications', 'notifications_created_by_fkey', 'created_by', 'users', 'user_id'),
      ('notifications', 'notifications_milestone_id_fkey', 'milestone_id', 'milestone_templates', 'milestone_id'),
      ('notification_reads', 'notification_reads_notification_id_fkey', 'notification_id', 'notifications', 'notification_id'),
      ('notification_reads', 'notification_reads_user_id_fkey', 'user_id', 'users', 'user_id'),
      ('import_logs', 'import_logs_imported_by_fkey', 'imported_by', 'users', 'user_id')
    ) AS constraints(table_name, constraint_name, column_name, parent_table, parent_column)
  LOOP
    IF to_regclass('public.' || fk.table_name) IS NOT NULL THEN
      EXECUTE format(
        'ALTER TABLE %I DROP CONSTRAINT IF EXISTS %I',
        fk.table_name,
        fk.constraint_name
      );
      EXECUTE format(
        'ALTER TABLE %I ADD CONSTRAINT %I FOREIGN KEY (%I) REFERENCES %I (%I) ON DELETE RESTRICT',
        fk.table_name,
        fk.constraint_name,
        fk.column_name,
        fk.parent_table,
        fk.parent_column
      );
    END IF;
  END LOOP;
END $$;
