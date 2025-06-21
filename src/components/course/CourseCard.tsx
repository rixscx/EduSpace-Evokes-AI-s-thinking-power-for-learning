
import Image from "next/image";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"; 
import { Badge } from "@/components/ui/badge";
import type { Course } from "@/types/platform";
import { getIconForCategory } from "@/config/nav"; 
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface CourseCardProps {
  course: Course;
  role: "student" | "teacher" | "admin";
  progress?: number; 
}

export function CourseCard({ course, role, progress }: CourseCardProps) {
  const CategoryIcon = getIconForCategory(course.category.name);

  const cardLink = role === "student" ? `/student/courses/${course.id}` :
                   role === "teacher" ? `/teacher/courses/${course.id}/edit` : 
                   `/admin/courses/${course.id}`; 

  const cardDescription = course.description && course.description.length > 80
    ? course.description.substring(0, 80) + "..."
    : course.description;
  
  const studentButtonText = progress !== undefined && progress > 0 && progress < 100 ? "Continue Learning" : "View Course";


  return (
    <Card className={cn(
        "flex flex-col overflow-hidden bg-card rounded-lg shadow-md hover:shadow-xl hover:-translate-y-1 transition-all duration-300 ease-in-out h-full border border-border/70 group",
        "animate-slide-in-up"
     )}>
      <Link href={cardLink} className="block">
        <div className="relative w-full aspect-[16/9]">
          <Image
            src={course.thumbnailImageURL}
            alt={course.title}
            layout="fill"
            objectFit="cover"
            className="group-hover:opacity-90 transition-opacity duration-200"
            data-ai-hint={course.dataAiHint || `${course.category.name} online course`}
            priority={role === "student"}
          />
        </div>
      </Link>
      <CardHeader className="p-4 flex-grow">
        <div className="flex items-center justify-between mb-1">
            <Badge variant="outline" className="text-xs font-normal py-0.5 px-2 rounded-full border-primary/30 text-primary bg-primary/10">
                <CategoryIcon className="h-3.5 w-3.5 mr-1" />
                {course.category.name}
            </Badge>
        </div>
        <Link href={cardLink} className="block">
          <CardTitle className="text-md font-semibold leading-snug mb-1 group-hover:text-primary transition-colors line-clamp-2" title={course.title}>
              {course.title}
          </CardTitle>
        </Link>
        <p className="text-xs text-muted-foreground font-body mb-2 line-clamp-1">
          By {course.teacherName || "EduSpace Instructor"}
        </p>
        {cardDescription && (
             <p className="text-xs text-muted-foreground font-body line-clamp-2 leading-relaxed flex-grow">
                {cardDescription}
             </p>
        )}
      </CardHeader>
      <div className="p-4 pt-0 mt-auto">
        {role === "student" && progress !== undefined && (
          <div className="my-2">
            <div className="h-1 w-full bg-muted rounded-full overflow-hidden">
              <div
                className="h-1 bg-primary rounded-full"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1">{progress}% complete</p>
          </div>
        )}
         <Link href={cardLink} className="w-full block">
            <Button 
                variant={role === "student" ? "default" : "outline"} 
                size="sm"
                className="w-full text-sm font-medium h-9 rounded-md"
            >
                {role === "student" ? studentButtonText : role === "teacher" ? "Manage Course" : "Review Course"}
            </Button>
        </Link>
      </div>
    </Card>
  );
}

