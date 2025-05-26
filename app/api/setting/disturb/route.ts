
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export async function POST(req: Request) {
  try {
    const { performerId, flag } = await req.json();
    const paresedPerformerId = parseInt(performerId);
    const performer = await prisma.performer.update({
        where: {
            id: paresedPerformerId,
        },
        data: {
            available: !flag,
        },
    });
    
    return new Response(JSON.stringify({
      error: false,
      message: 'Disturb setting is successful!'
    }), {
      status: 200,
    });
  } catch (error) {
    console.error("Fetch data error:", error);
    return new Response(JSON.stringify({error: true, message: "Failed to save disturb setting. Please try again." }), {});
  }
}
