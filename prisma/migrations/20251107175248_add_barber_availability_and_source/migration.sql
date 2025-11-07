-- AlterTable
ALTER TABLE "public"."Appointment" ADD COLUMN     "clientWhatsapp" TEXT,
ADD COLUMN     "payOnline" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "source" TEXT NOT NULL DEFAULT 'online';

-- AlterTable
ALTER TABLE "public"."users" ADD COLUMN     "whatsapp" TEXT;

-- CreateTable
CREATE TABLE "public"."barber_availability" (
    "id" TEXT NOT NULL,
    "barberId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "isDayBlocked" BOOLEAN NOT NULL DEFAULT false,
    "availableSlots" TEXT[],
    "blockedSlots" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "barber_availability_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "barber_availability_barberId_date_key" ON "public"."barber_availability"("barberId", "date");

-- AddForeignKey
ALTER TABLE "public"."barber_availability" ADD CONSTRAINT "barber_availability_barberId_fkey" FOREIGN KEY ("barberId") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
