-- Stage 2: Drop legacy images column from products table after cutover verification
alter table products drop column if exists images;
