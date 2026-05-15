CREATE TABLE "InventoryActivity" (
    "id" TEXT NOT NULL,
    "outletId" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "delta" DECIMAL(12,2) NOT NULL,
    "reason" TEXT NOT NULL,
    "quantityAfter" DECIMAL(12,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InventoryActivity_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "InventoryActivity_outletId_createdAt_idx" ON "InventoryActivity"("outletId", "createdAt");

ALTER TABLE "InventoryActivity" ADD CONSTRAINT "InventoryActivity_outletId_fkey" FOREIGN KEY ("outletId") REFERENCES "Outlet"("id") ON DELETE CASCADE ON UPDATE CASCADE;
