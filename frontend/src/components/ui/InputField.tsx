import React from "react";

interface InputFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
   className?: string;
}

const InputField = React.forwardRef<HTMLInputElement, InputFieldProps>(
   ({ className, ...props }, ref) => (
      <input
         ref={ref}
         className={[
            "flex-1 h-[36px] border-1 border-border dark:border-border-dark rounded-xl text-text dark:text-text-dark px-2.5 w-full focus:outline-none focus:ring-2 focus:ring-accent bg-background dark:bg-background-dark placeholder:text-sub dark:placeholder:text-sub-dark",
            className
         ]
            .filter(Boolean)
            .join(" ")}
         {...props}
      />
   )
);

InputField.displayName = "InputField";

export default InputField;
