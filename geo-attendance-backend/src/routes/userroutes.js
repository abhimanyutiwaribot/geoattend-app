const express = require("express");
const authRoute = require("./authroute");
const meRoute = require("./meroutes");
const biometricRoute = require("./biometricRoute");

const userRoutes = express.Router();

userRoutes.use("/auth", authRoute);
userRoutes.use("/biometric", biometricRoute);
userRoutes.use(meRoute)


module.exports = userRoutes