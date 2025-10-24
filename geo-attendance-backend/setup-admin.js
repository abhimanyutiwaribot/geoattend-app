const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
require('dotenv').config();

async function setupAdminUser() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Connected to MongoDB');

        const Admin = require("./src/models/admin");

        // Check if admin already exists
        const existingAdmin = await Admin.findOne({ username: 'superadmin' });
        if (existingAdmin) {
            console.log('✅ Admin user already exists');
            await mongoose.connection.close();
            return;
        }

        // Create default admin
        const saltRounds = parseInt(process.env.SALT_ROUNDS) || 10;
        const hashedPassword = await bcrypt.hash('admin123', saltRounds);

        const admin = new Admin({
            username: 'superadmin',
            email: 'admin@geoattendance.com',
            password: hashedPassword,
            role: 'super_admin',
            permissions: {
                canManageUsers: true,
                canViewReports: true,
                canManageGeofence: true,
                canViewSuspicious: true
            }
        });

        await admin.save();
        console.log('✅ Default admin user created:');
        console.log('   Username: superadmin');
        console.log('   Password: admin123');
        console.log('   Email: admin@geoattendance.com');

        await mongoose.connection.close();
    } catch (error) {
        console.error('❌ Error setting up admin:', error);
    }
}

setupAdminUser();