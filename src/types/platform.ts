
import type { LucideIcon } from "lucide-react";
export type UserRole = "admin" | "teacher" | "student";

export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  role: UserRole;
  phoneNumber?: string;
  joinedDate?: string;
  stats?: {
    coursesEnrolled: number;
    coursesCompleted: number;
    certificatesEarned: number;
  };
  dataAiHint?: string;
}

export interface Admin extends User {
  role: "admin";
}

export interface Teacher extends User {
  role: "teacher";
  bio?: string;
}

export interface Student extends User {
  role: "student";
  enrolledCourseIds?: string[];
  completedChapterIds?: string[];
  badges?: BadgeAward[]; 
  certificates?: CertificateRecord[];
}

export type ContentBlockType = "heading" | "text" | "image" | "video" | "link" | "file";

export interface ContentBlock {
  id: string;
  type: ContentBlockType;
  value: string; 
  altText?: string;
  level?: 1 | 2 | 3 | 4 | 5 | 6;
  dataAiHint?: string; 
  topic?: string; 
  fileName?: string;
  fileSize?: number;
  fileType?: string;
}

export interface Chapter {
  id: string;
  title: string;
  contentBlocks: ContentBlock[];
  estimatedMinutes?: number;
}

export interface Module {
  id: string;
  title: string;
  description?: string;
  chapters: Chapter[];
}

export interface CourseCategory {
  id:string;
  name: string;
}

export interface Course {
  id: string;
  title: string;
  description: string;
  category: CourseCategory;
  teacherId: string;
  teacherName?: string;
  thumbnailImageURL: string;
  thumbnailFileName?: string;
  modules: Module[];
  isPublished?: boolean;
  isApproved?: boolean;
  dataAiHint?: string; 

  difficulty?: "Beginner" | "Intermediate" | "Advanced";
  durationMinutes?: number;
  badgeOnComplete?: string;
  
  certificateFileName?: string;
  certificateTemplateUrl?: string;

  createdAt?: any;
  updatedAt?: any;
  enrollmentCount?: number;
}


// A derived structure for displaying chapter information in a list
export interface ChapterDisplayInfo { 
  id: string;
  moduleId?: string;
  lessonTitle: string; // "lessonTitle" is used here for legacy reasons in components
  videoURL?: string; 
  videoSearchQuery?: string;
  lessonTextContent: string; 
  imageQuery?: string; 
  quiz?: LessonQuiz[];
  materials?: LessonMaterial[]; 
}

// A simple quiz structure associated with a lesson/chapter
export interface LessonQuiz {
  question: string;
  options: string[];
  correctAnswerIndex: number;
}

export type QuizQuestionType = "mcq" | "true_false" | "fill_in_the_blank";

export interface QuizQuestion {
  id: string;
  questionText: string;
  questionType: QuizQuestionType;
  options?: string[]; // For MCQ
  correctAnswerIndex?: number; // For MCQ
  correctAnswerBoolean?: boolean; // For True/False
  correctAnswerText?: string | string[]; // For Fill-in-the-blank (string for single, array for multiple blanks)
  marks: number;
}

export interface FinalQuizData {
  quizTitle: string;
  questions: QuizQuestion[];
  totalMarks: number;
}

export interface FinalQuizAttempt {
  id?: string;
  userId: string;
  courseId: string;
  courseTitle: string; 
  badgeOnComplete?: string; 
  quizGeneratedAt: any; 
  questions: QuizQuestion[]; 
  studentAnswers?: { questionId: string; answer: any }[]; 
  score?: number;
  totalMarks?: number;
  passed?: boolean;
  attemptedAt?: any; 
  submittedAt?: any; 
  nextAttemptAllowedAt?: any; 
}

export interface LessonMaterial { 
  id: string;
  name: string;
  url?: string;
  type?: string;
  size?: number;
  file?: File; 
}


export interface Enrollment {
  id?: string;
  studentId: string;
  courseId: string;
  enrolledAt: any;
  progress?: number;
  completedChapterIds?: string[];
}


export interface StudentProgress {
  courseId: string;
  completedChapters: string[];
  totalChapters: number;
}

export interface Review {
  id?: string;
  courseId: string;
  studentId: string;
  studentName: string;
  rating: number; // 1-5
  comment?: string;
  createdAt: any;
  updatedAt?: any;
}


export interface Feedback {
  id: string;
  courseId: string;
  studentId: string;
  rating: 1 | 2 | 3 | 4 | 5;
  comment?: string;
  createdAt: Date;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  authorId: string;
  scope: "platform" | "course";
  courseId?: string;
  createdAt: Date;
}

export interface CourseSuggestionReply {
  id: string;
  senderId: string;
  senderName: string;
  message: string;
  createdAt: any;
}

export interface CourseSuggestion {
  id: string;
  courseId: string;
  courseTitle: string;
  adminId: string;
  adminName: string;
  teacherId: string;
  teacherName?: string;
  initialMessage: string;
  replies: CourseSuggestionReply[];
  createdAt: any;
  updatedAt: any;
  isReadByTeacher: boolean;
  isReadByAdmin: boolean;
}


export interface BadgeAward { 
  id?: string; 
  userId: string; 
  courseId: string;
  courseTitle: string; 
  badgeName: string;   
  awardedDate: any;  
  iconUrl?: string;    
}


export interface CertificateRecord {
  id?: string; 
  userId: string;
  studentName: string; 
  courseId: string;
  courseTitle: string; 
  issuedDate: any; 
  status: 'pending_validation' | 'approved' | 'rejected';
  validatedByTeacherId?: string;
  validationDate?: any;
  certificateUrl?: string; 
  finalScore?: number;
  totalMarks?: number;
}

export interface NavItem {
  title: string;
  href: string;
  icon: React.ElementType;
  disabled?: boolean;
  external?: boolean;
  label?: string;
  description?: string;
  activePaths?: string[];
}

export interface NotificationItem {
  id: string;
  userId?: string;
  title: string;
  description: string;
  createdAt: Date;
  read: boolean;
  link?: string;
  icon?: LucideIcon;
  category?: "course" | "system" | "community" | "general" | "suggestion";
}

export interface SidebarNavConfig {
  admin: NavItem[];
  teacher: NavItem[];
  student: NavItem[];
}

// Types for form state in course creation/editing
export interface ContentBlockInputState {
  id: string;
  type: ContentBlockType;
  value: string;
  altText?: string;
  level?: 1 | 2 | 3 | 4 | 5 | 6;
  dataAiHint?: string;
  topic?: string; 
  file?: File;
  fileName?: string;
  fileSize?: number;
  fileType?: string;
  localFilePreviewUrl?: string; 
}

export interface ChapterInputState {
  id: string;
  title: string;
  contentBlocks: ContentBlockInputState[];
  estimatedMinutes?: number;
}

export interface ModuleInputState {
  id: string;
  title: string;
  description?: string;
  chapters: ChapterInputState[];
}
