import { X } from "lucide-react";
import { ReactNode } from "react";

interface ModalProps {
   isOpen: boolean;
   onClose: () => void;
   title: string;
   children: ReactNode;
   footer?: ReactNode;
   maxWidth?: "sm" | "md" | "lg" | "xl";
}

export default function Modal({
   isOpen,
   onClose,
   title,
   children,
   footer,
   maxWidth = "md"
}: ModalProps) {
   if (!isOpen) return null;

   const maxWidthClasses = {
      sm: "max-w-sm",
      md: "max-w-md",
      lg: "max-w-lg",
      xl: "max-w-xl"
   };

   return (
      <div
         className="fixed inset-0 bg-black/20 flex items-center justify-center z-55 backdrop-blur-sm"
         onClick={onClose}>
         <div
            className={`bg-panel dark:bg-panel-dark rounded-xl border border-border dark:border-border-dark w-full ${maxWidthClasses[maxWidth]} mx-4 overflow-hidden`}
            onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border dark:border-border-dark">
               <h2 className="text-lg font-semibold text-text dark:text-text-dark">
                  {title}
               </h2>
               <button
                  onClick={onClose}
                  className="text-sub dark:text-sub-dark hover:text-text dark:hover:text-text-dark transition"
                  aria-label="Close">
                  <X size={20} />
               </button>
            </div>

            {/* Content */}
            <div className="max-h-[calc(100vh-12rem)] overflow-y-auto">
               {children}
            </div>

            {/* Footer */}
            {footer && (
               <div className="p-4 border-t border-border dark:border-border-dark flex gap-2 justify-end">
                  {footer}
               </div>
            )}
         </div>
      </div>
   );
}
