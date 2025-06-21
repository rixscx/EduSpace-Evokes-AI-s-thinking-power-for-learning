
"use client";

import React, { useEffect, useState, useCallback } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, BookOpen, MessageSquare, BarChart3, ListChecks, ShieldCheck, TrendingUp, AlertTriangle, LucideIcon, Bell, UserPlus, Edit, PlusSquare, CheckCircle } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, orderBy, limit, where, doc, getDoc, getCountFromServer } from "firebase/firestore";
import { getAllCourses, getRecentEnrollments } from "@/lib/mockCourses";
import type { User as AppUser, Course, Enrollment } from "@/types/platform";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

interface StatItem {
  title: string;
  value: string;
  icon: LucideIcon;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
  color: string;
  delay: number;
  isLoading?: boolean;
  link?: string;
}

interface ActivityItem {
  id: string;
  actor: string;
  action: string;
  type: "User Registration" | "Course Submission" | "System Report" | "Course Completion" | "Enrollment" | "Course Creation" | "Other";
  timestamp: Date;
  link?: string;
}

const initialStats: StatItem[] = [
  { title: "Total Users", value: "0", icon: Users, change: "+0%", changeType: "neutral" as const, color: "text-primary", delay: 100, isLoading: true, link: "/admin/users" },
  { title: "Active Courses", value: "0", icon: BookOpen, change: "+0", changeType: "neutral" as const, color: "text-green-600", delay: 150, isLoading: true, link: "/admin/courses" },
  { title: "Pending Approvals", value: "0", icon: ListChecks, change: "", changeType: "neutral" as const, color: "text-orange-600", delay: 200, isLoading: true, link: "/admin/courses?filter=pending" },
];

