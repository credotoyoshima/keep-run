-- Remove templateId from ActiveDay first (foreign key constraint)
ALTER TABLE "ActiveDay" DROP COLUMN IF EXISTS "templateId";

-- Drop template-related tables
DROP TABLE IF EXISTS "TemplateTask" CASCADE;
DROP TABLE IF EXISTS "TemplateTimeBlock" CASCADE;
DROP TABLE IF EXISTS "DayTemplate" CASCADE;

-- Drop notification-related tables
DROP TABLE IF EXISTS "PushSubscription" CASCADE;
DROP TABLE IF EXISTS "NotificationSettings" CASCADE;