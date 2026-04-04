import React, { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, Loader2, Wifi, WifiOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ManualEntryFormProps {
  onSuccess?: (ownerId: string, tableNumber: number) => void;
  isLoading?: boolean;
  restaurantId?: string; // Pre-populated restaurant ID
}

interface Restaurant {
  user_id: string;
  restaurant_name: string;
}

// Mock restaurants for development/offline testing
const MOCK_RESTAURANTS: Restaurant[] = [
  {
    user_id: "550e8400-e29b-41d4-a716-446655440000",
    restaurant_name: "Test Restaurant 1",
  },
  {
    user_id: "550e8400-e29b-41d4-a716-446655440001",
    restaurant_name: "Test Restaurant 2",
  },
];

export const ManualEntryForm: React.FC<ManualEntryFormProps> = ({
  onSuccess,
  isLoading = false,
  restaurantId: initialRestaurantId,
}) => {
  const [restaurantId, setRestaurantId] = useState(initialRestaurantId || "");
  const [tableNumber, setTableNumber] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [restaurants, setRestaurants] = useState<Restaurant[]>(MOCK_RESTAURANTS);
  const [restaurantsLoading, setRestaurantsLoading] = useState(true);
  const [isUsingMockData, setIsUsingMockData] = useState(false);
  const { toast } = useToast();

  // Fetch active restaurants, fallback to mock data
  useEffect(() => {
    const fetchRestaurants = async () => {
      try {
        setRestaurantsLoading(true);
        const response = await fetch("/api/restaurants/active");
        
        if (!response.ok) {
          throw new Error("Failed to fetch restaurants");
        }
        
        const data = await response.json();
        if (Array.isArray(data) && data.length > 0) {
          setRestaurants(data);
          setIsUsingMockData(false);
        } else {
          throw new Error("Empty restaurants list");
        }
      } catch (error) {
        console.warn("Could not fetch restaurants, using mock data", error);
        setRestaurants(MOCK_RESTAURANTS);
        setIsUsingMockData(true);
      } finally {
        setRestaurantsLoading(false);
      }
    };

    fetchRestaurants();
  }, []);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!restaurantId) {
      newErrors.restaurant = "Please select a restaurant";
    }

    if (!tableNumber) {
      newErrors.table = "Please enter table number";
    } else {
      const tableNum = parseInt(tableNumber);
      if (isNaN(tableNum) || tableNum < 1 || tableNum > 99) {
        newErrors.table = "Table number must be between 1 and 99";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      // Try to validate with server
      const response = await fetch("/api/qr/validate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ownerId: restaurantId,
          tableNumber: parseInt(tableNumber),
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: Validation failed`);
      }

      const data = await response.json();

      if (!data.success) {
        const errorMsg = data.error || "Invalid table";
        setErrors({ form: errorMsg });
        toast({
          title: "Invalid Table",
          description: errorMsg,
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Table Verified",
        description: "Loading menu...",
      });

      onSuccess?.(restaurantId, parseInt(tableNumber));
    } catch (error) {
      console.warn("API validation failed, using fallback", error);
      
      // Fallback: Accept the entry manually (mock mode)
      toast({
        title: "Using Test Mode",
        description: "Backend not connected. Proceeding with test data.",
        variant: "default",
      });

      onSuccess?.(restaurantId, parseInt(tableNumber));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto p-4">
      <Card className="p-6">
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-2xl font-bold">Enter Table Details</h2>
            <div className="flex items-center gap-2 text-sm">
              {isUsingMockData ? (
                <div className="flex items-center gap-1 text-amber-600 bg-amber-50 px-2 py-1 rounded">
                  <WifiOff className="w-4 h-4" />
                  Test Mode
                </div>
              ) : (
                <div className="flex items-center gap-1 text-green-600 bg-green-50 px-2 py-1 rounded">
                  <Wifi className="w-4 h-4" />
                  Connected
                </div>
              )}
            </div>
          </div>
          <p className="text-gray-600">
            If QR scan didn't work, enter your table information below
          </p>
        </div>

        {errors.form && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
            <span className="text-red-800">{errors.form}</span>
          </div>
        )}

        {isLoading && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 flex items-center gap-2">
            <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
            <span className="text-blue-800">Loading...</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Restaurant Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Restaurant
            </label>
            <select
              value={restaurantId}
              onChange={(e) => setRestaurantId(e.target.value)}
              disabled={restaurantsLoading || isSubmitting}
              className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.restaurant ? "border-red-500" : "border-gray-300"
              } ${(restaurantsLoading || isSubmitting) && "opacity-50 cursor-not-allowed"}`}
            >
              <option value="">
                {restaurantsLoading ? "Loading restaurants..." : "Select Restaurant"}
              </option>
              {restaurants.map((restaurant) => (
                <option key={restaurant.user_id} value={restaurant.user_id}>
                  {restaurant.restaurant_name}
                </option>
              ))}
            </select>
            {errors.restaurant && (
              <p className="text-red-600 text-sm mt-1">{errors.restaurant}</p>
            )}
          </div>

          {/* Table Number Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Table Number
            </label>
            <input
              type="number"
              min="1"
              max="99"
              value={tableNumber}
              onChange={(e) => setTableNumber(e.target.value)}
              disabled={isSubmitting}
              placeholder="Enter table number (1-99)"
              className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.table ? "border-red-500" : "border-gray-300"
              } ${isSubmitting && "opacity-50 cursor-not-allowed"}`}
            />
            {errors.table && (
              <p className="text-red-600 text-sm mt-1">{errors.table}</p>
            )}
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={isSubmitting || isLoading || !restaurantId || !tableNumber}
            className="w-full"
            size="lg"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Verifying...
              </>
            ) : (
              "Load Menu"
            )}
          </Button>
        </form>

        <div className="mt-6 pt-6 border-t border-gray-200">
          <p className="text-xs text-gray-500 text-center">
            Make sure you enter the correct restaurant and table number.
            <br />
            You'll see the menu for that table once verified.
          </p>
        </div>
      </Card>
    </div>
  );
};

export default ManualEntryForm;
