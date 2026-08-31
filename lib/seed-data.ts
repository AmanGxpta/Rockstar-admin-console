/**
 * Static seed/mock data for the educator + admin portals. Stands in for the
 * Supabase-backed content tables until those are wired up — shapes here are
 * meant to map cleanly onto future `courses`, `educators`, `students`, etc.
 */

export type CourseStatus = "live" | "pending" | "draft" | "archived";

export type Module = {
  id: string;
  title: string;
  minutes: number;
  status: "complete" | "active" | "locked";
};

export type Course = {
  id: string;
  title: string;
  description: string;
  category: string;
  educatorId: string;
  status: CourseStatus;
  enrolled: number;
  completionRate: number;
  revenue: number;
  submittedAt: string;
  price: number;
  modules: Module[];
};

export type Educator = {
  id: string;
  name: string;
  email: string;
  status: "approved" | "pending" | "suspended";
  joinedAt: string;
  bio: string;
  specialties: string[];
};

export type Student = {
  id: string;
  name: string;
  email: string;
  status: "active" | "suspended";
  coursesEnrolled: number;
  joinedAt: string;
};

export type Certification = {
  id: string;
  studentId: string;
  courseId: string;
  issueDate: string;
  status: "active" | "revoked";
};

export type Submission = {
  id: string;
  studentId: string;
  courseId: string;
  moduleTitle: string;
  submittedAt: string;
  status: "pending" | "approved" | "needs-revision";
  response: string;
};

export type MessageThread = {
  id: string;
  studentId: string;
  preview: string;
  lastActivity: string;
  unread: boolean;
};

export type Transaction = {
  id: string;
  date: string;
  studentId: string;
  courseId: string;
  type: "Course purchase" | "Renewal";
  amount: number;
  status: "Success" | "Refunded";
};

export const EDUCATORS: Educator[] = [
  {
    id: "ed-1",
    name: "Rae Mills",
    email: "rae@maisonatelier.co",
    status: "approved",
    joinedAt: "2024-11-02",
    bio: "Master colorist specializing in balayage and lived-in color.",
    specialties: ["Color & Balayage", "Consultation"],
  },
  {
    id: "ed-2",
    name: "Theo Vance",
    email: "theo@vancecuts.co",
    status: "approved",
    joinedAt: "2025-01-14",
    bio: "Editorial cutting specialist, ex-Vidal Sassoon academy.",
    specialties: ["Cutting", "Editorial"],
  },
  {
    id: "ed-3",
    name: "Priya Nair",
    email: "priya@studiopn.co",
    status: "approved",
    joinedAt: "2025-03-08",
    bio: "Barbering instructor focused on fades and texture work.",
    specialties: ["Barbering", "Styling"],
  },
  {
    id: "ed-4",
    name: "Mika Solano",
    email: "mika@solanohair.co",
    status: "pending",
    joinedAt: "2026-07-30",
    bio: "Session stylist pitching a runway styling curriculum.",
    specialties: ["Styling", "Editorial"],
  },
];

