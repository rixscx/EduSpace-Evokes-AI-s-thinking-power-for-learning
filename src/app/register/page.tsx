
"use client"; 

import { AuthLayout } from "@/components/layout/AuthLayout";
import { RegistrationForm } from "@/components/auth/RegistrationForm";
import { useSearchParams } from "next/navigation";
import type { UserRole } from "@/types/platform";
import { Suspense } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button"; // Added Button
import { UserPlus, LogIn } from "lucide-react"; // Added LogIn

function RegisterPageContent() {
  const searchParams = useSearchParams();
  const roleParam = searchParams.get("role") as UserRole | null;
  const registrationRole: UserRole = roleParam === "teacher" ? "teacher" : "student"; 

  const title = registrationRole === "teacher" ? "Teacher Registration" : "Student Registration";
  const description = registrationRole === "teacher" 
    ? "Join EduSpace as an instructor and share your knowledge."
    : "Join EduSpace and start your learning journey today.";

  return (
    <AuthLayout
      title={title}
      description={description}
      role="Register" 
    >
      <RegistrationForm registrationRole={registrationRole} />
      <div className="mt-6 text-center text-sm">
        <p className="text-muted-foreground">
          Already have an account?{' '}
          <Link 
            href={registrationRole === "teacher" ? "/teacher/login" : "/student/login"} 
            className="font-medium text-primary hover:underline"
          >
            Login as {registrationRole === "teacher" ? "Teacher" : "Student"}
          </Link>.
        </p>
        
        {registrationRole === "student" && (
          <div className="mt-4 pt-4 border-t border-border/60">
            <p className="text-xs text-muted-foreground mb-2.5">Want to share your expertise?</p>
            <Button variant="outline" size="sm" asChild className="text-xs rounded-md h-9">
              <Link href="/register?role=teacher" className="flex items-center justify-center">
                <UserPlus className="mr-1.5 h-4 w-4" /> Register as Teacher
              </Link>
            </Button>
          </div>
        )}
        {registrationRole === "teacher" && (
          <div className="mt-4 pt-4 border-t border-border/60">
            <p className="text-xs text-muted-foreground mb-2.5">Looking to learn?</p>
            <Button variant="outline" size="sm" asChild className="text-xs rounded-md h-9">
              <Link href="/register" className="flex items-center justify-center">
                 <UserPlus className="mr-1.5 h-4 w-4" /> Register as Student
              </Link>
            </Button>
          </div>
        )}
      </div>
    </AuthLayout>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <RegisterPageContent />
    </Suspense>
  );
}
