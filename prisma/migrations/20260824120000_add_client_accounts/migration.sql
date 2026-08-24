-- AlterTable
ALTER TABLE "public"."users" ADD COLUMN     "isRegistered" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "registeredAt" TIMESTAMP(3);

-- Contas internas (admin/barbeiro) continuam válidas.
-- Clientes antigos (auto-criados no agendamento) ficam como não registrados:
-- precisarão criar conta com o mesmo e-mail para reativar o acesso (o histórico é preservado).
UPDATE "public"."users" SET "isRegistered" = true, "registeredAt" = NOW() WHERE "role" IN ('ADMIN', 'BARBER');
