
import React from "react";
import Link from "next/link";
import { GraduationCap } from "lucide-react";
import type { UserRole } from "@/types/platform";

interface AuthLayoutProps {
  children: React.ReactNode;
  title: string;
  description: string;
  role: UserRole | "Register"; 
}

export function AuthLayout({ children, title, description, role }: AuthLayoutProps) {
  const currentPath = role === "Register" 
    ? (title.toLowerCase().includes("teacher") ? "/register?role=teacher" : "/register")
    : (role ? `/${role.toLowerCase()}/login` : "/");


  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-md space-y-8 animate-fade-in">
        <div className="text-center">
          <Link href={currentPath} className="inline-block mb-6 transform hover:scale-110 transition-all-smooth duration-300">
            <GraduationCap className="h-16 w-16 text-primary drop-shadow-lg" />
          </Link>
          <h1 className="text-4xl font-headline font-bold tracking-tight text-primary">
            {title}
          </h1>
          <p className="mt-2 text-foreground/80 font-body">
            {description}
          </p>
        </div>
        
        <div className="bg-card p-6 sm:p-8 shadow-xl rounded-xl border border-border/50">
          {children} 
        </div>

        <p className="mt-8 text-center text-xs text-foreground/50 font-body"> 
          &copy; {new Date().getFullYear()} EduSpace. All rights reserved. <br/> Empowering Minds, One Lesson at a Time.
        </p>
      </div>
    </div>
  );
}
