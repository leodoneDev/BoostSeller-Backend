
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export async function POST(req: Request) {
  try {
    const { stageId, requiredFields } = await req.json();

    const stageSetting = await prisma.stage.update({
        where: {
            id: stageId,
        },
      data: {
        requiredFields,
      },
    });

    return new Response(JSON.stringify({ error: false,  message: 'Add lead Sales Stage pipeline Successful!', stageSetting }), {
      status: 201,
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: true, message: 'Failed to Create Sales Stage Setting. Please try again.' }));
  }
}


