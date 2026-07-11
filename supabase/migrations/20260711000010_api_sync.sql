-- Add API Sync settings to shops
alter table shops 
add column if not exists api_sync_url text,
add column if not exists api_sync_format text check (api_sync_format in ('shopify', 'custom')),
add column if not exists api_sync_last_run timestamptz;
