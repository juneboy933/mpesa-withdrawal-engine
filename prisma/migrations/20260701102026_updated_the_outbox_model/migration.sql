-- AlterTable
ALTER TABLE "outbox_events" ADD COLUMN     "attempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "next_retry_at" TIMESTAMP(3);
