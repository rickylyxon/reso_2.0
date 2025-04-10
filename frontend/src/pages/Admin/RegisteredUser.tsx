import axios from "../../utils/axios";
import { useEffect, useState, useRef } from "react";
import Pdf from "../../utils/Pdf";
import toast from "react-hot-toast";
import {
  FaSpinner,
  FaIdCard,
  FaCalendarAlt,
  FaEnvelope,
  FaUser,
  FaCreditCard,
  FaAddressCard,
  FaMoneyBillWave,
  FaCheckCircle,
  FaTimesCircle,
  FaDownload,
  FaEdit,
} from "react-icons/fa";
import { IoClose } from "react-icons/io5";

type RegisteredEvent = {
  event: {
    event: string;
    date: string;
    fee: number;
    description?: string;
  };
  user: {
    email: string;
  };
  id?: number;
  name: string;
  contact: string;
  address: string;
  transactionId: string;
  bankingName: string;
  approved: boolean;
  team?: {
    teamName: string;
    players: {
      name: string;
      gender: string;
      teamLeader?: boolean;
    }[];
  };
  individual?: boolean;
  createdAt: string;
};

const InfoRow = ({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon?: React.ElementType;
}) => (
  <div className="mb-3 flex items-start gap-3">
    {Icon && <Icon className="text-blue-400 mt-1 flex-shrink-0" />}
    <div>
      <span className="block text-sm font-medium text-blue-300">{label}</span>
      <span className="text-white">{value}</span>
    </div>
  </div>
);

const Button = ({
  label,
  onClick,
  variant = "primary",
  isLoading = false,
  icon: Icon,
}: {
  label: string;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "success";
  isLoading?: boolean;
  icon?: React.ElementType;
}) => (
  <button
    onClick={onClick}
    disabled={isLoading}
    className={`px-4 py-2 rounded transition flex items-center justify-center gap-2 ${
      variant === "primary"
        ? "bg-blue-600 hover:bg-blue-700 text-white"
        : variant === "secondary"
        ? "bg-gray-700 hover:bg-gray-600 text-white"
        : "bg-green-600 hover:bg-green-700 text-white"
    } ${isLoading ? "opacity-70 cursor-not-allowed" : ""}`}
  >
    {isLoading ? <FaSpinner className="animate-spin" /> : Icon && <Icon />}
    {label}
  </button>
);

