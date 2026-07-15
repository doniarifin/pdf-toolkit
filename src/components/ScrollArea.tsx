import React from "react";

interface ScrollAreaProps {
  children: React.ReactNode;
  className?: string;
}

const ScrollArea: React.FC<ScrollAreaProps> = ({ children, className }) => {
  return (
    <div className={`scroll-area overflow-y-auto ${className ?? ""}`}>
      {children}
    </div>
  );
};

export default ScrollArea;
