const express = require("express");
const userRoutes = require("./src/routes/userroutes");
const app = express();
app.use(express.json())

app.use("/api/v1/user", userRoutes)
app.listen(8000, console.log("Running"))