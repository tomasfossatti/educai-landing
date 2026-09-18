import { currentUser } from "@/src/lib/auth";
import { redirect } from "next/navigation";
export default async function Home(){ const user=await currentUser(); redirect(user?.role === "TEACHER" ? "/teacher" : user ? "/student" : "/login"); }
