import { Pool } from "pg";
import bcrypt from "bcrypt";
import dotenv from "dotenv";

dotenv.config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const CITIES = [
  { name: "Tallinn",   lat: 59.4370, lon: 24.7536 },
  { name: "Tartu",     lat: 58.3776, lon: 26.7290 },
  { name: "Narva",     lat: 59.3797, lon: 28.1791 },
  { name: "Pärnu",     lat: 58.3859, lon: 24.4971 },
  { name: "Viljandi",  lat: 58.3636, lon: 25.5975 },
  { name: "Rakvere",   lat: 59.3469, lon: 26.3550 },
];

const FIRST_NAMES = [
  "Aleksander","Andres","Anna","Artur","Dmitri","Elena","Eva","Hans",
  "Helena","Igor","Jana","Juhan","Julia","Kadri","Karl","Katrin",
  "Kristiina","Laura","Liisa","Lukas","Madis","Marek","Maria","Maris",
  "Martin","Mihail","Mikk","Moonika","Natalja","Niina","Oliver","Peeter",
  "Piret","Reet","Reigo","Rein","Riho","Sander","Sandra","Siim",
  "Siiri","Taavi","Tarmo","Tiina","Toomas","Triin","Urmas","Vallo",
  "Viljar","Õnne",
];

const LAST_NAMES = [
  "Tamm","Sepp","Mägi","Kask","Lepp","Kukk","Rebane","Männik",
  "Oja","Kallas","Leppik","Rand","Saar","Koppel","Valk","Nurm",
  "Kaljurand","Paas","Põder","Ilves","Nõmm","Raud","Aru","Pärn",
  "Kink","Lill","Mets","Kuusk","Toots","Laane",
];

const HOBBIES_POOL = [
  "hiking","cycling","reading","gaming","cooking","painting","photography",
  "yoga","running","swimming","chess","board games","knitting","dancing",
  "gardening","fishing","climbing","skiing","volleyball","basketball",
];

const INTERESTS_POOL = [
  "technology","art","science","history","travel","food","fashion",
  "politics","philosophy","psychology","astronomy","environment",
  "music","film","literature","sports","health","finance","education",
];

const MUSIC_POOL = [
  "rock","pop","jazz","classical","hip-hop","electronic","folk",
  "metal","r&b","indie","country","reggae","blues","punk","latin",
];

const FOOD_POOL = [
  "italian","japanese","mexican","indian","thai","mediterranean",
  "estonian","chinese","american","french","korean","vegetarian","vegan",
];

const TRAITS_POOL = [
  "adventurous","creative","empathetic","analytical","humorous",
  "introverted","extroverted","ambitious","laid-back","organised",
  "spontaneous","reliable","curious","optimistic","passionate",
];

const LOOKING_FOR = [
  "friendship","a hiking buddy","someone to explore the city with",
  "a board game partner","a workout companion","meaningful conversations",
  "a travel partner","someone who loves good food","a creative collaborator",
];

const BIOS = [
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
  "Aspiring chef who enjoys live music and long walks.",
];

const MATCH_PREFERENCES_OPTIONS = [
  ["location", "age", "hobbies", "music", "connections"],
  ["hobbies", "music", "connections"],
  ["location", "hobbies"],
  ["age", "music", "hobbies"],
  ["location", "age", "music"],
  ["hobbies", "connections"],
];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pickN<T>(arr: T[], n: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomBirthdate(): string {
  const year = randomInt(1970, 2000);
  const month = String(randomInt(1, 12)).padStart(2, "0");
  const day = String(randomInt(1, 28)).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function jitterCoord(base: number, maxDelta: number): number {
  return base + (Math.random() - 0.5) * 2 * maxDelta;
}

async function clearData() {
  console.log("Clearing existing data...");
  await pool.query("DELETE FROM messages");
  await pool.query("DELETE FROM chats");
  await pool.query("DELETE FROM dismissed_recommendations");
  await pool.query("DELETE FROM connections");
  await pool.query("DELETE FROM profiles");
  await pool.query("DELETE FROM users");
  console.log("All data cleared.");
}

async function seedUsers(count: number) {
  const passwordHash = await bcrypt.hash("admin", 10);
  let created = 0;
  let skipped = 0;

  for (let i = 0; i < count; i++) {
    const firstName = pick(FIRST_NAMES);
    const lastName = pick(LAST_NAMES);
    const email = `user${i + 1}@gmail.com`;
    const city = pick(CITIES);
    const gender = pick(["Male", "Female", "Other"]);

    let userId: string;
    try {
      const userResult = await pool.query(
        `INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id`,
        [email, passwordHash]
      );
      userId = userResult.rows[0].id;
      created++;
    } catch (err: any) {
      if (err.code === "23505") { skipped++; continue; }
      throw err;
    }

    await pool.query(
      `INSERT INTO profiles (
        user_id, first_name, last_name, birthdate, gender, bio,
        city, latitude, longitude, max_distance_km,
        interests, hobbies, music_preferences, food_preferences,
        personality_traits, match_preferences, looking_for
      ) VALUES (
        $1,$2,$3,$4,$5,$6,
        $7,$8,$9,$10,
        $11,$12,$13,$14,
        $15,$16,$17
      )`,
      [
        userId,
        firstName,
        lastName,
        randomBirthdate(),
        gender,
        pick(BIOS),
        city.name,
        jitterCoord(city.lat, 0.15),
        jitterCoord(city.lon, 0.20),
        pick([25, 50, 100, 200, 500]),
        JSON.stringify(pickN(INTERESTS_POOL, randomInt(2, 5))),
        JSON.stringify(pickN(HOBBIES_POOL, randomInt(2, 5))),
        JSON.stringify(pickN(MUSIC_POOL, randomInt(2, 4))),
        JSON.stringify(pickN(FOOD_POOL, randomInt(2, 4))),
        JSON.stringify(pickN(TRAITS_POOL, randomInt(2, 4))),
        JSON.stringify(pick(MATCH_PREFERENCES_OPTIONS)),
        pick(LOOKING_FOR),
      ]
    );

    if ((i + 1) % 20 === 0) {
      console.log(`  ${i + 1}/${count} users seeded...`);
    }
  }

  return { created, skipped };
}

async function main() {
  const shouldClear = process.argv.includes("--clear");

  console.log("=== Nexus Seed Script ===");
  console.log(`Target: 120 users | Clear first: ${shouldClear}`);
  console.log("");

  try {
    if (shouldClear) await clearData();

    console.log("Seeding users...");
    const { created, skipped } = await seedUsers(120);

    console.log("");
    console.log("=== Done ===");
    console.log(`✅ Created: ${created} users`);
    if (skipped > 0) console.log(`⏭  Skipped: ${skipped} (duplicate emails)`);
    console.log("");
    console.log("All seeded users have password: admin");
    console.log('Email format: user1@gmail.com, user2@gmail.com, ...');
  } catch (err) {
    console.error("Seed failed:", err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();