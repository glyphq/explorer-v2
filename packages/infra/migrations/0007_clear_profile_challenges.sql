-- No profiles remain, so pending ownership challenges have nothing to attach
-- to. Clear them as well.

DELETE FROM profile_challenges;
