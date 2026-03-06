# Admin Panel Setup & Usage

## 🚀 Quick Start

### 1. Install Dependencies
```bash
cd geo-attendance-admin
npm install react-router-dom axios tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

### 2. Start Development Server
```bash
npm run dev
```

The admin panel will be available at `http://localhost:5173`

---

## 🔐 Login Credentials

You need to create an admin user in the backend first.

### Create Admin User (MongoDB)
```javascript
// In MongoDB shell or Compass
db.admins.insertOne({
  name: "Admin User",
  email: "admin@example.com",
  password: "$2b$10$..." // Use bcrypt to hash password
  role: "super_admin",
  permissions: {
    canManageUsers: true,
    canManageGeofence: true,
    canViewReports: true,
    canViewSuspicious: true
  }
})
```

### Or use the backend registration endpoint
```bash
POST http://localhost:3000/admin/register
{
  "name": "Admin User",
  "email": "admin@example.com",
  "password": "your_password"
}
```

---

## 📋 Features Implemented

### ✅ Phase 1: Core Setup
- [x] React + Vite project structure
- [x] Tailwind CSS styling
- [x] API client with axios
- [x] Authentication context
- [x] Protected routes

### ✅ Phase 2: Dashboard
- [x] Stats cards (users, sessions, attendance, suspicious)
- [x] Weekly attendance trend visualization
- [x] Recent activity summary

### ✅ Phase 3: User Management ⭐ **CRITICAL**
- [x] User list with search
- [x] Pagination
- [x] **Assign office to user** (dropdown modal)
- [x] View assigned office
- [x] Remove office assignment

### ✅ Phase 4: Geofence Management
- [x] List all office geofences
- [x] Create new geofence
- [x] View geofence details
- [x] Google Maps integration

---

## 🎯 How to Use

### 1. Login
1. Open `http://localhost:5173/login`
2. Enter admin credentials
3. Click "Sign In"

### 2. Assign Office to User
1. Navigate to **Users** page
2. Search for user (optional)
3. Click **"Assign Office"** button
4. Select office from dropdown
5. Click **"Assign Office"**
6. ✅ User can now only mark attendance at assigned office!

### 3. Create Office Geofence
1. Navigate to **Geofences** page
2. Click **"Create Geofence"**
3. Enter:
   - Office name (e.g., "Mumbai Office")
   - Latitude (e.g., 19.0760)
   - Longitude (e.g., 72.8777)
   - Radius in meters (e.g., 100)
4. Click **"Create Geofence"**

### 4. View Dashboard
- See total users, active sessions
- View weekly attendance trends
- Monitor suspicious activities

---

## 🔧 Configuration

### Environment Variables
Create `.env` file:
```env
VITE_API_URL=http://localhost:3000
```

### Backend URL
The admin panel connects to the backend at `http://localhost:3000` by default.

Make sure your backend is running:
```bash
cd geo-attendance-backend
npm start
```

---

## 📱 Pages Overview

### 1. **Dashboard** (`/dashboard`)
- Overview statistics
- Weekly trends
- Quick insights

### 2. **Users** (`/users`) ⭐ **MOST IMPORTANT**
- List all users
- Search by name/email
- **Assign office to each user**
- View user status
- Pagination

### 3. **Geofences** (`/geofences`)
- View all office locations
- Create new geofences
- See coordinates and radius
- Link to Google Maps

---

## 🎨 UI Features

- **Dark Theme** - Professional slate color scheme
- **Responsive** - Works on desktop, tablet, mobile
- **Icons** - SVG icons throughout
- **Loading States** - Spinners for async operations
- **Error Handling** - User-friendly error messages
- **Modals** - Clean modal dialogs

---

## 🐛 Troubleshooting

### "Failed to fetch users"
- Check backend is running on port 3000
- Verify admin token in localStorage
- Check CORS settings in backend

### "Office not showing in dropdown"
- Create a geofence first in Geofences page
- Refresh the page

### "Cannot assign office"
- Check admin has `canManageUsers` permission
- Verify geofence exists in database

---

## 🔄 Next Steps

### Additional Features to Add:
1. **Attendance Monitoring** - View all attendance records
2. **Reports** - Generate attendance reports
3. **Suspicious Activities** - Monitor flagged users
4. **User Details** - View individual user analytics
5. **Geofence Editing** - Edit existing geofences
6. **Bulk Operations** - Assign office to multiple users

---

## 📊 API Endpoints Used

```javascript
// Authentication
POST /admin/login

// Dashboard
GET /admin/dashboard

// Users
GET /admin/users?page=1&limit=10&search=john
PUT /admin/users/:userId/assign-office

// Geofences
GET /admin/geofences
POST /admin/geofences
```

---

## ✅ Testing Checklist

- [ ] Login with admin credentials
- [ ] View dashboard stats
- [ ] Search for users
- [ ] Assign office to user
- [ ] Remove office assignment
- [ ] Create new geofence
- [ ] View geofence on Google Maps
- [ ] Logout

---

## 🎯 Critical Workflow

**Assigning Office to User (Most Important)**

1. **Create Geofence First**
   - Go to Geofences → Create Geofence
   - Enter office details
   
2. **Assign to User**
   - Go to Users
   - Click "Assign Office" on user
   - Select office from dropdown
   - Confirm
   
3. **Verify**
   - User card shows assigned office
   - User can only mark attendance at that office
   - Mobile app enforces this restriction

---

**Status**: ✅ MVP Complete  
**Priority Features**: All implemented  
**Ready for**: Production testing
