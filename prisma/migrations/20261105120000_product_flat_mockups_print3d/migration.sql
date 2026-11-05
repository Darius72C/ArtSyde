-- Onglets Mockup et 3D des produits.
ALTER TABLE "Product" ADD COLUMN "flatMockups" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "print3d" JSONB;
