ALTER TYPE "Role" RENAME TO "Role_old";

CREATE TYPE "Role" AS ENUM ('owner', 'manager', 'kitchen', 'support');

ALTER TABLE "User"
  ALTER COLUMN "role" DROP DEFAULT,
  ALTER COLUMN "role" TYPE "Role"
  USING (
    CASE "role"::text
      WHEN 'owner' THEN 'owner'
      WHEN 'admin' THEN 'owner'
      WHEN 'ops_manager' THEN 'manager'
      WHEN 'store_manager' THEN 'manager'
      WHEN 'chef' THEN 'kitchen'
      WHEN 'analyst' THEN 'support'
      ELSE 'support'
    END
  )::"Role",
  ALTER COLUMN "role" SET DEFAULT 'manager';

DROP TYPE "Role_old";
