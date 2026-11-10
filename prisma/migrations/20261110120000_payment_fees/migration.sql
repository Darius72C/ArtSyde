-- Operator fee paid by the customer on top of the price.
ALTER TABLE "Order" ADD COLUMN "paymentFeeXof" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "CreditPurchase" ADD COLUMN "paymentFeeXof" INTEGER NOT NULL DEFAULT 0;
