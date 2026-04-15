import { getDb } from './db';
import { wards, nurses, schedules, shiftAssignments } from '../drizzle/schema';
import { eq } from 'drizzle-orm';

export async function seedDatabase() {
  try {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    console.log('🔄 Seeding database...');

    // 1. Clear existing data
    console.log('Clearing existing data...');
    await db.delete(shiftAssignments);
    await db.delete(schedules);
    await db.delete(nurses);
    await db.delete(wards);

    // 2. Insert wards
    console.log('Inserting wards...');
    const wardData = [
      { id: 101, name: '101 병동 (내과)', description: '내과 병동', totalNurses: 10 },
      { id: 102, name: '102 병동 (외과)', description: '외과 병동', totalNurses: 10 },
      { id: 103, name: '103 병동 (정형외과)', description: '정형외과 병동', totalNurses: 10 },
      { id: 104, name: '104 병동 (산부인과)', description: '산부인과 병동', totalNurses: 10 },
      { id: 105, name: '105 병동 (소아과)', description: '소아과 병동', totalNurses: 10 },
    ];

    for (const ward of wardData) {
      await db.insert(wards).values(ward);
    }
    console.log(`✓ Inserted ${wardData.length} wards`);

    // 3. Insert nurses (10 per ward)
    console.log('Inserting nurses...');
    const nurseNames = [
      '김영희', '이순신', '박민준', '정수현', '최민지',
      '홍길동', '이순애', '박지은', '정민철', '최준호'
    ];

    let nurseId = 1;
    for (const ward of wardData) {
      for (let i = 0; i < 10; i++) {
        await db.insert(nurses).values({
          id: nurseId,
          name: nurseNames[i],
          wardId: ward.id,
          careerYears: Math.floor(Math.random() * 10) + 1,
          position: i === 0 ? '수간호사' : '간호사',
          email: `nurse${nurseId}@hospital.com`,
          phone: `010-${Math.floor(Math.random() * 9000) + 1000}-${Math.floor(Math.random() * 9000) + 1000}`,
          preferredShifts: JSON.stringify(['day', 'evening', 'night']),
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        nurseId++;
      }
    }
    console.log(`✓ Inserted ${nurseId - 1} nurses`);

    // 4. Insert schedules
    console.log('Inserting schedules...');
    let scheduleId = 1;
    for (const ward of wardData) {
      for (let month = 4; month <= 4; month++) {
        await db.insert(schedules).values({
          id: scheduleId,
          wardId: ward.id,
          year: 2026,
          month: month,
          status: 'draft',
          dayShiftRequired: 8,
          eveningShiftRequired: 8,
          nightShiftRequired: 8,
          weekendDayShiftRequired: 4,
          weekendEveningShiftRequired: 4,
          weekendNightShiftRequired: 4,
          createdBy: 1,
          confirmedAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        scheduleId++;
      }
    }
    console.log(`✓ Inserted ${scheduleId - 1} schedules`);

    // 5. Generate shift assignments
    console.log('Generating shift assignments...');
    const shiftTypes = ['day', 'evening', 'night', 'off'] as const;
    let assignmentCount = 0;

    const allSchedules = await db.select().from(schedules);
    for (const schedule of allSchedules) {
      const daysInMonth = new Date(schedule.year, schedule.month, 0).getDate();
      const wardNurses = await db.select().from(nurses).where(eq(nurses.wardId, schedule.wardId));

      for (const nurse of wardNurses) {
        for (let day = 1; day <= daysInMonth; day++) {
          const date = new Date(schedule.year, schedule.month - 1, day);
          const shiftType = shiftTypes[Math.floor(Math.random() * shiftTypes.length)];
          const isWeekend = date.getDay() === 0 || date.getDay() === 6;

          await db.insert(shiftAssignments).values({
            scheduleId: schedule.id,
            nurseId: nurse.id,
            date: date,
            shiftType: shiftType,
            isWeekend: isWeekend,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
          assignmentCount++;
        }
      }
    }
    console.log(`✓ Inserted ${assignmentCount} shift assignments`);

    console.log('\n✅ Database seeding complete!');
    return {
      success: true,
      summary: {
        wards: wardData.length,
        nurses: nurseId - 1,
        schedules: scheduleId - 1,
        shiftAssignments: assignmentCount,
      },
    };
  } catch (error) {
    console.error('❌ Seeding error:', error);
    throw error;
  }
}
