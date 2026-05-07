package com.nexus;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.security.servlet.SecurityAutoConfiguration;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

import java.util.*;

/**
 * Seed script — Java equivalent of seed.ts
 *
 * Usage:
 *   mvn compile exec:java "-Dexec.mainClass=com.nexus.Seed"
 *   mvn compile exec:java "-Dexec.mainClass=com.nexus.Seed" "-Dexec.args=--clear"
 */
@SpringBootApplication(exclude = {SecurityAutoConfiguration.class})
public class Seed {

    static final Random random = new Random();
    static final ObjectMapper objectMapper = new ObjectMapper();

    static final String[][] CITIES = {
        {"Tallinn",  "59.4370", "24.7536"},
        {"Tartu",    "58.3776", "26.7290"},
        {"Narva",    "59.3797", "28.1791"},
        {"Parnu",    "58.3859", "24.4971"},
        {"Viljandi", "58.3636", "25.5975"},
        {"Rakvere",  "59.3469", "26.3550"},
    };

    static final String[] FIRST_NAMES = {
        "Aleksander","Andres","Anna","Artur","Dmitri","Elena","Eva","Hans",
        "Helena","Igor","Jana","Juhan","Julia","Kadri","Karl","Katrin",
        "Kristiina","Laura","Liisa","Lukas","Madis","Marek","Maria","Maris",
        "Martin","Mihail","Mikk","Moonika","Natalja","Niina","Oliver","Peeter",
        "Piret","Reet","Reigo","Rein","Riho","Sander","Sandra","Siim",
        "Siiri","Taavi","Tarmo","Tiina","Toomas","Triin","Urmas","Vallo",
        "Viljar","Onne"
    };

    static final String[] LAST_NAMES = {
        "Tamm","Sepp","Magi","Kask","Lepp","Kukk","Rebane","Mannik",
        "Oja","Kallas","Leppik","Rand","Saar","Koppel","Valk","Nurm",
        "Kaljurand","Paas","Poder","Ilves","Nomm","Raud","Aru","Parn",
        "Kink","Lill","Mets","Kuusk","Toots","Laane"
    };

    static final String[] HOBBIES_POOL = {
        "hiking","cycling","reading","gaming","cooking","painting","photography",
        "yoga","running","swimming","chess","board games","knitting","dancing",
        "gardening","fishing","climbing","skiing","volleyball","basketball"
    };

    static final String[] INTERESTS_POOL = {
        "technology","art","science","history","travel","food","fashion",
        "politics","philosophy","psychology","astronomy","environment",
        "music","film","literature","sports","health","finance","education"
    };

    static final String[] MUSIC_POOL = {
        "rock","pop","jazz","classical","hip-hop","electronic","folk",
        "metal","r&b","indie","country","reggae","blues","punk","latin"
    };

    static final String[] FOOD_POOL = {
        "italian","japanese","mexican","indian","thai","mediterranean",
        "estonian","chinese","american","french","korean","vegetarian","vegan"
    };

    static final String[] TRAITS_POOL = {
        "adventurous","creative","empathetic","analytical","humorous",
        "introverted","extroverted","ambitious","laid-back","organised",
        "spontaneous","reliable","curious","optimistic","passionate"
    };

    static final String[][] MATCH_PREFERENCES_OPTIONS = {
        {"location","age","hobbies","music","connections"},
        {"hobbies","music","connections"},
        {"location","hobbies"},
        {"age","music","hobbies"},
        {"location","age","music"},
        {"hobbies","connections"}
    };

    static final String[] BIOS = {
        "Love spending weekends outdoors. Always up for a new adventure.",
        "Bookworm by day, amateur chef by night. Looking for interesting people.",
        "Tech enthusiast who also enjoys a good hike. Life is about balance.",
        "Passionate about art and music. Coffee is my fuel.",
        "Fitness fanatic and amateur photographer. Let's explore together.",
        "Quiet soul who loves deep conversations and good films.",
        "Foodie at heart. Always on the lookout for the next great restaurant.",
        "Dog owner, nature lover, and occasional poet.",
        "Engineer by profession, artist by passion.",
        "Traveller who has visited 30+ countries and counting.",
        "Board game enthusiast looking for fellow strategists.",
        "Yoga instructor and mindfulness advocate.",
        "Software developer who unwinds by playing guitar.",
        "History buff with a love for cycling and good beer.",
        "Aspiring chef who enjoys live music and long walks."
    };

    // -------------------------------------------------------------------------
    // Helpers — mirrors pick(), pickN(), randomInt(), randomBirthdate(), jitterCoord()
    // -------------------------------------------------------------------------

    static <T> T pick(T[] arr) {
        return arr[random.nextInt(arr.length)];
    }

    static List<String> pickN(String[] arr, int n) {
        List<String> list = new ArrayList<>(Arrays.asList(arr));
        Collections.shuffle(list, random);
        return list.subList(0, Math.min(n, list.size()));
    }

    static int randomInt(int min, int max) {
        return min + random.nextInt(max - min + 1);
    }

