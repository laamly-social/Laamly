// src/components/feedback/FeedbackListPage.tsx
import { useState, useEffect } from "react";
import {
   ArrowLeft,
   MessageCircle,
   AlertCircle,
   Lightbulb,
   MessageSquare,
   Clock,
   CheckCircle,
   Archive
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { BACKEND_URL } from "../../config";

interface FeedbackItem {
   _id: string;
   userId?: {
      _id: string;
      profile?: {
         name: string;
         avatar?: string;
      };
   };
   type: "bug" | "feature" | "general";
   subject?: string;
   message: string;
   status: "new" | "reviewing" | "resolved" | "archived";
   createdAt: string;
}

export default function FeedbackListPage() {
   const navigate = useNavigate();
   const [feedback, setFeedback] = useState<FeedbackItem[]>([]);
   const [loading, setLoading] = useState(true);
   const [error, setError] = useState<string | null>(null);
   const [filter, setFilter] = useState<"all" | "bug" | "feature" | "general">(
      "all"
   );
   const [statusFilter, setStatusFilter] = useState<
      "all" | "new" | "reviewing" | "resolved" | "archived"
   >("all");
   const [isAuthorized, setIsAuthorized] = useState(true);

   useEffect(() => {
      checkAdminAndFetchFeedback();
   }, []);

   const checkAdminAndFetchFeedback = async () => {
      try {
         // Check if user is admin first
         const userResponse = await fetch(`${BACKEND_URL}/api/me`, {
            credentials: "include"
         });

         if (!userResponse.ok) {
            setIsAuthorized(false);
            setError("You must be logged in to view this page.");
            setLoading(false);
            setTimeout(() => navigate("/home"), 2000);
            return;
         }

         const userData = await userResponse.json();
         if (userData.privilegeLevel !== "admin") {
            setIsAuthorized(false);
            setError("Admin access required to view this page.");
            setLoading(false);
            setTimeout(() => navigate("/home"), 2000);
            return;
         }

         // User is admin, fetch feedback
         await fetchFeedback();
      } catch (err) {
         console.error("Error checking authorization:", err);
         setError("Failed to verify authorization.");
         setLoading(false);
      }
   };

   const fetchFeedback = async () => {
      try {
         setLoading(true);
         const response = await fetch(`${BACKEND_URL}/api/feedback`, {
            credentials: "include"
         });

         if (!response.ok) {
            throw new Error("Failed to fetch feedback");
         }

         const data = await response.json();
         setFeedback(data);
         setError(null);
      } catch (err) {
         console.error("Error fetching feedback:", err);
         setError("Failed to load feedback. Please try again later.");
      } finally {
         setLoading(false);
      }
   };

   const updateFeedbackStatus = async (
      id: string,
      newStatus: FeedbackItem["status"]
   ) => {
      try {
         const response = await fetch(
            `${BACKEND_URL}/api/feedback/${id}/status`,
            {
               method: "PATCH",
               headers: {
                  "Content-Type": "application/json"
               },
               credentials: "include",
               body: JSON.stringify({ status: newStatus })
            }
         );

         if (response.ok) {
            setFeedback((prev) =>
               prev.map((item) =>
                  item._id === id ? { ...item, status: newStatus } : item
               )
            );
         }
      } catch (err) {
         console.error("Error updating feedback status:", err);
      }
   };

   const getTypeIcon = (type: string) => {
      switch (type) {
         case "bug":
            return <AlertCircle size={20} className="text-red-500" />;
         case "feature":
            return <Lightbulb size={20} className="text-yellow-500" />;
         default:
            return <MessageSquare size={20} className="text-blue-500" />;
      }
   };

   const getStatusBadge = (status: string) => {
      const styles = {
         new: "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200 border-blue-300 dark:border-blue-700",
         reviewing:
            "bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-200 border-yellow-300 dark:border-yellow-700",
         resolved:
            "bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-200 border-green-300 dark:border-green-700",
         archived:
            "bg-gray-100 dark:bg-gray-900 text-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-700"
      };

      return (
         <span
            className={`px-2 py-1 rounded-full text-xs font-medium border ${styles[status as keyof typeof styles] || styles.new}`}>
            {status.charAt(0).toUpperCase() + status.slice(1)}
         </span>
      );
   };

   const filteredFeedback = feedback.filter((item) => {
      const matchesType = filter === "all" || item.type === filter;
      const matchesStatus =
         statusFilter === "all" || item.status === statusFilter;
      return matchesType && matchesStatus;
   });

   const formatDate = (dateString: string) => {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      if (diffMins < 60) return `${diffMins} minutes ago`;
      if (diffHours < 24) return `${diffHours} hours ago`;
      if (diffDays < 7) return `${diffDays} days ago`;
      return date.toLocaleDateString();
   };

   return (
      <div className="min-h-screen bg-bg dark:bg-bg-dark pb-20 md:pb-0">
         <div className="max-w-6xl mx-auto px-4 py-8">
            {/* Header */}
            <div className="flex items-center gap-4 mb-8">
               <button
                  onClick={() => navigate(-1)}
                  className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                  <ArrowLeft
                     size={24}
                     className="text-text dark:text-text-dark"
                  />
               </button>
               <div className="flex-1">
                  <h1 className="text-3xl font-bold text-text dark:text-text-dark">
                     All Feedback
                  </h1>
                  <p className="text-sub dark:text-sub-dark mt-1">
                     {filteredFeedback.length}{" "}
                     {filteredFeedback.length === 1
                        ? "submission"
                        : "submissions"}
                  </p>
               </div>
            </div>

            {/* Filters */}
            <div className="mb-6 space-y-4">
               {/* Type Filter */}
               <div>
                  <label className="block text-sm font-medium text-text dark:text-text-dark mb-2">
                     Filter by Type
                  </label>
                  <div className="flex gap-2 flex-wrap">
                     {["all", "bug", "feature", "general"].map((type) => (
                        <button
                           key={type}
                           onClick={() => setFilter(type as any)}
                           className={`px-4 py-2 rounded-lg border-2 transition-all ${
                              filter === type
                                 ? "border-accent bg-accent text-white"
                                 : "border-border dark:border-border-dark text-text dark:text-text-dark hover:border-accent"
                           }`}>
                           {type.charAt(0).toUpperCase() + type.slice(1)}
                        </button>
                     ))}
                  </div>
               </div>

               {/* Status Filter */}
               <div>
                  <label className="block text-sm font-medium text-text dark:text-text-dark mb-2">
                     Filter by Status
                  </label>
                  <div className="flex gap-2 flex-wrap">
                     {["all", "new", "reviewing", "resolved", "archived"].map(
                        (status) => (
                           <button
                              key={status}
                              onClick={() => setStatusFilter(status as any)}
                              className={`px-4 py-2 rounded-lg border-2 transition-all ${
                                 statusFilter === status
                                    ? "border-accent bg-accent text-white"
                                    : "border-border dark:border-border-dark text-text dark:text-text-dark hover:border-accent"
                              }`}>
                              {status.charAt(0).toUpperCase() + status.slice(1)}
                           </button>
                        )
                     )}
                  </div>
               </div>
            </div>

            {/* Loading State */}
            {loading && (
               <div className="flex items-center justify-center py-12">
                  <div className="text-center">
                     <div className="animate-spin text-4xl mb-4">⏳</div>
                     <p className="text-sub dark:text-sub-dark">
                        Loading feedback...
                     </p>
                  </div>
               </div>
            )}

            {/* Error State */}
            {error && (
               <div className="p-4 rounded-lg bg-red-100 dark:bg-red-900 border border-red-300 dark:border-red-700 text-red-700 dark:text-red-200">
                  {error}
               </div>
            )}

            {/* Feedback List */}
            {!loading && !error && (
               <div className="space-y-4">
                  {filteredFeedback.length === 0 ? (
                     <div className="text-center py-12">
                        <MessageCircle
                           size={48}
                           className="mx-auto text-sub dark:text-sub-dark mb-4"
                        />
                        <p className="text-sub dark:text-sub-dark">
                           No feedback found matching your filters.
                        </p>
                     </div>
                  ) : (
                     filteredFeedback.map((item) => (
                        <div
                           key={item._id}
                           className="bg-white dark:bg-gray-800 rounded-xl border border-border dark:border-border-dark p-6 shadow-sm hover:shadow-md transition-shadow">
                           {/* Header */}
                           <div className="flex items-start justify-between mb-4">
                              <div className="flex items-center gap-3">
                                 {getTypeIcon(item.type)}
                                 <div>
                                    <div className="flex items-center gap-2">
                                       <span className="font-semibold text-text dark:text-text-dark">
                                          {item.type === "bug"
                                             ? "🐛 Bug Report"
                                             : item.type === "feature"
                                               ? "💡 Feature Request"
                                               : "💬 General Feedback"}
                                       </span>
                                       {getStatusBadge(item.status)}
                                    </div>
                                    <p className="text-sm text-sub dark:text-sub-dark mt-1">
                                       {item.userId?.profile?.name ? (
                                          <span>
                                             by{" "}
                                             <span className="font-medium">
                                                {item.userId.profile.name}
                                             </span>
                                          </span>
                                       ) : (
                                          <span>Anonymous</span>
                                       )}{" "}
                                       • {formatDate(item.createdAt)}
                                    </p>
                                 </div>
                              </div>
                           </div>

                           {/* Subject */}
                           {item.subject && (
                              <h3 className="font-semibold text-lg text-text dark:text-text-dark mb-2">
                                 {item.subject}
                              </h3>
                           )}

                           {/* Message */}
                           <p className="text-text dark:text-text-dark whitespace-pre-wrap mb-4">
                              {item.message}
                           </p>

                           {/* Status Actions */}
                           <div className="flex gap-2 flex-wrap">
                              <label className="text-sm font-medium text-sub dark:text-sub-dark mr-2">
                                 Update Status:
                              </label>
                              {["new", "reviewing", "resolved", "archived"].map(
                                 (status) => (
                                    <button
                                       key={status}
                                       onClick={() =>
                                          updateFeedbackStatus(
                                             item._id,
                                             status as any
                                          )
                                       }
                                       disabled={item.status === status}
                                       className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                                          item.status === status
                                             ? "bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed"
                                             : "bg-gray-100 dark:bg-gray-700 text-text dark:text-text-dark hover:bg-gray-200 dark:hover:bg-gray-600"
                                       }`}>
                                       {status.charAt(0).toUpperCase() +
                                          status.slice(1)}
                                    </button>
                                 )
                              )}
                           </div>
                        </div>
                     ))
                  )}
               </div>
            )}
         </div>
      </div>
   );
}
