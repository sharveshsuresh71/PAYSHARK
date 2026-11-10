import { NextRequest } from "next/server";
import { z } from "zod";
import { analyzeAgreement } from "@/lib/ai/groq";
import { ok,fail } from "@/lib/http";
const schema=z.object({original_text:z.string().min(20).max(20000)});
export async function POST(req:NextRequest){
 try{const parsed=schema.safeParse(await req.json());if(!parsed.success)return fail("VALIDATION_FAILED","Invalid agreement text",422,parsed.error.flatten());
  const terms=await analyzeAgreement(parsed.data.original_text);return ok(terms);
 }catch(e){return fail("AI_UNAVAILABLE",e instanceof Error?e.message:"AI analysis failed",503);}
}
