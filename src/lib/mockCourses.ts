
import { db } from "@/lib/firebase";
import {
  collection,
  getDocs,
  addDoc,
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp,
  getCountFromServer,
  arrayUnion,
  limit,
  writeBatch,
  increment
} from "firebase/firestore";
import type { Course as PlatformCourse, Module, Chapter as ChapterType, Enrollment, CourseSuggestion, CourseSuggestionReply, Review, ContentBlock as PlatformContentBlock, BadgeAward, FinalQuizAttempt, QuizQuestion, CertificateRecord } from "@/types/platform";
import { addNotification } from "@/config/nav";
import { MessageSquareHeart, ListChecks, CheckCircle } from "lucide-react";

// Helper to convert Firestore Timestamps to Date objects if they exist
function convertTimestamps<T extends { createdAt?: any; updatedAt?: any; enrolledAt?: any; awardedDate?: any; replies?: any[]; quizGeneratedAt?: any; attemptedAt?: any; submittedAt?: any; nextAttemptAllowedAt?: any; issuedDate?: any; validationDate?: any; }>(data: T): T {
  const convert = (timestamp: any) => {
    if (timestamp instanceof Timestamp) {
      return timestamp.toDate();
    }
    if (timestamp instanceof Date) {
      return timestamp;
    }
    // Handle string dates, although serverTimestamp is preferred
    if (typeof timestamp === 'string') {
      const parsedDate = new Date(timestamp);
      if (!isNaN(parsedDate.getTime())) {
        return parsedDate;
      }
    }
     // Handle Firestore ServerTimestamp in object form before it's written
    if (typeof timestamp === 'object' && timestamp !== null && 'seconds' in timestamp && 'nanoseconds' in timestamp) {
      return new Timestamp(timestamp.seconds, timestamp.nanoseconds).toDate();
    }
    return timestamp;
  };

  const result = { ...data };
  if (data.createdAt) result.createdAt = convert(data.createdAt);
  if (data.updatedAt) result.updatedAt = convert(data.updatedAt);
  if (data.enrolledAt) result.enrolledAt = convert(data.enrolledAt);
  if (data.awardedDate) result.awardedDate = convert(data.awardedDate);
  if (data.quizGeneratedAt) result.quizGeneratedAt = convert(data.quizGeneratedAt);
  if (data.attemptedAt) result.attemptedAt = convert(data.attemptedAt);
  if (data.submittedAt) result.submittedAt = convert(data.submittedAt);
  if (data.nextAttemptAllowedAt) result.nextAttemptAllowedAt = convert(data.nextAttemptAllowedAt);
  if (data.issuedDate) result.issuedDate = convert(data.issuedDate);
  if (data.validationDate) result.validationDate = convert(data.validationDate);

  if (data.replies && Array.isArray(data.replies)) {
    result.replies = data.replies.map(reply => ({
      ...reply,
      createdAt: convert(reply.createdAt)
    }));
  }
  return result;
}


export async function getAllCourses(applyFilters: boolean = false): Promise<PlatformCourse[]> {
  const coursesCollectionRef = collection(db, "courses");
  let q;
  if (applyFilters) {
     q = query(coursesCollectionRef,
               where("isPublished", "==", true),
               where("isApproved", "==", true),
               orderBy("title", "asc"));
  } else {
     q = query(coursesCollectionRef, orderBy("title", "asc"));
  }
  const coursesSnapshot = await getDocs(q);
  return coursesSnapshot.docs.map(doc => convertTimestamps({ id: doc.id, ...doc.data() } as PlatformCourse));
}

export async function getCoursesByTeacher(teacherId: string): Promise<PlatformCourse[]> {
  if (!teacherId) return [];
  const coursesCollectionRef = collection(db, "courses");
  const q = query(coursesCollectionRef, where("teacherId", "==", teacherId), orderBy("title", "asc"));
  const coursesSnapshot = await getDocs(q);
  return coursesSnapshot.docs.map(doc => convertTimestamps({ id: doc.id, ...doc.data() } as PlatformCourse));
}

export async function getCourseById(courseId: string): Promise<PlatformCourse | null> {
  if (!courseId) return null;
  const courseDocRef = doc(db, "courses", courseId);
  const courseDocSnap = await getDoc(courseDocRef);
  if (courseDocSnap.exists()) {
    return convertTimestamps({ id: courseDocSnap.id, ...courseDocSnap.data() } as PlatformCourse);
  }
  return null;
}

