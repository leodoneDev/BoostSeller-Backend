
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export async function POST(req: Request) {
  try {
    const { registerId } = await req.json();

    const lead = await prisma.lead.update({
      where: {
        registerId: registerId,
      },
     data: {
      status: 'closed',
      assignedTo: null,
      triedPerformerIds: [],
     },
      
    });

    return new Response(JSON.stringify({
      error: false,
    }), {
      status: 200,
    });
  } catch (error) {
    console.error("Fetch data error:", error);
    return new Response(JSON.stringify({error: true, message: "Failed to close new lead. Please try again." }), {});
  }
}
