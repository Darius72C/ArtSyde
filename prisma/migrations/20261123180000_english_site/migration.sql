-- The product description in English (the /en site).
ALTER TABLE "Product" ADD COLUMN "descriptionEn" TEXT NOT NULL DEFAULT '';

-- The site's language when an order or a credit purchase was made (e-mails and the payment return page use it).
ALTER TABLE "Order" ADD COLUMN "locale" TEXT NOT NULL DEFAULT 'fr';
ALTER TABLE "CreditPurchase" ADD COLUMN "locale" TEXT NOT NULL DEFAULT 'fr';
