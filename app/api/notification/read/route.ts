
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export async function POST(req: Request) {
  try {
    const { receiveId } = await req.json();
    const paresedReceiveId = parseInt(receiveId);
    const unReadCount = await prisma.notification.update({
        where: {
            receiveId: paresedReceiveId,
        },
        data : {
            isRead: true,
        },
    });

    
    return new Response(JSON.stringify({
      error: false,
    }), {
      status: 200,
    });
  } catch (error) {
    console.error("Fetch data error:", error);
    return new Response(JSON.stringify({error: true, message: "Failed to save read status. Please try again." }), {});
  }
}
