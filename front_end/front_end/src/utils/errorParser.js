/**
 * Universal Error Parser for Django REST Framework Responses
 * @param {Error} err - The raw catch(err) object from Axios
 * @returns {string} A clean, standardized human-readable error message
 */
export const parseBackendError = (err) => {
  if (!err) return "An unknown error occurred.";
  
  // 1. Network / Server down errors
  if (!err.response) {
    return "Network connection failed. Unable to reach the service gateway.";
  }

  const data = err.response.data;
  const status = err.response.status;

  // 2. Authentication / Permission failures (401, 403)
  if (status === 401 || status === 403) {
    return data?.detail || "Access Denied: You do not have the required administrative permissions.";
  }

  // 3. Page Not Found (404)
  if (status === 404) {
    return data?.detail || "Requested resource could not be found.";
  }

  // 4. Django validation field dictionary errors (e.g., { national_id: ["This field must be unique."] })
  if (data && typeof data === "object" && !data.detail) {
    const firstKey = Object.keys(data)[0];
    const firstError = data[firstKey];
    
    if (Array.isArray(firstError) && typeof firstError[0] === "string") {
      // Formats "national_id" to "National id" and appends the backend error message
      const fieldName = firstKey.replace("_", " ");
      const normalizedField = fieldName.charAt(0).toUpperCase() + fieldName.slice(1);
      return `${normalizedField}: ${firstError[0]}`;
    }
  }

  // 5. Generic fallback catch-all
  return data?.detail || `Server Processing Error (${status}): Operation could not be completed.`;
};