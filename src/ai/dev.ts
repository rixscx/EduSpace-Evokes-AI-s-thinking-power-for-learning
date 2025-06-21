
import { config } from 'dotenv';
config();

import '@/ai/flows/generate-quiz.ts';
import '@/ai/flows/generate-course-text-structure.ts';
import '@/ai/flows/populate-course-images.ts';
import '@/ai/flows/populate-course-videos.ts';
import '@/ai/flows/generate-final-course-quiz.ts'; // Added new flow
