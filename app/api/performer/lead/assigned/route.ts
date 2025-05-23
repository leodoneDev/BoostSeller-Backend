
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export async function POST(req: Request) {
  try {
    const { performerId } = await req.json();
    console.log(performerId);
    const parsedperformerId = parseInt(performerId);
    const leads = await prisma.lead.findMany({
      where: {
        assignedTo: parsedperformerId,
        status: 'assigned',
      },
      orderBy: {
        assignedAt: 'desc',
      },
      include: {
        interest: true,
      },
    });

    
    return new Response(JSON.stringify({
      error: false,
      leads,
    }), {
      status: 200,
    });
  } catch (error) {
    console.error("Fetch data error:", error);
    return new Response(JSON.stringify({error: true, message: "Failed to get data. Please try again." }), {});
  }
}
