import { useCallback, useEffect, useMemo, useState } from "react";
import api from "@/api/axios";
import { parseBackendError } from "@/utils/errorParser";

const toNumber = (value) => Number(value || 0);

const normalizePayment = (payment) => ({
  payment_id: payment.payment_id,
  invoice: payment.invoice,
  amount: toNumber(payment.amount),
  mpesa_receipt: payment.mpesa_receipt,
  created_at: payment.created_at,
});

const normalizeMpesaRequest = (request) => ({
  id: request.id,
  invoice: request.invoice,
  phone_number: request.phone_number,
  amount: toNumber(request.amount),
  checkout_request_id: request.checkout_request_id,
  status: request.status,
  status_display: request.status_display,
  result_description: request.result_description,
  mpesa_receipt: request.mpesa_receipt,
  created_at: request.created_at,
  completed_at: request.completed_at,
});

const normalizeInvoice = (invoice) => ({
  id: invoice.id,
  contract: invoice.contract,
  amount_due: toNumber(invoice.amount_due),
  amount_paid: toNumber(invoice.amount_paid),
  balance: Math.max(toNumber(invoice.amount_due) - toNumber(invoice.amount_paid), 0),
  due_date: invoice.due_date,
  status: invoice.status,
  status_display: invoice.status_display,
  payments: (invoice.payments || []).map(normalizePayment),
});

const normalizeContract = (contract) => ({
  id: contract.id,
  driver: contract.driver,
  vehicle: contract.vehicle,
  vehicle_valuation: toNumber(contract.vehicle_valuation),
  interest_rate: toNumber(contract.interest_rate),
  total_repayment: toNumber(contract.total_repayment),
  weekly_installment: toNumber(contract.weekly_installment),
  total_weeks: toNumber(contract.total_weeks),
  weeks_paid: toNumber(contract.weeks_paid),
  prepayment_balance: toNumber(contract.prepayment_balance),
  progress_percent: contract.total_weeks
    ? Math.min(Math.round((toNumber(contract.weeks_paid) / toNumber(contract.total_weeks)) * 100), 100)
    : 0,
  status: contract.status,
  status_display: contract.status_display,
  billing_day: contract.billing_day,
  billing_day_display: contract.billing_day_display,
  created_at: contract.created_at,
  updated_at: contract.updated_at,
  invoices: (contract.invoices || []).map(normalizeInvoice),
});

export function useAdminPayments() {
  const [contracts, setContracts] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [payments, setPayments] = useState([]);
  const [mpesaRequests, setMpesaRequests] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchPaymentsData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [contractsResponse, invoicesResponse, paymentsResponse, mpesaRequestsResponse] = await Promise.all([
        api.get("/api/payments/contracts/"),
        api.get("/api/payments/invoices/"),
        api.get("/api/payments/payments/"),
        api.get("/api/payments/mpesa/requests/"),
      ]);

      setContracts(contractsResponse.data.map(normalizeContract));
      setInvoices(invoicesResponse.data.map(normalizeInvoice));
      setPayments(paymentsResponse.data.map(normalizePayment));
      setMpesaRequests(mpesaRequestsResponse.data.map(normalizeMpesaRequest));
    } catch (err) {
      setError(parseBackendError(err));
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createContract = useCallback(async (contractFormData) => {
    setIsLoading(true);
    setError(null);

    try {
      await api.post("/api/payments/contracts/", {
        driver: contractFormData.driver,
        vehicle: contractFormData.vehicle,
        vehicle_valuation: contractFormData.vehicle_valuation,
        interest_rate: contractFormData.interest_rate,
        total_repayment: contractFormData.total_repayment,
        weekly_installment: contractFormData.weekly_installment,
        total_weeks: contractFormData.total_weeks,
        status: contractFormData.status || "DR",
        billing_day: contractFormData.billing_day || "MON",
      });
      await fetchPaymentsData();
    } catch (err) {
      setError(parseBackendError(err));
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [fetchPaymentsData]);

  const createInvoice = useCallback(async (invoiceFormData) => {
    setIsLoading(true);
    setError(null);

    try {
      await api.post("/api/payments/invoices/", {
        contract: invoiceFormData.contract,
        amount_due: invoiceFormData.amount_due,
        due_date: invoiceFormData.due_date,
      });
      await fetchPaymentsData();
    } catch (err) {
      setError(parseBackendError(err));
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [fetchPaymentsData]);

  const recordPayment = useCallback(async (paymentFormData) => {
    setIsLoading(true);
    setError(null);

    try {
      await api.post("/api/payments/payments/", {
        invoice: paymentFormData.invoice,
        amount: paymentFormData.amount,
        mpesa_receipt: paymentFormData.mpesa_receipt || paymentFormData.transaction_reference,
      });
      await fetchPaymentsData();
    } catch (err) {
      setError(parseBackendError(err));
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [fetchPaymentsData]);

  const paymentStats = useMemo(() => {
    const totalCollected = payments.reduce((sum, payment) => sum + payment.amount, 0);
    const totalDue = invoices.reduce((sum, invoice) => sum + invoice.amount_due, 0);
    const outstandingBalance = invoices.reduce((sum, invoice) => sum + invoice.balance, 0);
    const unpaidInvoices = invoices.filter((invoice) => invoice.status === "UNPAID");
    const partialInvoices = invoices.filter((invoice) => invoice.status === "PARTIAL");
    const activeContracts = contracts.filter((contract) => contract.status === "AC");

    return {
      totalCollected,
      totalDue,
      outstandingBalance,
      unpaidInvoices,
      partialInvoices,
      activeContracts,
    };
  }, [contracts, invoices, payments]);

  useEffect(() => {
    fetchPaymentsData();
  }, [fetchPaymentsData]);

  const clearError = useCallback(() => setError(null), []);

  return {
    contracts,
    invoices,
    payments,
    mpesaRequests,
    paymentStats,
    isLoading,
    error,
    clearError,
    createContract,
    createInvoice,
    recordPayment,
    createPayment: recordPayment,
    refreshPayments: fetchPaymentsData,
  };
}
