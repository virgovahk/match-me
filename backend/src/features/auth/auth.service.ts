import { pool } from "../../db";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { JWT_SECRET } from "../../config/env";

export const register = async (email: string, password: string) => {
  console.log(`📝 Registering user: ${email}`);
  const passwordHash = await bcrypt.hash(password, 10);

  const result = await pool.query(
    `
    INSERT INTO users (email, password_hash)
    VALUES ($1, $2)
    RETURNING id
    `,
    [email, passwordHash]
  );

  const userId = result.rows[0].id;
  await pool.query(
    `
    INSERT INTO profiles (user_id, first_name, last_name, birthdate, gender, bio)
    VALUES ($1, $2, $3, $4, $5, $6)
    `,
    [userId, "", "", new Date().toISOString().split("T")[0], "", ""]
  );
};

export const login = async (email: string, password: string) => {
  console.log(`🔓 Login service called for: ${email}`);
  
  const result = await pool.query(
    `
    SELECT id, password_hash
    FROM users
    WHERE email = $1
    `,
    [email]
  );

  if (result.rowCount === 0) {
    console.log(`❌ Login failed: User not found (${email})`);
    throw new Error("Invalid credentials");
  }

  const user = result.rows[0];
  console.log(`✅ User found: ${email}, checking password...`);

  const isValid = await bcrypt.compare(password, user.password_hash);
  if (!isValid) {
    console.log(`❌ Login failed: Password mismatch for (${email})`);
    throw new Error("Invalid credentials");
  }

  console.log(`✅ Password valid for ${email}, generating JWT...`);
  const token = jwt.sign(
    { userId: user.id },
    JWT_SECRET,
    { expiresIn: "7d" }
  );
  
  console.log(`✅ JWT generated for userId: ${user.id}`);
  return token;
};

