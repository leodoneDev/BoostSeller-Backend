
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

    // hostess update
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

    // performer update (accepted_count and avg_response_time)
    const performer = await prisma.performer.findUnique({
      where: {
        id: paresedPerformerId,
      },
    });

    const acceptedAt = new Date(); // current timestamp
    const assignedAt = lead.assignedAt;
    const responseTime = (acceptedAt.getTime() - assignedAt!.getTime()) / 1000;
    const curAcceptedCount = performer!.acceptedCount;
    const curAvgResponseTime = performer!.avgResponseTime;
    const newAvgResponseTime = ((curAcceptedCount * curAvgResponseTime) + responseTime) / (curAcceptedCount + 1);

    await prisma.performer.update({
      where: {
        id: paresedPerformerId,
      },
      data: {
        avgResponseTime: newAvgResponseTime,
        acceptedCount: {
          increment: 1,
        }
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
