const express = require("express");
const authMiddleware = require("../middleware/authmiddleware");
const meRoute = express.Router();

meRoute.get("/me", authMiddleware, async (req, res) => {
    res.json({
        message: "hello from /me route"
    })
})


module.exports = meRoute;