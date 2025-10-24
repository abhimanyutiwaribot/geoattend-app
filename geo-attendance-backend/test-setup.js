const mongoose = require('mongoose');
require('dotenv').config();

// Test data setup
async function setupTestData() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Connected to MongoDB for testing');
        
        const GeoFenceModel = require('./src/models/officeGeofence');
        
        // Create a test geofence if it doesn't exist
        const existingGeofence = await GeoFenceModel.findOne();
        if (!existingGeofence) {
            await GeoFenceModel.create({
                name: "Main Office",
                center: {
                    lat: 28.6129,  // Example: Delhi coordinates
                    lng: 77.2295
                },
                radius: 100
            });
            console.log('✅ Test geofence created');
        } else {
            console.log('✅ Geofence already exists');
        }

        console.log('\n🎯 Test Geofence Details:');
        console.log('Location: 28.6129, 77.2295');
        console.log('Radius: 100 meters');
        console.log('\n📝 Use these coordinates for testing:');
        console.log('✅ WITHIN geofence: 28.6129, 77.2295');
        console.log('❌ OUTSIDE geofence: 28.7000, 77.3000');

        await mongoose.connection.close();
    } catch (error) {
        console.error('❌ Test setup failed:', error);
    }
}

setupTestData();