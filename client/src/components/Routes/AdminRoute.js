import React, { useState,useEffect } from "react";
import { useAuth } from "../../context/auth";
import { Outlet } from "react-router-dom";
import axios from 'axios';
import toast from "react-hot-toast";
import Spinner from "../Spinner";

export default function AdminRoute(){
    const [ok,setOk] = useState(false)
    // Foo Chao, A0272024R
    // AI Assistance: Github Copilot (Claude Sonnet 4.6)
    // Bug fix: track where to redirect so a non-admin (403) goes to /dashboard/user
    // while an unauthenticated user (401/network error) goes to /login
    const [redirectPath, setRedirectPath] = useState('login')
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
                setOk(false);
                // Foo Chao, A0272024R
                // AI Assistance: Github Copilot (Claude Sonnet 4.6)
                // Bug fix: 403 means "authenticated but not admin" — keep the user's session
                // intact and redirect them to their own dashboard instead of logging them out.
                // Any other status (401 invalid token, 500, network error) means the session
                // is genuinely broken — clear auth and redirect to login as before.
                if (error.response?.status === 403) {
                    setRedirectPath('dashboard/user');
                } else {
                    setRedirectPath('login');
                    setAuth({ user: null, token: "" });
                    localStorage.removeItem("auth");
                    toast.error("Session expired. Please login again.");
                }
            }
        };
        // Foo Chao, A0272024R
        // modified to reset ok to false when no token, to prevent showing Outlet when user logs out and token is removed
        // ensuring security
        if (auth?.token) authCheck();
        else {
            setOk(false);
            setRedirectPath('login'); // reset so a subsequent login always starts from /login
        }
        // eslint-disable-next-line
    }, [auth?.token]);
    
    return ok ? <Outlet /> : <Spinner path={redirectPath}/>;
}