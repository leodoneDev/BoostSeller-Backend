
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export async function POST(req: Request) {
  try {
    const { performerId } = await req.json();
    const parsedPerformerId = parseInt(performerId);
   
    const performer = await prisma.performer.findUnique({ where: { id: parsedPerformerId } });
    if (!performer) {
      return new Response(JSON.stringify({error: true, message: "User not found" }), {});
    }

    return new Response(JSON.stringify({
      error: false,
      performer,
    }), {
      status: 200,
    });
  } catch (error) {
    console.error("Fetch data error:", error);
    return new Response(JSON.stringify({error: true, message: "Failed to get data. Please try again." }), {});
  }
}
