export const runtime = "nodejs";          // Prisma needs Node runtime

import { handlers } from "@/lib/auth";

// ✅ Correct: export the handler functions, not the object
export const { GET, POST } = handlers;
