import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { Star, ArrowLeft } from "lucide-react";

const UserHistory = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  // Get user info from localStorage
  const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
  const token = localStorage.getItem("auth") || "";

  const [user, setUser] = useState<any>(storedUser);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [feedbackModalOpen, setFeedbackModalOpen] = useState(false);
  const [editFeedbackModalOpen, setEditFeedbackModalOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<any>(null);
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [feedbackDescription, setFeedbackDescription] = useState("");

  // Apply theme
  const applyTheme = (themeMode: "light" | "dark") => {
    const root = document.documentElement;
    if (themeMode === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  };

  // Fetch user history
  const fetchHistory = async () => {
    try {
      const res = await fetch(`http://localhost:5000/user/${user._id}`, {
        headers: { authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data._id) {
        setUser(data);
        
        // Apply theme from user preference
        const userTheme = data.theme_preference || "light";
        applyTheme(userTheme);
        
        const historyData = data.history || [];
        
        // Fetch detailed service information for each history entry
        const detailedHistory = await Promise.all(
          historyData.map(async (entry: any) => {
            try {
              const serviceRes = await fetch(
                `http://localhost:5000/service/details/${entry.service_id}`,
                {
                  headers: { authorization: `Bearer ${token}` },
                }
              );
              const serviceData = await serviceRes.json();
              return {
                ...entry,
                serviceDetails: serviceData,
              };
            } catch (e) {
              return entry;
            }
          })
        );
        
        setHistory(detailedHistory);
      }
    } catch (e) {
      toast({ title: "Error fetching history", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!token || !user._id) {
      navigate("/login");
      return;
    }
    fetchHistory();
  }, []);

  const openFeedbackModal = (service: any) => {
    setSelectedService(service);
    setRating(0);
    setHoveredRating(0);
    setFeedbackDescription("");
    setFeedbackModalOpen(true);
  };

  const openEditFeedbackModal = (service: any) => {
    setSelectedService(service);
    const existingRating = service.serviceDetails?.rating 
      ? parseFloat(service.serviceDetails.rating) 
      : 0;
    setRating(existingRating);
    setHoveredRating(0);
    setFeedbackDescription(service.serviceDetails?.feedback || "");
    setEditFeedbackModalOpen(true);
  };

  const closeFeedbackModal = () => {
    setFeedbackModalOpen(false);
    setSelectedService(null);
    setRating(0);
    setHoveredRating(0);
    setFeedbackDescription("");
  };

  const closeEditFeedbackModal = () => {
    setEditFeedbackModalOpen(false);
    setSelectedService(null);
    setRating(0);
    setHoveredRating(0);
    setFeedbackDescription("");
  };

  const submitFeedback = async () => {
    if (rating === 0) {
      toast({
        title: "Rating required",
        description: "Please provide a rating by selecting stars",
        variant: "destructive",
      });
      return;
    }

    if (!selectedService) return;

    try {
      // Update service with feedback and rating
      const updatePayload = {
        feedback: feedbackDescription,
        rating: rating.toString(),
      };

      const serviceId = selectedService.service_id || selectedService.serviceDetails?._id;
      if (!serviceId) {
        toast({
          title: "Error",
          description: "Service ID not found",
          variant: "destructive",
        });
        return;
      }

      const res = await fetch(
        `http://localhost:5000/service/update/${serviceId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(updatePayload),
        }
      );

      if (res.ok) {
        toast({
          title: "Feedback submitted successfully",
          description: "Thank you for your feedback!",
        });
        
        closeFeedbackModal();
        fetchHistory(); // Refresh history
      } else {
        const errorData = await res.json();
        toast({
          title: "Failed to submit feedback",
          description: errorData.result || "Please try again",
          variant: "destructive",
        });
      }
    } catch (e) {
      toast({
        title: "Error submitting feedback",
        variant: "destructive",
      });
    }
  };

  const submitEditFeedback = async () => {
    if (rating === 0) {
      toast({
        title: "Rating required",
        description: "Please provide a rating by selecting stars",
        variant: "destructive",
      });
      return;
    }

    if (!selectedService) return;

    try {
      // Update service with feedback and rating
      const updatePayload = {
        feedback: feedbackDescription,
        rating: rating.toString(),
      };

      const serviceId = selectedService.service_id || selectedService.serviceDetails?._id;
      if (!serviceId) {
        toast({
          title: "Error",
          description: "Service ID not found",
          variant: "destructive",
        });
        return;
      }

      const res = await fetch(
        `http://localhost:5000/service/update/${serviceId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(updatePayload),
        }
      );

      if (res.ok) {
        toast({
          title: "Feedback updated successfully",
          description: "Your feedback has been updated!",
        });
        
        closeEditFeedbackModal();
        fetchHistory(); // Refresh history
      } else {
        const errorData = await res.json();
        toast({
          title: "Failed to update feedback",
          description: errorData.result || "Please try again",
          variant: "destructive",
        });
      }
    } catch (e) {
      toast({
        title: "Error updating feedback",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const statusColors: Record<string, string> = {
      pending: "bg-yellow-100 text-yellow-800",
      done: "bg-green-100 text-green-800",
      rejected: "bg-red-100 text-red-800",
    };
    return (
      <span
        className={`px-3 py-1 rounded-full text-xs font-semibold ${
          statusColors[status] || "bg-gray-100 text-gray-800"
        }`}
      >
        {status?.toUpperCase() || "UNKNOWN"}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center">
        <p className="text-lg dark:text-white">Loading history...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex flex-col">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/user/dashboard")}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Button>
            <h1 className="text-xl font-bold dark:text-white">Service History</h1>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="container mx-auto px-4 py-6 flex-grow">
        {history.length === 0 ? (
          <Card className="dark:bg-gray-800 dark:border-gray-700">
            <CardContent className="py-12 text-center">
              <p className="text-gray-500 dark:text-gray-400 text-lg">No service requests found.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {history.map((entry, index) => (
              <Card key={index} className="dark:bg-gray-800 dark:border-gray-700">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg dark:text-white">{entry.service_name}</CardTitle>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        Date: {entry.date || "N/A"}
                      </p>
                    </div>
                    {getStatusBadge(entry.status)}
                  </div>
                </CardHeader>
                <CardContent>
                  {entry.serviceDetails && (
                    <div className="space-y-2 mb-4">
                      <p className="text-sm dark:text-gray-300">
                        <strong>Description:</strong> {entry.serviceDetails.service_des || "N/A"}
                      </p>
                      {entry.serviceDetails.expert_id && (
                        <p className="text-sm dark:text-gray-300">
                          <strong>Expert ID:</strong> {entry.expert_id}
                        </p>
                      )}
                    </div>
                  )}
                  {entry.status === "done" && (
                    <div className="mt-4">
                      {entry.serviceDetails?.rating && entry.serviceDetails.rating !== "0" ? (
                        <div className="flex flex-col gap-2">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium dark:text-white">Your Rating:</span>
                            <div className="flex">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <Star
                                  key={star}
                                  className={`h-5 w-5 ${
                                    star <= parseFloat(entry.serviceDetails.rating || "0")
                                      ? "fill-yellow-400 text-yellow-400"
                                      : "text-gray-300"
                                  }`}
                                />
                              ))}
                            </div>
                          </div>
                          {entry.serviceDetails.feedback && (
                            <div className="mt-2">
                              <p className="text-sm text-gray-600 dark:text-gray-300">
                                <strong>Feedback:</strong> {entry.serviceDetails.feedback}
                              </p>
                              <Button
                                onClick={() => openEditFeedbackModal(entry)}
                                variant="outline"
                                size="sm"
                                className="mt-2"
                              >
                                Edit Feedback
                              </Button>
                            </div>
                          )}
                        </div>
                      ) : (
                        <Button
                          onClick={() => openFeedbackModal(entry)}
                          variant="outline"
                          size="sm"
                        >
                          Give Feedback
                        </Button>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      {/* Feedback Modal */}
      {feedbackModalOpen && selectedService && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4 dark:bg-gray-800 dark:border-gray-700">
            <CardHeader>
              <CardTitle className="dark:text-white">Provide Feedback</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-medium mb-2 dark:text-white">
                  Service: {selectedService.service_name}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                  Rate your experience with the expert (Required)
                </p>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      onMouseEnter={() => setHoveredRating(star)}
                      onMouseLeave={() => setHoveredRating(0)}
                      className="focus:outline-none"
                    >
                      <Star
                        className={`h-8 w-8 cursor-pointer transition-colors ${
                          star <= (hoveredRating || rating)
                            ? "fill-yellow-400 text-yellow-400"
                            : "text-gray-300"
                        }`}
                      />
                    </button>
                  ))}
                </div>
                {rating > 0 && (
                  <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">
                    Selected: {rating} star{rating !== 1 ? "s" : ""}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 dark:text-white">
                  Feedback Description
                </label>
                <Textarea
                  value={feedbackDescription}
                  onChange={(e) => setFeedbackDescription(e.target.value)}
                  placeholder="Share your experience and feedback..."
                  rows={4}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={closeFeedbackModal}>
                  Cancel
                </Button>
                <Button onClick={submitFeedback} disabled={rating === 0}>
                  Submit Feedback
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Edit Feedback Modal */}
      {editFeedbackModalOpen && selectedService && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4 dark:bg-gray-800 dark:border-gray-700">
            <CardHeader>
              <CardTitle className="dark:text-white">Edit Feedback</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-medium mb-2 dark:text-white">
                  Service: {selectedService.service_name}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                  Update your rating and feedback (Required)
                </p>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      onMouseEnter={() => setHoveredRating(star)}
                      onMouseLeave={() => setHoveredRating(0)}
                      className="focus:outline-none"
                    >
                      <Star
                        className={`h-8 w-8 cursor-pointer transition-colors ${
                          star <= (hoveredRating || rating)
                            ? "fill-yellow-400 text-yellow-400"
                            : "text-gray-300"
                        }`}
                      />
                    </button>
                  ))}
                </div>
                {rating > 0 && (
                  <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">
                    Selected: {rating} star{rating !== 1 ? "s" : ""}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 dark:text-white">
                  Feedback Description
                </label>
                <Textarea
                  value={feedbackDescription}
                  onChange={(e) => setFeedbackDescription(e.target.value)}
                  placeholder="Share your experience and feedback..."
                  rows={4}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={closeEditFeedbackModal}>
                  Cancel
                </Button>
                <Button onClick={submitEditFeedback} disabled={rating === 0}>
                  Update Feedback
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default UserHistory;

