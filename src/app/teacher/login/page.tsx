
import { AuthLayout } from "@/components/layout/AuthLayout";
import { LoginForm } from "@/components/auth/LoginForm";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { GraduationCap, UserCog, School } from "lucide-react";

export default function TeacherLoginPage() {
  return (
    <AuthLayout
      title="Teacher Dashboard"
      description="Manage your courses and students."
      role="Teacher"
    >
      <LoginForm role="teacher" />
      <div className="mt-6 text-center text-sm">
        <p className="text-muted-foreground">
          Want to share your expertise?{' '}
          <Link href="/register?role=teacher" className="font-medium text-primary hover:underline">
            Register as Teacher
          </Link>.
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
              <Link href="/admin/login" className="flex items-center justify-center">
                <UserCog className="mr-1.5 h-4 w-4" /> Admin Login
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </AuthLayout>
  );
}
