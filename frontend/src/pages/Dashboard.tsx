import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { History, MapPin, Loader2, CheckCircle } from "lucide-react";
import { Label } from "@/components/ui/label";

const UserDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  // Get user info from localStorage
  const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
  const token = localStorage.getItem("auth") || "";

  const [user, setUser] = useState<any>(storedUser);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [updateModalOpen, setUpdateModalOpen] = useState(false);

  // Service request form state - only fields user fills now
  const [serviceForm, setServiceForm] = useState({
    service_name: "",
    service_des: "",
    date: "",
    time: "",
    location: null as { type: string; coordinates: [number, number] } | null,
    female_preference: false,
  });
  const [isFetchingLocation, setIsFetchingLocation] = useState(false);
  const [locationStatus, setLocationStatus] = useState<string>("");

  // User profile update form state (clone of user to edit)
  const [updateForm, setUpdateForm] = useState({ ...storedUser });

  // Services stats from user history
  const [serviceStats, setServiceStats] = useState({
    totalRequested: 0,
    pending: 0,
    completed: 0,
  });

  // Fetch fresh user profile
  const fetchUserProfile = async () => {
    try {
      const res = await fetch(`http://localhost:5000/user/${user._id}`, {
        headers: { authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data._id) {
        setUser(data);
        setUpdateForm(data);
        updateServiceStats(data.history || []);
      } else {
        toast({ title: "User profile fetch failed" });
      }
    } catch (e) {
      toast({ title: "Error fetching profile" });
    }
  };


  // Update service stats based on user history
  const updateServiceStats = (history: any[]) => {
    const totalRequested = history.length;
    const pending = history.filter((h) => h.status === "pending").length;
    const completed = history.filter((h) => h.status === "done").length;
    setServiceStats({ totalRequested, pending, completed });
  };

  useEffect(() => {
    if (!token || !user._id) {
      navigate("/login");
      return;
    }
    fetchUserProfile();
  }, []);

  // Handle service request form input changes
  const handleServiceChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setServiceForm((prev) => ({ ...prev, [name]: value }));
  };

  // Handle checkbox changes
  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setServiceForm((prev) => ({ ...prev, [name]: checked }));
  };

  // Fetch location using browser geolocation
  const handleFetchLocation = () => {
    if (!navigator.geolocation) {
      toast({
        title: "Location not supported",
        description: "Geolocation is not supported by your browser.",
        variant: "destructive",
      });
      return;
    }

    setIsFetchingLocation(true);
    setLocationStatus("Fetching location...");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { longitude, latitude } = position.coords;
        setServiceForm((prev) => ({
          ...prev,
          location: {
            type: "Point",
            coordinates: [longitude, latitude], // MongoDB GeoJSON format: [longitude, latitude]
          },
        }));
        setLocationStatus(`Location fetched: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
        setIsFetchingLocation(false);
        toast({
          title: "Location fetched successfully",
          description: "Your location has been captured.",
        });
      },
      (error) => {
        setIsFetchingLocation(false);
        let errorMessage = "Failed to fetch location.";
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = "Location access denied. Please enable location permissions.";
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = "Location information unavailable.";
            break;
          case error.TIMEOUT:
            errorMessage = "Location request timeout. Please try again.";
            break;
        }
        setLocationStatus(errorMessage);
        toast({
          title: "Location fetch failed",
          description: errorMessage,
          variant: "destructive",
        });
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  // Submit service request and update user history/profile
  const submitServiceRequest = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!serviceForm.service_name || !serviceForm.service_des || !serviceForm.date || !serviceForm.time) {
      toast({ title: "Please fill all required service request fields" });
      return;
    }

    if (!serviceForm.location || !serviceForm.location.coordinates) {
      toast({
        title: "Location required",
        description: "Please click 'Fetch Location' to capture your current location.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Post service request to service API
      const serviceBody: any = {
        service_name: serviceForm.service_name,
        service_des: serviceForm.service_des,
        date: serviceForm.date,
        time: serviceForm.time,
        user_id: user._id,
        user_name: user.name,
        mobile_no: user.mobile_no,
        email: user.email,
        landmark: user.landmark,
        address: user.address,
        city: user.city,
        district: user.district,
        state: user.state,
        status: "pending",
        female_preference: serviceForm.female_preference,
      };

      // Add location if it exists
      if (serviceForm.location && serviceForm.location.coordinates) {
        serviceBody.location = serviceForm.location;
      }

      const resService = await fetch("http://localhost:5000/service", {
        method: "POST",
        headers: { "Content-Type": "application/json", authorization: `Bearer ${token}` },
        body: JSON.stringify(serviceBody),
      });

      const serviceResult = await resService.json();

      if (!serviceResult._id) {
        toast({ title: "Service request failed" });
        return;
      }

      const newHistoryEntry = {
        service_id: serviceResult._id,
        expert_id: "", 
        date: serviceForm.date,
        service_name: serviceForm.service_name,
        status: "pending",
      };

      const updatedHistory = [...(user.history || []), newHistoryEntry];

      const resUserUpdate = await fetch(`http://localhost:5000/user/${user._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", authorization: `Bearer ${token}` },
        body: JSON.stringify({ history: updatedHistory }),
      });

      const userUpdated = await resUserUpdate.json();

      if (resUserUpdate.ok) {
        // Refresh user profile and stats
        fetchUserProfile();
        // Clear service form
        setServiceForm({
          service_name: "",
          service_des: "",
          date: "",
          time: "",
          location: null,
          female_preference: false,
        });
        setLocationStatus("");
        toast({ title: "Service requested successfully" });
      } else {
        toast({ title: "Failed to update user history" });
      }
    } catch (e) {
      toast({ title: "Error processing request" });
    }
  };

  // Handle profile modal open/close
  const openProfileModal = () => setProfileModalOpen(true);
  const closeProfileModal = () => setProfileModalOpen(false);

  // Handle update modal open/close
  const openUpdateModal = () => setUpdateModalOpen(true);
  const closeUpdateModal = () => setUpdateModalOpen(false);

  // Handle profile form input change
  const handleUpdateChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setUpdateForm((prev) => ({ ...prev, [name]: value }));
  };

  // Submit profile update
  const submitProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`http://localhost:5000/user/${user._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", authorization: `Bearer ${token}` },
        body: JSON.stringify(updateForm),
      });
      if (res.ok) {
        toast({ title: "Profile updated" });
        setUser(updateForm);
        closeUpdateModal();
      } else toast({ title: "Failed to update profile" });
    } catch {
      toast({ title: "Error updating profile" });
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex flex-col">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-xl font-bold dark:text-white">User Dashboard</h1>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/user/history")}
              className="flex items-center gap-2"
            >
              <History className="h-4 w-4" />
              History
            </Button>
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              Logout
            </Button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="container mx-auto px-4 py-6 flex-grow">
        {/* Stats */}
        <div className="mb-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="dark:bg-gray-800 dark:border-gray-700">
            <CardHeader>
              <CardTitle className="dark:text-white">Total Services Requested</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold dark:text-white">{serviceStats.totalRequested}</p>
            </CardContent>
          </Card>
          <Card className="dark:bg-gray-800 dark:border-gray-700">
            <CardHeader>
              <CardTitle className="dark:text-white">Pending Services</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold dark:text-white">{serviceStats.pending}</p>
            </CardContent>
          </Card>
          <Card className="dark:bg-gray-800 dark:border-gray-700">
            <CardHeader>
              <CardTitle className="dark:text-white">Completed Services</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold dark:text-white">{serviceStats.completed}</p>
            </CardContent>
          </Card>
        </div>

        {/* Request Service Form */}
        <Card className="dark:bg-gray-800 dark:border-gray-700">
          <CardHeader>
            <CardTitle className="dark:text-white">Request a Service</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={submitServiceRequest} className="space-y-4">
              <div>
                <label className="block mb-1">Service Name *</label>
                <Input
                  name="service_name"
                  value={serviceForm.service_name}
                  onChange={handleServiceChange}
                  required
                  placeholder="Enter service name"
                />
              </div>

              <div>
                <label className="block mb-1">Service Description *</label>
                <Textarea
                  name="service_des"
                  value={serviceForm.service_des}
                  onChange={handleServiceChange}
                  required
                  placeholder="Describe the service you need"
                />
              </div>

              <div>
                <label className="block mb-1">Date *</label>
                <Input
                  name="date"
                  value={serviceForm.date}
                  onChange={handleServiceChange}
                  required
                  type="date"
                />
              </div>

              <div>
                <label className="block mb-1 dark:text-white">Time *</label>
                <Input
                  name="time"
                  value={serviceForm.time}
                  onChange={handleServiceChange}
                  required
                  type="time"
                />
              </div>

              <div className="space-y-2">
                <Label className="dark:text-white">Location * (Required to match nearby experts)</Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    onClick={handleFetchLocation}
                    disabled={isFetchingLocation}
                    variant="outline"
                    className="flex items-center gap-2"
                  >
                    {isFetchingLocation ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Fetching...
                      </>
                    ) : (
                      <>
                        <MapPin className="h-4 w-4" />
                        Fetch Location
                      </>
                    )}
                  </Button>
                  {serviceForm.location && (
                    <div className="flex-1 px-3 py-2 border rounded-md bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 text-sm flex items-center">
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Location captured
                    </div>
                  )}
                </div>
                {locationStatus && (
                  <p className={`text-xs ${serviceForm.location ? "text-green-600 dark:text-green-400" : "text-gray-500 dark:text-gray-400"}`}>
                    {locationStatus}
                  </p>
                )}
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Click "Fetch Location" to allow the browser to access your location. This is required so we can match you with nearby experts.
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="female_preference"
                  name="female_preference"
                  checked={serviceForm.female_preference}
                  onChange={handleCheckboxChange}
                  className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                />
                <Label htmlFor="female_preference" className="text-sm font-medium cursor-pointer dark:text-white">
                  I prefer a female expert/assistant
                </Label>
              </div>

              <Button type="submit">Submit Request</Button>
            </form>
          </CardContent>
        </Card>

        {/* Buttons for profile modals */}
        <div className="mt-6 flex gap-4">
          <Button onClick={openProfileModal}>View Profile</Button>
          <Button onClick={openUpdateModal} variant="outline">Update Profile</Button>
        </div>
      </main>

      {/* <Footer /> */}

      {/* Profile Modal */}
      {profileModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded p-6 max-w-lg w-full relative">
            <button
              className="absolute top-2 right-3 text-gray-700 hover:text-gray-900"
              onClick={closeProfileModal}
              aria-label="Close profile modal"
            >
              ✕
            </button>
            <h2 className="text-xl font-bold mb-4 dark:text-white">Profile Details</h2>
            <div className="dark:text-gray-300">
              <p><strong>Name:</strong> {user.name}</p>
              <p><strong>Email:</strong> {user.email}</p>
              <p><strong>Phone:</strong> {user.mobile_no}</p>
              <p><strong>Address:</strong> {user.address}, {user.landmark}, {user.city}, {user.district}, {user.state}, {user.pincode}</p>
              <p><strong>Date of Birth:</strong> {user.dob}</p>
              <p><strong>Gender:</strong> {user.gender}</p>
            </div>
            <div className="mt-4 flex justify-end">
              <Button onClick={closeProfileModal}>Close</Button>
            </div>
          </div>
        </div>
      )}

      {/* Update Profile Modal */}
      {updateModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded p-6 max-w-lg w-full relative">
            <button
              className="absolute top-2 right-3 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
              onClick={closeUpdateModal}
              aria-label="Close update modal"
            >
              ✕
            </button>
            <h2 className="text-xl font-bold mb-4 dark:text-white">Update Profile</h2>
            <form onSubmit={submitProfileUpdate} className="space-y-4">
              <Input
                name="name"
                value={updateForm.name}
                onChange={handleUpdateChange}
                placeholder="Name"
                required
              />
              <Input
                name="email"
                value={updateForm.email}
                onChange={handleUpdateChange}
                placeholder="Email"
                type="email"
                required
              />
              <Input
                name="mobile_no"
                value={updateForm.mobile_no}
                onChange={handleUpdateChange}
                placeholder="Phone"
                required
              />
              <Input
                name="dob"
                value={updateForm.dob}
                onChange={handleUpdateChange}
                placeholder="Date of Birth"
                type="date"
              />
              <Input
                name="gender"
                value={updateForm.gender}
                onChange={handleUpdateChange}
                placeholder="Gender"
              />
              <Input
                name="address"
                value={updateForm.address}
                onChange={handleUpdateChange}
                placeholder="Address"
                required
              />
              <Input
                name="landmark"
                value={updateForm.landmark}
                onChange={handleUpdateChange}
                placeholder="Landmark"
              />
              <Input
                name="city"
                value={updateForm.city}
                onChange={handleUpdateChange}
                placeholder="City"
                required
              />
              <Input
                name="district"
                value={updateForm.district}
                onChange={handleUpdateChange}
                placeholder="District"
                required
              />
              <Input
                name="state"
                value={updateForm.state}
                onChange={handleUpdateChange}
                placeholder="State"
                required
              />
              <Input
                name="pincode"
                value={updateForm.pincode}
                onChange={handleUpdateChange}
                placeholder="Pincode"
              />

              <div className="flex justify-end gap-4 mt-4">
                <Button type="submit">Save</Button>
                <Button variant="outline" onClick={closeUpdateModal}>Cancel</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserDashboard;
