import React from "react";

interface ButtonProps {
  onClick: () => void;
  disabled?: boolean;
  type?: "button" | "submit" | "reset";
  className?: string;
  children: React.ReactNode;
}

export const PrimaryButton: React.FC<ButtonProps> = ({
  onClick,
  disabled = false,
  type = "button",
  className = "",
  children,
}) => {
  return (
    <button
      type={type}
      className={`primary-button ${className}`}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
};

export const SecondaryButton: React.FC<ButtonProps> = ({
  onClick,
  disabled = false,
  type = "button",
  className = "",
  children,
}) => {
  return (
    <button
      type={type}
      className={`secondary-button ${className}`}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
};

export const DangerButton: React.FC<ButtonProps> = ({
  onClick,
  disabled = false,
  type = "button",
  className = "",
  children,
}) => {
  return (
    <button
      type={type}
      className={`danger-button ${className}`}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
};

interface IconButtonProps extends ButtonProps {
  icon: string; // material-iconsのアイコン名
}

export const IconButton: React.FC<IconButtonProps> = ({
  onClick,
  disabled = false,
  type = "button",
  className = "",
  icon,
  children,
}) => {
  return (
    <button
      type={type}
      className={`icon-button ${className}`}
      onClick={onClick}
      disabled={disabled}
    >
      <span className="material-icons">{icon}</span>
      {children}
    </button>
  );
};
