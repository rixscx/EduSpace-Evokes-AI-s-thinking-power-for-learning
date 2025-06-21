
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
import { auth, db, GoogleAuthProvider } from "@/lib/firebase";
import { createUserWithEmailAndPassword, updateProfile, signInWithPopup, signOut } from "firebase/auth";
import { doc, setDoc, serverTimestamp, getDoc } from "firebase/firestore";
import { useState, useMemo } from "react";
import { Mail, KeyRound, User, LogIn, Phone, Check, X } from "lucide-react";
import type { UserRole } from "@/types/platform";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

const passwordValidationRules = {
  min: 8,
  lowercase: /(?=.*[a-z])/,
  uppercase: /(?=.*[A-Z])/,
  number: /(?=.*[0-9])/,
  specialChar: /(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`])/,
};

const formSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }).max(50, { message: "Name is too long." }),
  email: z.string().email({ message: "Please enter a valid email address." }),
  localPhoneNumber: z.string()
    .refine(val => /^\d*$/.test(val), {
      message: "Phone number must contain only digits.",
    })
    .optional()
    .or(z.literal('')),
  password: z.string()
    .min(passwordValidationRules.min, { message: `Password must be at least ${passwordValidationRules.min} characters long.` })
    .regex(passwordValidationRules.lowercase, { message: "Password must contain at least one lowercase letter." })
    .regex(passwordValidationRules.uppercase, { message: "Password must contain at least one uppercase letter." })
    .regex(passwordValidationRules.number, { message: "Password must contain at least one number." })
    .regex(passwordValidationRules.specialChar, { message: "Password must contain at least one special character." }),
  confirmPassword: z.string()
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
}).refine(data => {
  const { localPhoneNumber } = data;
  if (localPhoneNumber && localPhoneNumber.trim() !== "" && (localPhoneNumber.length < 7 || localPhoneNumber.length > 15)) {
    return false;
  }
  return true;
}, {
  message: "Phone number must be between 7 and 15 digits.",
  path: ["localPhoneNumber"],
});

interface RegistrationFormProps {
  registrationRole: UserRole;
}

const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    <path d="M1 1h22v22H1z" fill="none"/>
  </svg>
);

const PasswordRequirement = ({ label, met }: { label: string, met: boolean }) => (
  <div className={cn("flex items-center transition-colors", met ? "text-green-600" : "text-muted-foreground")}>
    {met ? <Check className="h-4 w-4 mr-1.5 shrink-0" /> : <X className="h-4 w-4 mr-1.5 shrink-0" />}
    <span className="text-xs">{label}</span>
  </div>
);


export function RegistrationForm({ registrationRole }: RegistrationFormProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
      localPhoneNumber: "",
      password: "",
      confirmPassword: ""
    },
  });

  const password = form.watch("password");

  const passwordCheck = useMemo(() => {
    return {
        min: (password || '').length >= passwordValidationRules.min,
        lowercase: passwordValidationRules.lowercase.test(password || ''),
        uppercase: passwordValidationRules.uppercase.test(password || ''),
        number: passwordValidationRules.number.test(password || ''),
        specialChar: passwordValidationRules.specialChar.test(password || ''),
    }
  }, [password]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, values.email, values.password);
      const firebaseUser = userCredential.user;

      await updateProfile(firebaseUser, {
        displayName: values.name
      });

      const fullPhoneNumber = values.localPhoneNumber && values.localPhoneNumber.trim() !== ""
        ? `+91${values.localPhoneNumber.trim()}`
        : null;

      const userDocRef = doc(db, "users", firebaseUser.uid);
      await setDoc(userDocRef, {
        uid: firebaseUser.uid,
        name: values.name,
        email: firebaseUser.email,
        phoneNumber: fullPhoneNumber,
        role: registrationRole,
        createdAt: serverTimestamp(),
        avatarUrl: `https://placehold.co/100x100.png?text=${values.name[0]?.toUpperCase() || registrationRole[0]?.toUpperCase()}`,
        dataAiHint: `${registrationRole} avatar`
      });

      await signOut(auth); 

      toast({
        title: "Registration Successful!",
        description: `Your ${registrationRole} account has been created. Please log in.`,
        variant: "default",
      });

      if (registrationRole === "student") {
        router.push("/student/login");
      } else if (registrationRole === "teacher") {
        router.push("/teacher/login");
      } else {
        router.push("/"); 
      }

    } catch (error: any) {
      console.error("Registration error:", error);
      let errorMessage = "Registration failed. Please try again.";
      if (error.code === "auth/email-already-in-use") {
        errorMessage = "This email address is already in use.";
      } else if (error.code === "auth/weak-password") {
        errorMessage = "The password does not meet the security requirements. Please choose a stronger password.";
      }
      toast({
        title: "Registration Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  const handleGoogleSignUp = async () => {
    setIsSubmitting(true);
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const firebaseUser = result.user;

      const userDocRef = doc(db, "users", firebaseUser.uid);
      const userDocSnap = await getDoc(userDocRef);

      const authoritativeName = firebaseUser.displayName || firebaseUser.email?.split('@')[0] || "User";
      const authoritativeAvatar = firebaseUser.photoURL || `https://placehold.co/100x100.png?text=${authoritativeName[0]?.toUpperCase()}`;
      const dataAiHintValue = `${registrationRole} avatar`;


      if (!userDocSnap.exists()) {
        await setDoc(userDocRef, {
          uid: firebaseUser.uid,
          name: authoritativeName,
          email: firebaseUser.email,
          phoneNumber: null, 
          role: registrationRole,
          avatarUrl: authoritativeAvatar,
          dataAiHint: dataAiHintValue,
          createdAt: serverTimestamp(),
        });
        
        await signOut(auth); 

        toast({ 
            title: "Google Sign-Up Successful!", 
            description: `Your ${registrationRole} account is linked with Google. Please log in.` 
        });
        
        if (registrationRole === "student") {
            router.push("/student/login");
        } else if (registrationRole === "teacher") {
            router.push("/teacher/login");
        } else {
            router.push("/");
        }

      } else {
        const existingData = userDocSnap.data();
        const existingRole = existingData.role as UserRole;

        await signOut(auth); 
        
        if (existingRole !== registrationRole) {
            toast({
                title: "Account Exists with Different Role",
                description: `Your Google account is already associated with the '${existingRole}' role. Please log in through the '${existingRole}' portal.`,
                variant: "destructive"
            });
        } else {
             toast({ 
                title: "Account Already Exists", 
                description: `Your ${existingRole} account is already linked with Google. Please log in.`,
                variant: "default" 
            });
        }
        
        if (existingRole === "student") router.push("/student/login");
        else if (existingRole === "teacher") router.push("/teacher/login");
        else if (existingRole === "admin") router.push("/admin/login"); 
        else router.push("/");
      }
    } catch (error: any) {
      console.error("Google Sign-Up error:", error);
      let errorMessage = error.message || "Could not sign up with Google.";
       if (error.code === 'auth/account-exists-with-different-credential') {
        errorMessage = "An account already exists with this email address using a different sign-in method. Please try logging in with your original method (e.g., password).";
      } else if (error.code === 'auth/popup-closed-by-user') {
        errorMessage = "Google Sign-Up was cancelled.";
      }
      toast({ title: "Google Sign-Up Failed", description: errorMessage, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };


  const roleSpecificText = registrationRole.charAt(0).toUpperCase() + registrationRole.slice(1);

  return (
    <>
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="font-body text-foreground text-sm font-medium">Full Name</FormLabel>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <FormControl>
                  <Input
                    placeholder="e.g., Ada Lovelace"
                    {...field}
                    className="pl-9 h-10 rounded-md text-sm"
                    aria-label="Full Name"
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
          name="localPhoneNumber"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="font-body text-foreground text-sm font-medium">Phone Number (Optional)</FormLabel>
              <div className="flex items-center gap-2">
                <div className="flex h-10 items-center justify-center rounded-md border border-input bg-background px-3 text-sm text-muted-foreground select-none">
                  +91
                </div>
                <div className="relative flex-grow">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <FormControl>
                    <Input
                      type="tel"
                      placeholder="e.g., 9876543210"
                      {...field}
                      className="pl-9 h-10 rounded-md text-sm w-full"
                      aria-label="Local Phone Number"
                      disabled={isSubmitting}
                    />
                  </FormControl>
                </div>
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

        {password && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-xs mt-2 p-2 border rounded-md bg-muted/50">
            <PasswordRequirement label="At least 8 characters" met={passwordCheck.min} />
            <PasswordRequirement label="One uppercase letter" met={passwordCheck.uppercase} />
            <PasswordRequirement label="One lowercase letter" met={passwordCheck.lowercase} />
            <PasswordRequirement label="One number" met={passwordCheck.number} />
            <PasswordRequirement label="One special character" met={passwordCheck.specialChar} />
          </div>
        )}

        <FormField
          control={form.control}
          name="confirmPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="font-body text-foreground text-sm font-medium">Confirm Password</FormLabel>
              <div className="relative">
                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <FormControl>
                  <Input
                    type="password"
                    placeholder="••••••••"
                    {...field}
                    className="pl-9 h-10 rounded-md text-sm"
                    aria-label="Confirm Password"
                    disabled={isSubmitting}
                  />
                </FormControl>
              </div>
              <FormMessage className="text-xs"/>
            </FormItem>
          )}
        />
        <Button
          type="submit"
          className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-body font-medium text-sm h-10 rounded-md"
          disabled={isSubmitting}
        >
          {isSubmitting && !form.formState.isSubmitting ? (
             <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          ) : (
            <LogIn className="mr-2 h-4 w-4" />
          )}
          {isSubmitting && !form.formState.isSubmitting ? `Creating ${roleSpecificText} Account...` : `Create ${roleSpecificText} Account`}
        </Button>
      </form>
    </Form>
      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-card px-2 text-muted-foreground">Or sign up with</span>
        </div>
      </div>
      <Button
        variant="outline"
        className="w-full font-body font-medium text-sm h-10 rounded-md"
        onClick={handleGoogleSignUp}
        disabled={isSubmitting}
      >
        <GoogleIcon /> Sign up with Google
      </Button>
    </>
  );
}
