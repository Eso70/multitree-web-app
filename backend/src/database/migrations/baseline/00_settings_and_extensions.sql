--
-- 00_settings_and_extensions.sql
--
-- Dump preamble: session settings and the extensions everything else assumes.
--
-- Part of the MultiTree baseline. `src/database/baseline.ts` lists the parts
-- and the order they are applied in; they are one schema split for reading,
-- not independent scripts.
--

--
-- PostgreSQL database dump
--
-- The single source of truth for the schema. Every incremental migration has
-- been folded back into the statements below, so this file alone builds a
-- complete database and there is nothing to apply after it.
--
-- This repository intentionally uses a single-baseline model. `db-migrate`
-- creates a fresh database from this file or verifies that an existing
-- database already matches it; it does not replay dated forward migrations.
-- Use `db-reset` only for disposable databases because it drops and recreates
-- the entire configured database before applying this file.
--
-- Dumped from database version 18.4
-- Dumped by pg_dump version 18.4

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: pg_trgm; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA public;


--
-- Name: EXTENSION pg_trgm; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION pg_trgm IS 'text similarity measurement and index searching based on trigrams';


--
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;


--
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


