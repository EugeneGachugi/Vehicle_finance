import { useCallback, useEffect, useState } from "react";

import api from "@/api/axios";
import { parseBackendError } from "@/utils/errorParser";


export function useAdminDocuments() {
  const [documents, setDocuments] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);

  const fetchDocuments = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await api.get("/api/documents/files/");
      setDocuments(response.data);
    } catch (err) {
      setError(parseBackendError(err));
    } finally {
      setIsLoading(false);
    }
  }, []);

  const uploadDocument = useCallback(async ({ targetType, targetId, docType, expiryDate, file }) => {
    setIsLoading(true);
    setError(null);
    setNotice(null);

    const formData = new FormData();
    formData.append("doc_type", docType);
    formData.append("file", file);
    if (expiryDate) formData.append("expiry_date", expiryDate);

    try {
      await api.post(`/api/documents/${targetType}/${targetId}/upload/`, formData);
      setNotice("Document uploaded and queued for review.");
      await fetchDocuments();
      return true;
    } catch (err) {
      setError(parseBackendError(err));
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [fetchDocuments]);

  const reviewDocument = useCallback(async (documentId, reviewStatus) => {
    setIsLoading(true);
    setError(null);
    setNotice(null);

    try {
      await api.post(`/api/documents/files/${documentId}/review/`, {
        status: reviewStatus,
      });
      setNotice(reviewStatus === "VR" ? "Document verified." : "Document rejected.");
      await fetchDocuments();
      return true;
    } catch (err) {
      setError(parseBackendError(err));
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [fetchDocuments]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  return {
    documents,
    isLoading,
    error,
    notice,
    clearError: useCallback(() => setError(null), []),
    clearNotice: useCallback(() => setNotice(null), []),
    refreshDocuments: fetchDocuments,
    uploadDocument,
    reviewDocument,
  };
}