    static String randomBirthdate() {
        int year = randomInt(1970, 2000);
        int month = randomInt(1, 12);
        int day = randomInt(1, 28);
        return String.format("%04d-%02d-%02d", year, month, day);
    }

    static double jitterCoord(double base, double maxDelta) {
        return base + (random.nextDouble() - 0.5) * 2 * maxDelta;
    }

    static String toJson(List<String> list) {
        try {
            return objectMapper.writeValueAsString(list);
        } catch (Exception e) {
            return "[]";
        }
    }

    // -------------------------------------------------------------------------
    // clearData() — mirrors clearData() in seed.ts
    // -------------------------------------------------------------------------

    static void clearData(JdbcTemplate db) {
        System.out.println("Clearing existing data...");
        db.update("DELETE FROM messages");
        db.update("DELETE FROM chats");
        db.update("DELETE FROM dismissed_recommendations");
        db.update("DELETE FROM connections");
        db.update("DELETE FROM profiles");
        db.update("DELETE FROM users");
        System.out.println("All data cleared.");
    }

    // -------------------------------------------------------------------------
    // seedUsers() — mirrors seedUsers() in seed.ts
    // -------------------------------------------------------------------------

    static int[] seedUsers(JdbcTemplate db, BCryptPasswordEncoder encoder, int count) {
        String passwordHash = encoder.encode("admin");
        int created = 0;
        int skipped = 0;

        for (int i = 0; i < count; i++) {
            String email = "user" + (i + 1) + "@gmail.com";
            String firstName = pick(FIRST_NAMES);
            String lastName = pick(LAST_NAMES);
            String[] city = pick(CITIES);
            String gender = pick(new String[]{"Male", "Female", "Other"});

            UUID userId;
            try {
                userId = db.queryForObject(
                    "INSERT INTO users (email, password_hash) VALUES (?, ?) RETURNING id",
                    UUID.class, email, passwordHash
                );
                created++;
            } catch (Exception e) {
                if (e.getMessage() != null && e.getMessage().contains("duplicate")) {
                    skipped++;
                    continue;
                }
                throw new RuntimeException("Seed failed at user " + email, e);
            }

            double lat = jitterCoord(Double.parseDouble(city[1]), 0.15);
            double lon = jitterCoord(Double.parseDouble(city[2]), 0.20);
            int maxDist = pick(new Integer[]{25, 50, 100, 200, 500});

            db.update(
                """
                INSERT INTO profiles (
                    user_id, first_name, last_name, birthdate, gender, bio,
                    city, latitude, longitude, max_distance_km,
                    interests, hobbies, music_preferences, food_preferences,
                    personality_traits, match_preferences
                ) VALUES (?,?,?,CAST(? AS date),?,?,?,?,?,?,CAST(? AS jsonb),CAST(? AS jsonb),CAST(? AS jsonb),CAST(? AS jsonb),CAST(? AS jsonb),CAST(? AS jsonb))
                """,
                userId, firstName, lastName, randomBirthdate(), gender, pick(BIOS),
                city[0], lat, lon, maxDist,
                toJson(pickN(INTERESTS_POOL, randomInt(2, 5))),
                toJson(pickN(HOBBIES_POOL, randomInt(2, 5))),
                toJson(pickN(MUSIC_POOL, randomInt(2, 4))),
                toJson(pickN(FOOD_POOL, randomInt(2, 4))),
                toJson(pickN(TRAITS_POOL, randomInt(2, 4))),
                toJson(Arrays.asList(pick(MATCH_PREFERENCES_OPTIONS)))
            );

            if ((i + 1) % 20 == 0) {
                System.out.println("  " + (i + 1) + "/" + count + " users seeded...");
            }
        }

        return new int[]{created, skipped};
    }

    // -------------------------------------------------------------------------
    // main() — mirrors main() in seed.ts
    // -------------------------------------------------------------------------

    public static void main(String[] args) throws Exception {
        List<String> argList = Arrays.asList(args);
        boolean shouldClear = argList.contains("--clear");

        ConfigurableApplicationContext ctx = SpringApplication.run(Seed.class, args);
        JdbcTemplate db = ctx.getBean(JdbcTemplate.class);
        BCryptPasswordEncoder encoder = new BCryptPasswordEncoder(10);

        System.out.println("=== Nexus Seed Script ===");
        System.out.println("Target: 120 users | Clear first: " + shouldClear);
        System.out.println();

        try {
            if (shouldClear) clearData(db);

            System.out.println("Seeding users...");
            int[] result = seedUsers(db, encoder, 120);
            int created = result[0];
            int skipped = result[1];

            System.out.println();
            System.out.println("=== Done ===");
            System.out.println("✅ Created: " + created + " users");
            if (skipped > 0) System.out.println("⏭  Skipped: " + skipped + " (duplicate emails)");
            System.out.println();
            System.out.println("All seeded users have password: admin");
            System.out.println("Email format: user1@gmail.com, user2@gmail.com, ...");
        } catch (Exception e) {
            System.err.println("Seed failed: " + e.getMessage());
            System.exit(1);
        } finally {
            ctx.close();
        }
    }
}