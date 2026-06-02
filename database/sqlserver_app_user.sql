USE master;
GO

IF NOT EXISTS (SELECT 1 FROM sys.sql_logins WHERE name = N'crm_api_user')
BEGIN
    CREATE LOGIN crm_api_user
    WITH PASSWORD = N'Troque_Esta_Senha_Forte_2026!',
         CHECK_POLICY = ON,
         CHECK_EXPIRATION = OFF;
END;
GO

USE crm_thiago_adv;
GO

IF NOT EXISTS (SELECT 1 FROM sys.database_principals WHERE name = N'crm_api_user')
BEGIN
    CREATE USER crm_api_user FOR LOGIN crm_api_user;
END;
GO

ALTER ROLE db_datareader ADD MEMBER crm_api_user;
ALTER ROLE db_datawriter ADD MEMBER crm_api_user;
GO

