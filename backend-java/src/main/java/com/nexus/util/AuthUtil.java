package com.nexus.util;

import org.springframework.security.core.context.SecurityContextHolder;

import java.util.UUID;

/**
 * Utility to get the authenticated user's ID from the security context.
 * Equivalent of req.userId in Express controllers.
 *
 * Usage in any controller:
 *   UUID userId = AuthUtil.getCurrentUserId();
 */
public class AuthUtil {

    public static UUID getCurrentUserId() {
        Object principal = SecurityContextHolder.getContext()
                .getAuthentication()
                .getPrincipal();

        if (principal instanceof UUID) {
            return (UUID) principal;
        }
        throw new IllegalStateException("No authenticated user in context");
    }
}