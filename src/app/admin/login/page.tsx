
import { AuthLayout } from "@/components/layout/AuthLayout";
import { LoginForm } from "@/components/auth/LoginForm";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { GraduationCap, School } from "lucide-react"; // Added icons

export default function AdminLoginPage() {
  return (
    <AuthLayout
      title="Admin Portal"
      description="Access the EduSpace administration panel."
      role="Admin"
    >
      <LoginForm role="admin" />
      <div className="mt-6 text-center text-sm">
        <p className="text-xs text-muted-foreground/80">
          (Admin registration is managed internally by super-admins)
        </p>
        <div className="mt-4 pt-4 border-t border-border/60">
          <p className="text-xs text-muted-foreground mb-2.5">Or log in as a different role:</p>
          <div className="flex justify-center gap-2">
            <Button variant="outline" size="sm" asChild className="text-xs rounded-md h-9 flex-1 sm:flex-none">
              <Link href="/student/login" className="flex items-center justify-center">
                <GraduationCap className="mr-1.5 h-4 w-4" /> Student Login
              </Link>
            </Button>
            <Button variant="outline" size="sm" asChild className="text-xs rounded-md h-9 flex-1 sm:flex-none">
              <Link href="/teacher/login" className="flex items-center justify-center">
                <School className="mr-1.5 h-4 w-4" /> Teacher Login
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </AuthLayout>
  );
}
