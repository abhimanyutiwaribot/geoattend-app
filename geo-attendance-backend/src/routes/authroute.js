const express = require("express");
const authRoute = express.Router();

authRoute.post("/register", (req, res) => {
    try{
        if(!req.body){
            return res.status(400).json({
                error: "Req body are missing"
            })
        }
        
        const {name, email, password, deviceId} = req.body;


        res.status(200).json({
            message: "happy register"
        })

    }catch(error){
        res.status(500).json({ error: "Internal server error" });
    }
})

authRoute.post("/login", (req, res) => {
    try{
        if(!req.body){
            return res.status(404).json({
                error: "Req Body are missing"
            })
        }

        const {email, password, deviceId} = req.body;

        res.status(200).json({
            token: "qwertyuiopolkjhgfdszxcvbnm",
            user: {
                id: "someID",
                name: "someName",
                role: "user"
            }
        })


    }catch(error){
        res.status(500).json({
            error: "Internal server error"
        })
    }
})
module.exports = authRoute;