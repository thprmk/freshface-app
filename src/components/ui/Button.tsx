// src/components/ui/Button.tsx
import React, { ButtonHTMLAttributes, ReactNode } from 'react';
import { Loader2 } from 'lucide-react'; // Or your preferred loading spinner icon
import cn from 'classnames'; // Optional: for cleaner class concatenation, install with `npm install classnames` or `yarn add classnames`

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'outline' | 'ghost';
  size?: 'xs' | 'sm' | 'md' | 'lg'; // <<<< 1. ADDED "xs" HERE
  icon?: ReactNode;
  fullWidth?: boolean;
  isLoading?: boolean;
}

const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  icon,
  fullWidth = false,
  isLoading = false,
  className = '',
  disabled,
  ...props
}) => {
  const baseClasses = 'inline-flex items-center justify-center rounded-md font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2';

  const isDisabledEffective = isLoading || disabled;

  const variantClasses = {
    primary: 'bg-purple-600 text-white hover:bg-purple-700 focus:ring-purple-500',
    secondary: 'bg-teal-600 text-white hover:bg-teal-700 focus:ring-teal-500',
    success: 'bg-green-600 text-white hover:bg-green-700 focus:ring-green-500',
    danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
    warning: 'bg-amber-500 text-white hover:bg-amber-600 focus:ring-amber-500',
    outline: 'bg-transparent border border-gray-300 text-gray-700 hover:bg-gray-50 focus:ring-gray-500',
    ghost: 'bg-transparent text-gray-700 hover:bg-gray-100 focus:ring-purple-500 focus:bg-gray-100',
  };

  const sizeClasses = {
    xs: 'px-2 py-1 text-xs',      // <<<< 2. ADDED STYLES FOR "xs" (Adjust as needed)
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-5 py-2.5 text-lg',
  };

  let effectiveSizeClasses = sizeClasses[size];
  if (variant === 'ghost' && icon && !children) {
    switch (size) {
        case 'xs': effectiveSizeClasses = 'p-1 text-xs'; break; // <<<< 3. ADDED ghost icon-only style for "xs"
        case 'sm': effectiveSizeClasses = 'p-1.5 text-sm'; break;
        case 'md': effectiveSizeClasses = 'p-2 text-base'; break;
        case 'lg': effectiveSizeClasses = 'p-2.5 text-lg'; break;
        default: effectiveSizeClasses = 'p-2 text-base';
    }
  }

  const widthClass = fullWidth ? 'w-full' : '';
  const disabledClasses = isDisabledEffective ? 'opacity-75 cursor-not-allowed' : '';

  // Using cn (classnames) for cleaner concatenation, but string template is also fine
  const finalClassName = cn(
    baseClasses,
    variantClasses[variant],
    effectiveSizeClasses,
    widthClass,
    disabledClasses,
    className
  );

  return (
    <button
      className={finalClassName}
      disabled={isDisabledEffective}
      {...props}
    >
      {isLoading ? (
        <Loader2 className={cn("animate-spin h-5 w-5", children ? "mr-2" : "")} />
      ) : (
        icon && <span className={cn(children ? "mr-2" : "")}>{icon}</span>
      )}
      {!isLoading && children}
    </button>
  );
};

export default Button;