import mysql from 'mysql2/promise';
import 'dotenv/config';

async function fixDatabase() {
  try {
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
      console.error('DATABASE_URL not set');
      process.exit(1);
    }

    const url = new URL(dbUrl);
    const connection = await mysql.createConnection({
      host: url.hostname,
      user: url.username,
      password: url.password,
      database: url.pathname.slice(1),
      ssl: true,
      waitForConnections: true,
      connectionLimit: 1,
      queueLimit: 0,
    });

    console.log('=== DATABASE FIX START ===\n');

    // 1. Create nurses table
    console.log('1️⃣ Creating nurses table...');
    try {
      await connection.execute(`
        CREATE TABLE IF NOT EXISTS \`nurses\` (
          \`id\` int AUTO_INCREMENT NOT NULL,
          \`name\` varchar(100) NOT NULL,
          \`ward_id\` int NOT NULL,
          \`career_years\` int DEFAULT 0,
          \`position\` varchar(50) DEFAULT '간호사',
          \`email\` varchar(100),
          \`phone\` varchar(20),
          \`preferred_shifts\` json,
          \`createdAt\` timestamp NOT NULL DEFAULT (now()),
          \`updatedAt\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
          CONSTRAINT \`nurses_id\` PRIMARY KEY(\`id\`)
        )
      `);
      console.log('✓ Nurses table created/verified\n');
    } catch (e) {
      if (!e.message.includes('already exists')) {
        throw e;
      }
      console.log('✓ Nurses table already exists\n');
    }

    // 2. Clear existing data
    console.log('2️⃣ Clearing existing data...');
    try {
      await connection.execute('DELETE FROM shift_assignments');
      await connection.execute('DELETE FROM schedules');
      await connection.execute('DELETE FROM nurses');
      await connection.execute('DELETE FROM wards');
      console.log('✓ Cleared all data\n');
    } catch (e) {
      console.log('✓ Data cleared (or already empty)\n');
    }

    // 3. Insert wards
    console.log('3️⃣ Inserting wards...');
    const wardData = [
      { id: 101, name: '101 병동 (내과)', description: '내과 병동', totalNurses: 10 },
      { id: 102, name: '102 병동 (외과)', description: '외과 병동', totalNurses: 10 },
      { id: 103, name: '103 병동 (정형외과)', description: '정형외과 병동', totalNurses: 10 },
      { id: 104, name: '104 병동 (산부인과)', description: '산부인과 병동', totalNurses: 10 },
      { id: 105, name: '105 병동 (소아과)', description: '소아과 병동', totalNurses: 10 },
    ];

    for (const ward of wardData) {
      await connection.execute(
        'INSERT INTO wards (id, name, description, total_nurses) VALUES (?, ?, ?, ?)',
        [ward.id, ward.name, ward.description, ward.totalNurses]
      );
    }
    console.log(`✓ Inserted ${wardData.length} wards\n`);

    // 4. Insert nurses (10 per ward)
    console.log('4️⃣ Inserting nurses...');
    const nurseNames = [
      '김영희', '이순신', '박민준', '정수현', '최민지',
      '홍길동', '이순애', '박지은', '정민철', '최준호'
    ];

    let nurseId = 1;
    for (const ward of wardData) {
      for (let i = 0; i < 10; i++) {
        await connection.execute(
          'INSERT INTO nurses (id, name, ward_id, career_years, position, email, phone, preferred_shifts) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          [
            nurseId,
            nurseNames[i],
            ward.id,
            Math.floor(Math.random() * 10) + 1,
            i === 0 ? '수간호사' : '간호사',
            `nurse${nurseId}@hospital.com`,
            `010-${Math.floor(Math.random() * 9000) + 1000}-${Math.floor(Math.random() * 9000) + 1000}`,
            JSON.stringify(['day', 'evening', 'night']),
          ]
        );
        nurseId++;
      }
    }
    console.log(`✓ Inserted ${nurseId - 1} nurses\n`);

    // 5. Insert schedules
    console.log('5️⃣ Inserting schedules...');
    let scheduleId = 1;
    for (const ward of wardData) {
      for (let month = 4; month <= 4; month++) {
        await connection.execute(
          `INSERT INTO schedules (
            ward_id, year, month, status, 
            day_shift_required, evening_shift_required, night_shift_required,
            weekend_day_shift_required, weekend_evening_shift_required, weekend_night_shift_required,
            created_by
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            ward.id,
            2026,
            month,
            'draft',
            8, 8, 8,
            4, 4, 4,
            1,
          ]
        );
        scheduleId++;
      }
    }
    console.log(`✓ Inserted ${scheduleId - 1} schedules\n`);

    // 6. Generate shift assignments
    console.log('6️⃣ Generating shift assignments...');
    const shiftTypes = ['day', 'evening', 'night', 'off'];
    let assignmentCount = 0;

    const [schedules] = await connection.execute('SELECT id, ward_id, year, month FROM schedules');

    for (const schedule of schedules) {
      const daysInMonth = new Date(schedule.year, schedule.month, 0).getDate();
      
      const [nurses] = await connection.execute(
        'SELECT id FROM nurses WHERE ward_id = ?',
        [schedule.ward_id]
      );

      for (const nurse of nurses) {
        for (let day = 1; day <= daysInMonth; day++) {
          const date = new Date(schedule.year, schedule.month - 1, day);
          const dateStr = date.toISOString().split('T')[0];
          const shiftType = shiftTypes[Math.floor(Math.random() * shiftTypes.length)];
          const isWeekend = date.getDay() === 0 || date.getDay() === 6 ? 1 : 0;

          await connection.execute(
            'INSERT INTO shift_assignments (schedule_id, nurse_id, date, shift_type, is_weekend) VALUES (?, ?, ?, ?, ?)',
            [schedule.id, nurse.id, dateStr, shiftType, isWeekend]
          );
          assignmentCount++;
        }
      }
    }
    console.log(`✓ Inserted ${assignmentCount} shift assignments\n`);

    console.log('=== DATABASE FIX COMPLETE ===');
    console.log(`Summary:`);
    console.log(`  - Wards: ${wardData.length}`);
    console.log(`  - Nurses: ${nurseId - 1}`);
    console.log(`  - Schedules: ${scheduleId - 1}`);
    console.log(`  - Shift Assignments: ${assignmentCount}`);

    await connection.end();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

fixDatabase();
