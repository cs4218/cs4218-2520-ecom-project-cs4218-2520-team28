// Foo Chao, A0272024R

import React, { useState,useEffect } from "react";
import { useAuth } from "../../context/auth";
import { Outlet } from "react-router-dom";
import axios from 'axios';
import toast from "react-hot-toast";
import Spinner from "../Spinner";

export default function PrivateRoute(){
    const [ok,setOk] = useState(false)
    // eslint-disable-next-line
    const [auth,setAuth] = useAuth()

    useEffect(()=> {
        const authCheck = async() => {
            // Foo Chao, A0272024R
            // Added try catch to handle error
            try {
                const res = await axios.get("/api/v1/auth/user-auth");
                if(res.data.ok){
                    setOk(true);
                } else {
                    setOk(false);
                }
            } catch (error) {
                // Token is expired or invalid — clear stale auth and notify user
                setOk(false);
                setAuth({ user: null, token: "" });
                localStorage.removeItem("auth");
                toast.error("Session expired. Please login again.");
            }
        };
        // Foo Chao, A0272024R
        // modified to reset ok to false when no token, to prevent showing Outlet when user logs out and token is removed
        // ensuring security
        if (auth?.token) {
            authCheck();
        } else {
            setOk(false); // Reset to spinner when no token
        }
        // eslint-disable-next-line
    }, [auth?.token]);

    // Foo Chao, A0272024R
    // Modified redirect path to login
    return ok ? <Outlet /> : <Spinner path="login"/>;
}