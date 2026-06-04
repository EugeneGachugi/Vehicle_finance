import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import api from "@/api/axios";

export const useDashboard = () =>{
    const {user: authUser} = useAuth();
    const [dashboardData, setDashboardData] = useState(null);
    const [loading, setLoading] = useState(true);

    const fetchStats = useCallback(async ({ showLoading = true } = {}) => {
        if (!authUser) return;

        if (showLoading) setLoading(true);

        try{
            const latestUnpaidRequest = api
                .get("/api/payments/invoices/latest-unpaid/")
                .catch((error) => {
                    if (error.response?.status === 404) return { data: null };
                    throw error;
                });

            const [
                profileResponse,
                vehicleResponse,
                contractResponse,
                invoiceResponse,
                latestUnpaidResponse,
                documentResponse,
            ] = await Promise.all([
                api.get("/api/users/profile/"),
                api.get("/api/vehicles/fleet/"),
                api.get("/api/payments/contracts/"),
                api.get("/api/payments/invoices/"),
                latestUnpaidRequest,
                api.get("/api/documents/files/"),
            ]);

            const profile = profileResponse.data;
            const vehicles = vehicleResponse.data;
            const vehicle = vehicles.length > 0 ? vehicles[0] : null;
            const contracts = contractResponse.data;
            const contract = contracts.length > 0 ? contracts[0] : null;
            const allInvoices = invoiceResponse.data;
            const latestUnpaid = latestUnpaidResponse.data;
            const payableInvoice = latestUnpaid
                ? allInvoices.find((invoice) => invoice.id === latestUnpaid.invoice_id)
                : null;
            const documents = documentResponse.data;

            setDashboardData({
                full_name: profile.full_name,
                join_date: profile.join_date,
                profile_picture: profile.profile_picture,
                vehicle: vehicle ? {
                    regNo: vehicle.plate_number,
                    make: vehicle.model_details?.make_details?.make || '',
                    model: vehicle.model_details?.name || '',
                    yom: vehicle.yom,
                    color: vehicle.color,
                    colorHex: '#000000',
                    imageUrl: null,
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
                next_payment: payableInvoice ? {
                    id: payableInvoice.id,
                    invoiceNumber: payableInvoice.id.toString(),
                    amount: Number(payableInvoice.amount_due) - Number(payableInvoice.amount_paid),
                    currency: 'KES',
                    dueDate: payableInvoice.due_date,
                } : null,
                documents: documents.map(doc => ({
                    id: doc.id,
                    type: doc.doc_type,
                    label: doc.doc_type_display,
                    expiryDate: doc.expiry_date,
                    fileUrl: doc.file,
                })),
            });
        }catch (err){
            console.error("Error fetching dashboard data", err);
        }finally{
            if (showLoading) {
                setLoading(false);
            }
        }
    }, [authUser]);

    useEffect(() => {
        fetchStats();
    }, [fetchStats]);

    const refreshDashboard = useCallback(
        () => fetchStats({ showLoading: false }),
        [fetchStats],
    );

    return {authUser, dashboardData, loading, refreshDashboard};
}
