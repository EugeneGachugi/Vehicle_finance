import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

const api = axios.create({
    baseURL: API_BASE_URL,
});

//Request interceptor: Attaches the user Token to every outgoing Request

api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('access_token');
        if(token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);
//Response Interceptor; Handles expired tokens
api.interceptors.response.use(
    (response) => response,
    async(error) => {
        const originalRequest = error.config;

        //if error is 401 and we haven't tried to refresh yet
        if (error.response?.status === 401 && !originalRequest._retry){
            originalRequest._retry = true;

            try{
                const refreshToken = localStorage.getItem('refresh_token');
                const res = await axios.post(`${API_BASE_URL}/api/token/refresh/`, {
                    refresh : refreshToken
                });

                if (res.status === 200){
                    localStorage.setItem('access_token',res.data.access);
                    //rerun the original request with new token
                    api.defaults.headers.common['Authorization'] = `Bearer ${res.data.access}`;
                    originalRequest.headers.Authorization = `Bearer ${res.data.access}`;
                    return api(originalRequest);
                }
            }catch (refreshError) {
                //log out user if refresh fails
                localStorage.clear();
                window.location.href = '/login';
                return Promise.reject(refreshError)
            }
        }
        return Promise.reject(error);
    }
);
export default api;
