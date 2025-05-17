
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export async function POST(req: Request) {
  try {
    const { userId } = await req.json();
    const parsedUserId = parseInt(userId);
    const hostess = await prisma.hostess.findUnique({
      where: {
        'userId': parsedUserId,
      },
    });

    const hostessId = hostess?.id;
    const leads = await prisma.lead.findMany(
      { 
        where: { addedBy: hostessId },
        include: {
          interest: true,
        },
        orderBy: {
          createdAt:'desc',
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
