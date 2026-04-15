import mysql from 'mysql2/promise';
import 'dotenv/config';

async function checkSchema() {
  const dbUrl = process.env.DATABASE_URL;
  const url = new URL(dbUrl);
  
  const connection = await mysql.createConnection({
    host: url.hostname,
    user: url.username,
    password: url.password,
    database: url.pathname.slice(1),
    waitForConnections: true,
    connectionLimit: 1,
    queueLimit: 0,
  });

  console.log('=== SCHEDULES TABLE SCHEMA ===\n');
  const [columns] = await connection.execute('DESCRIBE schedules');
  console.table(columns);

  console.log('\n=== NURSES TABLE SCHEMA ===\n');
  try {
    const [nurseColumns] = await connection.execute('DESCRIBE nurses');
    console.table(nurseColumns);
  } catch (e) {
    console.log('Nurses table does not exist yet');
  }

  console.log('\n=== WARDS TABLE SCHEMA ===\n');
  const [wardColumns] = await connection.execute('DESCRIBE wards');
  console.table(wardColumns);

  console.log('\n=== SHIFT_ASSIGNMENTS TABLE SCHEMA ===\n');
  const [assignColumns] = await connection.execute('DESCRIBE shift_assignments');
  console.table(assignColumns);

  await connection.end();
}

checkSchema().catch(console.error);
