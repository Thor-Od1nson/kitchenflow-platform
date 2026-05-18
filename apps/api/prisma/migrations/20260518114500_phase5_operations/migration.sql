-- Phase 5 operational durability: webhooks, payout reconciliation, and queue activity.
CREATE TABLE "WebhookEvent" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "signatureValid" BOOLEAN NOT NULL,
    "status" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "error" TEXT,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WebhookEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PayoutLedger" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "orderId" TEXT,
    "publicId" TEXT NOT NULL,
    "outletId" TEXT,
    "outletName" TEXT,
    "channel" TEXT NOT NULL,
    "grossAmount" INTEGER NOT NULL,
    "expectedPayout" INTEGER NOT NULL,
    "actualPayout" INTEGER,
    "varianceAmount" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "settlementDueAt" TIMESTAMP(3) NOT NULL,
    "settledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PayoutLedger_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "JobActivity" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT,
    "queue" TEXT NOT NULL,
    "jobName" TEXT NOT NULL,
    "jobId" TEXT,
    "status" TEXT NOT NULL,
    "detail" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JobActivity_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "WebhookEvent_restaurantId_provider_idempotencyKey_key" ON "WebhookEvent"("restaurantId", "provider", "idempotencyKey");
CREATE INDEX "WebhookEvent_restaurantId_provider_createdAt_idx" ON "WebhookEvent"("restaurantId", "provider", "createdAt");
CREATE INDEX "WebhookEvent_restaurantId_status_createdAt_idx" ON "WebhookEvent"("restaurantId", "status", "createdAt");

CREATE UNIQUE INDEX "PayoutLedger_restaurantId_publicId_channel_key" ON "PayoutLedger"("restaurantId", "publicId", "channel");
CREATE INDEX "PayoutLedger_restaurantId_status_settlementDueAt_idx" ON "PayoutLedger"("restaurantId", "status", "settlementDueAt");

CREATE INDEX "JobActivity_restaurantId_createdAt_idx" ON "JobActivity"("restaurantId", "createdAt");
CREATE INDEX "JobActivity_queue_status_createdAt_idx" ON "JobActivity"("queue", "status", "createdAt");

ALTER TABLE "WebhookEvent" ADD CONSTRAINT "WebhookEvent_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PayoutLedger" ADD CONSTRAINT "PayoutLedger_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "JobActivity" ADD CONSTRAINT "JobActivity_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
