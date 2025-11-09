// src/components/feedback/FeedbackPage.tsx
import { useState, useEffect } from "react";
import { ArrowLeft, Send, List } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { BACKEND_URL } from "../../config";

export default function FeedbackPage() {
   const navigate = useNavigate();
   const [feedbackType, setFeedbackType] = useState<
      "bug" | "feature" | "general"
   >("general");
   const [subject, setSubject] = useState("");
   const [message, setMessage] = useState("");
   const [isSubmitting, setIsSubmitting] = useState(false);
   const [submitStatus, setSubmitStatus] = useState<
      "idle" | "success" | "error"
   >("idle");
   const [isAdmin, setIsAdmin] = useState(false);

   useEffect(() => {
      // Check if user is admin
      fetch(`${BACKEND_URL}/api/me`, { credentials: "include" })
         .then((res) => res.json())
         .then((data) => {
            if (data.privilegeLevel === "admin") {
               setIsAdmin(true);
            }
         })
         .catch(() => {});
   }, []);

   const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();

      if (!message.trim()) {
         return;
      }

      setIsSubmitting(true);
      setSubmitStatus("idle");

      try {
         const response = await fetch(`${BACKEND_URL}/api/feedback`, {
            method: "POST",
            headers: {
               "Content-Type": "application/json"
            },
            credentials: "include",
            body: JSON.stringify({
               type: feedbackType,
               subject: subject.trim() || undefined,
               message: message.trim()
            })
         });

         if (response.ok) {
            setSubmitStatus("success");
            setSubject("");
            setMessage("");

            // Reset success message after 3 seconds
            setTimeout(() => {
               setSubmitStatus("idle");
            }, 3000);
         } else {
            setSubmitStatus("error");
         }
      } catch (error) {
         console.error("Failed to submit feedback:", error);
         setSubmitStatus("error");
      } finally {
         setIsSubmitting(false);
      }
   };

   return (
      <div className="min-h-screen bg-bg dark:bg-bg-dark">
         <div className="max-w-2xl mx-auto px-4 py-8">
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
               <h1 className="text-3xl font-bold text-text dark:text-text-dark flex-1">
                  Send Feedback
               </h1>
               {isAdmin && (
                  <button
                     onClick={() => navigate("/feedback/view")}
                     className="flex items-center gap-2 px-4 py-2 rounded-lg bg-panel dark:bg-panel-dark hover:bg-bg dark:hover:bg-bg-dark text-text dark:text-text-dark transition-colors">
                     <List size={20} />
                     <span className="hidden sm:inline">View All</span>
                  </button>
               )}
            </div>

            {/* Feedback Form */}
            <div className="bg-panel dark:bg-panel-dark rounded-xl border border-border dark:border-border-dark p-6 shadow-sm">
               <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Feedback Type */}
                  <div>
                     <label className="block text-sm font-medium text-text dark:text-text-dark mb-3">
                        What kind of feedback do you have?
                     </label>
                     <div className="flex gap-3">
                        <button
                           type="button"
                           onClick={() => setFeedbackType("bug")}
                           className={`flex-1 py-1 px-2 rounded-full border transition-all ${
                              feedbackType === "bug"
                                 ? "border-accent bg-accent text-white"
                                 : "border-border dark:border-border-dark text-text dark:text-text-dark hover:border-accent"
                           }`}>
                           🐛 Bug Report
                        </button>
                        <button
                           type="button"
                           onClick={() => setFeedbackType("feature")}
                           className={`flex-1 py-1 px-2 rounded-full border transition-all ${
                              feedbackType === "feature"
                                 ? "border-accent bg-accent text-white"
                                 : "border-border dark:border-border-dark text-text dark:text-text-dark hover:border-accent"
                           }`}>
                           💡 Feature Request
                        </button>
                        <button
                           type="button"
                           onClick={() => setFeedbackType("general")}
                           className={`flex-1 py-1 px-2 rounded-full border transition-all ${
                              feedbackType === "general"
                                 ? "border-accent bg-accent text-white"
                                 : "border-border dark:border-border-dark text-text dark:text-text-dark hover:border-accent"
                           }`}>
                           💬 General
                        </button>
                     </div>
                  </div>

                  {/* Subject */}
                  <div>
                     <label
                        htmlFor="subject"
                        className="block text-sm font-medium text-text dark:text-text-dark mb-2">
                        Subject (optional)
                     </label>
                     <input
                        id="subject"
                        type="text"
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        placeholder="Brief summary of your feedback"
                        className="w-full px-4 py-3 rounded-lg border border-border dark:border-border-dark bg-bg dark:bg-bg-dark text-text dark:text-text-dark placeholder:text-sub dark:placeholder:text-sub-dark focus:outline-none focus:ring-2 focus:ring-accent"
                        maxLength={100}
                     />
                  </div>

                  {/* Message */}
                  <div>
                     <label
                        htmlFor="message"
                        className="block text-sm font-medium text-text dark:text-text-dark mb-2">
                        Message *
                     </label>
                     <textarea
                        id="message"
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder="Tell us what's on your mind..."
                        rows={8}
                        required
                        className="w-full px-4 py-3 rounded-lg border border-border dark:border-border-dark bg-bg dark:bg-bg-dark text-text dark:text-text-dark placeholder:text-sub dark:placeholder:text-sub-dark focus:outline-none focus:ring-2 focus:ring-accent resize-none"
                        maxLength={2000}
                     />
                     <div className="mt-2 text-sm text-sub dark:text-sub-dark text-right">
                        {message.length} / 2000
                     </div>
                  </div>

                  {/* Status Messages */}
                  {submitStatus === "success" && (
                     <div className="p-4 rounded-lg bg-green-100 dark:bg-green-900 border border-green-300 dark:border-green-700 text-green-700 dark:text-green-200">
                        ✅ Thank you for your feedback! We appreciate your
                        input.
                     </div>
                  )}

                  {submitStatus === "error" && (
                     <div className="p-4 rounded-lg bg-red-100 dark:bg-red-900 border border-red-300 dark:border-red-700 text-red-700 dark:text-red-200">
                        ❌ Failed to submit feedback. Please try again later.
                     </div>
                  )}

                  {/* Submit Button */}
                  <button
                     type="submit"
                     disabled={isSubmitting || !message.trim()}
                     className="w-full py-3 px-4 rounded-full bg-accent text-white font-medium hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2">
                     {isSubmitting ? (
                        <>
                           <span className="animate-spin">⏳</span>
                           Sending...
                        </>
                     ) : (
                        <>
                           <Send size={20} />
                           Send Feedback
                        </>
                     )}
                  </button>
               </form>
            </div>

            {/* Info Section */}
            <div className="mt-6 p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 text-sm text-blue-800 dark:text-blue-200">
               <p>
                  <strong>Note:</strong> Your feedback helps us improve Laamly.
                  We review all submissions.
               </p>
            </div>
         </div>
      </div>
   );
}
