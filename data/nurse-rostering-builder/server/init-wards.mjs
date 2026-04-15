import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL;

async function initializeWards() {
  if (!DATABASE_URL) {
    console.error("DATABASE_URL not set");
    process.exit(1);
  }

  const connection = await mysql.createConnection(DATABASE_URL);

  try {
    console.log("Creating wards...");

    // Check if wards already exist
    const [existingWards] = await connection.execute(
      "SELECT id, name FROM wards WHERE name IN ('101 병동', '102 병동')"
    );

    if (existingWards.length > 0) {
      console.log("Wards already exist:", existingWards);
      return;
    }

    // Insert wards
    await connection.execute(
      "INSERT INTO wards (name, total_nurses, createdAt, updatedAt) VALUES (?, ?, NOW(), NOW())",
      ["101 병동", 10]
    );

    await connection.execute(
      "INSERT INTO wards (name, total_nurses, createdAt, updatedAt) VALUES (?, ?, NOW(), NOW())",
      ["102 병동", 10]
    );

    console.log("✓ Wards created successfully");

    // Get ward IDs
    const [wards] = await connection.execute(
      "SELECT id, name FROM wards WHERE name IN ('101 병동', '102 병동')"
    );

    console.log("Created wards:", wards);

    // Create sample nurses for each ward
    for (const ward of wards) {
      console.log(`\nAdding nurses to ${ward.name}...`);

      for (let i = 1; i <= 10; i++) {
        const employeeId = `${ward.name.replace(" ", "")}-${String(i).padStart(3, "0")}`;
        const name = `${ward.name} 간호사${i}`;

        // Insert nurse profile
        await connection.execute(
          `INSERT INTO nurse_profiles (user_id, ward_id, employee_id, career_years, qualification, max_consecutive_nights, createdAt, updatedAt)
           VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())`,
          [1, ward.id, employeeId, Math.floor(Math.random() * 10) + 1, "RN", 3]
        );

        console.log(`  ✓ Added ${name}`);
      }
    }

    console.log("\n✓ Ward initialization completed successfully!");
  } catch (error) {
    console.error("Error initializing wards:", error);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

initializeWards();
