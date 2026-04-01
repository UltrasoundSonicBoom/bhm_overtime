const puppeteer = require('puppeteer');
const path = require('path');

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  // 콘솔 메시지 캡처
  const logs = [];
  page.on('console', msg => logs.push('[' + msg.type() + '] ' + msg.text()));
  page.on('pageerror', err => logs.push('[ERROR] ' + err.message));

  const filePath = 'file://' + path.resolve('index.html');
  await page.goto(filePath, { waitUntil: 'networkidle0', timeout: 10000 });

  // 2초 대기 (비동기 로딩)
  await new Promise(r => setTimeout(r, 2000));

  // 캘린더 상태 확인
  const result = await page.evaluate(() => {
    const otCal = document.getElementById('otCalendar');
    const lvCal = document.getElementById('lvCalendar');
    const otDash = document.getElementById('otDashboard');

    return {
      otCalendarExists: !!otCal,
      otCalendarContent: otCal ? otCal.innerHTML.substring(0, 300) : 'N/A',
      otCalendarEmpty: otCal ? otCal.innerHTML.trim() === '' : true,
      lvCalendarExists: !!lvCal,
      lvCalendarEmpty: lvCal ? lvCal.innerHTML.trim() === '' : true,
      otDashboardContent: otDash ? otDash.innerHTML.substring(0, 150) : 'N/A',
      otCurrentYear: typeof otCurrentYear !== 'undefined' ? otCurrentYear : 'undefined',
      otCurrentMonth: typeof otCurrentMonth !== 'undefined' ? otCurrentMonth : 'undefined'
    };
  });

  console.log('=== 캘린더 상태 ===');
  console.log('시간외 캘린더 존재:', result.otCalendarExists);
  console.log('시간외 캘린더 비어있음:', result.otCalendarEmpty);
  console.log('휴가 캘린더 존재:', result.lvCalendarExists);
  console.log('휴가 캘린더 비어있음:', result.lvCalendarEmpty);
  console.log('\n=== 변수 상태 ===');
  console.log('otCurrentYear:', result.otCurrentYear);
  console.log('otCurrentMonth:', result.otCurrentMonth);
  console.log('\n=== 시간외 캘린더 내용 ===');
  console.log(result.otCalendarContent || '(비어있음)');
  console.log('\n=== 대시보드 내용 ===');
  console.log(result.otDashboardContent || '(비어있음)');

  if (logs.length > 0) {
    console.log('\n=== 콘솔 로그 ===');
    logs.forEach(l => console.log(l));
  }

  await browser.close();
})();
