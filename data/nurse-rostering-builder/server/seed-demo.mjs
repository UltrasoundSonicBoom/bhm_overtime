import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const connection = await mysql.createConnection(process.env.DATABASE_URL);

try {
  // Clear existing data
  await connection.execute('DELETE FROM nurses');
  await connection.execute('DELETE FROM wards');
  
  // Create sample ward
  const wardResult = await connection.execute(
    'INSERT INTO wards (name, total_nurses, createdAt, updatedAt) VALUES (?, ?, NOW(), NOW())',
    ['101 병동', 10]
  );
  const wardId = wardResult[0].insertId;
  console.log(`✅ 병동 생성: 101 병동 (ID: ${wardId})`);

  // Create 10 sample nurses
  const nurses = [
    { name: '김영희', qualification: 'RN', careerYears: 5 },
    { name: '이순신', qualification: 'RN', careerYears: 3 },
    { name: '박민준', qualification: 'CNS', careerYears: 8 },
    { name: '정수현', qualification: 'RN', careerYears: 2 },
    { name: '최지은', qualification: 'RN', careerYears: 6 },
    { name: '이다은', qualification: 'RN', careerYears: 4 },
    { name: '김준호', qualification: 'RN', careerYears: 1 },
    { name: '박소영', qualification: 'CNS', careerYears: 7 },
    { name: '조은미', qualification: 'RN', careerYears: 5 },
    { name: '이준혁', qualification: 'RN', careerYears: 3 },
  ];

  for (const nurse of nurses) {
    await connection.execute(
      'INSERT INTO nurses (name, employeeId, qualification, careerYears, wardId, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, NOW(), NOW())',
      [nurse.name, `NUR${Math.random().toString(36).substr(2, 9)}`, nurse.qualification, nurse.careerYears, wardId]
    );
  }
  console.log(`✅ 간호사 10명 생성 완료`);

  // Create sample schedule
  const scheduleResult = await connection.execute(
    'INSERT INTO schedules (wardId, year, month, status, createdAt, updatedAt) VALUES (?, ?, ?, ?, NOW(), NOW())',
    [wardId, 2026, 4, 'draft']
  );
  const scheduleId = scheduleResult[0].insertId;
  console.log(`✅ 근무표 생성: 2026년 4월 (ID: ${scheduleId})`);

  console.log('\n✨ 샘플 데이터 생성 완료!');
  console.log(`병동 ID: ${wardId}, 근무표 ID: ${scheduleId}`);
  
} catch (error) {
  console.error('❌ 오류:', error.message);
} finally {
  await connection.end();
}
