
"use client";

import type React from "react";
import { DashboardHeader } from "./DashboardHeader";
import type { UserRole } from "@/types/platform";
import { useAuth } from "@/contexts/AuthContext";
import { Skeleton } from "../ui/skeleton";
import { GraduationCap } from "lucide-react";

interface DashboardLayoutProps {
  children: React.ReactNode;
  role: UserRole; 
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { isLoading: authIsLoading } = useAuth();

  if (authIsLoading) {
    return (
      <div className="flex flex-col min-h-screen bg-background">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-border bg-card px-4 md:px-6 shadow-sm">
           <Skeleton className="h-8 w-8 rounded-full bg-muted" />
           <Skeleton className="h-6 w-24 ml-2 bg-muted hidden sm:block" />
           <div className="ml-auto flex items-center gap-2">
            <Skeleton className="h-8 w-20 bg-muted hidden md:block" />
            <Skeleton className="h-8 w-20 bg-muted hidden md:block" />
            <Skeleton className="h-9 w-9 rounded-full bg-muted" />
           </div>
        </header>
        <div className="flex-1 container-max section-padding space-y-6">
            <Skeleton className="h-10 w-1/3 mt-4" />
            <Skeleton className="h-48 w-full rounded-lg" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full">
              <Skeleton className="h-32 w-full rounded-lg" />
              <Skeleton className="h-32 w-full rounded-lg" />
              <Skeleton className="h-32 w-full rounded-lg" />
            </div>
        </div>
        <footer className="py-6 px-4 md:px-8 text-center border-t border-border mt-auto bg-card">
          <Skeleton className="h-6 w-8 mx-auto mb-2 rounded-full" />
          <Skeleton className="h-4 w-1/2 mx-auto mb-1" />
          <Skeleton className="h-3 w-1/3 mx-auto" />
        </footer>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <DashboardHeader />
      <main className="flex-1 w-full container-max section-padding">
        {children}
      </main>
      <footer className="py-8 px-4 md:px-6 text-center border-t border-border mt-auto bg-card">
        <div className="flex flex-col items-center text-sm text-muted-foreground font-body">
            <GraduationCap className="h-6 w-6 text-primary mb-2.5"/>
            <p>&copy; {new Date().getFullYear()} EduSpace. All rights reserved.</p>
            <p className="mt-0.5">Empowering Minds, One Lesson at a Time.</p>
        </div>
      </footer>
    </div>
  );
}
