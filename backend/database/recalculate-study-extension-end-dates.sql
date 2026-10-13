-- Align previously granted extension periods with the four-calendar-month policy.
UPDATE student_study_extensions
SET ends_on = (starts_on + INTERVAL '4 months')::date
WHERE ends_on <> (starts_on + INTERVAL '4 months')::date;
