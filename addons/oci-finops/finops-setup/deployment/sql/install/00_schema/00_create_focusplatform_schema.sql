-- Noninteractive bootstrap: caller supplies the two password bind variables.
SET ECHO OFF VERIFY OFF DEFINE OFF FEEDBACK ON SERVEROUTPUT ON SIZE UNLIMITED
SET LINESIZE 160 PAGESIZE 100
WHENEVER OSERROR EXIT FAILURE
WHENEVER SQLERROR EXIT SQL.SQLCODE ROLLBACK
@00_schema/internal/00_create_focusplatform_schema_core.sql
