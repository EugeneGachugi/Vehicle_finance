import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import api from "@/api/axios";

export const useDashboard = () =>{
    const {user: authUser} = useAuth();
    const [dashboardData, setDashboardData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () =>{
            try{
                // Fetch profile
                const profileResponse = await api.get("/api/users/profile/");
                const profile = profileResponse.data;

                // Fetch vehicle
                const vehicleResponse = await api.get("/api/vehicles/fleet/");
                const vehicles = vehicleResponse.data;
                const vehicle = vehicles.length > 0 ? vehicles[0] : null;

                // Fetch contracts
                const contractResponse = await api.get("/api/payments/contracts/");
                const contracts = contractResponse.data;
                const contract = contracts.length > 0 ? contracts[0] : null;

                // Fetch invoices
                const invoiceResponse = await api.get("/api/payments/invoices/");
                const allInvoices = invoiceResponse.data;

                // Fetch documents
                const documentResponse = await api.get("/api/documents/files/");
                const documents = documentResponse.data;

                // Process data
                const processedData = {
                    full_name: profile.full_name,
                    join_date: profile.join_date,
                    profile_picture: profile.profile_picture,
                    vehicle: vehicle ? {
                        regNo: vehicle.plate_number,
                        make: vehicle.model_details?.make_details?.make || '',
                        model: vehicle.model_details?.name || '',
                        yom: vehicle.yom,
                        color: vehicle.color,
                        colorHex: '#000000', // Default, can be improved
                        imageUrl: null, // No image field
                    } : null,
                    loan_stats: contract ? {
                        weeksPaid: contract.weeks_paid,
                        totalWeeks: contract.total_weeks,
                        weeklyAmount: contract.weekly_installment,
                        currency: 'KES',
                    } : { weeksPaid: 0, totalWeeks: 1, weeklyAmount: 0, currency: 'KES' },
                    recent_invoices: allInvoices.slice(0, 10).map(inv => ({
                        id: inv.id,
                        invoiceNumber: inv.id.toString(),
                        amount: inv.amount_due,
                        currency: 'KES',
                        date: inv.due_date,
                        status: inv.status === 'PAID' ? 'paid' : inv.status === 'OVERDUE' ? 'overdue' : 'pending',
                    })),
                    next_payment: allInvoices.find(inv => inv.status === 'UNPAID') ? {
                        id: allInvoices.find(inv => inv.status === 'UNPAID').id,
                        invoiceNumber: allInvoices.find(inv => inv.status === 'UNPAID').id.toString(),
                        amount: allInvoices.find(inv => inv.status === 'UNPAID').amount_due,
                        currency: 'KES',
                        dueDate: allInvoices.find(inv => inv.status === 'UNPAID').due_date,
                    } : null,
                    documents: documents.map(doc => ({
                        id: doc.id,
                        type: doc.doc_type,
                        label: doc.doc_type_display,
                        expiryDate: doc.expiry_date,
                        fileUrl: doc.file,
                    })),
                };

                setDashboardData(processedData);
            }catch (err){
                console.error("Error fetching dashboard data", err);
            }finally{
                setLoading(false);
            }
        };
        if (authUser) fetchStats();
    }, [authUser]);
    return {authUser, dashboardData, loading};
}
