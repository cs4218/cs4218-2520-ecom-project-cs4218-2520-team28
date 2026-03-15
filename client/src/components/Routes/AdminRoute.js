import React, { useState,useEffect } from "react";
import { useAuth } from "../../context/auth";
import { Outlet } from "react-router-dom";
import axios from 'axios';
import toast from "react-hot-toast";
import Spinner from "../Spinner";

export default function AdminRoute(){
    const [ok,setOk] = useState(false)
    const [auth,setAuth] = useAuth()

    useEffect(()=> {
        const authCheck = async() => {
            // Foo Chao, A0272024R
            // Added try catch to handle error
            try {
                const res = await axios.get("/api/v1/auth/admin-auth");
                if(res.data.ok){
                    setOk(true);
                } else {
                    setOk(false);
                }
            } catch (error) {
                // Token is expired, invalid, or user is no longer admin — clear stale auth
                setOk(false);
                setAuth({ user: null, token: "" });
                localStorage.removeItem("auth");
                toast.error("Session expired. Please login again.");
            }
        };
        // Foo Chao, A0272024R
        // modified to reset ok to false when no token, to prevent showing Outlet when user logs out and token is removed
        // ensuring security
        if (auth?.token) authCheck();
        else setOk(false);
        // eslint-disable-next-line
    }, [auth?.token]);
    
    return ok ? <Outlet /> : <Spinner/>;
}