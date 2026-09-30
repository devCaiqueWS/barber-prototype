-- AlterTable
ALTER TABLE "public"."users" ADD COLUMN     "clientCode" SERIAL NOT NULL,
ADD COLUMN     "cpf" TEXT;

-- AlterTable
ALTER TABLE "public"."Appointment" ADD COLUMN     "amountPaid" DOUBLE PRECISION,
ADD COLUMN     "asaasCheckoutId" TEXT,
ADD COLUMN     "paymentExpiresAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "public"."Subscription" ADD COLUMN     "lastPaymentAt" TIMESTAMP(3),
ADD COLUMN     "provider" TEXT NOT NULL DEFAULT 'asaas';

-- Numera as contas existentes pela ordem de criação (o SERIAL preenche em ordem física)
-- e avança a sequência para as próximas contas continuarem a contagem.
UPDATE "public"."users" AS u
SET "clientCode" = numbered.rn
FROM (SELECT "id", ROW_NUMBER() OVER (ORDER BY "createdAt", "id") AS rn FROM "public"."users") AS numbered
WHERE u."id" = numbered."id";

SELECT setval(
  pg_get_serial_sequence('"public"."users"', 'clientCode'),
  COALESCE((SELECT MAX("clientCode") FROM "public"."users"), 0) + 1,
  false
);

-- Status de assinatura passa a ser sempre minúsculo (o Asaas devolvia 'ACTIVE').
-- Assinaturas do Asaas só contam como ativas depois de um pagamento confirmado:
-- as que estavam 'ACTIVE' sem pagamento registrado voltam para 'pending' até o
-- webhook confirmar. O admin pode ativar manualmente se o cliente já estiver em dia.
UPDATE "public"."Subscription" SET "status" = LOWER("status");
UPDATE "public"."Subscription" SET "status" = 'pending'
WHERE "status" = 'active' AND "asaasSubscriptionId" IS NOT NULL AND "lastPaymentAt" IS NULL;
UPDATE "public"."Subscription" SET "status" = 'cancelled' WHERE "status" IN ('inactive', 'expired', 'deleted');

-- CreateIndex
CREATE UNIQUE INDEX "users_clientCode_key" ON "public"."users"("clientCode");

-- CreateIndex
CREATE INDEX "Appointment_asaasCheckoutId_idx" ON "public"."Appointment"("asaasCheckoutId");

-- CreateIndex
CREATE INDEX "Subscription_asaasSubscriptionId_idx" ON "public"."Subscription"("asaasSubscriptionId");
