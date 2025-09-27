const express = require("express");
const authRoute = express.Router();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken")
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
        // console.log(isPreviousUser)

        if(isPreviousUser){
            return res.status(409).json({
                success: false,
                message: "User already registered with this email",
                error: "USER_ALREADY_EXISTS"
            });
        }

        const existingDeviceUser = await UserModel.findOne({ deviceID });
        if (existingDeviceUser) {
            return res.status(409).json({
                success: false,
                message: "This device is already registered with another account",
                error: "DEVICE_ALREADY_REGISTERED"
            });
        }


        
        const saltRounds = parseInt(process.env.SALT_ROUNDS) || 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        
        const user = await UserModel.create({ 
            name,
            email,
            password: hashedPassword,
            deviceID, // Bind device during registration
            devices: [{
                deviceID: deviceID,
                deviceName: "Primary Device",
                lastLogin: new Date(),
                isActive: true
            }],
            firstLogin: new Date(),
            lastLogin: new Date()
         });

        res.status(201).json({
            success: true,
            message: "User registered successfully",
            data: {
                user: {
                    id: user._id,
                    name: user.name,
                    email: user.email,
                    deviceID: user.deviceID
                }
            }
        })
    }
    catch(error){
        console.error("Registration error:", error);
        res.status(500).json({ 
            success: false,
            error: "Internal server error"
         });
    }
})

authRoute.post("/login", async (req, res) => {
    try{
        if(!req.body){
            return res.status(404).json({
                error: "Req Body are missing"
            })
        }

        const {email, password, deviceID} = req.body;

        const user = await UserModel.findOne({ email });

        if (!user) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password",
                error: "USER_NOT_FOUND"
            });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password)
        if(!isPasswordValid){
            return res.status(401).json({
                success: false,
                message: "Invalid email or password",
                error: "INVALID_CREDENTIALS"
            })
        }

        if (user.deviceID !== deviceID) {
            return res.status(403).json({
                success: false,
                message: "This account is bound to another device. Please use your registered device.",
                error: "DEVICE_MISMATCH",
                registeredDeviceID: user.deviceID // Optional: for debugging
            });
        }

        user.lastLogin = new Date();
        user.loginCount += 1;


        const device = user.devices.find(d => d.deviceID === deviceID);
        if (device) {
            device.lastLogin = new Date();
        }

        await user.save()

        const token = jwt.sign(
            {
                userId: user._id,
                email: user.email,
                deviceID: user.deviceID
            },
             process.env.JWT_SECRET
            ,{expiresIn: '7d'}
        );

        res.status(200).json({
            success: true,
            messgae: "Login successful",
            data: {
                user: {
                    id: user._id,
                    name: user.name,
                    email: user.email,
                    deviceID: user.deviceID
                },
                token
            }
        });

    }catch(error){
        console.error("Login error:", error);
        res.status(500).json({
            success: false,
            error: "Internal server error"
        });
    }
});


module.exports = authRoute;