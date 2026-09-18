import "server-only";
import crypto from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "./db";

const COOKIE = "educai_session";
const SESSION_DAYS = 14;

function secret() {
  const value = process.env.SESSION_SECRET;
  if (!value) throw new Error("SESSION_SECRET is required");
  return value;
}

function b64(input: Buffer) { return input.toString("base64url"); }
function hashToken(token: string) { return crypto.createHmac("sha256", secret()).update(token).digest("hex"); }

export function hashPassword(password: string, salt = b64(crypto.randomBytes(16))) {
  const derived = crypto.scryptSync(password, salt, 64);
  return { hash: b64(derived), salt };
}

export function verifyPassword(password: string, salt: string, expected: string) {
  const derived = b64(crypto.scryptSync(password, salt, 64));
  const a = Buffer.from(derived);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export async function createSession(userId: string) {
  const token = b64(crypto.randomBytes(32));
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await db.authSession.create({ data: { userId, tokenHash: hashToken(token), expiresAt } });
  const store = await cookies();
  store.set(COOKIE, token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", expires: expiresAt });
}

export async function destroySession() {
  const store = await cookies();
  const token = store.get(COOKIE)?.value;
  if (token) await db.authSession.deleteMany({ where: { tokenHash: hashToken(token) } });
  store.delete(COOKIE);
}

export async function currentUser() {
  const store = await cookies();
  const token = store.get(COOKIE)?.value;
  if (!token) return null;
  const session = await db.authSession.findFirst({
    where: { tokenHash: hashToken(token), expiresAt: { gt: new Date() } },
    include: { user: { include: { teacher: true, student: true } } }
  });
  return session?.user ?? null;
}

export async function requireUser() {
  const user = await currentUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireTeacher() {
  const user = await requireUser();
  if (user.role !== "TEACHER" || !user.teacher) redirect("/student");
  return user as typeof user & { teacher: NonNullable<typeof user.teacher> };
}

export async function requireStudent() {
  const user = await requireUser();
  if (user.role !== "STUDENT" || !user.student) redirect("/teacher");
  return user as typeof user & { student: NonNullable<typeof user.student> };
}
