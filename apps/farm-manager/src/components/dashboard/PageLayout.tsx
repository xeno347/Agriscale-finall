import React from "react";

interface PageLayoutProps {
  children: React.ReactNode;
  title?: string;
}

export const PageLayout = ({ children, title }: PageLayoutProps) => {
  return (
    <div className="flex flex-col flex-1 p-6">
      {title && (
        <h1 className="text-2xl font-semibold mb-6">
          {title}
        </h1>
      )}

      {children}
    </div>
  );
};
