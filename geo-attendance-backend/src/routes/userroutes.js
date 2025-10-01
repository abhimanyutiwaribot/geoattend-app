const express = require("express");
const authRoute = require("./authroute");
const meRoute = require("./meroutes");

const userRoutes = express.Router();

userRoutes.use("/auth", authRoute);
userRoutes.use(meRoute)


module.exports = userRoutes