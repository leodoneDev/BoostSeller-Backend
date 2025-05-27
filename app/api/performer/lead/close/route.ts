
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export async function POST(req: Request) {
  try {
    const { registerId, performerId } = await req.json();
    const paresedPerformerId = parseInt(performerId);
    const leads = await prisma.lead.update({
      where: {
        registerId: registerId,
      },
     data: {
      status: 'closed',
      acceptedBy: paresedPerformerId,
     },
      
    });

    // update performer (closed_count)
    await prisma.performer.update({
      where: {
        id: paresedPerformerId,
      },
      data: {
        closedCount: {
          increment: 1,
        },
      }

    });

    return new Response(JSON.stringify({
      error: false,
      leads,
    }), {
      status: 200,
    });
  } catch (error) {
    console.error("Fetch data error:", error);
    return new Response(JSON.stringify({error: true, message: "Failed to close new lead. Please try again." }), {});
  }
}
