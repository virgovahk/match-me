import { Request, Response } from "express";
import * as authService from "./auth.service";

export const register = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password required" });
    }

    await authService.register(email, password);
    console.log(`✅ User registered: ${email}`);
    return res.status(201).json({ message: "User registered successfully" });
  } catch (err: any) {
    console.error("❌ Register error:", err.message);
    if (err.message.includes("duplicate key")) {
      return res.status(409).json({ error: "Email already registered" });
    }
    return res.status(500).json({ error: "Registration failed" });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password required" });
    }

    console.log(`🔍 Login attempt for: ${email}`);
    const token = await authService.login(email, password);
    
    res.cookie("token", token, {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      domain: "localhost",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    
    console.log(`✅ Login successful for: ${email}, cookie set`);
    return res.json({ 
      message: "Login successful",
      email: email 
    });
  } catch (err: any) {
    console.error("❌ Login error:", err.message);
    if (err.message === "Invalid credentials") {
      return res.status(401).json({ error: "Invalid email or password" });
    }
    return res.status(500).json({ error: "Login failed" });
  }
};

export const logout = async (_req: Request, res: Response) => {
  res.clearCookie("token");
  console.log("✅ User logged out, cookie cleared");
  return res.json({ message: "Logged out successfully" });
};
