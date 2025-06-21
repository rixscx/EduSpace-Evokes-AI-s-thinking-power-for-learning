
"use client";

import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Edit3, Trash2, Search, Eye, RotateCcw } from "lucide-react";
import Link from "next/link";
import type { Course } from "@/types/platform";
import { getCoursesByTeacher, deleteCourseFromFirestore } from "@/lib/mockCourses"; 
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
  AlertDialogTrigger, // Added missing import
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";

export default function TeacherCoursesPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [allTeacherCourses, setAllTeacherCourses] = useState<Course[]>([]);
  const [coursesToDisplay, setCoursesToDisplay] = useState<Course[]>([]);
  const [isLoadingCourses, setIsLoadingCourses] = useState(true);
  const { toast } = useToast();

  const loadCourses = useCallback(async (teacherId: string) => {
    setIsLoadingCourses(true);
    try {
      const fetchedCourses = await getCoursesByTeacher(teacherId);
      const sortedCourses = fetchedCourses.sort((a,b) => a.title.localeCompare(b.title));
      setAllTeacherCourses(sortedCourses);
      setCoursesToDisplay(sortedCourses);
    } catch (error) {
      console.error("Error fetching teacher courses:", error);
      toast({ title: "Error", description: "Could not load your courses from Firestore.", variant: "destructive" });
    } finally {
      setIsLoadingCourses(false);
    }
  }, [toast]);

  useEffect(() => {
    if (user?.uid && !authLoading) {
      loadCourses(user.uid);
    } else if (!authLoading && !user?.uid) { 
      setAllTeacherCourses([]);
      setCoursesToDisplay([]);
      setIsLoadingCourses(false);
    }
  }, [user, authLoading, loadCourses]);

  const handleDeleteCourse = async (courseId: string) => {
    const courseToDelete = allTeacherCourses.find(c => c.id === courseId);
    if (!courseToDelete) return;

    try {
      await deleteCourseFromFirestore(courseId);
      if (user?.uid) loadCourses(user.uid); 
      toast({
        title: "Course Deleted",
        description: `"${courseToDelete.title}" has been permanently removed from Firestore. This action is permanent.`,
        variant: "default", 
      });
    } catch (error) {
      console.error("Error deleting course:", error);
      toast({ title: "Error", description: "Could not delete course from Firestore.", variant: "destructive" });
    }
  };

  const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
    const searchTerm = event.target.value.toLowerCase();
    if (searchTerm === "") {
      setCoursesToDisplay([...allTeacherCourses].sort((a,b) => a.title.localeCompare(b.title)));
    } else {
      setCoursesToDisplay(
        allTeacherCourses.filter(course => 
          course.title.toLowerCase().includes(searchTerm) ||
          course.category.name.toLowerCase().includes(searchTerm)
        ).sort((a,b) => a.title.localeCompare(b.title))
      );
    }
  };

  if (authLoading || isLoadingCourses) {
    return (
      <DashboardLayout role="teacher">
        <div className="animate-fade-in space-y-8">
          <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div><Skeleton className="h-8 w-48 mb-2" /><Skeleton className="h-4 w-72" /></div>
          </header>
          <Card className="shadow-sm border-border/80 rounded-lg">
            <CardHeader className="p-4 sm:p-5 border-b border-border/70">
              <Skeleton className="h-6 w-1/4 mb-1" /><Skeleton className="h-4 w-1/2" />
              <div className="pt-3"><Skeleton className="h-9 w-full" /></div>
            </CardHeader>
            <CardContent className="p-0">
               {[...Array(3)].map((_, i) => (
                <div key={i} className="flex items-center p-4 border-b border-border/70 last:border-b-0">
                  <div className="flex-1 space-y-1.5"><Skeleton className="h-4 w-3/4" /><Skeleton className="h-3 w-1/2" /></div>
                  <Skeleton className="h-7 w-20 ml-4" /> <Skeleton className="h-7 w-7 ml-2 rounded-full" /> <Skeleton className="h-7 w-7 ml-1 rounded-full" />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="teacher">
      <div className="animate-fade-in space-y-8">
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 animate-slide-in-up" style={{ animationDelay: '50ms'}}>
          <div>
            <h1 className="text-2xl md:text-3xl font-semibold text-foreground">My Courses</h1>
            <p className="text-md text-muted-foreground mt-0.5">Manage all your courses, edit content, and track status.</p>
          </div>
        </header>

        <Card className="shadow-sm border-border/80 rounded-lg animate-slide-in-up hover:shadow-md transition-all-smooth" style={{ animationDelay: '150ms'}}>
          <CardHeader className="p-4 sm:p-5 border-b border-border/70">
            <CardTitle className="text-lg font-semibold text-foreground">Course Overview</CardTitle>
            <CardDescription className="text-sm text-muted-foreground pt-0.5">
              A list of all courses you manage on EduSpace. Newly created draft courses will appear here.
            </CardDescription>
            <div className="pt-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Search your courses..." 
                  className="pl-9 h-9 rounded-md text-sm" 
                  onChange={handleSearch}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
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
                {coursesToDisplay.map((course) => (
                  <TableRow key={course.id} className="hover:bg-muted/50 text-sm transition-colors duration-150 ease-in-out">
                    <TableCell className="font-medium text-foreground py-2.5 max-w-xs truncate">{course.title}</TableCell>
                    <TableCell className="text-muted-foreground hidden sm:table-cell py-2.5">{course.category.name}</TableCell>
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
                      <Link href={`/teacher/courses/${course.id}/edit`}>
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
                {coursesToDisplay.length === 0 && (
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
      </div>
    </DashboardLayout>
  );
}
    
    
