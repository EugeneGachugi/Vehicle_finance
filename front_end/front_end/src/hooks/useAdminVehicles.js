import { useCallback, useEffect, useState } from "react";
import api from "@/api/axios";
import { parseBackendError } from "@/utils/errorParser";

const normalizeVehicle = (vehicle) => ({
  id: vehicle.id,
  plate_number: vehicle.plate_number,
  full_name: vehicle.full_name,
  model: vehicle.model,
  make: vehicle.model_details?.make_details?.make || "",
  model_name: vehicle.model_details?.name || "",
  yom: vehicle.yom,
  chasis_number: vehicle.chasis_number,
  engine_number: vehicle.engine_number,
  color: vehicle.color,
  valuation: vehicle.valuation,
  status: vehicle.status,
  status_display: vehicle.status_display,
  driver: vehicle.driver,
});

export function useAdminVehicles() {
  const [vehicles, setVehicles] = useState([]);
  const [vehicleModels, setVehicleModels] = useState([]);
  const [vehicleMakes, setVehicleMakes] = useState([]);
  const [availableVehicles, setAvailableVehicles] = useState([]);
  const [financedVehicles, setFinancedVehicles] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchVehiclesData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [vehiclesResponse, modelsResponse, makesResponse] = await Promise.all([
        api.get("/api/vehicles/fleet/"),
        api.get("/api/vehicles/models/"),
        api.get("/api/vehicles/makes/"),
      ]);
      const allVehicles = vehiclesResponse.data.map(normalizeVehicle);

      setVehicles(allVehicles);
      setVehicleModels(modelsResponse.data);
      setVehicleMakes(makesResponse.data);
      setAvailableVehicles(allVehicles.filter((vehicle) => vehicle.status === "AV"));
      setFinancedVehicles(allVehicles.filter((vehicle) => vehicle.status === "FI"));
    } catch (err) {
      setError(parseBackendError(err));
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createVehicle = useCallback(async (vehicleFormData) => {
    setIsLoading(true);
    setError(null);

    try {
      await api.post("/api/vehicles/fleet/", {
        plate_number: vehicleFormData.plate_number || vehicleFormData.registration_number,
        model: vehicleFormData.model,
        yom: vehicleFormData.yom,
        chasis_number: vehicleFormData.chasis_number,
        engine_number: vehicleFormData.engine_number,
        color: vehicleFormData.color,
        valuation: vehicleFormData.valuation,
        status: vehicleFormData.status || "AV",
        driver: vehicleFormData.driver || null,
      });
      await fetchVehiclesData();
    } catch (err) {
      setError(parseBackendError(err));
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [fetchVehiclesData]);

  const deleteVehicle = useCallback(async (vehicleId) => {
    setIsLoading(true);
    setError(null);

    try {
      await api.delete(`/api/vehicles/fleet/${vehicleId}/`);
      await fetchVehiclesData();
    } catch (err) {
      setError(parseBackendError(err));
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [fetchVehiclesData]);

  const updateVehicle = useCallback(async (vehicleId, vehicleFormData) => {
    setIsLoading(true);
    setError(null);

    try {
      await api.patch(`/api/vehicles/fleet/${vehicleId}/`, vehicleFormData);
      await fetchVehiclesData();
    } catch (err) {
      setError(parseBackendError(err));
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [fetchVehiclesData]);

  useEffect(() => {
    fetchVehiclesData();
  }, [fetchVehiclesData]);

  const clearError = useCallback(() => setError(null), []);

  return {
    vehicles,
    vehicleModels,
    vehicleMakes,
    availableVehicles,
    financedVehicles,
    isLoading,
    error,
    clearError,
    createVehicle,
    updateVehicle,
    deleteVehicle,
    refreshVehicles: fetchVehiclesData,
  };
}
