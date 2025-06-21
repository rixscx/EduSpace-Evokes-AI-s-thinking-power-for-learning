
"use client"; 

import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { CourseCard } from "@/components/course/CourseCard"; 
import type { Course } from "@/types/platform";
import { BookCopy, RotateCcw } from "lucide-react";
import { getAllCourses } from "@/lib/mockCourses"; // Now fetches from Firestore
import { useState, useEffect, useCallback } from "react"; 
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

export default function DiscoverCoursesPage() {
  const [availableCourses, setAvailableCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const loadAvailableCourses = useCallback(async () => {
    setIsLoading(true);
    try {
      // Fetch all courses, filtering for published and approved happens in getAllCourses
      const allFetchedCourses = await getAllCourses(true); // Pass true to apply published & approved filters
      setAvailableCourses(allFetchedCourses);
    } catch (error) {
      console.error("Error fetching available courses:", error);
      toast({ title: "Error", description: "Could not load courses from Firestore.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadAvailableCourses();
  }, [loadAvailableCourses]); 

  if (isLoading) {
    return (
      <DashboardLayout role="student">
        <div className="animate-fade-in space-y-8">
          <header className="space-y-1.5 text-left">
            <Skeleton className="h-8 w-1/2 mb-2" />
            <Skeleton className="h-4 w-3/4" />
          </header>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <Card key={i} className="shadow-sm border-border/80 rounded-lg">
                <CardContent className="p-5 flex flex-col flex-grow space-y-3">
                  <Skeleton className="aspect-[16/9] w-full rounded-md mb-3" />
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-3 w-1/3" />
                  <Skeleton className="h-10 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </DashboardLayout>
    );
  }


  return (
    <DashboardLayout role="student">
      <div className="animate-fade-in space-y-8">
        <header className="space-y-1.5 text-left animate-slide-in-up" style={{ animationDelay: '50ms'}}>
          <h1 className="text-2xl md:text-3xl font-semibold text-foreground">Discover Courses</h1>
          <p className="text-md text-muted-foreground">Browse all available lessons below and find your next learning adventure.</p>
        </header>

        {availableCourses.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-slide-in-up" style={{ animationDelay: '150ms'}}>
            {availableCourses.map((course, index) => (
              <div key={course.id} style={{ animationDelay: `${150 + index * 50}ms`}} className="animate-slide-in-up">
                 <CourseCard course={course} role="student" />
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-card rounded-lg shadow-sm border border-border/80 animate-slide-in-up hover:shadow-md transition-all-smooth" style={{ animationDelay: '150ms'}}>
            <BookCopy className="mx-auto h-20 w-20 text-muted-foreground/40 mb-5" />
            <h2 className="text-xl font-semibold mb-2 text-foreground">No Courses Found</h2>
            <p className="text-muted-foreground text-sm mb-4">There are currently no courses available for enrollment.</p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
