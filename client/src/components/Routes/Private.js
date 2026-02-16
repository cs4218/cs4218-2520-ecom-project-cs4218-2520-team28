// Foo Chao, A0272024R

import React, { useState,useEffect } from "react";
import { useAuth } from "../../context/auth";
import { Outlet } from "react-router-dom";
import axios from 'axios';
import Spinner from "../Spinner";

export default function PrivateRoute(){
    const [ok,setOk] = useState(false)
    // eslint-disable-next-line
    const [auth,setAuth] = useAuth()

    useEffect(()=> {
        const authCheck = async() => {
            const res = await axios.get("/api/v1/auth/user-auth");
            if(res.data.ok){
                setOk(true);
            } else {
                setOk(false);
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
    }, [auth?.token]);

    return ok ? <Outlet /> : <Spinner path=""/>;
}