export async function addCourseToFirestore(
  courseData: Omit<PlatformCourse, 'id' | 'teacherId' | 'teacherName' | 'isApproved' | 'isPublished' | 'createdAt' | 'updatedAt' | 'dataAiHint' | 'thumbnailImageURL' | 'thumbnailFileName' | 'enrollmentCount' | 'certificateTemplateUrl' | 'certificateFileName'>,
  teacherId: string,
  teacherName: string,
  thumbnailImageURL_param?: string,
  thumbnailFileName_param?: string,
  certificateTemplateUrl_param?: string,
  certificateFileName_param?: string
): Promise<string> {
  const coursesCollectionRef = collection(db, "courses");

  // Helper to remove undefined properties from an object, which Firestore dislikes
  const cleanObject = (obj: any) => {
    Object.keys(obj).forEach(key => {
      if (obj[key] === undefined) {
        delete obj[key];
      } else if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
        cleanObject(obj[key]);
      }
    });
    return obj;
  };

  const dataToSave = cleanObject({
    title: courseData.title,
    description: courseData.description,
    category: courseData.category,
    teacherId: teacherId,
    teacherName: teacherName,
    modules: courseData.modules.map(m => cleanObject({
      id: m.id,
      title: m.title,
      description: m.description,
      chapters: m.chapters.map(c => cleanObject({
        id: c.id,
        title: c.title,
        estimatedMinutes: c.estimatedMinutes,
        contentBlocks: c.contentBlocks.map(cb => cleanObject({
          id: cb.id,
          type: cb.type,
          value: cb.value,
          altText: cb.altText,
          level: cb.level,
          dataAiHint: cb.dataAiHint,
          fileName: cb.fileName,
          fileSize: cb.fileSize,
          fileType: cb.fileType,
        })),
      })),
    })),
    isApproved: false,
    isPublished: false,
    thumbnailImageURL: thumbnailImageURL_param || `https://placehold.co/600x338.png?text=${encodeURIComponent(courseData.title.substring(0,10) || "New")}`,
    dataAiHint: courseData.category.name.toLowerCase(),
    enrollmentCount: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    difficulty: courseData.difficulty,
    durationMinutes: courseData.durationMinutes,
    badgeOnComplete: courseData.badgeOnComplete,
    thumbnailFileName: thumbnailFileName_param,
    certificateTemplateUrl: certificateTemplateUrl_param,
    certificateFileName: certificateFileName_param,
  });

  const newCourseRef = await addDoc(coursesCollectionRef, dataToSave);
  return newCourseRef.id;
}


export async function updateCourseInFirestore(courseId: string, courseData: Partial<Omit<PlatformCourse, 'id' | 'teacherId' | 'createdAt'>>): Promise<void> {
  const courseDocRef = doc(db, "courses", courseId);

  const currentCourse = await getDoc(courseDocRef);
  if (!currentCourse.exists()) {
    console.error(`Cannot update or send notification: Course with ID ${courseId} not found.`);
    throw new Error(`Course with ID ${courseId} not found.`);
  }
  const currentCourseData = currentCourse.data() as PlatformCourse;

  // Clone and remove undefined properties from the update payload
  const dataToUpdate: { [key: string]: any } = { ...courseData };
  Object.keys(dataToUpdate).forEach(key => {
    if (dataToUpdate[key] === undefined) {
      delete dataToUpdate[key];
    }
  });

  if (courseData.modules) {
    dataToUpdate.modules = courseData.modules.map(module => ({
      ...module,
      chapters: module.chapters.map(chapter => ({
        ...chapter,
        contentBlocks: chapter.contentBlocks.map(block => {
          const newBlock = {...block};
          // Remove undefined keys to prevent Firestore errors
          Object.keys(newBlock).forEach(key => {
              // @ts-ignore
              if(newBlock[key] === undefined) delete newBlock[key];
          });
          return newBlock;
        }),
      })),
    }));
  }

  dataToUpdate.updatedAt = serverTimestamp();

  await updateDoc(courseDocRef, dataToUpdate);

  const newIsPublished = courseData.isPublished !== undefined ? courseData.isPublished : currentCourseData.isPublished;
  const newIsApproved = courseData.isApproved !== undefined ? courseData.isApproved : currentCourseData.isApproved;

  // Check if isPublished changed from false to true AND course is not yet approved
  if (newIsPublished === true && currentCourseData.isPublished === false && newIsApproved === false) {
    addNotification({
      title: `Course Submitted: ${currentCourseData.title}`,
      description: `Course "${currentCourseData.title}" by ${currentCourseData.teacherName || 'Teacher'} needs approval.`,
      link: `/admin/courses/${courseId}/preview`,
      category: "system",
      icon: ListChecks,
    });
  }

  // Check if isApproved changed from false to true AND course is published
  if (newIsApproved === true && currentCourseData.isApproved === false && newIsPublished === true) {
    if (currentCourseData.teacherId) {
      addNotification({
        userId: currentCourseData.teacherId,
        title: `Course Approved: ${currentCourseData.title}`,
        description: `Congratulations! Your course "${currentCourseData.title}" has been approved and is now live.`,
        link: `/teacher/courses/${courseId}`,
        category: "course",
        icon: CheckCircle,
      });
    }
  }
}


