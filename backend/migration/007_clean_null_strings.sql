UPDATE profiles SET latitude = NULL WHERE latitude::text = 'null';
UPDATE profiles SET longitude = NULL WHERE longitude::text = 'null';
UPDATE profiles SET first_name = NULL WHERE first_name = 'null';
UPDATE profiles SET last_name = NULL WHERE last_name = 'null';
UPDATE profiles SET birthdate = NULL WHERE birthdate::text = 'null';
UPDATE profiles SET gender = NULL WHERE gender = 'null';
UPDATE profiles SET bio = NULL WHERE bio = 'null';
UPDATE profiles SET city = NULL WHERE city = 'null';