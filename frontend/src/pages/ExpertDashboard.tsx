import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { UsersRound, Calendar, LogOut, BarChart, Star } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/components/ui/use-toast";

const ExpertDashboard = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  const [pendingServicesData, setPendingServicesData] = useState<any[]>([]);
  const [myPendingServicesData, setMyPendingServicesData] = useState<any[]>([]);
  const [expertServices, setExpertServices] = useState<any[]>([]);
  const [serviceDetails, setServiceDetails] = useState<any>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [expertData, setExpertData] = useState<any>(null);

  const token = localStorage.getItem("auth");
  const expert = JSON.parse(localStorage.getItem("expert") || "{}");
  const expertId = expert._id;

  // Fetch expert data
  const getExpertData = async () => {
    if (!expertId) return;
    try {
      // Since we don't have a single expert endpoint, we'll fetch from expert/all and find our expert
      const res = await fetch(`http://localhost:5000/expert/all`, {
        headers: {
          authorization: `Bearer ${token}`,
        },
      });
      const experts = await res.json();
      const currentExpert = Array.isArray(experts) 
        ? experts.find((e: any) => e._id === expertId)
        : null;
      if (currentExpert) {
        setExpertData(currentExpert);
      }
    } catch (err) {
      console.error("Error fetching expert data:", err);
    }
  };

  // Fetch all services assigned to this expert
  const getExpertServices = async () => {
    if (!expertId) return;
    try {
      const res = await fetch(`http://localhost:5000/service/expert/${expertId}`, {
        headers: {
          authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      setExpertServices(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error fetching expert services:", err);
      toast({ title: "Failed to load expert services." });
    }
  };

  const getPendingServices = async () => {
    try {
      const res = await fetch(`http://localhost:5000/service/pending`, {
        headers: {
          authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      setPendingServicesData(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error fetching pending services:", err);
      toast({ title: "Failed to load pending services." });
    }
  };

  const getMyPendingServices = async () => {
    if (!expertId) return;
    try {
      const res = await fetch(`http://localhost:5000/service/pending/${expertId}`, {
        headers: {
          authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      setMyPendingServicesData(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error fetching my pending services:", err);
      toast({ title: "Failed to load your pending services." });
    }
  };

  useEffect(() => {
    if (!token) {
      setIsAuthenticated(false);
      navigate("/admin/login");
      return;
    }
    getPendingServices();
    getMyPendingServices();
    getExpertServices();
    getExpertData();
  }, [token, expertId, navigate]);

  // Handlers...

  const fetchServiceDetails = async (id: string) => {
    try {
      const res = await fetch(`http://localhost:5000/service/details/${id}`, {
        headers: {
          authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) {
        toast({ title: "Failed to fetch service details." });
        return;
      }
      const data = await res.json();
      setServiceDetails(data);
      setModalOpen(true);
    } catch (error) {
      console.error("Error fetching service details:", error);
      toast({ title: "Error fetching service details." });
    }
  };

  const handleAcceptService = async (serviceId: string) => {
    if (!expertId) {
      toast({ title: "Expert ID not found. Please login again." });
      return;
    }
    try {
      const res = await fetch(`http://localhost:5000/service/update/${serviceId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ expert_id: expertId }),
      });
      if (res.ok) {
        toast({ title: "Service accepted successfully!" });
        getPendingServices();
        getMyPendingServices();
        getExpertServices();
      } else {
        toast({ title: "Failed to accept the service." });
      }
    } catch (error) {
      console.error("Error accepting service:", error);
      toast({ title: "Something went wrong." });
    }
  };

  const handleDoneClick = (taskId: string) => {
    navigate(`/expert/update-service/${taskId}`);
  };

  const closeModal = () => {
    setModalOpen(false);
    setServiceDetails(null);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.clear();
    navigate("/admin/login");
  };

  // Calculate total bookings and revenue for expert's services
  const totalBookings = expertServices.length;
  const totalRevenue = expertServices.reduce((sum, service) => {
    const amount = parseFloat(service.payment_amount);
    return sum + (isNaN(amount) ? 0 : amount);
  }, 0);
  const completedServices = expertServices.filter((service) => service.status === "done");
  const completedRevenue = completedServices.reduce((sum, service) => {
    const amount = parseFloat(service.payment_amount);
    return sum + (isNaN(amount) ? 0 : amount);
  }, 0);
  const averageCompletedRevenue =
    completedServices.length > 0 ? completedRevenue / completedServices.length : 0;

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <span className="text-xl font-bold text-primary-600">Cyber</span>
            <span className="text-xl font-bold text-secondary-500">Bandhu</span>
          </div>
          <span className="ml-4 text-sm bg-gray-200 px-2 py-1 rounded">Expert Panel</span>
          <Button variant="ghost" size="sm" onClick={handleLogout}>
            <LogOut className="h-4 w-4 mr-2" /> Logout
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">Expert Dashboard</h1>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex items-center justify-between pb-2">
              <CardTitle>Total Bookings</CardTitle>
              <Calendar className="h-5 w-5 text-gray-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{totalBookings}</div>
              <p className="text-xs text-gray-500">Bookings assigned to you</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex items-center justify-between pb-2">
              <CardTitle>My Pending Services</CardTitle>
              <UsersRound className="h-5 w-5 text-gray-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{myPendingServicesData.length}</div>
              <p className="text-xs text-gray-500">Pending requests</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex items-center justify-between pb-2">
              <CardTitle>Total Revenue</CardTitle>
              <BarChart className="h-5 w-5 text-gray-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">₹{totalRevenue.toFixed(2)}</div>
              <p className="text-xs text-gray-500">Revenue from your services</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="bookings" className="mb-6">
          <TabsList className="mb-4">
            <TabsTrigger value="bookings">Pending Services</TabsTrigger>
            <TabsTrigger value="mybookings">My Pending Services</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>

          <TabsContent value="bookings">
            <Card>
              <CardHeader>
                <CardTitle>Recent Bookings</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[300px]">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="py-2 text-left font-medium">Name</th>
                          <th className="py-2 text-left font-medium">Mobile</th>
                          <th className="py-2 text-left font-medium">Email</th>
                          <th className="py-2 text-left font-medium">Service</th>
                          <th className="py-2 text-left font-medium">Description</th>
                          <th className="py-2 text-left font-medium">Address</th>
                          <th className="py-2 text-left font-medium">Date</th>
                          <th className="py-2 text-left font-medium">Status</th>
                          <th className="py-2 text-left font-medium">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pendingServicesData.map((booking) => (
                          <tr key={booking._id} className="border-b">
                            <td className="py-2">{booking.user_name}</td>
                            <td className="py-2">{booking.mobile_no}</td>
                            <td className="py-2">{booking.email}</td>
                            <td className="py-2">{booking.service_name}</td>
                            <td className="py-2">{booking.service_des}</td>
                            <td className="py-2">{booking.address}</td>
                            <td className="py-2">{new Date(booking.date).toLocaleString()}</td>
                            <td className="py-2">
                              <span
                                className={`px-2 py-1 rounded-full text-xs ${
                                  booking.status === "Confirmed"
                                    ? "bg-green-100 text-green-800"
                                    : booking.status === "Pending"
                                    ? "bg-yellow-100 text-yellow-800"
                                    : "bg-red-100 text-red-800"
                                }`}
                              >
                                {booking.status}
                              </span>
                            </td>
                            <td className="py-2">
                              <div className="mt-2 flex gap-4">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => fetchServiceDetails(booking._id)}
                                >
                                  Show Details
                                </Button>
                                <Button
                                  variant="default"
                                  size="sm"
                                  onClick={() => handleAcceptService(booking._id)}
                                >
                                  Accept
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="mybookings">
            <Card>
              <CardHeader>
                <CardTitle>My Pending Services</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[300px]">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="py-2 text-left font-medium">Name</th>
                          <th className="py-2 text-left font-medium">Mobile</th>
                          <th className="py-2 text-left font-medium">Email</th>
                          <th className="py-2 text-left font-medium">Service</th>
                          <th className="py-2 text-left font-medium">Description</th>
                          <th className="py-2 text-left font-medium">Address</th>
                          <th className="py-2 text-left font-medium">Date</th>
                          <th className="py-2 text-left font-medium">Status</th>
                          <th className="py-2 text-left font-medium">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {myPendingServicesData.map((booking) => (
                          <tr key={booking._id} className="border-b">
                            <td className="py-2">{booking.user_name}</td>
                            <td className="py-2">{booking.mobile_no}</td>
                            <td className="py-2">{booking.email}</td>
                            <td className="py-2">{booking.service_name}</td>
                            <td className="py-2">{booking.service_des}</td>
                            <td className="py-2">{booking.address}</td>
                            <td className="py-2">{new Date(booking.date).toLocaleString()}</td>
                            <td className="py-2">
                              <span
                                className={`px-2 py-1 rounded-full text-xs ${
                                  booking.status === "Confirmed"
                                    ? "bg-green-100 text-green-800"
                                    : booking.status === "Pending"
                                    ? "bg-yellow-100 text-yellow-800"
                                    : "bg-red-100 text-red-800"
                                }`}
                              >
                                {booking.status}
                              </span>
                            </td>
                            <td className="py-2">
                              <Button
                                variant="default"
                                size="sm"
                                onClick={() => handleDoneClick(booking._id)}
                              >
                                Done
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history">
            <Card>
              <CardHeader>
                <CardTitle>Completed Services</CardTitle>
                <p className="text-sm text-gray-500">
                  Review the services you have completed along with their revenue details.
                </p>
              </CardHeader>
              <CardContent>
                <div className="mb-4 flex flex-wrap gap-4 text-sm">
                  <span className="font-semibold">
                    Completed: <span className="text-primary-600">{completedServices.length}</span>
                  </span>
                  <span className="font-semibold">
                    Revenue: <span className="text-primary-600">₹{completedRevenue.toFixed(2)}</span>
                  </span>
                  <span className="font-semibold">
                    Avg / Job: <span className="text-primary-600">₹{averageCompletedRevenue.toFixed(2)}</span>
                  </span>
                </div>

                {completedServices.length === 0 ? (
                  <p className="text-sm text-gray-500">No completed services yet.</p>
                ) : (
                  <ScrollArea className="h-[300px]">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b">
                            <th className="py-2 text-left font-medium">Name</th>
                            <th className="py-2 text-left font-medium">Mobile</th>
                            <th className="py-2 text-left font-medium">Email</th>
                            <th className="py-2 text-left font-medium">Service</th>
                            <th className="py-2 text-left font-medium">Description</th>
                            <th className="py-2 text-left font-medium">Address</th>
                            <th className="py-2 text-left font-medium">Payment (₹)</th>
                            <th className="py-2 text-left font-medium">Payment Type</th>
                            <th className="py-2 text-left font-medium">Completed On</th>
                            <th className="py-2 text-left font-medium">Status</th>
                            <th className="py-2 text-left font-medium">Remarks</th>
                            <th className="py-2 text-left font-medium">Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {completedServices.map((booking) => {
                            const paymentAmount = parseFloat(booking.payment_amount);
                            const formattedPayment = isNaN(paymentAmount)
                              ? "-"
                              : `₹${paymentAmount.toFixed(2)}`;
                            const completedOn = booking.solved_date
                              ? new Date(booking.solved_date).toLocaleDateString()
                              : booking.date
                              ? new Date(booking.date).toLocaleDateString()
                              : "-";

                            return (
                              <tr key={booking._id} className="border-b">
                                <td className="py-2">{booking.user_name}</td>
                                <td className="py-2">{booking.mobile_no || "-"}</td>
                                <td className="py-2">{booking.email}</td>
                                <td className="py-2">{booking.service_name}</td>
                                <td className="py-2">{booking.service_des || "-"}</td>
                                <td className="py-2">{booking.address || "-"}</td>
                                <td className="py-2">{formattedPayment}</td>
                                <td className="py-2">{booking.payment_type || "-"}</td>
                                <td className="py-2">{completedOn}</td>
                                <td className="py-2">
                                  <span
                                    className={`px-2 py-1 rounded-full text-xs ${
                                      booking.status === "done"
                                        ? "bg-green-100 text-green-800"
                                        : booking.status === "pending"
                                        ? "bg-yellow-100 text-yellow-800"
                                        : "bg-red-100 text-red-800"
                                    }`}
                                  >
                                    {booking.status ? booking.status.charAt(0).toUpperCase() + booking.status.slice(1) : "-"}
                                  </span>
                                </td>
                                <td className="py-2">{booking.remarks || "-"}</td>
                                <td className="py-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => fetchServiceDetails(booking._id)}
                                  >
                                    View Details
                                  </Button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Modal for Service Details */}
        {modalOpen && serviceDetails && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-lg p-6 max-w-2xl w-full relative max-h-[90vh] overflow-y-auto">
              <button
                className="absolute top-2 right-2 text-gray-600 hover:text-gray-900 text-2xl"
                onClick={closeModal}
                aria-label="Close modal"
              >
                ✕
              </button>
              <h2 className="text-xl font-bold mb-4">Service Details</h2>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600"><strong>Name:</strong></p>
                    <p>{serviceDetails.user_name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600"><strong>Mobile:</strong></p>
                    <p>{serviceDetails.mobile_no}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600"><strong>Email:</strong></p>
                    <p>{serviceDetails.email}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600"><strong>Status:</strong></p>
                    <span
                      className={`px-2 py-1 rounded-full text-xs inline-block ${
                        serviceDetails.status === "done"
                          ? "bg-green-100 text-green-800"
                          : serviceDetails.status === "pending"
                          ? "bg-yellow-100 text-yellow-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {serviceDetails.status?.charAt(0).toUpperCase() + serviceDetails.status?.slice(1)}
                    </span>
                  </div>
                </div>
                
                <div>
                  <p className="text-sm text-gray-600"><strong>Service:</strong></p>
                  <p>{serviceDetails.service_name}</p>
                </div>
                
                <div>
                  <p className="text-sm text-gray-600"><strong>Description:</strong></p>
                  <p>{serviceDetails.service_des}</p>
                </div>
                
                <div>
                  <p className="text-sm text-gray-600"><strong>Address:</strong></p>
                  <p>{serviceDetails.address}</p>
                </div>
                
                <div>
                  <p className="text-sm text-gray-600"><strong>Date:</strong></p>
                  <p>{new Date(serviceDetails.date).toLocaleString()}</p>
                </div>

                {/* Rating and Feedback Section */}
                {serviceDetails.status === "done" && (
                  <div className="mt-6 pt-4 border-t border-gray-200">
                    <h3 className="text-lg font-semibold mb-3">Rating & Feedback</h3>
                    
                    {/* Overall Expert Rating */}
                    {expertData && expertData.rating && parseFloat(expertData.rating) > 0 && (
                      <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                        <p className="text-sm text-gray-600 mb-1"><strong>Your Overall Rating:</strong></p>
                        <div className="flex items-center gap-2">
                          <div className="flex">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star
                                key={star}
                                className={`h-5 w-5 ${
                                  star <= parseFloat(expertData.rating || "0")
                                    ? "fill-yellow-400 text-yellow-400"
                                    : "text-gray-300"
                                }`}
                              />
                            ))}
                          </div>
                          <span className="text-sm font-medium">
                            {parseFloat(expertData.rating).toFixed(1)} / 5.0
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Service-specific Rating and Feedback */}
                    {serviceDetails.rating && serviceDetails.rating !== "0" ? (
                      <div className="space-y-3">
                        <div>
                          <p className="text-sm text-gray-600 mb-2"><strong>Rating for this service:</strong></p>
                          <div className="flex items-center gap-2">
                            <div className="flex">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <Star
                                  key={star}
                                  className={`h-5 w-5 ${
                                    star <= parseFloat(serviceDetails.rating || "0")
                                      ? "fill-yellow-400 text-yellow-400"
                                      : "text-gray-300"
                                  }`}
                                />
                              ))}
                            </div>
                            <span className="text-sm font-medium">
                              {parseFloat(serviceDetails.rating).toFixed(1)} / 5.0
                            </span>
                          </div>
                        </div>
                        
                        {serviceDetails.feedback && (
                          <div>
                            <p className="text-sm text-gray-600 mb-2"><strong>Feedback:</strong></p>
                            <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                              <p className="text-sm text-gray-700 whitespace-pre-wrap">{serviceDetails.feedback}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                        <p className="text-sm text-yellow-800">
                          No rating or feedback has been provided for this service yet.
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Payment Information */}
                {serviceDetails.status === "done" && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <h3 className="text-lg font-semibold mb-3">Payment Information</h3>
                    <div className="grid grid-cols-2 gap-4">
                      {serviceDetails.payment_amount && (
                        <div>
                          <p className="text-sm text-gray-600"><strong>Payment Amount:</strong></p>
                          <p className="text-lg font-semibold text-green-600">
                            ₹{parseFloat(serviceDetails.payment_amount).toFixed(2)}
                          </p>
                        </div>
                      )}
                      {serviceDetails.payment_type && (
                        <div>
                          <p className="text-sm text-gray-600"><strong>Payment Type:</strong></p>
                          <p>{serviceDetails.payment_type}</p>
                        </div>
                      )}
                    </div>
                    {serviceDetails.remarks && (
                      <div className="mt-3">
                        <p className="text-sm text-gray-600"><strong>Remarks:</strong></p>
                        <p>{serviceDetails.remarks}</p>
                      </div>
                    )}
                    {serviceDetails.solved_date && (
                      <div className="mt-3">
                        <p className="text-sm text-gray-600"><strong>Completed On:</strong></p>
                        <p>{new Date(serviceDetails.solved_date).toLocaleString()}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div className="mt-6 flex justify-end">
                <Button variant="ghost" onClick={closeModal}>
                  Close
                </Button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default ExpertDashboard;
