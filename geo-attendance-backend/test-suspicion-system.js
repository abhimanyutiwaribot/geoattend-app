const mongoose = require('mongoose');
require('dotenv').config();

async function testSuspicionSystem() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Connected to MongoDB for suspicion testing\n');

        // Test data
        const testToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2OGZiNWRkZDE2YTQ0MzRhMWRjZmEwZmMiLCJlbWFpbCI6InRlc3QyQGV4YW1wbGUuY29tIiwiZGV2aWNlSUQiOiJkZXZpY2UtMDAyIiwiaWF0IjoxNzYxMzA0MDQ1LCJleHAiOjE3NjE5MDg4NDV9.QpWCaOpeb8TM7ke0KoWWUm4WOLhaPNTLwpFz00cXJG4"; // Replace with actual token
        const baseURL = "http://localhost:8000";

        console.log('🎯 Testing Suspicion Detection & Revalidation System\n');

        // Test 1: Start a new attendance session
        console.log('1. Starting attendance session...');
        const startResponse = await fetch(`${baseURL}/api/v1/attendance/start`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${testToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                lat: 28.6129,
                lng: 77.2295
            })
        });

        const startData = await startResponse.json();
        console.log('📝 Start Response:', startData);

        if (!startData.success) {
            throw new Error('Failed to start attendance session');
        }

        const attendanceId = startData.data.attendanceId;
        console.log(`✅ Attendance started: ${attendanceId}\n`);

        // Test 2: Send suspicious motion data (no movement)
        console.log('2. Sending suspicious motion data (no movement)...');
        for (let i = 0; i < 3; i++) {
            const validateResponse = await fetch(`${baseURL}/api/v1/attendance/validate`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${testToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    attendanceId: attendanceId,
                    gyro: [0, 0, 0],  // No movement - suspicious!
                    accel: [0, 0, 0]   // No acceleration - very suspicious!
                })
            });

            const validateData = await validateResponse.json();
            console.log(`   Validation ${i + 1}:`, validateData.data?.motionAnalysis);

            if (validateData.data && validateData.data.motionAnalysis) {
                console.log(`   Motion Analysis:`, validateData.data.motionAnalysis);
            } else {
                console.log(`   ❌ No motion analysis in response`);
                console.log(`   Full response:`, JSON.stringify(validateData, null, 2));
            }

            // Wait 1 second between requests
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        // Test 3: Check for suspicion
        console.log('\n3. Checking for suspicion...');
        const suspicionResponse = await fetch(`${baseURL}/api/v1/attendance/check-suspicion`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${testToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                attendanceId: attendanceId
            })
        });

        const suspicionData = await suspicionResponse.json();
        console.log('🔍 Suspicion Analysis:', JSON.stringify(suspicionData, null, 2));

        // Test 4: If challenge generated, test challenge response
        if (suspicionData.data?.challenge) {
            console.log('\n4. Testing revalidation challenge...');
            const challengeId = suspicionData.data.challenge.challengeId;
            const challengeType = suspicionData.data.challenge.challengeType;

            console.log(`   Challenge Type: ${challengeType}`);
            console.log(`   Challenge ID: ${challengeId}`);

            // Test different challenge responses based on type
            let testResponse = {};

            switch (challengeType) {
                case 'qr_scan':
                    testResponse = { scannedCode: suspicionData.data.challenge.challengeData.qrCode };
                    break;
                case 'question':
                    // For testing, we'll need to know the answer. In real app, this would come from the challenge data
                    testResponse = { answer: "8" }; // Default test answer
                    break;
                case 'pattern_match':
                    testResponse = { pattern: suspicionData.data.challenge.challengeData.pattern };
                    break;
            }

            console.log('   Test Response:', testResponse);

            const challengeResponse = await fetch(`${baseURL}/api/v1/attendance/validate-challenge`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${testToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    challengeId: challengeId,
                    attendanceId: attendanceId,
                    response: testResponse
                })
            });

            const challengeResult = await challengeResponse.json();
            console.log('   Challenge Result:', challengeResult);

            // Test 5: Test invalid challenge response
            if (challengeResult.isValid) {
                console.log('\n5. Testing invalid challenge response...');
                const invalidResponse = await fetch(`${baseURL}/api/v1/attendance/validate-challenge`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${testToken}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        challengeId: challengeId, // This should fail now since challenge is completed
                        attendanceId: attendanceId,
                        response: { scannedCode: "WRONG_CODE" }
                    })
                });

                const invalidResult = await invalidResponse.json();
                console.log('   Invalid Response Result:', invalidResult);
            }
        }

        // Test 6: End attendance session
        console.log('\n6. Ending attendance session...');
        const endResponse = await fetch(`${baseURL}/api/v1/attendance/end`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${testToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                attendanceId: attendanceId
            })
        });

        const endData = await endResponse.json();
        console.log('📝 End Response:', endData);

        console.log('\n🎉 SUSPICION SYSTEM TEST COMPLETED!');

        await mongoose.connection.close();

    } catch (error) {
        console.error('❌ Test failed:', error);
    }
}

// Manual test function for step-by-step testing
async function manualTestStepByStep() {
    console.log('🔧 Manual Testing Mode - Copy these commands:\n');

    console.log('1. Start Attendance:');
    console.log(`curl -X POST http://localhost:8000/api/v1/attendance/start \\\n  -H "Authorization: Bearer YOUR_TOKEN" \\\n  -H "Content-Type: application/json" \\\n  -d '{"lat": 28.6129, "lng": 77.2295}'`);

    console.log('\n2. Send Suspicious Motion (No Movement):');
    console.log(`curl -X POST http://localhost:8000/api/v1/attendance/validate \\\n  -H "Authorization: Bearer YOUR_TOKEN" \\\n  -H "Content-Type: application/json" \\\n  -d '{"attendanceId": "ATTENDANCE_ID", "gyro": [0,0,0], "accel": [0,0,0]}'`);

    console.log('\n3. Check Suspicion:');
    console.log(`curl -X POST http://localhost:8000/api/v1/attendance/check-suspicion \\\n  -H "Authorization: Bearer YOUR_TOKEN" \\\n  -H "Content-Type: application/json" \\\n  -d '{"attendanceId": "ATTENDANCE_ID"}'`);

    console.log('\n4. Validate Challenge (if generated):');
    console.log(`curl -X POST http://localhost:8000/api/v1/attendance/validate-challenge \\\n  -H "Authorization: Bearer YOUR_TOKEN" \\\n  -H "Content-Type: application/json" \\\n  -d '{"challengeId": "CHALLENGE_ID", "attendanceId": "ATTENDANCE_ID", "response": {"scannedCode": "QR_CODE_HERE"}}'`);
}

// Run the test
if (process.argv.includes('--manual')) {
    manualTestStepByStep();
} else {
    testSuspicionSystem();
}