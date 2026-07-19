// Self-contained queue waitlist simulator tests with mocked DB state for standalone run
const avgDuration = 20; // 20 minutes service duration

let mockQueueDb = [];

function joinQueueMock(shopId, resourceId, customerPhone, customerName) {
  const dateStr = new Date().toISOString().split('T')[0];
  const startOfDay = new Date(`${dateStr}T00:00:00+06:00`);
  
  // Count entries for the resource today
  const count = mockQueueDb.filter(e => 
    e.shop_id === shopId && 
    e.resource_id === resourceId && 
    new Date(e.joined_at) >= startOfDay
  ).length;

  const nextSerial = count + 1;
  const newEntry = {
    id: `mock-uuid-${Math.random()}`,
    shop_id: shopId,
    resource_id: resourceId,
    serial_number: nextSerial,
    customer_phone: customerPhone,
    customer_name: customerName,
    status: 'waiting',
    joined_at: new Date().toISOString(),
    called_at: null
  };

  mockQueueDb.push(newEntry);
  return { success: true, data: newEntry };
}

function callNextInQueueMock(shopId, resourceId) {
  // Mark current serving as completed
  mockQueueDb.forEach(e => {
    if (e.shop_id === shopId && e.resource_id === resourceId && e.status === 'being_served') {
      e.status = 'completed';
    }
  });

  // Find next waiting (oldest first)
  const nextEntry = mockQueueDb.find(e => 
    e.shop_id === shopId && 
    e.resource_id === resourceId && 
    e.status === 'waiting'
  );

  if (!nextEntry) {
    return { success: true, called: null };
  }

  nextEntry.status = 'being_served';
  nextEntry.called_at = new Date().toISOString();
  return { success: true, called: nextEntry };
}

function getWaitTimeEstimateMock(shopId, resourceId, customerPhone) {
  const customerEntry = mockQueueDb.find(e => 
    e.shop_id === shopId && 
    e.resource_id === resourceId && 
    e.customer_phone === customerPhone && 
    e.status === 'waiting'
  );

  if (!customerEntry) {
    return { success: false, error: 'Spot not found.' };
  }

  // Count waiting ahead of this customer
  const waitingAhead = mockQueueDb.filter(e => 
    e.shop_id === shopId && 
    e.resource_id === resourceId && 
    e.status === 'waiting' && 
    e.serial_number < customerEntry.serial_number
  ).length;

  // Check if someone is currently served
  const servingCount = mockQueueDb.filter(e => 
    e.shop_id === shopId && 
    e.resource_id === resourceId && 
    e.status === 'being_served'
  ).length;

  const position = waitingAhead + servingCount;
  const estimateMinutes = position * avgDuration;

  return {
    success: true,
    serial_number: customerEntry.serial_number,
    position,
    minutes: estimateMinutes
  };
}

async function runTest() {
  console.log('--- STARTING LIVE QUEUE SERIAL QUEUE FLOW TEST (MOCKED DB) ---');
  
  const shopId = 'shop-123';
  const resourceId = 'resource-456';
  
  console.log('\nStep 1: Adding 3 guests to the waitlist queue...');
  const phoneA = '01711111111';
  const phoneB = '01722222222';
  const phoneC = '01733333333';

  const guestA = joinQueueMock(shopId, resourceId, phoneA, 'Guest Alpha');
  const guestB = joinQueueMock(shopId, resourceId, phoneB, 'Guest Beta');
  const guestC = joinQueueMock(shopId, resourceId, phoneC, 'Guest Gamma');

  console.log(`Added Guest Alpha: Serial #${guestA.data.serial_number}`);
  console.log(`Added Guest Beta: Serial #${guestB.data.serial_number}`);
  console.log(`Added Guest Gamma: Serial #${guestC.data.serial_number}`);

  // Fetch initial wait-times
  console.log('\nChecking initial wait time estimates (No one serving yet)...');
  const estA1 = getWaitTimeEstimateMock(shopId, resourceId, phoneA);
  const estB1 = getWaitTimeEstimateMock(shopId, resourceId, phoneB);
  const estC1 = getWaitTimeEstimateMock(shopId, resourceId, phoneC);

  console.log(`Guest Alpha (#${estA1.serial_number}) Position=${estA1.position}, Wait=${estA1.minutes} mins (Expected: Position=0, Wait=0)`);
  console.log(`Guest Beta (#${estB1.serial_number}) Position=${estB1.position}, Wait=${estB1.minutes} mins (Expected: Position=1, Wait=20)`);
  console.log(`Guest Gamma (#${estC1.serial_number}) Position=${estC1.position}, Wait=${estC1.minutes} mins (Expected: Position=2, Wait=40)`);

  if (estA1.position !== 0 || estB1.minutes !== 20 || estC1.minutes !== 40) {
    console.error('Wait time validation failed!');
    process.exit(1);
  }

  // Call Next (Alpha gets served)
  console.log('\nStep 2: Advancing queue - calling first guest (Alpha starts serving)...');
  const call1 = callNextInQueueMock(shopId, resourceId);
  console.log(`Called guest: ${call1.called.customer_name} (Status = ${call1.called.status})`);

  // Re-estimate
  const estA2 = getWaitTimeEstimateMock(shopId, resourceId, phoneA);
  const estB2 = getWaitTimeEstimateMock(shopId, resourceId, phoneB);
  const estC2 = getWaitTimeEstimateMock(shopId, resourceId, phoneC);

  console.log(`Guest Alpha Active Status Check: ActiveWaiting=${estA2.success ? 'Yes' : 'No'} (Expected: No, since serving)`);
  console.log(`Guest Beta (#${estB2.serial_number}) Position=${estB2.position}, Wait=${estB2.minutes} mins (Expected: Position=1, Wait=20)`);
  console.log(`Guest Gamma (#${estC2.serial_number}) Position=${estC2.position}, Wait=${estC2.minutes} mins (Expected: Position=2, Wait=40)`);

  if (estA2.success || estB2.position !== 1 || estC2.minutes !== 40) {
    console.error('State assertion failed after call 1!');
    process.exit(1);
  }

  // Call Next again (Alpha completed, Beta starts serving)
  console.log('\nStep 3: Advancing queue - calling next guest (Beta starts serving, Alpha completed)...');
  const call2 = callNextInQueueMock(shopId, resourceId);
  console.log(`Called guest: ${call2.called.customer_name} (Status = ${call2.called.status})`);

  // Re-estimate Gamma
  const estC3 = getWaitTimeEstimateMock(shopId, resourceId, phoneC);
  console.log(`Guest Gamma (#${estC3.serial_number}) Position=${estC3.position}, Wait=${estC3.minutes} mins (Expected: Position=1, Wait=20)`);

  if (estC3.position !== 1 || estC3.minutes !== 20) {
    console.error('Wait time calculation failed after call 2!');
    process.exit(1);
  }

  // Call Next final (Gamma starts serving, Beta completed)
  console.log('\nStep 4: Advancing queue - calling next guest (Gamma starts serving, Beta completed)...');
  const call3 = callNextInQueueMock(shopId, resourceId);
  console.log(`Called guest: ${call3.called.customer_name} (Status = ${call3.called.status})`);

  const estC4 = getWaitTimeEstimateMock(shopId, resourceId, phoneC);
  console.log(`Guest Gamma Active Status Check: ActiveWaiting=${estC4.success ? 'Yes' : 'No'} (Expected: No, since serving)`);

  console.log('\n--- LIVE QUEUE SERIAL QUEUE FLOW TEST PASSED ---');
}

runTest();
