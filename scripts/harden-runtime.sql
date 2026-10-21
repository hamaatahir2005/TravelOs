-- Run as migration owner after creating travel_os_app with a strong provider-managed password.
-- Do not grant table ownership, CREATE, TRUNCATE, ALTER, or schema ownership to runtime users.
GRANT CONNECT ON DATABASE travel_os_production TO travel_os_app;
GRANT USAGE ON SCHEMA public TO travel_os_app;
GRANT SELECT, INSERT ON ALL TABLES IN SCHEMA public TO travel_os_app;
GRANT UPDATE ON "Agency", "Staff", "Customer", "Supplier", "Ticket", "VisaApplication", "LoginAttempt" TO travel_os_app;
GRANT DELETE ON "Session", "LoginAttempt" TO travel_os_app;
-- For a demo database, replace travel_os_production above with travel_os_demo.
-- Reapply grants after future migrations create new tables. Keep migrations on the owner connection.
