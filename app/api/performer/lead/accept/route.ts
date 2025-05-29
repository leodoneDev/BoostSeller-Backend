
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export async function POST(req: Request) {
  try {
    const { registerId, performerId } = await req.json();
    const paresedPerformerId = parseInt(performerId);
    const firstStage = await prisma.stage.findFirst({
      where: {
        sequence: 1,
      },
    });
    if (firstStage == null) {
      return new Response(JSON.stringify({error: true, exist: false,  message: "Sales stage is not defined. Please wait until configured sales stage setting." }), {});
    }
    const firstStageName = firstStage.name;
    const lead = await prisma.lead.update({
      where: {
        registerId: registerId,
      },
     data: {
      acceptedBy: paresedPerformerId,
      status: firstStageName,
      acceptedAt: new Date(),
      stageId: firstStage.id,
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

    const updatedLead = await prisma.lead.findUnique({
      where: {
        registerId: registerId,
      },
      include: {
        interest: true,
      },
    });
    return new Response(JSON.stringify({
      error: false,
      lead: updatedLead,
      stageName: firstStageName,
      stageId: firstStage.id,
    }), {
      status: 200,
    });
  } catch (error) {
    console.error("Fetch data error:", error);
    return new Response(JSON.stringify({error: true, message: "Failed to accept new lead. Please try again." }), {});
  }
}
