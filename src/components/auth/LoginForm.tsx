
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import type { UserRole } from "@/types/platform";
import { useAuth } from "@/contexts/AuthContext";
import { Mail, KeyRound, LogIn, HelpCircle } from "lucide-react";
import { auth, db, GoogleAuthProvider } from "@/lib/firebase";
import { signInWithEmailAndPassword, signOut, sendPasswordResetEmail, signInWithPopup } from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp, updateDoc } from "firebase/firestore";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";

const formSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address." }),
  password: z.string().min(1, { message: "Please enter your password." }),
});

const passwordResetSchema = z.object({
  resetEmail: z.string().email({ message: "Please enter a valid email address." }),
});

interface LoginFormProps {
  role: UserRole;
}

const ADMIN_EMAIL = "manishp.73codestop@gmail.com";

const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" className="mr-2 h-4 w-4 fill-current">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    <path d="M1 1h22v22H1z" fill="none"/>
  </svg>
);


export function LoginForm({ role: formRole }: LoginFormProps) {
  const { toast } = useToast();
  const { setRoleForContext } = useAuth();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRecoveryDialogOpen, setIsRecoveryDialogOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetEmailError, setResetEmailError] = useState<string | null>(null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const handleSuccessfulLogin = (role: UserRole) => {
    setRoleForContext(role);
    toast({
      title: "Login Successful",
      description: `Welcome! Redirecting you to the ${role} dashboard.`,
      variant: "default",
    });
    router.push(`/${role}/dashboard`);
  };

  const syncUserProfile = async (firebaseUser: any, role: UserRole) => {
    const userDocRef = doc(db, "users", firebaseUser.uid);
    const userDocSnap = await getDoc(userDocRef);

    const authoritativeName = firebaseUser.displayName || firebaseUser.email?.split('@')[0] || "User";
    const authoritativeAvatar = firebaseUser.photoURL || `https://placehold.co/100x100.png?text=${authoritativeName[0]?.toUpperCase() || role[0]?.toUpperCase()}`;
    const dataAiHintValue = `${role} avatar`;
    
    const updates: Record<string, any> = {};

    if (userDocSnap.exists()) {
      const currentData = userDocSnap.data();
      if (currentData.role !== role) updates.role = role;
      if (currentData.name !== authoritativeName) updates.name = authoritativeName;
      if (currentData.avatarUrl !== authoritativeAvatar) updates.avatarUrl = authoritativeAvatar;
      if (currentData.dataAiHint !== dataAiHintValue) updates.dataAiHint = dataAiHintValue;
      if (typeof currentData.phoneNumber === 'undefined') updates.phoneNumber = null; // Ensure field exists

      if (Object.keys(updates).length > 0) {
        updates.updatedAt = serverTimestamp();
        await updateDoc(userDocRef, updates);
      }
    } else {
      await setDoc(userDocRef, {
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        role: role,
        name: authoritativeName,
        avatarUrl: authoritativeAvatar,
        dataAiHint: dataAiHintValue,
        phoneNumber: null,
        createdAt: serverTimestamp(),
        stats: { coursesEnrolled: 0, coursesCompleted: 0, certificatesEarned: 0 },
      });
    }
  };

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, values.email, values.password);
      const firebaseUser = userCredential.user;

      const userDocRef = doc(db, "users", firebaseUser.uid);
      const userDocSnap = await getDoc(userDocRef);
      
      let userAppRole: UserRole;

      if (formRole === "admin") {
        if (firebaseUser.email !== ADMIN_EMAIL) {
          toast({ title: "Access Denied", description: `The email ${values.email} is not authorized for admin access.`, variant: "destructive" });
          await signOut(auth);
          setIsSubmitting(false);
          return;
        }
        userAppRole = "admin";
      } else {
        if (!userDocSnap.exists()) {
          userAppRole = formRole;
        } else {
          userAppRole = userDocSnap.data().role as UserRole;
          if (userAppRole !== formRole) {
            toast({ title: "Login Role Mismatch", description: `Your account role is '${userAppRole}'. Please log in to the correct portal.`, variant: "destructive" });
            await signOut(auth);
            setIsSubmitting(false);
            return;
          }
        }
      }
      
      await syncUserProfile(firebaseUser, userAppRole);
      handleSuccessfulLogin(userAppRole);

    } catch (error: any) {
      let title = "Login Failed";
      let description = "An unexpected error occurred. Please try again.";

      if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found') {
        description = "Incorrect email or password. Please check your details and try again.";
      } else if (error.code === 'auth/too-many-requests') {
        title = "Too Many Attempts";
        description = "Access to this account has been temporarily disabled. Please reset your password or try again later.";
      } else {
        console.error("Login error:", error); // Log other unexpected errors
      }
      
      toast({ title, description, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  }

  const handleGoogleSignIn = async () => {
    setIsSubmitting(true);
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const firebaseUser = result.user;
      
      if (formRole === 'admin' && firebaseUser.email !== ADMIN_EMAIL) {
        toast({ title: "Access Denied", description: "This Google account is not authorized for admin access.", variant: "destructive" });
        await signOut(auth);
        setIsSubmitting(false);
        return;
      }
      
      const userDocRef = doc(db, "users", firebaseUser.uid);
      const userDocSnap = await getDoc(userDocRef);
      let userAppRole: UserRole;

      if (userDocSnap.exists()) {
        const existingData = userDocSnap.data();
        const existingRole = existingData.role as UserRole;

        if (formRole === 'admin') {
            userAppRole = 'admin'; // Admin login overrides existing role for the admin user
        } else if (existingRole !== formRole) {
            toast({ title: "Login Role Mismatch", description: `Your Google account is associated with the '${existingRole}' role. Please use the correct portal.`, variant: "destructive" });
            await signOut(auth);
            setIsSubmitting(false);
            return;
        } else {
            userAppRole = existingRole;
        }
      } else {
        // New user signing in with Google
        userAppRole = (formRole === 'admin') ? 'admin' : formRole;
      }

      await syncUserProfile(firebaseUser, userAppRole);
      handleSuccessfulLogin(userAppRole);

    } catch (error: any) {
      console.error("Google Sign-In error:", error);
      let errorMessage = error.message || "Could not sign in with Google.";
      if (error.code === 'auth/popup-closed-by-user') errorMessage = "Google Sign-In was cancelled.";
      if (error.code === 'auth/account-exists-with-different-credential') errorMessage = "An account already exists with this email address using a different sign-in method. Try logging in with your password.";
      toast({ title: "Google Sign-In Failed", description: errorMessage, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePasswordResetRequest = async () => {
    setResetEmailError(null);
    const result = passwordResetSchema.safeParse({ resetEmail });
    if (!result.success) {
      setResetEmailError(result.error.errors[0].message);
      return;
    }

    setIsSubmitting(true);
    try {
      await sendPasswordResetEmail(auth, result.data.resetEmail);
      toast({
        title: "Password Reset Email Sent",
        description: "If an account exists for this email, a password reset link has been sent.",
      });
      setIsRecoveryDialogOpen(false);
      setResetEmail("");
    } catch (error: any) {
      console.error("Password reset error:", error);
      let message = "Could not send password reset email. Please try again.";
      if (error.code === "auth/user-not-found") {
        message = "No account found with this email address.";
      }
      toast({
        title: "Password Reset Failed",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const roleSpecificText = formRole.charAt(0).toUpperCase() + formRole.slice(1);

  return (
    <>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="font-body text-foreground text-sm font-medium">Email Address</FormLabel>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="you@example.com"
                      {...field}
                      className="pl-9 h-10 rounded-md text-sm"
                      aria-label="Email Address"
                      disabled={isSubmitting}
                    />
                  </FormControl>
                </div>
                <FormMessage className="text-xs"/>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="font-body text-foreground text-sm font-medium">Password</FormLabel>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="••••••••"
                      {...field}
                      className="pl-9 h-10 rounded-md text-sm"
                      aria-label="Password"
                      disabled={isSubmitting}
                    />
                  </FormControl>
                </div>
                <FormMessage className="text-xs"/>
              </FormItem>
            )}
          />
          <div className="flex justify-end items-center -mt-2 mb-2 text-xs">
            {isClient && (
              <AlertDialog open={isRecoveryDialogOpen} onOpenChange={setIsRecoveryDialogOpen}>
                <AlertDialogTrigger asChild>
                  <Button
                    type="button"
                    variant="link"
                    className="font-medium text-primary p-0 h-auto"
                    onClick={() => {
                      setResetEmail(form.getValues().email);
                      setResetEmailError(null);
                    }}
                  >
                    Forgot Email/Password?
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center">
                       <HelpCircle className="mr-2 h-5 w-5 text-primary"/> Account Recovery
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      <div className="text-sm text-muted-foreground pt-2 space-y-2">
                        <div>To reset your password, please enter your email address below. A password reset link will be sent to you.</div>
                      </div>
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <div className="space-y-2 pt-2">
                    <Label htmlFor="reset-email" className="text-sm font-medium">Email for Password Reset</Label>
                    <Input
                      id="reset-email"
                      type="email"
                      placeholder="you@example.com"
                      value={resetEmail}
                      onChange={(e) => { setResetEmail(e.target.value); setResetEmailError(null); }}
                      className="h-10 rounded-md text-sm"
                      disabled={isSubmitting}
                    />
                    {resetEmailError && <p className="text-xs text-destructive">{resetEmailError}</p>}
                  </div>
                  <div className="pt-4 text-sm text-muted-foreground space-y-1">
                      <div className="font-medium text-foreground">Forgotten your email address?</div>
                      <div className="text-xs">
                        <ul className="list-disc list-inside space-y-0.5 pl-2">
                          <li>Search your email inboxes (e.g., Gmail, Outlook) for messages from &quot;EdRole&quot; or &quot;EduSpace&quot;.</li>
                          <li>If you previously signed up or logged in using Google, try the Google Sign-In option on the login page.</li>
                          <li>If you are still unable to locate your account email, please contact support for assistance.</li>
                        </ul>
                      </div>
                  </div>
                  <AlertDialogFooter className="pt-4">
                    <AlertDialogCancel disabled={isSubmitting}>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handlePasswordResetRequest} disabled={isSubmitting}>
                      {isSubmitting ? "Sending..." : "Send Password Reset Link"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>

          <Button
            type="submit"
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-body font-medium text-sm h-10 rounded-md"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              <LogIn className="mr-2 h-4 w-4" />
            )}
            {isSubmitting ? "Logging In..." : `Login to ${roleSpecificText}`}
          </Button>
        </form>
      </Form>
      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-card px-2 text-muted-foreground">Or continue with</span>
        </div>
      </div>
      <Button
        variant="outline"
        className="w-full font-body font-medium text-sm h-10 rounded-md"
        onClick={handleGoogleSignIn}
        disabled={isSubmitting}
      >
        <GoogleIcon /> Sign in with Google
      </Button>
    </>
  );
}
