package com.nexus;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.security.servlet.SecurityAutoConfiguration;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.jdbc.core.JdbcTemplate;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Migration runner — Java equivalent of migration.ts
 *
 * Reads all .sql files from the migration/ folder in order and runs them.
 * Handles dollar-quoted blocks ($$...$$) used in CREATE FUNCTION / CREATE TRIGGER.
 *
 * Usage:
 *   mvn clean compile exec:java "-Dexec.mainClass=com.nexus.Migrate"
 */
@SpringBootApplication(exclude = {SecurityAutoConfiguration.class})
public class Migrate {

    /**
     * Splits a SQL file into individual statements, correctly handling:
     * - Dollar-quoted blocks ($$...$$) used in PostgreSQL functions/triggers
     * - Regular semicolon-separated statements
     * - Comments
     */
    static List<String> splitStatements(String sql) {
        List<String> statements = new ArrayList<>();
        StringBuilder current = new StringBuilder();
        boolean inDollarQuote = false;
        int i = 0;

        while (i < sql.length()) {
            // Check for $$ dollar-quote start/end
            if (i + 1 < sql.length() && sql.charAt(i) == '$' && sql.charAt(i + 1) == '$') {
                inDollarQuote = !inDollarQuote;
                current.append("$$");
                i += 2;
                continue;
            }

            char c = sql.charAt(i);

            if (c == ';' && !inDollarQuote) {
                String stmt = current.toString().trim();
                if (!stmt.isEmpty() && !stmt.startsWith("--")) {
                    statements.add(stmt);
                }
                current = new StringBuilder();
            } else {
                current.append(c);
            }
            i++;
        }

        // Add any remaining statement
        String last = current.toString().trim();
        if (!last.isEmpty() && !last.startsWith("--")) {
            statements.add(last);
        }

        return statements;
    }

    public static void main(String[] args) throws Exception {
        ConfigurableApplicationContext ctx = SpringApplication.run(Migrate.class, args);
        JdbcTemplate db = ctx.getBean(JdbcTemplate.class);

        try {
            Path migrationsDir = Paths.get("migration");

            List<Path> files = Files.list(migrationsDir)
                .filter(p -> p.toString().endsWith(".sql"))
                .sorted()
                .collect(Collectors.toList());

            for (Path file : files) {
                String filename = file.getFileName().toString();
                String sql = Files.readString(file);
                System.out.println("Running " + filename + "...");

                List<String> statements = splitStatements(sql);
                for (String statement : statements) {
                    db.execute(statement);
                }
            }

            System.out.println("All migrations applied!");
        } catch (Exception e) {
            System.err.println("Migration failed: " + e.getMessage());
            System.exit(1);
        } finally {
            ctx.close();
        }
    }
}