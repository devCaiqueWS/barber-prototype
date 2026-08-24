-- AlterTable
ALTER TABLE "public"."Appointment" ADD COLUMN     "asaasPaymentLinkId" TEXT,
ADD COLUMN     "asaasPaymentId" TEXT,
ADD COLUMN     "paidAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Appointment_asaasPaymentLinkId_idx" ON "public"."Appointment"("asaasPaymentLinkId");
