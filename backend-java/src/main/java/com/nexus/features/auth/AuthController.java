package com.nexus.features.auth;

import com.nexus.util.JwtUtil;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/auth")
public class AuthController {

    private final JdbcTemplate db;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;

    public AuthController(JdbcTemplate db, PasswordEncoder passwordEncoder, JwtUtil jwtUtil) {
        this.db = db;
        this.passwordEncoder = passwordEncoder;
        this.jwtUtil = jwtUtil;
    }

    /** POST /auth/register */
    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody Map<String, String> body,
                                      HttpServletResponse response) {
        String email = body.get("email");
        String password = body.get("password");

        if (email == null || password == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "Email and password required"));
        }

        // Check if email already exists
        Integer count = db.queryForObject(
            "SELECT COUNT(*) FROM users WHERE email = ?",
            Integer.class, email
        );
        if (count != null && count > 0) {
            return ResponseEntity.badRequest().body(Map.of("message", "Email already in use"));
        }

        // Hash password with bcrypt — equivalent of bcrypt.hash(password, 10)
        String hash = passwordEncoder.encode(password);

        UUID userId = db.queryForObject(
            "INSERT INTO users (email, password_hash) VALUES (?, ?) RETURNING id",
            UUID.class, email, hash
        );

        setAuthCookie(response, userId);
        return ResponseEntity.status(201).body(Map.of("message", "Registered successfully"));
    }

    /** POST /auth/login */
    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Map<String, String> body,
                                   HttpServletResponse response) {
        String email = body.get("email");
        String password = body.get("password");

        if (email == null || password == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "Email and password required"));
        }

        try {
            Map<String, Object> user = db.queryForMap(
                "SELECT id, password_hash FROM users WHERE email = ?", email
            );

            String hash = (String) user.get("password_hash");

            // Verify password — equivalent of bcrypt.compare(password, hash)
            if (!passwordEncoder.matches(password, hash)) {
                return ResponseEntity.status(401).body(Map.of("message", "Invalid credentials"));
            }

            UUID userId = (UUID) user.get("id");
            setAuthCookie(response, userId);
            return ResponseEntity.ok(Map.of("message", "Logged in successfully"));

        } catch (Exception e) {
            return ResponseEntity.status(401).body(Map.of("message", "Invalid credentials"));
        }
    }

    /** GET /auth/token — returns the JWT so the frontend can use it for WebSocket auth */
    @GetMapping("/token")
    public ResponseEntity<?> getToken(HttpServletRequest request) {
        Cookie[] cookies = request.getCookies();
        if (cookies != null) {
            for (Cookie c : cookies) {
                if ("token".equals(c.getName())) {
                    return ResponseEntity.ok(Map.of("token", c.getValue()));
                }
            }
        }
        return ResponseEntity.status(401).body(Map.of("message", "Not authenticated"));
    }

    /** POST /auth/logout */
    @PostMapping("/logout")
    public ResponseEntity<?> logout(HttpServletResponse response) {
        // Clear the JWT cookie by setting maxAge to 0
        Cookie cookie = new Cookie("token", "");
        cookie.setHttpOnly(true);
        cookie.setPath("/");
        cookie.setMaxAge(0);
        response.addCookie(cookie);
        return ResponseEntity.ok(Map.of("message", "Logged out successfully"));
    }

    /** Set the httpOnly JWT cookie — equivalent of res.cookie("token", token, { httpOnly: true }) */
    private void setAuthCookie(HttpServletResponse response, UUID userId) {
        String token = jwtUtil.generateToken(userId);
        Cookie cookie = new Cookie("token", token);
        cookie.setHttpOnly(true);
        cookie.setPath("/");
        cookie.setMaxAge(86400); // 24 hours
        response.addCookie(cookie);
    }
}