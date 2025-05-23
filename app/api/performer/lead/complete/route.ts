
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
      status: 'completed',
      acceptedBy: paresedPerformerId,
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
    return new Response(JSON.stringify({error: true, message: "Failed to completed new lead. Please try again." }), {});
  }
}
