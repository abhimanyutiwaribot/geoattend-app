const mongoose = require('mongoose');
require('dotenv').config();

async function testAdminDashboard() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Connected to MongoDB for admin testing\n');

        const baseURL = "http://localhost:8000";

        console.log('🎯 Testing Admin Dashboard APIs\n');

        // Step 1: Admin Login
        console.log('1. Testing Admin Login...');
        const loginResponse = await fetch(`${baseURL}/api/v1/admin/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                username: 'superadmin',
                password: 'admin123'
            })
        });
        
        const loginData = await loginResponse.json();
        console.log('📝 Login Response:', loginData);
        
        if (!loginData.success) {
            throw new Error('Admin login failed');
        }

        const adminToken = loginData.data.token;
        console.log(`✅ Admin login successful\n`);

        // Step 2: Test Dashboard Overview
        console.log('2. Testing Dashboard Overview...');
        const dashboardResponse = await fetch(`${baseURL}/api/v1/admin/dashboard`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${adminToken}`,
                'Content-Type': 'application/json'
            }
        });
        
        const dashboardData = await dashboardResponse.json();
        console.log('📊 Dashboard Overview:');
        console.log('   Total Users:', dashboardData.data?.overview?.totalUsers);
        console.log('   Active Sessions:', dashboardData.data?.overview?.activeSessions);
        console.log('   Today Attendances:', dashboardData.data?.overview?.todayAttendances);
        console.log('   Suspicious Activities:', dashboardData.data?.overview?.suspiciousActivities);
        console.log('✅ Dashboard test completed\n');

        // Step 3: Test User Management
        console.log('3. Testing User Management...');
        const usersResponse = await fetch(`${baseURL}/api/v1/admin/users?limit=5`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${adminToken}`,
                'Content-Type': 'application/json'
            }
        });
        
        const usersData = await usersResponse.json();
        console.log('👥 Users List:');
        console.log('   Total Users:', usersData.data?.pagination?.totalUsers);
        console.log('   Users fetched:', usersData.data?.users?.length);
        if (usersData.data?.users?.length > 0) {
            console.log('   First user:', usersData.data.users[0].name);
        }
        console.log('✅ User management test completed\n');

        // Step 4: Test Attendance Monitoring
        console.log('4. Testing Attendance Monitoring...');
        const attendanceResponse = await fetch(`${baseURL}/api/v1/admin/attendances?limit=5`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${adminToken}`,
                'Content-Type': 'application/json'
            }
        });
        
        const attendanceData = await attendanceResponse.json();
        console.log('📍 Attendance Records:');
        console.log('   Total Records:', attendanceData.data?.pagination?.totalRecords);
        console.log('   Records fetched:', attendanceData.data?.attendances?.length);
        console.log('✅ Attendance monitoring test completed\n');

        // Step 5: Test Suspicious Activities
        console.log('5. Testing Suspicious Activities...');
        const suspiciousResponse = await fetch(`${baseURL}/api/v1/admin/suspicious-activities`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${adminToken}`,
                'Content-Type': 'application/json'
            }
        });
        
        const suspiciousData = await suspiciousResponse.json();
        console.log('🚨 Suspicious Activities:');
        console.log('   Suspicious Attendances:', suspiciousData.data?.suspiciousAttendances?.length);
        console.log('   Failed Challenges:', suspiciousData.data?.failedChallenges?.length);
        console.log('✅ Suspicious activities test completed\n');

        // Step 6: Test Geofence Management
        console.log('6. Testing Geofence Management...');
        const geofenceResponse = await fetch(`${baseURL}/api/v1/admin/geofences`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${adminToken}`,
                'Content-Type': 'application/json'
            }
        });
        
        const geofenceData = await geofenceResponse.json();
        console.log('⚙️ Geofences:');
        console.log('   Total Geofences:', geofenceData.data?.geofences?.length);
        if (geofenceData.data?.geofences?.length > 0) {
            console.log('   First geofence:', geofenceData.data.geofences[0].name);
        }
        console.log('✅ Geofence management test completed\n');

        // Step 7: Test Report Generation
        console.log('7. Testing Report Generation...');
        const today = new Date().toISOString().split('T')[0];
        const reportResponse = await fetch(`${baseURL}/api/v1/admin/reports/generate`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${adminToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                type: "daily_attendance",
                startDate: today,
                endDate: today
            })
        });
        
        const reportData = await reportResponse.json();
        console.log('📈 Report Generation:');
        console.log('   Report Type:', reportData.data?.report?.type);
        console.log('   Data Generated:', !!reportData.data?.report?.data);
        console.log('✅ Report generation test completed\n');

        console.log('🎉 ADMIN DASHBOARD TEST COMPLETED SUCCESSFULLY!');
        
        await mongoose.connection.close();
        
    } catch (error) {
        console.error('❌ Admin dashboard test failed:', error);
    }
}

testAdminDashboard();