BEGIN;

INSERT INTO projects (name)
SELECT 'default'
WHERE NOT EXISTS (SELECT 1 FROM projects WHERE name = 'default');

COMMIT;
