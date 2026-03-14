import JWT from "jsonwebtoken";
import userModel from "../models/userModel.js";

// Protected routes token base
export const requireSignIn = async (req, res, next) => {
    try {
        const decode = JWT.verify(
            req.headers.authorization,
            process.env.JWT_SECRET
        );
        req.user = decode;
        next();
    } catch (error) {
        console.log(error);
        // Foo Chao, A0272024R
        // AI Assistance: Github Copilot (Claude Sonnet 4.6)
        // modifeid error handling to return 401 status code and error message instead of just logging the error
        return res.status(401).send({ success: false, message: "Unauthorized: Invalid or missing token" });
    }
};

//admin access
export const isAdmin = async (req, res, next) => {
    try {
        const user = await userModel.findById(req.user._id);
        // Foo Chao, A0272024R
        // AI Assistance: Github Copilot (Claude Sonnet 4.6)
        // added check for user not found and return 401 status code instead of generic Error in admin middleware
        if (!user) {
            return res.status(401).send({
                success: false,
                message: "User not found",
            });
        }
        if (user.role !== 1) {
            return res.status(401).send({
                success: false,
                message: "Unauthorized Access",
            });
        }
        next();
    } catch (error) {
        console.log(error);
        // Foo Chao, A0272024R
        // AI Assistance: Github Copilot (Claude Sonnet 4.6)
        // modified error handling to return 500 status code instead of 401
        res.status(500).send({
            success: false,
            error,
            message: "Error in admin middleware",
        });
    }
};