-- Clear every verified profile record. Curated exchange rows from 0002 are
-- included, so a fresh database also ends up with an empty profile set.

DELETE FROM profiles;
