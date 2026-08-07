-- Migration: 0001_platform_foundation (DOWN)
-- Description: Rollback platform infrastructure tables

DROP TABLE IF EXISTS languages CASCADE;
DROP TABLE IF EXISTS themes CASCADE;
DROP TABLE IF EXISTS domains CASCADE;
DROP TABLE IF EXISTS destinations CASCADE;
DROP TABLE IF EXISTS regions CASCADE;
DROP TABLE IF EXISTS countries CASCADE;
DROP TABLE IF EXISTS tenants CASCADE;

DELETE FROM _drizzle_migrations WHERE name = '0001_platform_foundation';