export default function AdminDashboardPage() {
  const { user: adminUser, isLoading: authLoading } = useAuth();
  const { toast } = useToast();

  const [stats, setStats] = useState<StatItem[]>(initialStats);
  const [recentActivities, setRecentActivities] = useState<ActivityItem[]>([]);
  const [isLoadingActivities, setIsLoadingActivities] = useState(true);
  const [allCoursesForActivity, setAllCoursesForActivity] = useState<Course[]>([]);


  const fetchDashboardData = useCallback(async () => {
    setIsLoadingActivities(true); // Also set activities to loading when dashboard data refreshes
    setStats(initialStats.map(s => ({ ...s, isLoading: true }))); // Reset stats to loading

    try {
      const usersCollectionRef = collection(db, "users");
      const usersSnapshot = await getCountFromServer(usersCollectionRef);
      const totalUsers = usersSnapshot.data().count.toString();
      setStats(prevStats => prevStats.map(s => s.title === "Total Users" ? { ...s, value: totalUsers, isLoading: false } : s));

      const courses = await getAllCourses(false);
      setAllCoursesForActivity(courses);

      const activeCoursesCount = courses.filter(c => c.isPublished && c.isApproved).length.toString();
      const pendingApprovalsCount = courses.filter(c => c.isPublished && !c.isApproved).length.toString();
      
      setStats(prevStats => prevStats.map(s => {
        if (s.title === "Active Courses") return { ...s, value: activeCoursesCount, isLoading: false };
        if (s.title === "Pending Approvals") return { ...s, value: pendingApprovalsCount, isLoading: false };
        return { ...s, isLoading: false }; // Ensure all stats are marked as not loading
      }));
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      toast({ title: "Error", description: "Failed to load dashboard statistics.", variant: "destructive" });
      setStats(prevStats => prevStats.map(s => ({ ...s, value: "Error", isLoading: false })));
      setAllCoursesForActivity([]); // Clear courses on error
    }
    // Note: setIsLoadingActivities(false) will be handled by the generateActivities useEffect
  }, [toast]);

  useEffect(() => {
    if (!authLoading && adminUser) {
      fetchDashboardData();
    } else if (!authLoading && !adminUser) {
      // If no admin user is logged in and auth is done loading, reset states
      setStats(initialStats.map(s => ({ ...s, isLoading: false, value: "0" })));
      setAllCoursesForActivity([]);
      setRecentActivities([]);
      setIsLoadingActivities(false);
    }
  }, [fetchDashboardData, authLoading, adminUser]);

  useEffect(() => {
    const generateActivities = async () => {
      const activities: ActivityItem[] = [];
      const now = new Date();
      try {
        if (adminUser) { // Ensure there's an admin user before fetching potentially permissioned data
            const recentUsersQuery = query(collection(db, "users"), orderBy("createdAt", "desc"), limit(2));
            const recentUsersSnapshot = await getDocs(recentUsersQuery);
            recentUsersSnapshot.forEach(docSnap => {
            const userData = docSnap.data() as AppUser & { createdAt?: {toDate: () => Date} };
            activities.push({
                id: docSnap.id,
                actor: userData.name || userData.email?.split('@')[0] || "New User",
                action: `registered as a ${userData.role}`,
                type: "User Registration",
                timestamp: userData.createdAt?.toDate ? userData.createdAt.toDate() : now,
                link: `/admin/users/${docSnap.id}/edit`
            });
            });

            if (allCoursesForActivity.length > 0) {
                const pendingCourse = allCoursesForActivity.find(c => c.isPublished && !c.isApproved);
                if (pendingCourse) {
                activities.push({
                    id: `course-sub-${pendingCourse.id}`,
                    actor: pendingCourse.teacherName || "A Teacher",
                    action: `submitted '${pendingCourse.title}' for approval`,
                    type: "Course Submission",
                    timestamp: pendingCourse.updatedAt ? (pendingCourse.updatedAt.toDate ? pendingCourse.updatedAt.toDate() : new Date(pendingCourse.updatedAt)) : now,
                    link: `/admin/courses`
                });
                }

                const sortedCoursesByCreation = [...allCoursesForActivity]
                    .filter(c => c.createdAt)
                    .sort((a, b) => {
                        const dateA = a.createdAt.toDate ? a.createdAt.toDate().getTime() : new Date(a.createdAt).getTime();
                        const dateB = b.createdAt.toDate ? b.createdAt.toDate().getTime() : new Date(b.createdAt).getTime();
                        return dateB - dateA;
                    });

                if (sortedCoursesByCreation.length > 0) {
                    const newestCourse = sortedCoursesByCreation[0];
                    activities.push({
                    id: `course-create-${newestCourse.id}`,
                    actor: newestCourse.teacherName || "A Teacher",
                    action: `created course '${newestCourse.title}'`,
                    type: "Course Creation",
                    timestamp: newestCourse.createdAt?.toDate ? newestCourse.createdAt.toDate() : new Date(newestCourse.createdAt || now),
                    link: `/admin/courses/${newestCourse.id}/preview`
                    });
                }
            }

            const recentEnrollments = await getRecentEnrollments(2);
            for (const enrollment of recentEnrollments) {
                if (enrollment.studentId && enrollment.courseId) {
                    const studentDocRef = doc(db, "users", enrollment.studentId);
                    const studentDocSnap = await getDoc(studentDocRef);
                    const studentData = studentDocSnap.exists() ? studentDocSnap.data() as AppUser : null;
                    const studentName = studentData ? (studentData.name || studentData.email?.split('@')[0]) : "A Student";

                    const courseData = allCoursesForActivity.find(c => c.id === enrollment.courseId);
                    const courseTitle = courseData ? courseData.title : "a course";

                    activities.push({
                        id: `enroll-${enrollment.id}`,
                        actor: studentName || "A Student",
                        action: `enrolled in '${courseTitle}'`,
                        type: "Enrollment",
                        timestamp: enrollment.enrolledAt?.toDate ? enrollment.enrolledAt.toDate() : new Date(enrollment.enrolledAt || now),
                        link: `/admin/users/${enrollment.studentId}/edit`
                    });
                }
            }
        } // end if(adminUser)
        
        activities.push({
            id: "system-report-1",
            actor: "System",
            action: "generated weekly analytics report",
            type: "System Report",
            timestamp: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
        });
        
        activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        setRecentActivities(activities.slice(0, 5));

      } catch (error) {
        console.error("Error generating activities list:", error);
        toast({ title: "Activity Log Error", description: "Could not load recent platform activities.", variant: "destructive" });
        setRecentActivities([]); // Clear activities on error
      } finally {
        setIsLoadingActivities(false);
      }
    };

    const activeCoursesStatIsLoading = stats.some(s => s.title === "Active Courses" && s.isLoading);
    // Ensure auth is complete, user exists, and prerequisite data (courses or stats) is ready before generating activities.
    if (!authLoading && adminUser && (allCoursesForActivity.length > 0 || !activeCoursesStatIsLoading) && isLoadingActivities) {
      generateActivities();
    } else if (!authLoading && !adminUser && isLoadingActivities) {
      // If no admin user is logged in but activities were set to loading, reset
      setRecentActivities([]);
      setIsLoadingActivities(false);
    }
  }, [allCoursesForActivity, stats, toast, isLoadingActivities, authLoading, adminUser]);


  const getActivityIcon = (type: ActivityItem['type']): LucideIcon => {
    switch(type) {
        case "User Registration": return UserPlus;
        case "Course Submission": return Edit;
        case "Course Creation": return PlusSquare;
        case "Enrollment": return Users;
        case "Course Completion": return CheckCircle;
        case "System Report": return ShieldCheck;
        default: return BarChart3;
    }
  };


  return (
    <DashboardLayout role="admin">
      <div className="animate-fade-in space-y-8">
         <header className="animate-slide-in-up" style={{ animationDelay: '50ms'}}>
            <h1 className="text-2xl md:text-3xl font-semibold text-foreground">Admin Dashboard</h1>
            <p className="text-md text-muted-foreground mt-0.5">Oversee and manage the EduSpace platform.</p>
          </header>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {stats.map((stat) => (
            <Card key={stat.title} className="shadow-sm border-border/80 rounded-lg animate-slide-in-up hover:shadow-md transition-all-smooth" style={{ animationDelay: `${stat.delay}ms`}}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 pt-4 px-4">
                <CardTitle className="text-sm font-medium text-muted-foreground">{stat.title}</CardTitle>
                 {stat.link ? (
                    <Link href={stat.link}><stat.icon className={`h-5 w-5 ${stat.color} hover:opacity-80`} /></Link>
                 ) : (
                    <stat.icon className={`h-5 w-5 ${stat.color}`} />
                 )}
              </CardHeader>
              <CardContent className="px-4 pb-4">
                {stat.isLoading ? (
                    <Skeleton className="h-8 w-20 mt-1" />
                ) : (
                    <div className="text-2xl font-semibold text-foreground">{stat.value}</div>
                )}
                {stat.change && !stat.isLoading && stat.value !== "Error" && (
                  <p className={`text-xs mt-0.5 ${stat.changeType === 'positive' ? 'text-green-600' : stat.changeType === 'negative' ? 'text-red-600' : 'text-muted-foreground'}`}>
                    {stat.changeType === 'positive' && <TrendingUp className="inline h-3 w-3 mr-0.5"/>}
                    {stat.change}
                  </p>
                )}
                 {stat.isLoading && <Skeleton className="h-4 w-12 mt-1.5" />}
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="shadow-sm animate-slide-in-up border-border/80 rounded-lg hover:shadow-md transition-all-smooth" style={{ animationDelay: `300ms`}}>
          <CardHeader className="p-4 sm:p-5">
            <div className="flex justify-between items-center">
                <CardTitle className="text-lg font-semibold flex items-center text-foreground">
                <BarChart3 className="mr-2 h-5 w-5 text-primary" />
                Recent Platform Activity
                </CardTitle>
            </div>
            <CardDescription className="text-sm pt-0.5 text-muted-foreground">
              An overview of the latest significant actions on EduSpace.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0 sm:p-2">
            {isLoadingActivities ? (
              <div className="p-4 space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="flex items-center space-x-4">
                     <Skeleton className="h-6 w-6 rounded-full" />
                    <Skeleton className="h-4 w-1/4" />
                    <Skeleton className="h-4 w-2/4 hidden sm:block" />
                    <Skeleton className="h-4 w-1/5" />
                    <Skeleton className="h-4 w-1/6" />
                  </div>
                ))}
              </div>
            ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs font-medium text-muted-foreground w-12 text-center">Type</TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground">Actor</TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground hidden sm:table-cell">Action</TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground text-right">Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentActivities.map((activity) => {
                  const ActivityIcon = getActivityIcon(activity.type);
                  return (
                  <TableRow key={activity.id} className="hover:bg-muted/50 text-sm transition-colors duration-150 ease-in-out">
                    <TableCell className="py-2.5 text-center">
                        <ActivityIcon className="h-4 w-4 text-muted-foreground mx-auto" title={activity.type}/>
                    </TableCell>
                    <TableCell className="font-medium text-foreground py-2.5">
                        {activity.link ? <Link href={activity.link} className="hover:underline">{activity.actor}</Link> : activity.actor}
                    </TableCell>
                    <TableCell className="text-muted-foreground hidden sm:table-cell py-2.5">{activity.action}</TableCell>
                    <TableCell className="text-right text-muted-foreground py-2.5 text-xs">{format(new Date(activity.timestamp), "PPp")}</TableCell>
                  </TableRow>
                )})}
                 {recentActivities.length === 0 && !isLoadingActivities && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-10 text-sm">
                      No recent activities to display.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            )}
          </CardContent>
        </Card>

        <div className="grid md:grid-cols-2 gap-6">
            <Card className="shadow-sm animate-slide-in-up border-border/80 rounded-lg hover:shadow-md transition-all-smooth" style={{ animationDelay: `350ms`}}>
                <CardHeader className="p-4 sm:p-5">
                    <CardTitle className="text-lg font-semibold flex items-center text-foreground">
                        <ListChecks className="mr-2 h-5 w-5 text-primary" /> Quick Actions
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2.5 p-4 sm:p-5 pt-0">
                    <Link href="/admin/courses?filter=pending" passHref><Button variant="outline" size="sm" className="w-full justify-start text-sm rounded-md">Review Pending Courses</Button></Link>
                    <Link href="/admin/users?filter=flagged" passHref><Button variant="outline" size="sm" className="w-full justify-start text-sm rounded-md" disabled>Manage Flagged Users</Button></Link>
                    <Link href="/admin/announcements/add" passHref><Button variant="outline" size="sm" className="w-full justify-start text-sm rounded-md">Create Announcement</Button></Link>
                    <Link href="/admin/notifications" passHref><Button variant="outline" size="sm" className="w-full justify-start text-sm rounded-md">View Notifications Log</Button></Link>
                </CardContent>
            </Card>
            <Card className="shadow-sm animate-slide-in-up border-border/80 rounded-lg hover:shadow-md transition-all-smooth" style={{ animationDelay: `400ms`}}>
                <CardHeader className="p-4 sm:p-5">
                    <CardTitle className="text-lg font-semibold flex items-center text-foreground">
                        <MessageSquare className="mr-2 h-5 w-5 text-primary" /> Platform Feedback
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-4 sm:p-5 pt-0">
                    <p className="text-sm text-muted-foreground mb-2.5">No new platform-wide feedback messages.</p>
                    <Button variant="default" size="sm" className="text-sm rounded-md" disabled>View All Feedback</Button>
                </CardContent>
            </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
    

    