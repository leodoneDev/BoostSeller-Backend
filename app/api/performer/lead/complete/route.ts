
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export async function POST(req: Request) {
  try {
    const { registerId, performerId } = await req.json();
    const paresedPerformerId = parseInt(performerId);
    const lead = await prisma.lead.update({
      where: {
        registerId: registerId,
      },
     data: {
      status: 'completed',
      acceptedBy: paresedPerformerId,
     },
      
    });

    const hostessId = lead.addedBy ?? undefined;

    await prisma.hostess.update({
      where: {
        id: hostessId,
      },
      data: {
        completedCount: {
          increment: 1,
        },
      },
    });
    
    return new Response(JSON.stringify({
      error: false,
      lead,
    }), {
      status: 200,
    });
  } catch (error) {
    console.error("Fetch data error:", error);
    return new Response(JSON.stringify({error: true, message: "Failed to completed new lead. Please try again." }), {});
  }
}
