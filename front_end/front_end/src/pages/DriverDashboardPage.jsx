import { useDashboard } from "@/hooks/Dashboard";
import DriverDashboard from "@/components/ui/DriverDashboard"; 


export default function DashboardPage() {
    const {authUser, dashboardData, loading} = useDashboard();

    if (loading) return <div className="p-10 text-center">Loading...</div>;
    const driverProps = {
        name: dashboardData?.full_name || authUser?.username || "Driver",
        nickname: null, // No nickname field
        avatarUrl: dashboardData?.profile_picture,
        joinDate: dashboardData?.join_date
    };
    return(
        <DriverDashboard
        driver={driverProps}
        vehicle={dashboardData?.vehicle}
        loan={dashboardData?.loan_stats}
        invoices={dashboardData?.recent_invoices}
        upcomingInvoice={dashboardData?.next_payment}
        documents={dashboardData?.documents} 
      // Handlers
        onPayInvoice={(id) => console.log("Pay", id)}
        onUploadDoc={(type) => console.log("Upload", type)}
    />
    )
}