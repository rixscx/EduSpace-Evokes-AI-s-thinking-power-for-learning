
"use client"; 

import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookCopy, Search, ArrowRight, RotateCcw, Library } from "lucide-react";
import Link from "next/link";
import type { Course } from "@/types/platform";
import { CourseCard } from "@/components/course/CourseCard";
import { getAllCourses, getEnrolledCoursesByStudent } from "@/lib/mockCourses"; 
import { useState, useEffect, useCallback, useMemo } from "react"; 
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";

export default function StudentDashboardPage() {
  const { user, isLoading: authIsLoading } = useAuth();
  const [enrolledCourses, setEnrolledCourses] = useState<Course[]>([]);
  const [suggestedCourses, setSuggestedCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const loadDashboardCourses = useCallback(async () => {
    setIsLoading(true);
    try {
      if (user && user.uid) {
        const studentEnrolledCourses = await getEnrolledCoursesByStudent(user.uid);
        setEnrolledCourses(studentEnrolledCourses);

        const allAvailableCourses = await getAllCourses(true); 
        const enrolledCourseIds = new Set(studentEnrolledCourses.map(c => c.id));
        const filteredSuggestedCourses = allAvailableCourses.filter(c => !enrolledCourseIds.has(c.id));
        setSuggestedCourses(filteredSuggestedCourses.slice(0, 3));
      } else {
        const allAvailableCourses = await getAllCourses(true);
        setSuggestedCourses(allAvailableCourses.slice(0, 3));
        setEnrolledCourses([]);
      }
    } catch (error) {
      console.error("Error fetching courses for student dashboard:", error);
      toast({ title: "Error", description: "Could not load courses from Firestore.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [toast, user]);

  useEffect(() => {
    if (!authIsLoading) { 
      loadDashboardCourses();
    }
  }, [authIsLoading, loadDashboardCourses]); 

  // Calculate progress client-side (mock)
  const coursesWithProgress = useMemo(() => {
    return enrolledCourses.map(course => {
      if (typeof window !== 'undefined') {
        const allChaptersFlat = course.modules.flatMap(m => m.chapters?.map(ch => ch.id) || []).filter(id => id);
        const completedCount = allChaptersFlat.reduce((count, chapterId) => {
          if (localStorage.getItem(`lesson-${chapterId}-completed`) === 'true') {
            return count + 1;
          }
          return count;
        }, 0);
        const totalLessons = allChaptersFlat.length;
        const percentage = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;
        return { ...course, progress: percentage };
      }
      return { ...course, progress: 0 }; // Default progress if not client-side
    });
  }, [enrolledCourses]);


  if (authIsLoading || isLoading) {
     return (
      <DashboardLayout role="student">
        <div className="animate-fade-in space-y-10">
            <header className="space-y-1.5">
                <Skeleton className="h-8 w-3/4 mb-2" />
                <Skeleton className="h-4 w-full" />
            </header>
            <section>
                <Skeleton className="h-6 w-1/3 mb-4" />
                <div className="grid gap-x-6 gap-y-8 md:grid-cols-2 lg:grid-cols-3">
                    {[...Array(1)].map((_, i) => (
                        <Card key={`enrolled-skel-${i}`} className="shadow-sm rounded-lg border-border/70">
                             <CardContent className="p-4"><Skeleton className="aspect-[16/9] w-full rounded-md mb-3" /><Skeleton className="h-5 w-3/4" /><Skeleton className="h-4 w-1/2 mt-1" /><Skeleton className="h-9 w-full mt-3" /></CardContent>
                        </Card>
                    ))}
                </div>
            </section>
             <section>
                <Skeleton className="h-6 w-1/2 mb-4" />
                <div className="grid gap-x-6 gap-y-8 md:grid-cols-2 lg:grid-cols-3">
                     {[...Array(2)].map((_, i) => (
                        <Card key={`suggest-skel-${i}`} className="shadow-sm rounded-lg border-border/70">
                            <CardContent className="p-4"><Skeleton className="aspect-[16/9] w-full rounded-md mb-3" /><Skeleton className="h-5 w-3/4" /><Skeleton className="h-4 w-1/2 mt-1" /><Skeleton className="h-9 w-full mt-3" /></CardContent>
                        </Card>
                    ))}
                </div>
            </section>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="student">
      <div className="animate-fade-in space-y-10">
        <header className="space-y-1.5 animate-slide-in-up" style={{ animationDelay: '50ms'}}>
          <h1 className="text-2xl md:text-3xl font-semibold text-foreground">Welcome Back, {user?.displayName?.split(' ')[0] || "Student"}!</h1>
          <p className="text-md text-muted-foreground">Continue your learning journey and explore new skills.</p>
        </header>
        
        <section className="animate-slide-in-up" style={{ animationDelay: `150ms`}}>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-foreground">
              Continue Learning
            </h2>
            {coursesWithProgress.length > 3 && ( 
                 <Link href="/student/courses" passHref> 
                    <Button variant="link" className="text-primary hover:text-primary/80 text-sm px-0">View All <ArrowRight className="ml-1 h-3.5 w-3.5"/></Button>
                 </Link>
            )}
          </div>
          {coursesWithProgress.length > 0 ? (
            <div className="grid gap-x-6 gap-y-8 md:grid-cols-2 lg:grid-cols-3">
              {coursesWithProgress.slice(0,3).map((course, index) => (
                <div key={course.id} className="animate-slide-in-up" style={{ animationDelay: `${(index + 2) * 75}ms`}}>
                    <CourseCard course={course} role="student" progress={course.progress} /> 
                </div>
              ))}
            </div>
          ) : (
             <Card className="shadow-sm border-border/80 rounded-lg animate-slide-in-up hover:shadow-md transition-all-smooth" style={{ animationDelay: '200ms'}}>
                <CardContent className="p-8 text-center">
                  <Library className="mx-auto h-16 w-16 text-muted-foreground/50 mb-4" />
                  <p className="mb-2 text-md font-medium text-muted-foreground">You are not enrolled in any courses yet.</p>
                  <Link href="/student/courses">
                    <Button variant="default" size="sm" className="text-sm rounded-md">Explore Courses</Button>
                  </Link>
                </CardContent>
              </Card>
          )}
        </section>

        <section className="animate-slide-in-up" style={{ animationDelay: `250ms`}}>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-foreground">
             Recommended For You
            </h2>
             {suggestedCourses.length > 0 && ( 
                 <Link href="/student/courses" passHref>
                    <Button variant="link" className="text-primary hover:text-primary/80 text-sm px-0">Explore More <ArrowRight className="ml-1 h-3.5 w-3.5"/></Button>
                 </Link>
            )}
          </div>
          {suggestedCourses.length > 0 ? (
          <div className="grid gap-x-6 gap-y-8 md:grid-cols-2 lg:grid-cols-3">
            {suggestedCourses.map((course, index) => ( 
              <div key={course.id} className="animate-slide-in-up" style={{ animationDelay: `${(index + coursesWithProgress.length + 3) * 75}ms`}}>
                 <CourseCard course={course} role="student" />
              </div>
            ))}
          </div>
           ) : (
            <Card className="shadow-sm border-border/80 rounded-lg animate-slide-in-up hover:shadow-md transition-all-smooth" style={{ animationDelay: '300ms'}}>
              <CardContent className="p-8 text-center text-muted-foreground">
                <Search className="mx-auto h-16 w-16 text-muted-foreground/50 mb-4" />
                <p className="text-md">No new recommendations available at the moment.</p>
                <p className="mt-1 text-sm">Keep learning or explore all courses to get personalized suggestions!</p>
                 <Link href="/student/courses" className="mt-3 inline-block">
                    <Button variant="outline" size="sm" className="text-sm rounded-md">View All Courses</Button>
                  </Link>
              </CardContent>
            </Card>
          )}
        </section>
      </div>
    </DashboardLayout>
  );
}

