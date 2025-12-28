-- Update any plan references from "Top" to "Master" in the database
-- This is informational only - the database stores "top" as the plan identifier
-- The display name "Master" is now shown in the PLAN_NAMES mapping

-- If you have any data where plan is stored as text "Top" instead of "top", run:
-- UPDATE profiles SET plan = 'top' WHERE plan = 'Top';

-- Verify all plans are using lowercase identifiers
SELECT 
  id,
  email,
  full_name,
  plan,
  CASE 
    WHEN plan = 'top' THEN 'Master'
    WHEN plan = 'intermediario' THEN 'Intermediário'
    WHEN plan = 'basico' THEN 'Básico'
    ELSE 'Sem Plano'
  END as plan_display_name
FROM profiles
WHERE role = 'client'
ORDER BY created_at DESC;
