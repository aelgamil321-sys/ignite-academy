import type { Bi, QuizQuestion } from "./curriculum";
import type { AnnouncementTopic } from "./announcement-topics";

export interface VideoItem {
  slug: string;
  title: Bi;
  description: Bi;
  grade: Bi;
  duration: string;
  youtubeId: string;
}

export const videos: VideoItem[] = [];

export function getVideo(slug: string) {
  return videos.find((v) => v.slug === slug);
}

export interface QuizItem {
  slug: string;
  title: Bi;
  description: Bi;
  grade: Bi;
  questions: QuizQuestion[];
}

export const quizzes: QuizItem[] = [];

export function getQuiz(slug: string) {
  return quizzes.find((q) => q.slug === slug);
}

export interface Announcement {
  slug: string;
  date: string;
  createdAt: number;
  tag: Bi;
  topic: AnnouncementTopic;
  title: Bi;
  excerpt: Bi;
  body: Bi;
  imageUrl?: string;
}

export const announcements: Announcement[] = [];

export function getAnnouncement(slug: string) {
  return announcements.find((a) => a.slug === slug);
}

export interface Resource {
  slug: string;
  title: Bi;
  type: "pdf" | "ppt" | "worksheet";
  grade: Bi;
  subject: Bi;
  size: string;
}

export const resources: Resource[] = [];

export interface ParentGuide {
  slug: string;
  title: Bi;
  excerpt: Bi;
  body: Bi;
}

export const parentGuides: ParentGuide[] = [];

export function getParentGuide(slug: string) {
  return parentGuides.find((g) => g.slug === slug);
}
