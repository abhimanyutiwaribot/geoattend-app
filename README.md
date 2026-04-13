# Geo Attendance App

Monorepo with three packages — backend API, mobile app, and admin dashboard.

```
geo-attendance-app/
├── geo-attendance-backend/   # Node.js + Express API
├── geo-attendance-mobile/    # React Native (Expo)
└── geo-attendance-admin/     # React + Vite admin dashboard
```

---

## Prerequisites

- Node.js ≥ 18
- npm ≥ 9
- Expo CLI: `npm install -g expo-cli`
- Android emulator or physical device with Expo Go

---

## 1. Backend

```bash
cd geo-attendance-backend
npm install
```

Create `.env` in `geo-attendance-backend/`:

```env
MONGO_URI=<your MongoDB connection string>
JWT_SECRET=<any secret string>
SALT_ROUNDS=10
PORT=3001
```

> **Face recognition models** — place the `face-api.js` model files (`ssdMobilenetv1`, `faceLandmark68Net`, `faceRecognitionNet`) inside a `/models/` folder at `geo-attendance-backend/models/`. Without them the server still starts, but face check-in is unavailable.

```bash
node server.js
```

Server runs on `http://localhost:3001`. Health check: `GET /health`.

---

## 2. Admin Dashboard

```bash
cd geo-attendance-admin
npm install
```

Create `.env` in `geo-attendance-admin/` (optional — defaults to localhost):

```env
VITE_API_URL=http://localhost:3001
```

```bash
npm run dev
```

Opens at `http://localhost:5173`.

---

## 3. Mobile App

```bash
cd geo-attendance-mobile
npm install
```

Create `.env` in `geo-attendance-mobile/`:

```env
EXPO_PUBLIC_API_URL=http://<your-machine-ip>:3001
EXPO_PUBLIC_MAPTILER_KEY=<your MapTiler API key>
```

> Use your machine's local IP (not `localhost`) so the physical device / emulator can reach the backend. Use ngrok if testing over the internet: `ngrok http 3001` and paste the https URL.

```bash
npx expo start
```

Scan the QR code with Expo Go (Android) or press `a` for Android emulator.

---

## Running All Three Together

Open three terminals:

```bash
# Terminal 1
cd geo-attendance-backend && node server.js

# Terminal 2
cd geo-attendance-admin && npm run dev

# Terminal 3
cd geo-attendance-mobile && npx expo start
```
