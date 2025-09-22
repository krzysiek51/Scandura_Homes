-- AlterTable
ALTER TABLE "public"."Booking" ADD COLUMN     "googleEventId" TEXT;

-- CreateIndex
CREATE INDEX "Booking_startAt_idx" ON "public"."Booking"("startAt");

-- CreateIndex
CREATE INDEX "Booking_status_idx" ON "public"."Booking"("status");
