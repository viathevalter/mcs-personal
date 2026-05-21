import { ReactNode } from 'react';

export function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="flex-1 w-full flex flex-col min-h-screen">
      {children}
    </div>
  );
}
