-- Migration aditiva. "PasswordResetToken" já existe em produção (migration antiga
-- fora do repositório), por isso tudo usa IF NOT EXISTS.

-- PasswordResetToken
CREATE TABLE IF NOT EXISTS "public"."PasswordResetToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(6) NOT NULL,
    "usedAt" TIMESTAMP(6),
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "PasswordResetToken_tokenHash_key" ON "public"."PasswordResetToken"("tokenHash");
CREATE INDEX IF NOT EXISTS "PasswordResetToken_userId_expiresAt_idx" ON "public"."PasswordResetToken"("userId", "expiresAt");

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PasswordResetToken_userId_fkey') THEN
    ALTER TABLE "public"."PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- SubscriptionInterest
CREATE TABLE IF NOT EXISTS "public"."SubscriptionInterest" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'waiting',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "handledAt" TIMESTAMP(3),
    "handledById" TEXT,

    CONSTRAINT "SubscriptionInterest_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "SubscriptionInterest_status_createdAt_idx" ON "public"."SubscriptionInterest"("status", "createdAt");
CREATE INDEX IF NOT EXISTS "SubscriptionInterest_clientId_idx" ON "public"."SubscriptionInterest"("clientId");

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'SubscriptionInterest_clientId_fkey') THEN
    ALTER TABLE "public"."SubscriptionInterest" ADD CONSTRAINT "SubscriptionInterest_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- Dependent
CREATE TABLE IF NOT EXISTS "public"."Dependent" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "relationship" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Dependent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "Dependent_ownerId_idx" ON "public"."Dependent"("ownerId");

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Dependent_ownerId_fkey') THEN
    ALTER TABLE "public"."Dependent" ADD CONSTRAINT "Dependent_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- Appointment: dependente
ALTER TABLE "public"."Appointment" ADD COLUMN IF NOT EXISTS "dependentId" TEXT;
ALTER TABLE "public"."Appointment" ADD COLUMN IF NOT EXISTS "dependentName" TEXT;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Appointment_dependentId_fkey') THEN
    ALTER TABLE "public"."Appointment" ADD CONSTRAINT "Appointment_dependentId_fkey" FOREIGN KEY ("dependentId") REFERENCES "public"."Dependent"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
