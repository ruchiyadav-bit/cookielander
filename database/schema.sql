-- =============================================================
-- LandingPageSaaS — Database Schema
--
-- HISTORICAL / REFERENCE ONLY — NOT USED AT RUNTIME.
-- The live app persists to MongoDB via the Mongoose models under
-- backend/models/ (User, Page, Template, Email, Setting, PolicyTemplate).
-- This legacy MySQL schema is kept only as a rough reference of the same
-- entities in relational form (README.md §3 / §13) and is never read or
-- executed by the running application.
--
-- Safe to re-run: drops existing tables before recreating
-- Run: mysql -u root -p < database/schema.sql
-- =============================================================

CREATE DATABASE IF NOT EXISTS landingpagesaas
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE landingpagesaas;

-- Drop in reverse FK order to avoid constraint errors
DROP TABLE IF EXISTS emails;
DROP TABLE IF EXISTS pages;
DROP TABLE IF EXISTS policy_templates;
DROP TABLE IF EXISTS templates;
DROP TABLE IF EXISTS settings;
DROP TABLE IF EXISTS users;

-- -------------------------------------------------------------
-- users
-- -------------------------------------------------------------
CREATE TABLE users (
  id               INT UNSIGNED     AUTO_INCREMENT PRIMARY KEY,
  name             VARCHAR(120)     NOT NULL,
  email            VARCHAR(191)     NOT NULL UNIQUE,
  password         VARCHAR(255)     NOT NULL,
  role             ENUM('user','admin') NOT NULL DEFAULT 'user',
  -- Per-user feature flags: cookie_banner, age_gate, email_newsletter,
  -- ai_generation, custom_templates, email_export, analytics,
  -- landing_pages, popup_module, policy_template_edit (off by default).
  features_enabled JSON             DEFAULT NULL,
  sheet_webhook    VARCHAR(500)     DEFAULT NULL,
  created_at       TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- -------------------------------------------------------------
-- pages
-- -------------------------------------------------------------
CREATE TABLE pages (
  id                 INT UNSIGNED  AUTO_INCREMENT PRIMARY KEY,
  user_id            INT UNSIGNED  NOT NULL,
  type               ENUM('landing','cookie','age-verification','newsletter','popup',
                           'privacy','terms','contact','disclaimer','other')
                     NOT NULL DEFAULT 'landing',
  domain             VARCHAR(255)  DEFAULT NULL,
  html_content       LONGTEXT      DEFAULT NULL,
  sheet_webhook      VARCHAR(500)  DEFAULT NULL,
  -- landing pages only: 'scroll' (fixed/parallax hero background) or
  -- 'single-section' (default, no scroll effect).
  image_display_mode ENUM('scroll','single-section') NOT NULL DEFAULT 'single-section',
  -- Set on the landing page and copied onto its 4 generated policy pages.
  niche              ENUM('cbd','nutra') DEFAULT NULL,
  created_at         TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at         TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_pages_type (type),
  INDEX idx_pages_domain (domain),
  UNIQUE KEY uq_pages_user_type_domain (user_id, type, domain),

  CONSTRAINT fk_pages_user
    FOREIGN KEY (user_id) REFERENCES users (id)
    ON DELETE CASCADE ON UPDATE CASCADE
);

-- -------------------------------------------------------------
-- emails
-- -------------------------------------------------------------
CREATE TABLE emails (
  id         INT UNSIGNED  AUTO_INCREMENT PRIMARY KEY,
  page_id    INT UNSIGNED  NOT NULL,
  email      VARCHAR(191)  NOT NULL,
  created_at TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,

  UNIQUE KEY uq_emails_page_email (page_id, email),

  CONSTRAINT fk_emails_page
    FOREIGN KEY (page_id) REFERENCES pages (id)
    ON DELETE CASCADE ON UPDATE CASCADE
);

-- -------------------------------------------------------------
-- templates
-- -------------------------------------------------------------
CREATE TABLE templates (
  id           INT UNSIGNED  AUTO_INCREMENT PRIMARY KEY,
  user_id      INT UNSIGNED  DEFAULT NULL,
  name         VARCHAR(191)  NOT NULL,
  type         ENUM('landing','cookie','age-verification','email','popup','other') NOT NULL DEFAULT 'other',
  html_content LONGTEXT      DEFAULT NULL,
  created_at   TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_templates_type (type),

  CONSTRAINT fk_templates_user
    FOREIGN KEY (user_id) REFERENCES users (id)
    ON DELETE SET NULL ON UPDATE CASCADE
);

-- -------------------------------------------------------------
-- settings — generic key/value store (e.g. global_sheet_webhook)
-- -------------------------------------------------------------
CREATE TABLE settings (
  id          INT UNSIGNED  AUTO_INCREMENT PRIMARY KEY,
  setting_key VARCHAR(191)  NOT NULL UNIQUE,
  value       VARCHAR(1000) DEFAULT NULL,
  created_at  TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- -------------------------------------------------------------
-- policy_templates — admin-managed default Privacy/Terms/Contact/
-- Disclaimer content per niche (CBD / Nutra). One row per (type, niche).
-- {{domain}} / {{brand}} placeholders in body_content are substituted only
-- at generation time (policy.controller.js), never pre-filled here.
-- -------------------------------------------------------------
CREATE TABLE policy_templates (
  id              INT UNSIGNED  AUTO_INCREMENT PRIMARY KEY,
  type            ENUM('privacy','terms','contact','disclaimer') NOT NULL,
  niche           ENUM('cbd','nutra') NOT NULL,
  header_content  TEXT          DEFAULT NULL,
  body_content    LONGTEXT      DEFAULT NULL,
  footer_content  TEXT          DEFAULT NULL,
  updated_by      INT UNSIGNED  DEFAULT NULL,
  created_at      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  UNIQUE KEY uq_policy_templates_type_niche (type, niche),

  CONSTRAINT fk_policy_templates_updated_by
    FOREIGN KEY (updated_by) REFERENCES users (id)
    ON DELETE SET NULL ON UPDATE CASCADE
);

-- -------------------------------------------------------------
-- Seed: default templates
-- -------------------------------------------------------------
INSERT INTO templates (name, type) VALUES
  ('Cookie Consent Banner',  'cookie'),
  ('Age Verification Gate',  'age-verification'),
  ('SaaS Hero Landing Page', 'landing'),
  ('Welcome Email',          'email'),
  ('Password Reset Email',   'email'),
  ('General Popup Widget',   'popup');
