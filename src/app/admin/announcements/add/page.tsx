
"use client";

import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { Megaphone, Send } from "lucide-react";
import { addNotification } from "@/config/nav"; 
import type { NotificationItem } from "@/types/platform"; 

const announcementFormSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters.").max(100, "Title is too long."),
  content: z.string().min(20, "Content must be at least 20 characters.").max(2000, "Content is too long."),
  scope: z.enum(["platform", "course"], { required_error: "Please select a scope." }),
  courseId: z.string().optional(), 
});

type AnnouncementFormValues = z.infer<typeof announcementFormSchema>;

const mockCourses = [
  { id: "course1", title: "Advanced JavaScript" },
  { id: "course2", title: "Introduction to Python" },
  { id: "course3", title: "Machine Learning Foundations" },
];


export default function AddAnnouncementPage() {
  const { toast } = useToast();
  const router = useRouter();

  const form = useForm<AnnouncementFormValues>({
    resolver: zodResolver(announcementFormSchema),
    defaultValues: {
      title: "",
      content: "",
      scope: undefined, 
      courseId: "",
    },
  });

  const scope = form.watch("scope");

  function onSubmit(data: AnnouncementFormValues) {
    if (data.scope === "course" && !data.courseId) {
      form.setError("courseId", { type: "manual", message: "Please select a course for this announcement." });
      return;
    }
    console.log("Announcement data:", data);
    toast({
      title: "Announcement Sent!",
      description: `"${data.title}" has been successfully broadcasted.`,
    });

    const notificationTitle = `New Announcement: ${data.title}`;
    const notificationDescription = data.content.substring(0, 100) + (data.content.length > 100 ? "..." : "");
    let notificationLink;
    if (data.scope === "course" && data.courseId) {
        notificationLink = `/student/courses/${data.courseId}`; 
    }

    const newNotificationData: Omit<NotificationItem, 'id' | 'createdAt' | 'read'> = {
        title: notificationTitle,
        description: notificationDescription,
        link: notificationLink,
        category: "system", 
        icon: Megaphone, 
    };
    addNotification(newNotificationData);

    form.reset();
  }

  return (
    <DashboardLayout role="admin">
      <div className="max-w-2xl mx-auto animate-fade-in space-y-8">
        <header className="animate-slide-in-up" style={{ animationDelay: '50ms'}}>
          <h1 className="text-2xl md:text-3xl font-semibold text-foreground flex items-center">
            <Megaphone className="mr-3 h-7 w-7 text-primary" /> Create Announcement
          </h1>
          <p className="text-md text-muted-foreground mt-1">Broadcast important messages to users or specific courses.</p>
        </header>

        <Card className="shadow-sm border-border/80 rounded-lg animate-slide-in-up" style={{ animationDelay: '150ms'}}>
          <CardHeader className="p-4 sm:p-5">
            <CardTitle className="text-lg font-semibold text-foreground">New Announcement Details</CardTitle>
            <CardDescription className="text-sm text-muted-foreground pt-0.5">
              Fill in the form below to create and send your announcement.
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
                        <Input placeholder="e.g., Upcoming Platform Maintenance" {...field} className="h-9 rounded-md text-sm"/>
                      </FormControl>
                      <FormMessage className="text-xs"/>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="content"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">Content</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Write your announcement message here..." rows={6} {...field} className="rounded-md text-sm"/>
                      </FormControl>
                      <FormMessage className="text-xs"/>
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                    control={form.control}
                    name="scope"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel className="text-sm font-medium">Scope</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                            <SelectTrigger className="h-9 rounded-md text-sm">
                                <SelectValue placeholder="Select announcement scope" />
                            </SelectTrigger>
                            </FormControl>
                            <SelectContent className="bg-card rounded-md shadow-lg border-border">
                                <SelectItem value="platform" className="text-sm">Platform-Wide</SelectItem>
                                <SelectItem value="course" className="text-sm">Specific Course</SelectItem>
                            </SelectContent>
                        </Select>
                        <FormMessage className="text-xs"/>
                        </FormItem>
                    )}
                    />
                    {scope === "course" && (
                         <FormField
                            control={form.control}
                            name="courseId"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel className="text-sm font-medium">Target Course</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                    <SelectTrigger className="h-9 rounded-md text-sm">
                                        <SelectValue placeholder="Select target course" />
                                    </SelectTrigger>
                                    </FormControl>
                                    <SelectContent className="bg-card rounded-md shadow-lg border-border">
                                        {mockCourses.map(course => (
                                            <SelectItem key={course.id} value={course.id} className="text-sm">{course.title}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <FormMessage className="text-xs"/>
                                </FormItem>
                            )}
                        />
                    )}
                </div>
                <div className="flex justify-end pt-2">
                  <Button type="submit" className="bg-primary hover:bg-primary/90 text-primary-foreground text-sm h-9 rounded-md">
                    <Send className="mr-2 h-4 w-4" /> Send Announcement
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

