-- Insert wards
INSERT INTO wards (id, name, createdAt, updatedAt) VALUES 
(101, '101 병동 (내과)', NOW(), NOW()),
(102, '102 병동 (외과)', NOW(), NOW()),
(103, '103 병동 (정형외과)', NOW(), NOW());

-- Insert nurses for ward 101
INSERT INTO nurses (id, name, ward_id, career_years, position, email, phone, preferred_shifts, createdAt, updatedAt) VALUES 
(1, '김영희', 101, 1, '수간호사', 'nurse1@hospital.com', '010-1001-2001', 'day', NOW(), NOW()),
(2, '이순신', 101, 2, '간호사', 'nurse2@hospital.com', '010-1002-2002', 'day', NOW(), NOW()),
(3, '박민준', 101, 3, '간호사', 'nurse3@hospital.com', '010-1003-2003', 'day', NOW(), NOW()),
(4, '정수현', 101, 4, '간호사', 'nurse4@hospital.com', '010-1004-2004', 'day', NOW(), NOW()),
(5, '최민지', 101, 5, '간호사', 'nurse5@hospital.com', '010-1005-2005', 'day', NOW(), NOW()),
(6, '홍길동', 101, 6, '간호사', 'nurse6@hospital.com', '010-1006-2006', 'day', NOW(), NOW()),
(7, '이순애', 101, 7, '간호사', 'nurse7@hospital.com', '010-1007-2007', 'day', NOW(), NOW()),
(8, '박지은', 101, 8, '간호사', 'nurse8@hospital.com', '010-1008-2008', 'day', NOW(), NOW()),
(9, '정민철', 101, 9, '간호사', 'nurse9@hospital.com', '010-1009-2009', 'day', NOW(), NOW()),
(10, '최준호', 101, 10, '간호사', 'nurse10@hospital.com', '010-1010-2010', 'day', NOW(), NOW());

-- Insert nurses for ward 102
INSERT INTO nurses (id, name, ward_id, career_years, position, email, phone, preferred_shifts, createdAt, updatedAt) VALUES 
(11, '김영희', 102, 1, '수간호사', 'nurse11@hospital.com', '010-1011-2011', 'day', NOW(), NOW()),
(12, '이순신', 102, 2, '간호사', 'nurse12@hospital.com', '010-1012-2012', 'day', NOW(), NOW()),
(13, '박민준', 102, 3, '간호사', 'nurse13@hospital.com', '010-1013-2013', 'day', NOW(), NOW()),
(14, '정수현', 102, 4, '간호사', 'nurse14@hospital.com', '010-1014-2014', 'day', NOW(), NOW()),
(15, '최민지', 102, 5, '간호사', 'nurse15@hospital.com', '010-1015-2015', 'day', NOW(), NOW()),
(16, '홍길동', 102, 6, '간호사', 'nurse16@hospital.com', '010-1016-2016', 'day', NOW(), NOW()),
(17, '이순애', 102, 7, '간호사', 'nurse17@hospital.com', '010-1017-2017', 'day', NOW(), NOW()),
(18, '박지은', 102, 8, '간호사', 'nurse18@hospital.com', '010-1018-2018', 'day', NOW(), NOW()),
(19, '정민철', 102, 9, '간호사', 'nurse19@hospital.com', '010-1019-2019', 'day', NOW(), NOW()),
(20, '최준호', 102, 10, '간호사', 'nurse20@hospital.com', '010-1020-2020', 'day', NOW(), NOW());

-- Insert nurses for ward 103
INSERT INTO nurses (id, name, ward_id, career_years, position, email, phone, preferred_shifts, createdAt, updatedAt) VALUES 
(21, '김영희', 103, 1, '수간호사', 'nurse21@hospital.com', '010-1021-2021', 'day', NOW(), NOW()),
(22, '이순신', 103, 2, '간호사', 'nurse22@hospital.com', '010-1022-2022', 'day', NOW(), NOW()),
(23, '박민준', 103, 3, '간호사', 'nurse23@hospital.com', '010-1023-2023', 'day', NOW(), NOW()),
(24, '정수현', 103, 4, '간호사', 'nurse24@hospital.com', '010-1024-2024', 'day', NOW(), NOW()),
(25, '최민지', 103, 5, '간호사', 'nurse25@hospital.com', '010-1025-2025', 'day', NOW(), NOW()),
(26, '홍길동', 103, 6, '간호사', 'nurse26@hospital.com', '010-1026-2026', 'day', NOW(), NOW()),
(27, '이순애', 103, 7, '간호사', 'nurse27@hospital.com', '010-1027-2027', 'day', NOW(), NOW()),
(28, '박지은', 103, 8, '간호사', 'nurse28@hospital.com', '010-1028-2028', 'day', NOW(), NOW()),
(29, '정민철', 103, 9, '간호사', 'nurse29@hospital.com', '010-1029-2029', 'day', NOW(), NOW()),
(30, '최준호', 103, 10, '간호사', 'nurse30@hospital.com', '010-1030-2030', 'day', NOW(), NOW());

-- Insert schedules
INSERT INTO schedules (id, ward_id, year, month, status, day_shift_required, evening_shift_required, night_shift_required, weekend_day_shift_required, weekend_evening_shift_required, weekend_night_shift_required, created_by, confirmed_at, createdAt, updatedAt) VALUES 
(1, 101, 2026, 4, 'draft', 8, 8, 8, 4, 4, 4, 1, NULL, NOW(), NOW()),
(2, 102, 2026, 4, 'draft', 8, 8, 8, 4, 4, 4, 1, NULL, NOW(), NOW()),
(3, 103, 2026, 4, 'draft', 8, 8, 8, 4, 4, 4, 1, NULL, NOW(), NOW());