export async function deleteCourseFromFirestore(courseId: string): Promise<void> {
  if (!courseId) return;
  const courseDocRef = doc(db, "courses", courseId);
  await deleteDoc(courseDocRef);
}

// Enrollment Functions

export async function addEnrollment(studentId: string, courseId: string): Promise<string> {
  if (!studentId || !courseId) throw new Error("Student ID and Course ID are required to enroll.");
  const enrollmentsCollectionRef = collection(db, "enrollments");
  const q = query(enrollmentsCollectionRef, where("studentId", "==", studentId), where("courseId", "==", courseId));
  const existingEnrollment = await getDocs(q);
  if (!existingEnrollment.empty) {
    return existingEnrollment.docs[0].id;
  }

  const batch = writeBatch(db);

  const newEnrollmentRef = doc(collection(db, "enrollments"));
  batch.set(newEnrollmentRef, {
    studentId,
    courseId,
    enrolledAt: serverTimestamp(),
    progress: 0,
    completedChapterIds: [],
  });

  const userDocRef = doc(db, "users", studentId);
  batch.update(userDocRef, { "stats.coursesEnrolled": increment(1) });

  const courseDocRef = doc(db, "courses", courseId);
  batch.update(courseDocRef, { "enrollmentCount": increment(1) });

  await batch.commit();
  return newEnrollmentRef.id;
}

export async function isStudentEnrolled(studentId: string, courseId: string): Promise<boolean> {
  if (!studentId || !courseId) return false;
  const enrollmentsCollectionRef = collection(db, "enrollments");
  const q = query(enrollmentsCollectionRef, where("studentId", "==", studentId), where("courseId", "==", courseId), limit(1));
  const snapshot = await getDocs(q);
  return !snapshot.empty;
}

export async function getCourseEnrollmentCount(courseId: string): Promise<number> {
  if (!courseId) return 0;
  const courseDocRef = doc(db, "courses", courseId);
  const courseSnap = await getDoc(courseDocRef);
  if (courseSnap.exists()) {
    return courseSnap.data().enrollmentCount || 0;
  }
  return 0;
}

export async function getEnrolledCoursesByStudent(studentId: string): Promise<PlatformCourse[]> {
  if (!studentId) return [];
  const enrollmentsCollectionRef = collection(db, "enrollments");
  const q = query(enrollmentsCollectionRef, where("studentId", "==", studentId), orderBy("enrolledAt", "desc"));
  const enrollmentsSnapshot = await getDocs(q);

  const courses: PlatformCourse[] = [];
  for (const enrollmentDoc of enrollmentsSnapshot.docs) {
    const enrollmentData = enrollmentDoc.data() as Enrollment;
    const course = await getCourseById(enrollmentData.courseId);
    if (course && course.isPublished && course.isApproved) {
      courses.push(course);
    }
  }
  return courses;
}

export async function getRecentEnrollments(limitCount: number = 2): Promise<Array<Enrollment & { id: string }>> {
  const enrollmentsCollectionRef = collection(db, "enrollments");
  const q = query(enrollmentsCollectionRef, orderBy("enrolledAt", "desc"), limit(limitCount));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => convertTimestamps({ id: doc.id, ...doc.data() } as Enrollment & { id: string }));
}

// Course Suggestion Functions
export async function addCourseSuggestion(
  data: Omit<CourseSuggestion, 'id' | 'createdAt' | 'updatedAt' | 'isReadByTeacher' | 'isReadByAdmin' | 'replies'>
): Promise<string> {
  const suggestionsCollectionRef = collection(db, "courseSuggestions");
  const newSuggestionRef = await addDoc(suggestionsCollectionRef, {
    ...data,
    replies: [],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    isReadByTeacher: false,
    isReadByAdmin: true,
  });

  addNotification({
    userId: data.teacherId,
    title: `New Suggestion for "${data.courseTitle}"`,
    description: `${data.adminName} sent a suggestion: "${data.initialMessage.substring(0, 50)}..."`,
    link: `/teacher/courses/${data.courseId}?tab=suggestions&suggestionId=${newSuggestionRef.id}`,
    category: "suggestion",
    icon: MessageSquareHeart,
  });

  return newSuggestionRef.id;
}

