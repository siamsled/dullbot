ALTER TABLE "public"."products"
ADD COLUMN "min_acceptable_price" numeric NULL,
ADD COLUMN "allow_ai_negotiation" boolean NOT NULL DEFAULT false;
