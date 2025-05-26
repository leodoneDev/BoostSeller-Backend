
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
      acceptedBy: paresedPerformerId,
      status: 'presentation',
      acceptedAt: new Date(),
     },
      
    });

    const hostessId = lead.addedBy ?? undefined;

    await prisma.hostess.update({
      where: {
        id: hostessId,
      },
      data: {
        acceptedCount: {
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
    return new Response(JSON.stringify({error: true, message: "Failed to accept new lead. Please try again." }), {});
  }
}