export const COURSES: Course[] = [
  {
    id: "co-1",
    title: "The Art of the Consultation",
    description:
      "How to listen beyond the words. Building trust before the scissors touch.",
    category: "Consultation",
    educatorId: "ed-1",
    status: "live",
    enrolled: 842,
    completionRate: 71,
    revenue: 12630,
    submittedAt: "2025-09-12",
    price: 15,
    modules: [
      { id: "m1", title: "Reading the room", minutes: 14, status: "complete" },
      { id: "m2", title: "Asking better questions", minutes: 18, status: "complete" },
      { id: "m3", title: "Setting expectations", minutes: 12, status: "active" },
    ],
  },
  {
    id: "co-2",
    title: "Balayage — Sectioning & Foundation",
    description: "Foil-free lightening fundamentals, from parting to placement.",
    category: "Color & Balayage",
    educatorId: "ed-1",
    status: "live",
    enrolled: 1204,
    completionRate: 64,
    revenue: 24080,
    submittedAt: "2025-06-02",
    price: 20,
    modules: [
      { id: "m1", title: "Tools & prep", minutes: 10, status: "complete" },
      { id: "m2", title: "Sectioning theory", minutes: 22, status: "complete" },
      { id: "m3", title: "Live placement demo", minutes: 28, status: "active" },
      { id: "m4", title: "Toning & finishing", minutes: 16, status: "locked" },
    ],
  },
  {
    id: "co-3",
    title: "Pricing Yourself with Confidence",
    description: "Understanding your value. Communicating it without apology.",
    category: "Ownership · Purpose",
    educatorId: "ed-1",
    status: "pending",
    enrolled: 0,
    completionRate: 0,
    revenue: 0,
    submittedAt: "2026-08-10",
    price: 15,
    modules: [
      { id: "m1", title: "Knowing your numbers", minutes: 15, status: "locked" },
      { id: "m2", title: "The pricing conversation", minutes: 20, status: "locked" },
    ],
  },
  {
    id: "co-4",
    title: "Precision Cutting — Fundamentals",
    description: "Sectioning, elevation, and the geometry behind a clean cut.",
    category: "Cutting",
    educatorId: "ed-2",
    status: "live",
    enrolled: 967,
    completionRate: 68,
    revenue: 19340,
    submittedAt: "2025-04-19",
    price: 20,
    modules: [
      { id: "m1", title: "Elevation & geometry", minutes: 16, status: "complete" },
      { id: "m2", title: "Graduated bob, start to finish", minutes: 26, status: "complete" },
      { id: "m3", title: "Texturizing", minutes: 18, status: "active" },
    ],
  },
  {
    id: "co-5",
    title: "Editorial Styling for Photoshoots",
    description: "Building looks that read on camera, not just in the mirror.",
    category: "Editorial",
    educatorId: "ed-2",
    status: "archived",
    enrolled: 312,
    completionRate: 58,
    revenue: 6240,
    submittedAt: "2024-08-01",
    price: 20,
    modules: [
      { id: "m1", title: "Moodboarding", minutes: 12, status: "complete" },
      { id: "m2", title: "On-set adjustments", minutes: 20, status: "complete" },
    ],
  },
  {
    id: "co-6",
    title: "Modern Fades & Tapers",
    description: "Clipper-over-comb, blending, and the finish that keeps clients coming back.",
    category: "Barbering",
    educatorId: "ed-3",
    status: "live",
    enrolled: 731,
    completionRate: 74,
    revenue: 14620,
    submittedAt: "2025-10-05",
    price: 20,
    modules: [
      { id: "m1", title: "Clipper fundamentals", minutes: 14, status: "complete" },
      { id: "m2", title: "Skin fades", minutes: 24, status: "complete" },
      { id: "m3", title: "Texture on top", minutes: 19, status: "active" },
    ],
  },
  {
    id: "co-7",
    title: "Color Theory — Final Assessment",
    description: "Underlying pigment, level, and tone — the full picture.",
    category: "Color & Balayage",
    educatorId: "ed-3",
    status: "draft",
    enrolled: 0,
    completionRate: 0,
    revenue: 0,
    submittedAt: "2026-08-14",
    price: 15,
    modules: [
      { id: "m1", title: "Underlying pigment", minutes: 15, status: "locked" },
    ],
  },
];

export const STUDENTS: Student[] = [
  { id: "st-1", name: "Mia Castillo", email: "mia.castillo@gmail.com", status: "active", coursesEnrolled: 4, joinedAt: "2025-02-11" },
  { id: "st-2", name: "Jon Park", email: "jon.park@gmail.com", status: "active", coursesEnrolled: 2, joinedAt: "2025-05-22" },
  { id: "st-3", name: "Ada Reyes", email: "ada.reyes@gmail.com", status: "active", coursesEnrolled: 6, joinedAt: "2024-12-03" },
  { id: "st-4", name: "Lena Brooks", email: "lena.brooks@gmail.com", status: "suspended", coursesEnrolled: 1, joinedAt: "2025-07-30" },
  { id: "st-5", name: "Sam Ortiz", email: "sam.ortiz@gmail.com", status: "active", coursesEnrolled: 3, joinedAt: "2026-01-09" },
  { id: "st-6", name: "Priya Chandra", email: "priya.chandra@gmail.com", status: "active", coursesEnrolled: 5, joinedAt: "2025-09-17" },
  { id: "st-7", name: "Devon Marsh", email: "devon.marsh@gmail.com", status: "active", coursesEnrolled: 2, joinedAt: "2026-03-02" },
  { id: "st-8", name: "Yuki Tanaka", email: "yuki.tanaka@gmail.com", status: "active", coursesEnrolled: 7, joinedAt: "2024-10-21" },
];

export const CERTIFICATIONS: Certification[] = [
  { id: "cert-3391", studentId: "st-3", courseId: "co-2", issueDate: "2026-06-18", status: "active" },
  { id: "cert-3388", studentId: "st-1", courseId: "co-1", issueDate: "2026-06-02", status: "active" },
  { id: "cert-3372", studentId: "st-8", courseId: "co-4", issueDate: "2026-05-21", status: "active" },
  { id: "cert-3350", studentId: "st-6", courseId: "co-6", issueDate: "2026-04-30", status: "active" },
  { id: "cert-3298", studentId: "st-2", courseId: "co-2", issueDate: "2026-03-11", status: "revoked" },
  { id: "cert-3244", studentId: "st-5", courseId: "co-1", issueDate: "2026-02-14", status: "active" },
];

