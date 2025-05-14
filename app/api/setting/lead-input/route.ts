
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export async function POST(req: Request) {
  try {
    const { sequence, label, type } = await req.json();

    // Check for existing user
    const existingFieldSetting = await prisma.leadInputSetting.findUnique({ where: { label } });
    if (existingFieldSetting) {
      return new Response(JSON.stringify({ error: true, message: 'label already exists.' }), {
      });
    }

    const fieldSetting = await prisma.leadInputSetting.create({
      data: {
        sequence,
        label,
        type,
      },
    });

    return new Response(JSON.stringify({ error: false,  message: 'Add lead additional feild Successful!', fieldSetting }), {
      status: 201,
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: true, message: 'Failed to Create field Setting. Please try again.' }));
  }
}

export async function GET() {
  try {
    const fields = await prisma.leadInputSetting.findMany({
        orderBy: {
            sequence: 'asc'
        },
    });
    if(fields.length == 0) {
        return new Response(JSON.stringify({ error: true, message: "Not found LeadAdditional Fields." }), {
          
        });
    }
    return new Response(JSON.stringify({
      error: false,
      fields,
    }), {
      status: 200,
      
    });
   
  } catch (error) {
    console.error("fetching error:", error);
    return new Response(JSON.stringify({error: true, message: "Failed to fetch data. Please try again." }), {
      
    });
  }
}