export async function getCourseSuggestionThread(courseId: string, adminId: string): Promise<CourseSuggestion | null> {
  if (!courseId || !adminId) return null;
  const suggestionsCollectionRef = collection(db, "courseSuggestions");
  const q = query(suggestionsCollectionRef,
                  where("courseId", "==", courseId),
                  where("adminId", "==", adminId),
                  orderBy("createdAt", "desc"),
                  limit(1)
                );
  const snapshot = await getDocs(q);
  if (snapshot.empty) {
    return null;
  }
  const docData = snapshot.docs[0].data();
  return convertTimestamps({ id: snapshot.docs[0].id, ...docData } as CourseSuggestion);
}

export async function getCourseSuggestionsForTeacher(courseId: string, teacherId: string): Promise<CourseSuggestion[]> {
  if (!courseId || !teacherId) return [];
  const suggestionsCollectionRef = collection(db, "courseSuggestions");
  const q = query(
    suggestionsCollectionRef,
    where("courseId", "==", courseId),
    where("teacherId", "==", teacherId),
    orderBy("updatedAt", "desc")
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => convertTimestamps({ id: doc.id, ...doc.data() } as CourseSuggestion));
}

export async function markSuggestionAsReadByTeacher(suggestionId: string): Promise<void> {
  if (!suggestionId) return;
  const suggestionDocRef = doc(db, "courseSuggestions", suggestionId);
  await updateDoc(suggestionDocRef, {
    isReadByTeacher: true,
  });
}

export async function addReplyToSuggestion(
  suggestionId: string,
  senderId: string,
  senderName: string,
  message: string,
  originalAdminId: string,
  targetTeacherId: string,
  courseTitle: string,
  courseId: string
): Promise<void> {
  if (!suggestionId || !senderId || !message) return;
  const suggestionDocRef = doc(db, "courseSuggestions", suggestionId);
  // Firestore doesn't store JS Date objects directly in arrays well, use server timestamp on root, and ISO string in array
  const newReply: Omit<CourseSuggestionReply, 'createdAt'> & {createdAt: any} = {
    id: `reply-${Date.now()}-${Math.random().toString(36).substring(2,9)}`,
    senderId,
    senderName,
    message,
    createdAt: new Date().toISOString(),
  };

  const updateData: any = {
    replies: arrayUnion(newReply),
    updatedAt: serverTimestamp(),
  };

  const isSenderAdmin = senderId === originalAdminId;

  if (isSenderAdmin) {
    updateData.isReadByTeacher = false;
    updateData.isReadByAdmin = true;
    addNotification({
      userId: targetTeacherId,
      title: `Reply from Admin on "${courseTitle}"`,
      description: `${senderName}: "${message.substring(0, 50)}..."`,
      link: `/teacher/courses/${courseId}?tab=suggestions&suggestionId=${suggestionId}`,
      category: "suggestion",
      icon: MessageSquareHeart,
    });
  } else {
    updateData.isReadByAdmin = false;
    updateData.isReadByTeacher = true;
     addNotification({
      userId: originalAdminId,
      title: `Reply from Teacher on "${courseTitle}"`,
      description: `${senderName}: "${message.substring(0, 50)}..."`,
      link: `/admin/courses?openSuggestion=${suggestionId}&courseId=${courseId}`,
      category: "suggestion",
      icon: MessageSquareHeart,
    });
  }

  await updateDoc(suggestionDocRef, updateData);
}

export async function getCourseSuggestionById(suggestionId: string): Promise<CourseSuggestion | null> {
    if (!suggestionId) return null;
    const suggestionDocRef = doc(db, "courseSuggestions", suggestionId);
    const suggestionDocSnap = await getDoc(suggestionDocRef);
    if (suggestionDocSnap.exists()) {
        return convertTimestamps({ id: suggestionDocSnap.id, ...suggestionDocSnap.data() } as CourseSuggestion);
    }
    return null;
}

