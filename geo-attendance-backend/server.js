const express = require("express");
const connectDB = require("./db.js")
const userRoutes = require("./src/routes/userroutes");
const app = express();
require("dotenv").config();
app.use(express.json())

connectDB()
app.use("/api/v1/user", userRoutes)
app.listen(8000, console.log("Running"))