export const SUBMISSIONS: Submission[] = [
  {
    id: "sub-1",
    studentId: "st-1",
    courseId: "co-2",
    moduleTitle: "Sectioning theory",
    submittedAt: "2026-08-17T10:20:00",
    status: "pending",
    response:
      "I want to do a full balayage from scratch without asking for help. That's the one I've been avoiding because I'm afraid it won't look right. But I know that's exactly why I need to do it.",
  },
  {
    id: "sub-2",
    studentId: "st-2",
    courseId: "co-2",
    moduleTitle: "Tools & prep",
    submittedAt: "2026-08-17T08:05:00",
    status: "pending",
    response:
      "My plan is to practice sectioning on a mannequin head every morning before opening, ten minutes a day, until it's second nature.",
  },
  {
    id: "sub-3",
    studentId: "st-3",
    courseId: "co-1",
    moduleTitle: "Final reflection",
    submittedAt: "2026-08-16T18:40:00",
    status: "pending",
    response:
      "The biggest shift for me was realizing the consultation isn't a formality — it's the whole job. Everything after that is just execution.",
  },
  {
    id: "sub-4",
    studentId: "st-5",
    courseId: "co-1",
    moduleTitle: "Setting expectations",
    submittedAt: "2026-08-15T14:12:00",
    status: "approved",
    response: "Wrote out a script for managing expectations on color corrections specifically.",
  },
  {
    id: "sub-5",
    studentId: "st-7",
    courseId: "co-4",
    moduleTitle: "Graduated bob, start to finish",
    submittedAt: "2026-08-14T09:30:00",
    status: "needs-revision",
    response: "Attached photos of the practice cut — elevation looks off on the left side.",
  },
];

export const MESSAGES: MessageThread[] = [
  { id: "msg-1", studentId: "st-1", preview: "Quick question about the toning ratios in module 4…", lastActivity: "2026-08-17T11:02:00", unread: true },
  { id: "msg-2", studentId: "st-4", preview: "Is there a way to get an extension on the final project?", lastActivity: "2026-08-17T09:15:00", unread: true },
  { id: "msg-3", studentId: "st-6", preview: "Thank you for the feedback on my last submission!", lastActivity: "2026-08-16T20:44:00", unread: true },
  { id: "msg-4", studentId: "st-3", preview: "Loved the live placement demo, could you post the notes?", lastActivity: "2026-08-16T16:20:00", unread: false },
  { id: "msg-5", studentId: "st-8", preview: "Signed up for the fades course, excited to start.", lastActivity: "2026-08-15T13:05:00", unread: true },
  { id: "msg-6", studentId: "st-2", preview: "Following up on my sectioning submission from Tuesday.", lastActivity: "2026-08-14T10:50:00", unread: false },
];

export const TRANSACTIONS: Transaction[] = [
  { id: "txn-9911", date: "2026-08-17", studentId: "st-6", courseId: "co-6", type: "Course purchase", amount: 20, status: "Success" },
  { id: "txn-9908", date: "2026-08-17", studentId: "st-8", courseId: "co-4", type: "Renewal", amount: 20, status: "Success" },
  { id: "txn-9902", date: "2026-08-16", studentId: "st-2", courseId: "co-2", type: "Course purchase", amount: 20, status: "Success" },
  { id: "txn-9897", date: "2026-08-16", studentId: "st-5", courseId: "co-1", type: "Course purchase", amount: 15, status: "Refunded" },
  { id: "txn-9891", date: "2026-08-15", studentId: "st-1", courseId: "co-1", type: "Renewal", amount: 15, status: "Success" },
  { id: "txn-9884", date: "2026-08-14", studentId: "st-3", courseId: "co-6", type: "Course purchase", amount: 20, status: "Success" },
  { id: "txn-9879", date: "2026-08-14", studentId: "st-7", courseId: "co-4", type: "Course purchase", amount: 20, status: "Success" },
  { id: "txn-9870", date: "2026-08-13", studentId: "st-4", courseId: "co-2", type: "Course purchase", amount: 20, status: "Success" },
];

export function educatorById(id: string) {
  return EDUCATORS.find((e) => e.id === id);
}
export function studentById(id: string) {
  return STUDENTS.find((s) => s.id === id);
}
export function courseById(id: string) {
  return COURSES.find((c) => c.id === id);
}
export function coursesByEducator(id: string) {
  return COURSES.filter((c) => c.educatorId === id);
}
export function certificationsByStudent(id: string) {
  return CERTIFICATIONS.filter((c) => c.studentId === id);
}

export function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  const now = new Date("2026-08-17T18:00:00").getTime();
  const diffMin = Math.round((now - then) / 60000);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.round(diffHr / 24);
  return `${diffDay}d ago`;
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatMoney(n: number): string {
  return `$${n.toLocaleString("en-US")}`;
}
