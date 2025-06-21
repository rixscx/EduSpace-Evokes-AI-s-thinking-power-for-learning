
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import Link from "next/link";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useRouter, useParams } from "next/navigation";
import { Edit, Save, Shield, RotateCcw, Phone, User as UserIcon } from "lucide-react";
import { db } from "@/lib/firebase";
import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import type { UserRole, User as AppUser } from "@/types/platform";
import { useEffect, useState, useCallback } from "react";
import { Skeleton } from "@/components/ui/skeleton";

const phoneSchemaPart = {
  localPhoneNumber: z.string()
    .refine(val => /^\d*$/.test(val), {
      message: "Phone number must contain only digits.",
    })
    .optional()
    .or(z.literal('')),
};

const userProfileEditSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters.").max(50, "Name is too long."),
  email: z.string().email("Please enter a valid email address.").optional(),
  ...phoneSchemaPart,
  role: z.enum(["student", "teacher", "admin"], { required_error: "Please select a role." }),
}).refine(data => {
  // This validation runs only if a phone number is provided.
  if (data.localPhoneNumber && (data.localPhoneNumber.length < 7 || data.localPhoneNumber.length > 15)) {
    return false;
  }
  return true;
}, {
  message: "Phone number must be between 7 and 15 digits.",
  path: ["localPhoneNumber"],
});


type UserProfileEditFormValues = z.infer<typeof userProfileEditSchema>;