// Review Functions
export async function addCourseReview(reviewData: Omit<Review, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  const reviewsCollectionRef = collection(db, "reviews");
  const newReviewRef = await addDoc(reviewsCollectionRef, {
    ...reviewData,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return newReviewRef.id;
}

export async function updateCourseReview(reviewId: string, reviewData: Pick<Review, 'rating' | 'comment'>): Promise<void> {
  const reviewDocRef = doc(db, "reviews", reviewId);
  await updateDoc(reviewDocRef, {
    ...reviewData,
    updatedAt: serverTimestamp(),
  });
}

export async function getCourseReviews(courseId: string): Promise<Review[]> {
  if (!courseId) return [];
  const reviewsCollectionRef = collection(db, "reviews");
  const q = query(reviewsCollectionRef, where("courseId", "==", courseId), orderBy("updatedAt", "desc"), orderBy("createdAt", "desc"));
  const reviewsSnapshot = await getDocs(q);
  return reviewsSnapshot.docs.map(doc => convertTimestamps({ id: doc.id, ...doc.data() } as Review));
}

export async function getStudentReviewForCourse(studentId: string, courseId: string): Promise<Review | null> {
  if (!studentId || !courseId) return null;
  const reviewsCollectionRef = collection(db, "reviews");
  const q = query(reviewsCollectionRef,
                  where("studentId", "==", studentId),
                  where("courseId", "==", courseId),
                  limit(1));
  const snapshot = await getDocs(q);
  if (snapshot.empty) {
    return null;
  }
  return convertTimestamps({ id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as Review);
}

// Badge and User Stats Functions
export async function checkIfBadgeAwarded(userId: string, courseId: string): Promise<boolean> {
  if (!userId || !courseId) return false;
  const badgeQuery = query(
    collection(db, `users/${userId}/earnedBadges`),
    where("courseId", "==", courseId),
    limit(1)
  );
  const snapshot = await getDocs(badgeQuery);
  return !snapshot.empty;
}

export async function awardUserBadge(
  userId: string,
  courseId: string,
  courseTitle: string,
  badgeName: string
): Promise<string | null> {
  if (!userId || !courseId || !badgeName) return null;

  const alreadyAwarded = await checkIfBadgeAwarded(userId, courseId);
  if (alreadyAwarded) {
    console.log(`Badge for course ${courseId} already awarded to user ${userId}.`);
    const q = query(collection(db, `users/${userId}/earnedBadges`), where("courseId", "==", courseId), limit(1));
    const snapshot = await getDocs(q);
    return snapshot.empty ? null : snapshot.docs[0].id;
  }

  const userBadgesCollectionRef = collection(db, `users/${userId}/earnedBadges`);
  const newBadgeRef = await addDoc(userBadgesCollectionRef, {
    userId,
    courseId,
    courseTitle,
    badgeName,
    awardedDate: serverTimestamp(),
    iconUrl: "lucide:Award"
  });
  return newBadgeRef.id;
}

export async function getEarnedBadgesForUser(userId: string): Promise<BadgeAward[]> {
  if (!userId) return [];
  const userBadgesCollectionRef = collection(db, `users/${userId}/earnedBadges`);
  const q = query(userBadgesCollectionRef, orderBy("awardedDate", "desc"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc =>
    convertTimestamps({
      id: doc.id,
      ...(doc.data() as Omit<BadgeAward, 'id' | 'awardedDate'>),
      awardedDate: doc.data().awardedDate
    } as BadgeAward)
  );
}

export async function incrementUserCoursesCompleted(userId: string): Promise<void> {
  if (!userId) return;
  const userDocRef = doc(db, "users", userId);
  try {
    await updateDoc(userDocRef, {
      "stats.coursesCompleted": increment(1),
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error(`Failed to increment coursesCompleted for user ${userId}:`, error);
  }
}

// --- New Functions for Final Quiz and Certificates ---

export async function saveFinalQuizAttempt(attemptData: Omit<FinalQuizAttempt, 'id'>): Promise<string> {
  const quizAttemptsCollectionRef = collection(db, "quizAttempts");
  const newAttemptRef = await addDoc(quizAttemptsCollectionRef, {
    ...attemptData,
  });
  return newAttemptRef.id;
}

export async function updateFinalQuizAttempt(attemptId: string, updates: Partial<FinalQuizAttempt>): Promise<void> {
  if (!attemptId) return;
  const attemptDocRef = doc(db, "quizAttempts", attemptId);
  await updateDoc(attemptDocRef, updates);
}

export async function getFinalQuizAttemptById(attemptId: string): Promise<FinalQuizAttempt | null> {
  if (!attemptId) return null;
  const attemptDocRef = doc(db, "quizAttempts", attemptId);
  const attemptDocSnap = await getDoc(attemptDocRef);
  if (attemptDocSnap.exists()) {
    return convertTimestamps({ id: attemptDocSnap.id, ...attemptDocSnap.data() } as FinalQuizAttempt);
  }
  return null;
}

export async function getLatestQuizAttemptForCourse(userId: string, courseId: string): Promise<FinalQuizAttempt | null> {
  if (!userId || !courseId) return null;
  const attemptsCollectionRef = collection(db, "quizAttempts");
  const q = query(
    attemptsCollectionRef,
    where("userId", "==", userId),
    where("courseId", "==", courseId),
    orderBy("quizGeneratedAt", "desc"),
    limit(1)
  );
  const snapshot = await getDocs(q);
  if (snapshot.empty) {
    return null;
  }
  return convertTimestamps({ id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as FinalQuizAttempt);
}


export async function createCertificateRecord(data: Omit<CertificateRecord, 'id' | 'status' | 'issuedDate'>): Promise<string> {
  const certificatesCollectionRef = collection(db, "certificates");
  const newRecordRef = await addDoc(certificatesCollectionRef, {
    ...data,
    status: 'pending_validation',
    issuedDate: serverTimestamp(),
  });

  const course = await getCourseById(data.courseId);
  if (course?.teacherId) {
    addNotification({
      userId: course.teacherId,
      title: `Certificate Pending: ${data.courseTitle}`,
      description: `${data.studentName} passed the final quiz. Certificate needs validation.`,
      link: `/teacher/courses/${data.courseId}?tab=certificates`,
      category: "system",
      icon: ListChecks
    });
  }
  return newRecordRef.id;
}

export async function updateCertificateRecordStatus(recordId: string, status: CertificateRecord['status'], teacherId?: string): Promise<void> {
  if (!recordId) return;
  const recordDocRef = doc(db, "certificates", recordId);
  const updates: Partial<Omit<CertificateRecord, 'id'>> = { status };
  if (teacherId) {
    updates.validatedByTeacherId = teacherId;
    updates.validationDate = serverTimestamp();
  }
  await updateDoc(recordDocRef, updates);

  const record = await getDoc(recordDocRef);
  if(record.exists()){
    const recordData = record.data() as CertificateRecord;
    if(status === 'approved' && recordData.userId) {
        addNotification({
            userId: recordData.userId,
            title: `Certificate Approved: ${recordData.courseTitle}`,
            description: `Your certificate for "${recordData.courseTitle}" has been approved by your teacher!`,
            link: `/student/profile?tab=certificates&highlight=${recordId}`,
            category: "course",
            icon: CheckCircle
        });
    }
  }
}

export async function getCertificateRecordsForCourse(courseId: string): Promise<CertificateRecord[]> {
  if (!courseId) return [];
  const certificatesCollectionRef = collection(db, "certificates");
  const q = query(certificatesCollectionRef, where("courseId", "==", courseId), orderBy("issuedDate", "desc"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => convertTimestamps({ id: doc.id, ...doc.data() } as CertificateRecord));
}

export async function getCertificatesForUser(userId: string): Promise<CertificateRecord[]> {
  if (!userId) return [];
  const certificatesCollectionRef = collection(db, "certificates");
  const q = query(certificatesCollectionRef, where("userId", "==", userId), orderBy("issuedDate", "desc"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => convertTimestamps({ id: doc.id, ...doc.data() } as CertificateRecord));
}

export async function getCertificateForUserAndCourse(userId: string, courseId: string): Promise<CertificateRecord | null> {
    if (!userId || !courseId) return null;
    const certificatesCollectionRef = collection(db, "certificates");
    const q = query(
        certificatesCollectionRef,
        where("userId", "==", userId),
        where("courseId", "==", courseId),
        orderBy("issuedDate", "desc"),
        limit(1)
    );
    const snapshot = await getDocs(q);
    if (snapshot.empty) {
        return null;
    }
    return convertTimestamps({ id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as CertificateRecord);
}

export async function getCertificateRecordById(recordId: string): Promise<CertificateRecord | null> {
  if (!recordId) return null;
  const recordDocRef = doc(db, "certificates", recordId);
  const recordDocSnap = await getDoc(recordDocRef);
  if (recordDocSnap.exists()) {
    return convertTimestamps({ id: recordDocSnap.id, ...recordDocSnap.data() } as CertificateRecord);
  }
  return null;
}
