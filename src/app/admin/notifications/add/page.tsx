
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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { Bell, Send, GraduationCap, Zap, Award as AwardIcon } from "lucide-react"; 
import { addNotification } from "@/config/nav";
import type { NotificationItem } from "@/types/platform";

const notificationCategories = [
  { value: "course", label: "Course Update", icon: GraduationCap },
  { value: "system", label: "System Alert", icon: Zap },
  { value: "community", label: "Community", icon: AwardIcon },
  { value: "general", label: "General", icon: Bell },
] as const;

type NotificationCategoryValue = typeof notificationCategories[number]['value'];

const notificationFormSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters.").max(100, "Title is too long."),
  description: z.string().min(10, "Description must be at least 10 characters.").max(500, "Description is too long."),
  link: z.string().url("Please enter a valid URL (e.g., https://example.com/info).").optional().or(z.literal('')),
  category: z.custom<NotificationCategoryValue>(
    (val) => notificationCategories.some(cat => cat.value === val),
    { message: "Please select a valid category." }
  ),
});

type NotificationFormValues = z.infer<typeof notificationFormSchema>;

export default function AddNotificationPage() {
  const { toast } = useToast();
  const router = useRouter();

  const form = useForm<NotificationFormValues>({
    resolver: zodResolver(notificationFormSchema),
    defaultValues: {
      title: "",
      description: "",
      link: "",
      category: "general",
    },
  });

  function onSubmit(data: NotificationFormValues) {
    const selectedCategoryConfig = notificationCategories.find(cat => cat.value === data.category);
    
    const newNotificationData: Omit<NotificationItem, 'id' | 'createdAt' | 'read'> = {
        title: data.title,
        description: data.description,
        link: data.link || undefined,
        category: data.category as NotificationItem['category'], 
        icon: selectedCategoryConfig?.icon 
    };

    addNotification(newNotificationData); 

    toast({
      title: "Notification Sent!",
      description: `"${data.title}" has been successfully broadcasted.`,
    });
    router.push("/admin/notifications"); 
  }

  return (
    <DashboardLayout role="admin">
      <div className="max-w-2xl mx-auto animate-fade-in space-y-8">
        <header className="animate-slide-in-up" style={{ animationDelay: '50ms'}}>
          <h1 className="text-2xl md:text-3xl font-semibold text-foreground flex items-center">
            <Bell className="mr-3 h-7 w-7 text-primary" /> Create Notification
          </h1>
          <p className="text-md text-muted-foreground mt-1">Compose and send a new platform notification.</p>
        </header>

        <Card className="shadow-sm border-border/80 rounded-lg animate-slide-in-up hover:shadow-md transition-all-smooth" style={{ animationDelay: '150ms'}}>
          <CardHeader className="p-4 sm:p-5">
            <CardTitle className="text-lg font-semibold text-foreground">New Notification Details</CardTitle>
            <CardDescription className="text-sm text-muted-foreground pt-0.5">
              Fill in the form below to create and send your notification.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-5">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">Title</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., New Course Available!" {...field} className="h-9 rounded-md text-sm"/>
                      </FormControl>
                      <FormMessage className="text-xs"/>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">Description</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Write your notification message here..." rows={4} {...field} className="rounded-md text-sm"/>
                      </FormControl>
                      <FormMessage className="text-xs"/>
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                        control={form.control}
                        name="category"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel className="text-sm font-medium">Category</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                <SelectTrigger className="h-9 rounded-md text-sm">
                                    <SelectValue placeholder="Select notification category" />
                                </SelectTrigger>
                                </FormControl>
                                <SelectContent className="bg-card rounded-md shadow-lg border-border">
                                    {notificationCategories.map(cat => (
                                        <SelectItem key={cat.value} value={cat.value} className="text-sm flex items-center">
                                           <cat.icon className="mr-2 h-4 w-4 text-muted-foreground" /> {cat.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <FormMessage className="text-xs"/>
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="link"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel className="text-sm font-medium">Link (Optional)</FormLabel>
                            <FormControl>
                                <Input placeholder="e.g., /student/courses/new-course" {...field} className="h-9 rounded-md text-sm"/>
                            </FormControl>
                            <FormDescription className="text-xs text-muted-foreground">
                                Relative (e.g., /news/item) or absolute URL.
                            </FormDescription>
                            <FormMessage className="text-xs"/>
                            </FormItem>
                        )}
                    />
                </div>
                <div className="flex justify-end pt-2 gap-2">
                  <Link href="/admin/notifications" passHref>
                     <Button type="button" variant="outline" className="h-9 rounded-md text-sm">Cancel</Button>
                  </Link>
                  <Button type="submit" className="bg-primary hover:bg-primary/90 text-primary-foreground text-sm h-9 rounded-md">
                    <Send className="mr-2 h-4 w-4" /> Send Notification
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

