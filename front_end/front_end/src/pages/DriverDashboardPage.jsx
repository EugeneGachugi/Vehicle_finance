/* eslint-disable react/prop-types */
import { useCallback, useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, LoaderCircle, RefreshCw, Smartphone, X } from "lucide-react";

import api from "@/api/axios";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useDashboard } from "@/hooks/Dashboard";
import { Input } from "@/components/ui/input";
import { parseBackendError } from "@/utils/errorParser";
import DriverDashboard from "@/components/ui/DriverDashboard"; 


function MpesaPaymentModal({
    invoice,
    phoneNumber,
    feedback,
    submitting,
    polling,
    onPhoneNumberChange,
    onSubmit,
    onRefresh,
    onClose,
}) {
    if (!invoice) return null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/45 p-4 backdrop-blur-sm"
            onClick={(event) => event.target === event.currentTarget && onClose()}
        >
            <form
                className="w-full max-w-md overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-xl"
                onSubmit={onSubmit}
            >
                <div className="flex items-start justify-between border-b border-zinc-200 px-5 py-4">
                    <div>
                        <h2 className="text-lg font-semibold text-zinc-950">Pay with M-Pesa</h2>
                        <p className="mt-1 text-sm text-zinc-500">
                            KES {Number(invoice.amount).toLocaleString()} due
                        </p>
                    </div>
                    <Button type="button" variant="ghost" size="icon" aria-label="Close payment" onClick={onClose}>
                        <X />
                    </Button>
                </div>

                <div className="grid gap-4 px-5 py-5">
                    <label className="grid gap-1.5 text-sm font-medium text-zinc-800">
                        M-Pesa phone number
                        <Input
                            autoFocus
                            required
                            inputMode="tel"
                            placeholder="2547XXXXXXXX"
                            value={phoneNumber}
                            onChange={(event) => onPhoneNumberChange(event.target.value)}
                        />
                    </label>

                    {feedback && (
                        <Alert
                            variant={feedback.type === "error" ? "destructive" : "default"}
                            className={feedback.type === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-900" : ""}
                        >
                            {feedback.type === "error" ? <AlertCircle /> : <CheckCircle2 />}
                            <AlertDescription>{feedback.message}</AlertDescription>
                        </Alert>
                    )}
                </div>

                <div className="flex flex-col-reverse gap-2 border-t border-zinc-200 px-5 py-4 sm:flex-row sm:justify-end">
                    {polling && (
                        <Button type="button" variant="outline" onClick={onRefresh}>
                            <RefreshCw />
                            Refresh status
                        </Button>
                    )}
                    <Button type="submit" disabled={submitting || polling} className="bg-emerald-800 text-white hover:bg-emerald-700">
                        {submitting || polling ? <LoaderCircle className="animate-spin" /> : <Smartphone />}
                        {submitting ? "Sending request" : polling ? "Waiting for payment" : "Send STK push"}
                    </Button>
                </div>
            </form>
        </div>
    );
}


export default function DashboardPage() {
    const {authUser, dashboardData, loading, refreshDashboard} = useDashboard();
    const [paymentInvoice, setPaymentInvoice] = useState(null);
    const [phoneNumber, setPhoneNumber] = useState("2547");
    const [submitting, setSubmitting] = useState(false);
    const [polling, setPolling] = useState(false);
    const [feedback, setFeedback] = useState(null);
    const [paymentRequestId, setPaymentRequestId] = useState(null);

    const checkPaymentStatus = useCallback(async () => {
        if (!paymentInvoice || !paymentRequestId) return null;

        try {
            const response = await api.get("/api/payments/mpesa/status/", {
                params: { payment_request_id: paymentRequestId },
            });
            const payment = response.data;

            if (payment.payment_status === "SUCCESS") {
                setPolling(false);
                setFeedback({
                    type: "success",
                    message: payment.mpesa_receipt
                        ? `Payment confirmed. Receipt: ${payment.mpesa_receipt}`
                        : "Payment confirmed. Your invoice has been updated.",
                });
                await refreshDashboard();
            } else if (payment.payment_status === "FAILED") {
                setPolling(false);
                setFeedback({
                    type: "error",
                    message: payment.result_description || "The M-Pesa payment request was not completed.",
                });
            }

            return payment.payment_status;
        } catch (error) {
            setPolling(false);
            setFeedback({ type: "error", message: parseBackendError(error) });
            return null;
        }
    }, [paymentInvoice, paymentRequestId, refreshDashboard]);

    useEffect(() => {
        if (!polling || !paymentInvoice) return undefined;

        let checks = 0;
        let checking = false;
        const interval = window.setInterval(async () => {
            if (checking) return;
            checking = true;
            checks += 1;
            const paymentStatus = await checkPaymentStatus();
            checking = false;

            if (paymentStatus === "SUCCESS" || paymentStatus === "FAILED" || checks >= 12) {
                window.clearInterval(interval);
                if (checks >= 12 && paymentStatus === "PENDING") {
                    setPolling(false);
                    setFeedback({
                        type: "default",
                        message: "Payment is still pending. You can refresh the status after completing the M-Pesa prompt.",
                    });
                }
            }
        }, 2500);

        return () => window.clearInterval(interval);
    }, [checkPaymentStatus, paymentInvoice, polling]);

    const openPayment = (invoiceId) => {
        const invoice = dashboardData?.next_payment;
        if (!invoice || invoice.id !== invoiceId) return;

        setPaymentInvoice(invoice);
        setFeedback(null);
        setPolling(false);
        setPaymentRequestId(null);
    };

    const closePayment = () => {
        if (submitting) return;
        setPaymentInvoice(null);
        setFeedback(null);
        setPolling(false);
        setPaymentRequestId(null);
    };

    const initiatePayment = async (event) => {
        event.preventDefault();
        if (!paymentInvoice) return;

        setSubmitting(true);
        setFeedback(null);

        try {
            const response = await api.post("/api/payments/mpesa/stk-push/", {
                invoice_id: paymentInvoice.id,
                phone_number: phoneNumber,
            });

            if (response.data.invoice_status === "PAID") {
                setFeedback({ type: "success", message: response.data.message });
                await refreshDashboard();
            } else {
                setPaymentRequestId(response.data.payment_request_id);
                setFeedback({ type: "default", message: response.data.message });
                setPolling(true);
            }
        } catch (error) {
            setFeedback({ type: "error", message: parseBackendError(error) });
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <div className="p-10 text-center">Loading...</div>;
    const driverProps = {
        name: dashboardData?.full_name || authUser?.username || "Driver",
        nickname: null, // No nickname field
        avatarUrl: dashboardData?.profile_picture,
        joinDate: dashboardData?.join_date
    };
    return (
        <>
            <DriverDashboard
                driver={driverProps}
                vehicle={dashboardData?.vehicle}
                loan={dashboardData?.loan_stats}
                invoices={dashboardData?.recent_invoices}
                upcomingInvoice={dashboardData?.next_payment}
                documents={dashboardData?.documents}
                onPayInvoice={openPayment}
                onUploadDoc={(type) => console.log("Upload", type)}
            />
            <MpesaPaymentModal
                invoice={paymentInvoice}
                phoneNumber={phoneNumber}
                feedback={feedback}
                submitting={submitting}
                polling={polling}
                onPhoneNumberChange={setPhoneNumber}
                onSubmit={initiatePayment}
                onRefresh={checkPaymentStatus}
                onClose={closePayment}
            />
        </>
    )
}
