import { createContext, useState, useContext, useEffect } from "react";
import api from "@/api/axios"

const AuthContext = createContext();

export const AuthProvider = ({children}) => {
    const [user, setUser] = useState(null);
    const[loading, setLoading] = useState(true);
//check if user was already logged in
    useEffect(() =>{
        const savedUser = localStorage.getItem("user")
        if(savedUser){
            setUser(JSON.parse(savedUser));
        }
        setLoading(false);
    },[]);
const login = async (email,password) => {
    const response = await api.post("/api/users/login/", {email,password});
    const {user: userData, access, refresh} = response.data;

    localStorage.setItem("access_token", access);
    localStorage.setItem("refresh_token", refresh);
    localStorage.setItem("user", JSON.stringify(userData));

    setUser(userData);
    return userData;
};
const logout = () =>{
    localStorage.clear();
    setUser(null);
};

return (
    <AuthContext.Provider value={{ user, login, logout, loading}}>
        {!loading && children}
    </AuthContext.Provider>
);
};

export const useAuth = () => useContext(AuthContext);
