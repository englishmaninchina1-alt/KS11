-- Wordy World database schema for cPanel (MySQL 5.7+ / MariaDB 10.3+).
--
-- Import this once, into the database you create in cPanel > MySQL Databases.
-- phpMyAdmin: select the database, then the Import tab, then choose this file.
--
-- The Cloudflare version stored the same two tables in D1. Nothing else in the
-- app is stateful: word lists, games and progress live in the browser.

CREATE TABLE IF NOT EXISTS students (
  id          CHAR(36)     NOT NULL,
  name_key    VARCHAR(32)  NOT NULL,
  name        VARCHAR(32)  NOT NULL,
  hash        VARCHAR(255) NOT NULL,
  created_at  BIGINT       NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY students_name_key (name_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS sessions (
  token_hash  CHAR(64)  NOT NULL,
  student_id  CHAR(36)  NOT NULL,
  created_at  BIGINT    NOT NULL,
  expires_at  BIGINT    NOT NULL,
  PRIMARY KEY (token_hash),
  KEY sessions_student (student_id),
  KEY sessions_expiry (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
