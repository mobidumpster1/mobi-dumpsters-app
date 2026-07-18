"use client";

export function ConfirmButton({
  message,
  className,
  children,
  onClick,
  disabled,
}: {
  message: string;
  className?: string;
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type={onClick ? "button" : "submit"}
      className={className}
      disabled={disabled}
      onClick={(e) => {
        if (!window.confirm(message)) {
          e.preventDefault();
          return;
        }
        onClick?.();
      }}
    >
      {children}
    </button>
  );
}
