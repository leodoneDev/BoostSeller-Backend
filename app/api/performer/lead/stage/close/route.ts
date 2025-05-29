
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export async function POST(req: Request) {
  try {
    const { stageId } = await req.json();
    const stages = await prisma.stage.findMany({
        where: {
            id: {
                lte: parseInt(stageId),
            }
        }
    });

    return new Response(JSON.stringify({
      error: false,
      stages
    }), {
      status: 200,
    });
  } catch (error) {
    console.error("Fetch data error:", error);
    return new Response(JSON.stringify({error: true, message: "Failed to close new lead. Please try again." }), {});
  }
}
