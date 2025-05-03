import React from "react";

interface ErrorMessageProps {
  message: string | null;
}

export const ErrorMessage: React.FC<ErrorMessageProps> = ({ message }) => {
  if (!message) return null;
  return <div className="error-message">{message}</div>;
};

interface SuccessMessageProps {
  message: string | null;
}

export const SuccessMessage: React.FC<SuccessMessageProps> = ({ message }) => {
  if (!message) return null;
  return <div className="success-message">{message}</div>;
};

interface LoadingSpinnerProps {
  loading: boolean;
  text?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  loading,
  text = "Loading...",
}) => {
  if (!loading) return null;
  return <div className="loading-spinner">{text}</div>;
};
