
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export async function POST(req: Request) {
  try {
    const { stageId } = await req.json();
    const closedStage = await prisma.stage.findUnique({
      where: {
        id: parseInt(stageId),
      },
    });
    const interestId = closedStage?.interestId;
    const curSequence = closedStage?.sequence;

    const stages = await prisma.stage.findMany({
      where: {
        interestId: interestId,
        sequence: {
          lte: curSequence,
        }
      },
      orderBy: {
        sequence: 'asc',
      },
    });

    return new Response(JSON.stringify({
      error: false,
      stages
    }), {
      status: 200,
    });
  } catch (error) {
    console.error("Fetch data error:", error);
    return new Response(JSON.stringify({ error: true, message: "Failed to close new lead. Please try again." }), {});
  }
}
