
import { PrismaClient } from '@prisma/client';
import { cursorTo } from 'readline';
const prisma = new PrismaClient();

export async function POST(req: Request) {
  try {
    const { stageId } = await req.json();
    
    const curStage = await prisma.stage.findUnique({
        where: {
            id: parseInt(stageId),
        },
    });

    if (curStage === null) {
        return new Response(JSON.stringify({error: true, message: "Sales stage are not defined. please wait until configured stage setting." }), {});
    }
    
    const fields = curStage.requiredFields;

    return new Response(JSON.stringify({
      error: false,
      fields: fields,
    }), {
      status: 200,
    });
  } catch (error) {
    console.error("Fetch data error:", error);
    return new Response(JSON.stringify({error: true, message: "Failed to close new lead. Please try again." }), {});
  }
}


