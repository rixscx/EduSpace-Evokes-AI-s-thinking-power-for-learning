
"use client"; 

import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Library, Users, Star, Edit3, Trash2, Eye, Clock, BarChartHorizontalBig, RotateCcw, ListChecks, PlusCircle, MessageCircle, MessageSquare } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import type { Course, Review } from "@/types/platform";
import { getCoursesByTeacher, deleteCourseFromFirestore, getCourseReviews } from "@/lib/mockCourses"; 
import { useState, useEffect, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
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
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { format } from "date-fns";

const initialTeacherStats = [
  { title: "Total Courses", value: "0", icon: Library, color: "text-primary" },
  { title: "Active Students", value: "0", icon: Users, color: "text-green-600" }, 
  { title: "Avg. Rating", value: "N/A", icon: Star, color: "text-yellow-600" },  
  { title: "Total Reviews", value: "0", icon: MessageSquare, color: "text-orange-600" }, 
];

export default function TeacherDashboardPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [coursesForDisplay, setCoursesForDisplay] = useState<Course[]>([]);
  const [currentTeacherStats, setCurrentTeacherStats] = useState(initialTeacherStats);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [recentFeedbacks, setRecentFeedbacks] = useState<Review[]>([]);
  const { toast } = useToast();

  const loadDashboardData = useCallback(async (teacherId: string) => {
    setIsLoadingData(true);
    try {
      const fetchedCourses = await getCoursesByTeacher(teacherId);
      const sortedCourses = fetchedCourses.sort((a,b) => a.title.localeCompare(b.title));
      setCoursesForDisplay(sortedCourses);

      let totalActiveStudents = 0;
      const allReviews: Review[] = [];

      for (const course of fetchedCourses) {
        totalActiveStudents += course.enrollmentCount || 0; // Summing the property from the Course object
        const reviews = await getCourseReviews(course.id);
        // Augment review with courseTitle for display in feedback card
        allReviews.push(...reviews.map(r => ({...r, courseTitle: course.title })));
      }
      
      allReviews.sort((a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime());
      setRecentFeedbacks(allReviews.slice(0, 3));

      const averageRating = allReviews.length > 0 
        ? (allReviews.reduce((sum, review) => sum + review.rating, 0) / allReviews.length).toFixed(1)
        : "N/A";

      setCurrentTeacherStats(prevStats => 
        prevStats.map(stat => {
          if (stat.title === "Total Courses") return { ...stat, value: sortedCourses.length.toString() };
          if (stat.title === "Active Students") return { ...stat, value: totalActiveStudents.toString() }; 
          if (stat.title === "Avg. Rating") return { ...stat, value: averageRating }; 
          if (stat.title === "Total Reviews") return { ...stat, value: allReviews.length.toString() }; 
          return stat;
        })
      );
    } catch (error) {
      console.error("Error fetching teacher dashboard data:", error);
      toast({ title: "Error", description: "Could not load dashboard data from Firestore.", variant: "destructive" });
      setCurrentTeacherStats(initialTeacherStats.map(s => ({...s, value: s.title === "Avg. Rating" ? "N/A" : "Error"})));
    } finally {
      setIsLoadingData(false);
    }
  }, [toast]);

  useEffect(() => {
    if (user?.uid && !authLoading) {
      loadDashboardData(user.uid);
    } else if (!authLoading && !user?.uid) {
      setCoursesForDisplay([]);
      setCurrentTeacherStats(initialTeacherStats);
      setRecentFeedbacks([]);
      setIsLoadingData(false);
    }
  }, [user, authLoading, loadDashboardData]);

  const handleDeleteCourse = async (courseId: string) => {
    const courseToDelete = coursesForDisplay.find(c => c.id === courseId);
    if (!courseToDelete) return;

    try {
      await deleteCourseFromFirestore(courseId);
      if (user?.uid) {
        loadDashboardData(user.uid); 
      }
      toast({
        title: "Course Deleted",
        description: `"${courseToDelete.title}" has been permanently removed from Firestore.`,
        variant: "destructive",
      });
    } catch (error) {
      console.error("Error deleting course from dashboard:", error);
      toast({ title: "Error", description: "Could not delete course from Firestore.", variant: "destructive" });
    }
  };


  if (authLoading || isLoadingData) {
      return (
        <DashboardLayout role="teacher">
             <div className="animate-fade-in space-y-8">
                <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <div><Skeleton className="h-8 w-60 mb-2" /><Skeleton className="h-4 w-80" /></div>
                </header>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    {[...Array(4)].map((_, i) => <Card key={i}><CardHeader className="pb-2 pt-4 px-4"><Skeleton className="h-5 w-24" /></CardHeader><CardContent className="px-4 pb-4"><Skeleton className="h-8 w-12" /></CardContent></Card>)}
                </div>
                <Card><CardHeader className="p-4 sm:p-5"><Skeleton className="h-6 w-1/3 mb-2" /><Skeleton className="h-4 w-1/2" /></CardHeader><CardContent className="p-0 sm:p-2">
                    {[...Array(2)].map((_, i) => (
                        <div key={i} className="flex items-center p-4 border-b last:border-b-0">
                        <div className="flex-1 space-y-1.5"><Skeleton className="h-4 w-3/4" /><Skeleton className="h-3 w-1/2" /></div>
                        <Skeleton className="h-7 w-20 ml-4" /> <Skeleton className="h-7 w-7 ml-2 rounded-full" />
                        </div>
                    ))}
                </CardContent></Card>
                <div className="grid md:grid-cols-2 gap-6 mt-8">
                    <Card><CardHeader className="p-4 sm:p-5"><Skeleton className="h-6 w-1/2" /></CardHeader><CardContent className="p-4 sm:p-5 pt-0 space-y-2.5"><Skeleton className="h-9 w-full" /><Skeleton className="h-9 w-full" /></CardContent></Card>
                    <Card><CardHeader className="p-4 sm:p-5"><Skeleton className="h-6 w-1/2" /></CardHeader><CardContent className="p-4 sm:p-5 pt-0"><Skeleton className="h-4 w-3/4" /></CardContent></Card>
                </div>
             </div>
        </DashboardLayout>
      )
  }

  return (
    <DashboardLayout role="teacher">
      <div className="animate-fade-in space-y-8">
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 animate-slide-in-up" style={{ animationDelay: '50ms'}}>
          <div>
            <h1 className="text-2xl md:text-3xl font-semibold text-foreground">Teacher Dashboard</h1>
            <p className="text-md text-muted-foreground mt-0.5">Manage your courses, students, and content. Data reflects the last load/refresh.</p>
          </div>
        </header>
        
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {currentTeacherStats.map((stat, index) => (
            <Card key={stat.title} className="shadow-sm border-border/80 rounded-lg animate-slide-in-up hover:shadow-md transition-all-smooth" style={{ animationDelay: `${index * 75}ms`}}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 pt-4 px-4">
                <CardTitle className="text-sm font-medium text-muted-foreground">{stat.title}</CardTitle>
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <div className="text-2xl font-semibold text-foreground">{stat.value}{stat.title.includes("Avg. Rating") && stat.value !== "N/A" && stat.value !== "Error" && <span className="text-sm text-muted-foreground">/5</span>}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="shadow-sm animate-slide-in-up border-border/80 rounded-lg hover:shadow-md transition-all-smooth" style={{ animationDelay: `300ms`}}>
          <CardHeader className="p-4 sm:p-5">
            <div className="flex justify-between items-center">
                <CardTitle className="text-lg font-semibold flex items-center text-foreground">
                <BarChartHorizontalBig className="mr-2 h-5 w-5 text-primary" />
                My Courses
                </CardTitle>
                <Link href="/teacher/courses" passHref>
                    <Button variant="outline" size="sm" className="text-xs rounded-md">View All</Button>
                </Link>
            </div>
            <CardDescription className="text-sm pt-0.5 text-muted-foreground">
              A quick overview of your courses. Drafts and pending approvals are included.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0 sm:p-2">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs font-medium text-muted-foreground">Title</TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground hidden sm:table-cell">Category</TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground">Status</TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground hidden md:table-cell">Approval</TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {coursesForDisplay.slice(0, 5).map((course) => (
                  <TableRow key={course.id} className="hover:bg-muted/50 transition-colors duration-150 ease-in-out">
                    <TableCell className="font-medium text-sm text-foreground py-2.5 max-w-xs truncate">{course.title}</TableCell>
                    <TableCell className="text-xs text-muted-foreground hidden sm:table-cell py-2.5">{course.category.name}</TableCell>
                    <TableCell className="py-2.5">
                      <Badge variant={course.isPublished ? "default" : "secondary"} className={`text-xs font-normal rounded-full py-0.5 px-2 ${course.isPublished ? "bg-green-100 text-green-700 border-green-300" : "bg-yellow-100 text-yellow-700 border-yellow-300"}`}>
                        {course.isPublished ? "Published" : "Draft"}
                      </Badge>
                    </TableCell>
                     <TableCell className="py-2.5 hidden md:table-cell">
                      <Badge variant={course.isApproved ? "default" : "destructive"} className={`text-xs font-normal rounded-full py-0.5 px-2 ${course.isApproved ? "bg-blue-100 text-blue-700 border-blue-300" : "bg-orange-100 text-orange-700 border-orange-300"}`}>
                        {course.isApproved ? "Approved" : "Pending"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right space-x-0.5 py-2.5">
                      <Link href={`/teacher/courses/${course.id}`} passHref>
                        <Button variant="ghost" size="icon" aria-label={`View ${course.title}`} className="text-muted-foreground hover:text-primary h-7 w-7 rounded-full">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </Link>
                      <Link href={`/teacher/courses/${course.id}/edit`} passHref>
                        <Button variant="ghost" size="icon" aria-label={`Edit ${course.title}`} className="text-muted-foreground hover:text-primary h-7 w-7 rounded-full">
                          <Edit3 className="h-4 w-4" />
                        </Button>
                      </Link>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                           <Button 
                            variant="ghost" 
                            size="icon" 
                            aria-label={`Delete ${course.title}`} 
                            className="text-destructive/70 hover:text-destructive h-7 w-7 rounded-full"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This action will permanently remove the course &quot;{course.title}&quot; from Firestore. This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDeleteCourse(course.id)} className="bg-destructive hover:bg-destructive/90">
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                ))}
                 {coursesForDisplay.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-10 text-sm">
                      You haven&apos;t created any courses yet. 
                      <Link href="/teacher/courses/add" className="text-primary hover:underline ml-1 font-medium">Create one now!</Link>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <div className="grid md:grid-cols-2 gap-6 mt-8">
            <Card className="shadow-sm animate-slide-in-up border-border/80 rounded-lg hover:shadow-md transition-all-smooth" style={{ animationDelay: `350ms`}}>
                <CardHeader className="p-4 sm:p-5">
                    <CardTitle className="text-lg font-semibold flex items-center text-foreground">
                        <ListChecks className="mr-2 h-5 w-5 text-primary" /> Quick Actions
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2.5 p-4 sm:p-5 pt-0">
                    <Link href="/teacher/courses/add" passHref>
                        <Button variant="outline" size="sm" className="w-full justify-start text-sm rounded-md">
                            <PlusCircle className="mr-2 h-4 w-4"/> Create New Course
                        </Button>
                    </Link>
                    <Link href="/teacher/courses" passHref>
                        <Button variant="outline" size="sm" className="w-full justify-start text-sm rounded-md">
                             <Library className="mr-2 h-4 w-4"/> View All My Courses
                        </Button>
                    </Link>
                    <Button variant="outline" size="sm" className="w-full justify-start text-sm rounded-md" disabled>
                        <Users className="mr-2 h-4 w-4"/> Manage Student Submissions
                    </Button>
                     <Button variant="outline" size="sm" className="w-full justify-start text-sm rounded-md" disabled>
                        <MessageCircle className="mr-2 h-4 w-4"/> Course Announcements
                    </Button>
                </CardContent>
            </Card>
            <Card className="shadow-sm animate-slide-in-up border-border/80 rounded-lg hover:shadow-md transition-all-smooth" style={{ animationDelay: `400ms`}}>
                <CardHeader className="p-4 sm:p-5">
                    <CardTitle className="text-lg font-semibold flex items-center text-foreground">
                        <MessageCircle className="mr-2 h-5 w-5 text-primary" /> Latest Student Feedback
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-4 sm:p-5 pt-0 space-y-3">
                    {recentFeedbacks.length > 0 ? (
                        recentFeedbacks.map(review => (
                            <div key={review.id} className="p-2.5 border rounded-md bg-muted/50 text-xs">
                                <div className="flex items-center gap-1.5 mb-1">
                                    <Avatar className="h-6 w-6">
                                        <AvatarImage src={`https://placehold.co/40x40.png?text=${review.studentName[0]}`} alt={review.studentName} data-ai-hint="student avatar"/>
                                        <AvatarFallback className="text-xs bg-background">{review.studentName[0]?.toUpperCase() || 'S'}</AvatarFallback>
                                    </Avatar>
                                    <span className="font-semibold text-foreground">{review.studentName}</span>
                                    {/* @ts-ignore */}
                                    <span className="text-muted-foreground">on &quot;{review.courseTitle || 'Course'}&quot;</span>
                                </div>
                                <div className="flex items-center mb-0.5">
                                    {[...Array(5)].map((_, i) => <Star key={i} className={`h-3.5 w-3.5 ${i < review.rating ? 'text-yellow-500 fill-yellow-500' : 'text-muted-foreground/40'}`} />)}
                                </div>
                                {review.comment && <p className="text-muted-foreground line-clamp-2">&quot;{review.comment}&quot;</p>}
                                <p className="text-muted-foreground/80 text-[0.7rem] mt-1">{format(new Date(review.updatedAt || review.createdAt), "MMM d, yyyy")}</p>
                            </div>
                        ))
                    ) : (
                       <p className="text-sm text-muted-foreground text-center py-4">No new student feedback for your courses.</p> 
                    )}
                    {/* Link to a full feedback page could be added here if such a page exists */}
                </CardContent>
            </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}

    