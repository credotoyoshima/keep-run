// Test script to verify localStorage and day change detection
console.log('=== Keep-run Debug Test ===\n');

// 1. Test localStorage directly
console.log('1. Testing localStorage:');
try {
  // Write test
  localStorage.setItem('test-key', 'test-value');
  const testValue = localStorage.getItem('test-key');
  console.log('✓ Write/Read test:', testValue === 'test-value' ? 'PASSED' : 'FAILED');
  
  // Check current values
  console.log('- selectedDayPage:', localStorage.getItem('selectedDayPage'));
  console.log('- dayStartTime:', localStorage.getItem('dayStartTime'));
  console.log('- expandedTimeBlocks:', localStorage.getItem('expandedTimeBlocks'));
  
  // Test page persistence
  console.log('\n2. Testing page persistence:');
  const currentPage = localStorage.getItem('selectedDayPage');
  console.log('- Current page:', currentPage);
  
  // Set a new page value
  localStorage.setItem('selectedDayPage', '2');
  console.log('- Set page to 2');
  console.log('- Read back:', localStorage.getItem('selectedDayPage'));
  
  // Restore original if existed
  if (currentPage) {
    localStorage.setItem('selectedDayPage', currentPage);
  }
} catch (error) {
  console.error('❌ localStorage error:', error);
}

// 2. Test day change logic
console.log('\n3. Testing day change logic:');
const dayStartTime = localStorage.getItem('dayStartTime') || '05:00';
console.log('- Day start time:', dayStartTime);

// Calculate current date with day start consideration
const now = new Date();
const [hours, minutes] = dayStartTime.split(':').map(Number);
const dayStart = new Date(now);
dayStart.setHours(hours, minutes, 0, 0);

console.log('- Current time:', now.toLocaleString());
console.log('- Day boundary:', dayStart.toLocaleString());

if (now < dayStart) {
  console.log('- Current time is BEFORE day boundary (belongs to yesterday)');
} else {
  console.log('- Current time is AFTER day boundary (belongs to today)');
}

// 3. Check for enhanced vs regular detector
console.log('\n4. Checking which day detector is imported:');
console.log('- Check if SimpleDayViewOptimized imports from:');
console.log('  - day-change-detector-enhanced.ts (new) OR');
console.log('  - day-change-detector.ts (original)');

// 4. Test API endpoint
console.log('\n5. Testing API endpoint:');
fetch('/api/day/reset-tasks', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  }
})
.then(response => {
  console.log('- API Response status:', response.status);
  console.log('- Status text:', response.statusText);
  return response.text();
})
.then(text => {
  try {
    const data = JSON.parse(text);
    console.log('- Response data:', data);
  } catch (e) {
    console.log('- Response text:', text);
  }
})
.catch(error => {
  console.error('- API Error:', error);
});

console.log('\n=== End of Debug Test ===');