const RegisteredUser = () => {
  const [eventsRegistered, setEventsRegistered] = useState<RegisteredEvent[]>(
    []
  );
  const [selectedItem, setSelectedItem] = useState<RegisteredEvent | null>(
    null
  );
  const [statusMap, setStatusMap] = useState<Record<number, boolean>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  // Sort events with pending first, then by creation date (newest first)
  const sortedEvents = [...eventsRegistered].sort((a, b) => {
    if (a.approved !== b.approved) return a.approved ? 1 : -1;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const handleApprovalChange = (id: number, value: string) => {
    setStatusMap((prev) => ({
      ...prev,
      [id]: value === "true",
    }));
  };

  const handleUpdateApproval = async (id: number) => {
    const token = localStorage.getItem("Authorization");
    if (!token) {
      toast.error("No token found.");
      return;
    }

    setUpdatingId(id);
    const currentStatus =
      statusMap[id] ??
      eventsRegistered.find((item) => item.id === id)?.approved;

    if (typeof currentStatus === "undefined") {
      toast.error("Unable to determine current status");
      setUpdatingId(null);
      return;
    }

    try {
      await axios.put(
        `/admin/approve/${id}`,
        { approved: currentStatus },
        { headers: { Authorization: token } }
      );

      setEventsRegistered((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, approved: currentStatus } : item
        )
      );
      toast.success("Status updated successfully");
    } catch (error) {
      console.error("Update failed:", error);
      toast.error("Failed to update status");
    } finally {
      setUpdatingId(null);
    }
  };

  useEffect(() => {
    const fetchRegisteredEvents = async () => {
      setIsLoading(true);
      try {
        const token = localStorage.getItem("Authorization");
        if (!token) {
          console.warn("No auth token found");
          return;
        }

        const response = await axios.get("/admin/register-details", {
          headers: { Authorization: token },
        });
        setEventsRegistered(response.data.registerDetails || []);
      } catch (error) {
        console.error("Error fetching registration data:", error);
        toast.error("Failed to load registration data");
      } finally {
        setIsLoading(false);
      }
    };

    fetchRegisteredEvents();
  }, []);

  // Close modal when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        modalRef.current &&
        !modalRef.current.contains(event.target as Node)
      ) {
        setSelectedItem(null);
      }
    };

    if (selectedItem) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [selectedItem]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-900">
        <FaSpinner className="animate-spin text-blue-500 text-4xl" />
      </div>
    );
  }
  const totalFees = eventsRegistered.reduce((sum, item) => {
    return sum + Number(item.event.fee || 0);
  }, 0);
  const totalApprovedFees = eventsRegistered.reduce((sum, item) => {
    return item.approved ? sum + Number(item.event.fee || 0) : sum;
  }, 0);

  const totalPendingFees = eventsRegistered.reduce((sum, item) => {
    return !item.approved ? sum + Number(item.event.fee || 0) : sum;
  }, 0);

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };
  return (
    <div className="p-4 bg-gray-900 min-h-screen">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <h1 className="text-2xl font-bold text-blue-400 flex items-center gap-2">
          <FaEdit className="text-blue-400" />
          Registered Events
        </h1>

        <div className="flex flex-wrap gap-4">
          <div className="bg-gray-800 px-4 py-3 rounded-lg border border-blue-500 flex items-center gap-2">
            <FaMoneyBillWave className="text-yellow-400 text-xl" />
            <div>
              <p className="text-sm text-gray-400">Pending Registration Fees</p>
              <p className="text-white font-bold">
                {formatCurrency(totalPendingFees)}
              </p>
            </div>
          </div>

          <div className="bg-gray-800 px-4 py-3 rounded-lg border border-green-500 flex items-center gap-2">
            <FaMoneyBillWave className="text-green-400 text-xl" />
            <div>
              <p className="text-sm text-gray-400">
                Approved Registration Fees
              </p>
              <p className="text-white font-bold">
                {formatCurrency(totalApprovedFees)}
              </p>
            </div>
          </div>

          <div className="bg-gray-800 px-4 py-3 rounded-lg border border-white flex items-center gap-2">
            <FaMoneyBillWave className="text-white text-xl" />
            <div>
              <p className="text-sm text-gray-400">Total Registration Fees</p>
              <p className="text-white font-bold">
                {formatCurrency(totalFees)}
              </p>
            </div>
          </div>
        </div>
      </div>
      {selectedItem && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div
            ref={modalRef}
            className="bg-gray-800 rounded-lg shadow-lg max-w-4xl w-full relative border border-blue-500"
          >
            <button
              onClick={() => setSelectedItem(null)}
              className="absolute top-2 right-2 text-white bg-blue-600 hover:bg-blue-700 rounded-full w-8 h-8 flex items-center justify-center transition"
            >
              <IoClose />
            </button>
            <Pdf item={selectedItem} />
          </div>
        </div>
      )}

      {sortedEvents.length > 0 ? (
        <div className="grid gap-4">
          {sortedEvents.map((item) => (
            <div
              key={item.id}
              className={`p-6 rounded-lg border transition-all ${
                item.approved
                  ? "border-green-500 bg-gray-800/50"
                  : "border-blue-500 bg-gray-800"
              }`}
            >
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-xl font-bold text-blue-400 flex items-center gap-2">
                  {item.approved ? (
                    <FaCheckCircle className="text-green-500" />
                  ) : (
                    <FaTimesCircle className="text-yellow-500" />
                  )}
                  {item.event?.event.toUpperCase() || "Event Name N/A"}
                </h3>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 ${
                    item.approved ? "bg-green-600" : "bg-yellow-600"
                  }`}
                >
                  {item.approved ? (
                    <FaCheckCircle className="text-sm" />
                  ) : (
                    <FaSpinner className="text-sm animate-spin" />
                  )}
                  {item.approved ? "Approved" : "Pending"}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <InfoRow
                    icon={FaIdCard}
                    label="ID:"
                    value={item.id?.toString() || "N/A"}
                  />
                  <InfoRow
                    icon={FaCalendarAlt}
                    label="Registered On:"
                    value={
                      new Date(item.createdAt).toLocaleString("en-IN", {
                        timeZone: "Asia/Kolkata",
                        year: "numeric",
                        month: "short",
                        day: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      }) || "No date"
                    }
                  />
                  <InfoRow
                    icon={FaEnvelope}
                    label="Email:"
                    value={item.user?.email || "N/A"}
                  />
                  <InfoRow
                    icon={FaUser}
                    label={item.individual ? "Name:" : "Team Name:"}
                    value={
                      item.individual
                        ? item.name || "No name"
                        : item.team?.teamName || "No team name"
                    }
                  />
                </div>
                <div>
                  <InfoRow
                    icon={FaCreditCard}
                    label="Transaction ID:"
                    value={item.transactionId || "N/A"}
                  />
                  <InfoRow
                    icon={FaAddressCard}
                    label="Bank Name:"
                    value={item.bankingName || "N/A"}
                  />
                  <InfoRow
                    icon={FaMoneyBillWave}
                    label="Fee:"
                    value={`₹${item.event.fee ?? "N/A"}`}
                  />
                </div>
              </div>

              {item.id !== undefined && (
                <div className="mt-6 pt-4 border-t border-gray-700">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <label className="text-blue-300 flex items-center gap-1">
                        <FaEdit />
                        Change Status:
                      </label>
                      <select
                        className="bg-gray-700 text-white p-2 rounded border border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={(statusMap[item.id] ?? item.approved).toString()}
                        onChange={(e) =>
                          handleApprovalChange(item.id!, e.target.value)
                        }
                      >
                        <option value="true">Approved</option>
                        <option value="false">Pending</option>
                      </select>
                      <Button
                        label="Update"
                        variant={
                          statusMap[item.id] ?? item.approved
                            ? "success"
                            : "secondary"
                        }
                        onClick={() => handleUpdateApproval(item.id!)}
                        isLoading={updatingId === item.id}
                        icon={FaCheckCircle}
                      />
                    </div>
                    <Button
                      label="Download PDF"
                      onClick={() => setSelectedItem(item)}
                      icon={FaDownload}
                    />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-gray-800 rounded-lg">
          <p className="text-gray-400 text-lg flex items-center justify-center gap-2">
            <FaTimesCircle />
            No events registered yet.
          </p>
        </div>
      )}
    </div>
  );
};

export default RegisteredUser;
