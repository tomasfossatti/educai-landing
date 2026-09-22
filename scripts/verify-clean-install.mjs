import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import { PrismaClient } from "@prisma/client";

const baseUrl = process.env.DATABASE_URL;
if (!baseUrl) {
  throw new Error("DATABASE_URL is required to verify a clean installation");
}

const schema = `verify_clean_${crypto.randomBytes(8).toString("hex")}`;
const url = new URL(baseUrl);
url.searchParams.set("schema", schema);
const databaseUrl = url.toString();

execFileSync(
  process.platform === "win32" ? "npx.cmd" : "npx",
  ["prisma", "migrate", "deploy"],
  { stdio: "inherit", env: { ...process.env, DATABASE_URL: databaseUrl } }
);

const db = new PrismaClient({ datasources: { db: { url: databaseUrl } } });

try {
  // Exercise the relation/columns read by refreshClassFeedbackInsight.
  await db.classSession.findUnique({
    where: { id: "clean-install-probe" },
    include: {
      course: true,
      classFeedback: {
        orderBy: { createdAt: "asc" },
        select: { rating: true, comment: true }
      }
    }
  });
  await db.classSession.updateMany({
    where: { id: "clean-install-probe" },
    data: {
      feedbackSummary: "probe",
      feedbackRecommendation: "probe",
      feedbackGeneratedAt: new Date(0)
    }
  });

  // Exercise the model and compound key used by submitFeedbackAction's upsert.
  await db.classFeedback.findUnique({
    where: {
      sessionId_studentId: {
        sessionId: "clean-install-probe",
        studentId: "clean-install-probe"
      }
    },
    select: {
      courseId: true,
      sessionId: true,
      studentId: true,
      rating: true,
      comment: true
    }
  });

  console.log(`Clean migration verification passed in schema ${schema}.`);
} finally {
  await db.$disconnect();

  const admin = new PrismaClient({ datasources: { db: { url: baseUrl } } });
  try {
    await admin.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
  } finally {
    await admin.$disconnect();
  }
}

