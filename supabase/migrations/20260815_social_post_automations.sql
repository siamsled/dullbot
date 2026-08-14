-- Migration: Create post_automations and post_comments tables for Social Media Automation
-- Run this in your Supabase SQL Editor: https://supabase.com/dashboard/project/_/sql

CREATE TABLE IF NOT EXISTS post_automations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    post_id TEXT NOT NULL,
    post_platform TEXT NOT NULL DEFAULT 'facebook',
    post_preview_text TEXT DEFAULT '',
    post_thumbnail_url TEXT,
    reply_as_comment BOOLEAN NOT NULL DEFAULT true,
    send_as_messenger BOOLEAN NOT NULL DEFAULT true,
    delete_negative BOOLEAN NOT NULL DEFAULT false,
    instructions TEXT DEFAULT '',
    delete_examples JSONB DEFAULT '[]'::jsonb,
    product_ids JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (shop_id, post_id)
);

CREATE INDEX IF NOT EXISTS idx_post_automations_shop_post ON post_automations(shop_id, post_id);

CREATE TABLE IF NOT EXISTS post_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    post_id TEXT NOT NULL,
    comment_id TEXT UNIQUE NOT NULL,
    sender_id TEXT,
    sender_name TEXT,
    comment_text TEXT,
    reply_text TEXT,
    is_negative BOOLEAN DEFAULT false,
    is_deleted BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_post_comments_shop_post ON post_comments(shop_id, post_id);
CREATE INDEX IF NOT EXISTS idx_post_comments_comment_id ON post_comments(comment_id);
