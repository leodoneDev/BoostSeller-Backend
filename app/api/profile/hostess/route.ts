
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export async function POST(req: Request) {
  try {
    const { hostessId } = await req.json();
    const parsedHostessId = parseInt(hostessId);
   
    const hostess = await prisma.hostess.findUnique({ where: { id: parsedHostessId } });
    if (!hostess) {
      return new Response(JSON.stringify({error: true, message: "User not found" }), {});
    }

    return new Response(JSON.stringify({
      error: false,
      hostess,
    }), {
      status: 200,
    });
  } catch (error) {
    console.error("Fetch data error:", error);
    return new Response(JSON.stringify({error: true, message: "Failed to get data. Please try again." }), {});
  }
}
