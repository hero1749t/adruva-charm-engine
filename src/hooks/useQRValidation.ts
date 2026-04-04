/**
 * Hook: useQRValidation
 * Validates QR scans and manual table entries
 * Includes fallback/mock data when backend is unavailable
 */

import { useState } from "react";
import { useToast } from "./use-toast";

export interface QRValidationResult {
  success: boolean;
  tableId: string;
  menuUrl: string;
  error?: string;
}

// Mock QR validation for development
function generateMockValidation(
  ownerId: string,
  tableNumber: number
): QRValidationResult {
  return {
    success: true,
    tableId: `table_${tableNumber}`,
    menuUrl: `/menu/${ownerId}?table=${tableNumber}`,
  };
}

export function useQRValidation() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasBackendError, setHasBackendError] = useState(false);
  const { toast } = useToast();

  const validateQR = async (
    ownerId: string,
    tableNumber: number
  ): Promise<QRValidationResult> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/qr/validate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ownerId,
          tableNumber,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: Failed to validate`);
      }

      const data = await response.json();

      if (!data.success) {
        const errorMsg = data.error || "Invalid table";
        setError(errorMsg);
        return {
          success: false,
          tableId: "",
          menuUrl: "",
          error: errorMsg,
        };
      }

      setHasBackendError(false);
      return {
        success: true,
        tableId: data.tableId,
        menuUrl: data.menuUrl,
      };
    } catch (err) {
      // Fallback to mock validation
      console.warn("QR validation API failed, using mock data", err);
      setHasBackendError(true);
      const mockResult = generateMockValidation(ownerId, tableNumber);
      
      toast({
        title: "Using Test Mode",
        description: "Backend not connected. Using test table validation.",
        variant: "default",
      });
      
      return mockResult;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    validateQR,
    isLoading,
    error,
    setError,
    hasBackendError,
  };
}
