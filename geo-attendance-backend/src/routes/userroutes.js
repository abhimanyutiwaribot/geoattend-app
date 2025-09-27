const express = require("express");
const authRoute = require("./authroute");

const userRoutes = express.Router();

userRoutes.use("/auth", authRoute);


module.exports = userRoutes