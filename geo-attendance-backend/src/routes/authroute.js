const express = require("express");
const authRoute = express.Router();
const bcrypt = require("bcrypt");
const UserModel = require("../models/user");

authRoute.post("/register", async (req, res) => {
    try{
        if(!req.body){
            return res.status(400).json({
                error: "Req body are missing"
            })
        }
        const {name, email, password, deviceID} = req.body;
        
        console.log(req.body)
        const isPreviousUser = await UserModel.findOne({
            email
        })
        console.log(isPreviousUser)

        if(isPreviousUser){
            return res.status(409).json({
                success: false,
                message: "User already registered with this email",
                error: "USER_ALREADY_EXISTS"
            });
        }
        
        const saltRounds = parseInt(process.env.SALT_ROUNDS) || 10;

        const hashedPassword = await bcrypt.hash(password, saltRounds);
        const user = await UserModel.create({ 
            name,
            email,
            password: hashedPassword,
            deviceID
         });

        res.status(201).json({
            success: true,
            message: "User registered successfully",
            data: {
                id: user._id,
                name: user.name,
                email: user.email,
                deviceID: user.deviceID
            }
        })
    }
    catch(error){
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
});


module.exports = authRoute;