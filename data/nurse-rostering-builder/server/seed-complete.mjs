import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const connection = await mysql.createConnection(process.env.DATABASE_URL);

try {
  console.log('🔧 테이블 생성 중...');
  
  // Create wards table
  await connection.execute(`
    CREATE TABLE IF NOT EXISTS wards (
      id int NOT NULL AUTO_INCREMENT PRIMARY KEY,
      name varchar(100) NOT NULL,
      description text,
      total_nurses int,
      createdAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);
  console.log('✅ wards 테이블 생성');

  // Create nurses table
  await connection.execute(`
    CREATE TABLE IF NOT EXISTS nurses (
      id int NOT NULL AUTO_INCREMENT PRIMARY KEY,
      name varchar(100) NOT NULL,
      employeeId varchar(50),
      qualification varchar(50),
      careerYears int,
      wardId int,
      preferredShifts text,
      createdAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (wardId) REFERENCES wards(id) ON DELETE CASCADE
    )
  `);
  console.log('✅ nurses 테이블 생성');

  // Create schedules table
  await connection.execute(`
    CREATE TABLE IF NOT EXISTS schedules (
      id int NOT NULL AUTO_INCREMENT PRIMARY KEY,
      wardId int NOT NULL,
      year int NOT NULL,
      month int NOT NULL,
      status varchar(50),
      createdAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (wardId) REFERENCES wards(id) ON DELETE CASCADE
    )
  `);
  console.log('✅ schedules 테이블 생성');

  // Create schedule_assignments table
  await connection.execute(`
    CREATE TABLE IF NOT EXISTS schedule_assignments (
      id int NOT NULL AUTO_INCREMENT PRIMARY KEY,
      scheduleId int NOT NULL,
      nurseId int NOT NULL,
      date date NOT NULL,
      shiftType varchar(50),
      createdAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (scheduleId) REFERENCES schedules(id) ON DELETE CASCADE,
      FOREIGN KEY (nurseId) REFERENCES nurses(id) ON DELETE CASCADE
    )
  `);
  console.log('✅ schedule_assignments 테이블 생성');

  // Clear existing data
  console.log('\n🗑️  기존 데이터 삭제 중...');
  await connection.execute('DELETE FROM schedule_assignments');
  await connection.execute('DELETE FROM schedules');
  await connection.execute('DELETE FROM nurses');
  await connection.execute('DELETE FROM wards');

  // Create sample ward
  console.log('\n📝 샘플 데이터 생성 중...');
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

  const nurseIds = [];
  for (const nurse of nurses) {
    const result = await connection.execute(
      'INSERT INTO nurses (name, employeeId, qualification, careerYears, wardId, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, NOW(), NOW())',
      [nurse.name, `NUR${Math.random().toString(36).substr(2, 9).toUpperCase()}`, nurse.qualification, nurse.careerYears, wardId]
    );
    nurseIds.push(result[0].insertId);
  }
  console.log(`✅ 간호사 10명 생성 완료`);

  // Create sample schedule
  const scheduleResult = await connection.execute(
    'INSERT INTO schedules (wardId, year, month, status, createdAt, updatedAt) VALUES (?, ?, ?, ?, NOW(), NOW())',
    [wardId, 2026, 4, 'draft']
  );
  const scheduleId = scheduleResult[0].insertId;
  console.log(`✅ 근무표 생성: 2026년 4월 (ID: ${scheduleId})`);

  // Create sample assignments (simple pattern for demo)
  console.log(`✅ 근무 배정 생성 중...`);
  const shifts = ['DAY', 'EVENING', 'NIGHT', 'OFF'];
  let assignmentCount = 0;
  
  for (let day = 1; day <= 30; day++) {
    for (let i = 0; i < nurseIds.length; i++) {
      const shiftIndex = (day + i) % shifts.length;
      const shiftType = shifts[shiftIndex];
      
      await connection.execute(
        'INSERT INTO schedule_assignments (scheduleId, nurseId, date, shiftType, createdAt, updatedAt) VALUES (?, ?, ?, ?, NOW(), NOW())',
        [scheduleId, nurseIds[i], `2026-04-${String(day).padStart(2, '0')}`, shiftType]
      );
      assignmentCount++;
    }
  }
  console.log(`✅ 근무 배정 ${assignmentCount}개 생성 완료`);

  console.log('\n✨ 모든 데이터 생성 완료!');
  console.log(`병동 ID: ${wardId}, 근무표 ID: ${scheduleId}`);
  console.log(`간호사: ${nurseIds.length}명`);
  console.log(`근무 배정: ${assignmentCount}개`);
  
} catch (error) {
  console.error('❌ 오류:', error.message);
  console.error(error);
} finally {
  await connection.end();
}
