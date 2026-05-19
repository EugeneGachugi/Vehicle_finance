import { useState, useEffect, useCallback } from "react";
import api from "@/api/axios";
import { parseBackendError } from "@/utils/errorParser";

export function useAdminDrivers(){
    const[drivers, setDrivers] = useState([]);
    const [accessRequests, setAccessRequests]= useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    const fetchDriversData = useCallback(async () =>{
        setIsLoading(true);
        setError(null);
        try{
            const response = await api.get("/api/users/drivers/");
            const allDrivers = response.data;

            setDrivers(allDrivers.filter(d => d.driver_profile?.verification_status === "VERIFIED"));
            setAccessRequests(allDrivers.filter(d=> d.driver_profile?.verification_status === "PENDING"));
        }catch(err){
            setError(parseBackendError(err));
        }finally {
            setIsLoading(false);
        }
    },[]);

    const createDriver = useCallback(async (driverFormData) => {
        setIsLoading(true);
        setError(null);
        try{
            const [firstName = "", ...lastNameParts] = (driverFormData.full_name || "").trim().split(/\s+/);

            await api.post("/api/users/onboard/",{
                username: driverFormData.username || driverFormData.email,
                email: driverFormData.email,
                first_name: firstName,
                last_name: lastNameParts.join(" "),
                password: driverFormData.password,
                national_id: driverFormData.national_id,
                profile_details: {
                    kra_pin: driverFormData.kra_pin,
                    dl_number: driverFormData.dl_number || driverFormData.driving_license_number,
                },
            });
            await fetchDriversData();
        }catch (err){
            setError(parseBackendError(err));
            throw err;
        }finally{
            setIsLoading(false);
        }
    }, [fetchDriversData]);

    const approveDriver = useCallback(async (driverId) => {
        setIsLoading(true);
        setError(null);
        try{
            await api.patch(`/api/users/drivers/${driverId}/verification/`,{
                verification_status: "VERIFIED"
            });
            await fetchDriversData();
        }catch (err){
            setError(parseBackendError(err));
        }finally {
            setIsLoading(false);
        }
    }, [fetchDriversData]);

    const rejectDriver = useCallback(async (driverId) => {
        setIsLoading(true);
        setError(null);
        try{
            await api.patch(`/api/users/drivers/${driverId}/verification/`,{
                verification_status: "REJECTED"
            });
            await fetchDriversData();
        }catch (err){
            setError(parseBackendError(err));
        }finally {
            setIsLoading(false);
        }
    }, [fetchDriversData]);

    useEffect(() => {
        fetchDriversData();
    }, [fetchDriversData]);

    const clearError = useCallback(() => setError(null),[]);
    return {drivers, accessRequests, isLoading, error, clearError, createDriver, approveDriver, rejectDriver, refreshDrivers: fetchDriversData};

}