export default function EditUserProfilePage() {
  const { toast } = useToast();
  const router = useRouter();
  const params = useParams();
  const userId = params.userId as string;

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [initialEmail, setInitialEmail] = useState("");

  const form = useForm<UserProfileEditFormValues>({
    resolver: zodResolver(userProfileEditSchema),
    defaultValues: {
      name: "",
      email: "",
      localPhoneNumber: "",
      role: "student",
    },
  });

  const fetchUserData = useCallback(async () => {
    if (!userId) return;
    setIsLoading(true);
    try {
      const userDocRef = doc(db, "users", userId);
      const userDocSnap = await getDoc(userDocRef);

      if (userDocSnap.exists()) {
        const userData = userDocSnap.data() as AppUser;
        // Robustly parse local phone number
        const phoneNumber = userData.phoneNumber || "";
        const localPhoneNumber = phoneNumber.startsWith('+91')
            ? phoneNumber.substring(3)
            : phoneNumber.replace(/\D/g, ''); // Fallback for other formats

        form.reset({
          name: userData.name,
          email: userData.email,
          localPhoneNumber: localPhoneNumber,
          role: userData.role,
        });
        setInitialEmail(userData.email);
      } else {
        toast({ title: "User Not Found", description: "This user profile does not exist.", variant: "destructive" });
        router.push("/admin/users");
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
      toast({ title: "Error", description: "Could not load user data.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [userId, form, router, toast]);

  useEffect(() => {
    fetchUserData();
  }, [fetchUserData]);

  async function onSubmit(data: UserProfileEditFormValues) {
    if (!userId) return;
    setIsSubmitting(true);
    try {
      const userDocRef = doc(db, "users", userId);

      const fullPhoneNumber = data.localPhoneNumber && data.localPhoneNumber.trim() !== ""
        ? `+91${data.localPhoneNumber.trim()}`
        : null;

      await updateDoc(userDocRef, {
        name: data.name,
        phoneNumber: fullPhoneNumber,
        role: data.role,
        updatedAt: serverTimestamp(),
      });

      toast({
        title: "User Profile Updated!",
        description: `Profile for ${data.name} has been successfully updated.`,
      });
      router.push("/admin/users");
    } catch (error) {
      console.error("Error updating user profile: ", error);
      toast({
        title: "Update Failed",
        description: "Could not update user profile in the database.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return (
        <DashboardLayout role="admin">
            <div className="max-w-2xl mx-auto py-10 animate-fade-in">
                <RotateCcw className="h-8 w-8 animate-spin mx-auto text-primary mb-4" />
                <p className="text-muted-foreground text-center">Loading user profile...</p>
                <Card className="mt-6 shadow-sm border-border/80 rounded-lg"><CardContent className="p-6 space-y-4">
                    <Skeleton className="h-6 w-1/3 mb-1"/> <Skeleton className="h-9 w-full"/>
                    <Skeleton className="h-6 w-1/3 mb-1 mt-3"/> <Skeleton className="h-9 w-full"/>
                    <Skeleton className="h-6 w-1/3 mb-1 mt-3"/> <Skeleton className="h-9 w-full"/>
                    <Skeleton className="h-6 w-1/3 mb-1 mt-3"/> <Skeleton className="h-9 w-full"/>
                </CardContent></Card>
            </div>
        </DashboardLayout>
    )
  }

  return (
    <DashboardLayout role="admin">
      <div className="max-w-2xl mx-auto animate-fade-in space-y-8">
        <header className="animate-slide-in-up" style={{ animationDelay: '50ms'}}>
          <h1 className="text-2xl md:text-3xl font-semibold text-foreground flex items-center">
            <Edit className="mr-3 h-7 w-7 text-primary" /> Edit User Profile
          </h1>
          <p className="text-md text-muted-foreground mt-1">
            Modify user's details. Email and password changes are handled separately.
          </p>
        </header>

        <Card className="shadow-sm border-border/80 rounded-lg animate-slide-in-up hover:shadow-md transition-all-smooth" style={{ animationDelay: '150ms'}}>
          <CardHeader className="p-4 sm:p-5">
            <CardTitle className="text-lg font-semibold text-foreground">Editing Profile for: {form.getValues().name || "User"}</CardTitle>
             <CardDescription className="text-sm text-muted-foreground pt-0.5">
               Email: {initialEmail || "Not available"} (Display only)
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-5">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium flex items-center"><UserIcon className="mr-1.5 h-4 w-4 text-muted-foreground"/>Full Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Ada Lovelace" {...field} className="h-9 rounded-md text-sm" disabled={isSubmitting}/>
                      </FormControl>
                      <FormMessage className="text-xs"/>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="localPhoneNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium flex items-center"><Phone className="mr-1.5 h-4 w-4 text-muted-foreground"/>Phone Number (Optional)</FormLabel>
                      <div className="flex items-center gap-2">
                        <div className="flex h-9 items-center justify-center rounded-md border border-input bg-background px-3 text-sm text-muted-foreground select-none">
                          +91
                        </div>
                        <div className="relative flex-grow">
                           <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <FormControl>
                            <Input
                              type="tel"
                              placeholder="e.g., 9876543210"
                              {...field}
                              className="pl-9 h-9 rounded-md text-sm w-full"
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
                  name="role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium flex items-center"><Shield className="mr-1.5 h-4 w-4 text-muted-foreground"/>Role</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value} disabled={isSubmitting}>
                        <FormControl>
                          <SelectTrigger className="h-9 rounded-md text-sm">
                            <SelectValue placeholder="Select user role" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="bg-card rounded-md shadow-lg border-border">
                          <SelectItem value="student" className="text-sm">Student</SelectItem>
                          <SelectItem value="teacher" className="text-sm">Teacher</SelectItem>
                          <SelectItem value="admin" className="text-sm">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage className="text-xs"/>
                    </FormItem>
                  )}
                />
                <div className="flex justify-end pt-2 gap-2">
                  <Link href="/admin/users" passHref>
                     <Button type="button" variant="outline" className="h-9 rounded-md text-sm" disabled={isSubmitting}>Cancel</Button>
                  </Link>
                  <Button type="submit" className="bg-primary hover:bg-primary/90 text-primary-foreground text-sm h-9 rounded-md" disabled={isSubmitting}>
                    {isSubmitting ? (
                       <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    ) : (
                       <Save className="mr-2 h-4 w-4" />
                    )}
                    {isSubmitting ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
