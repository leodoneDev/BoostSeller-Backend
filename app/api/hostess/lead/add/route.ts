
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export async function POST(req: Request) {
  try {
    const { name, phoneNumber, additionalInfo, hostessId, interestId } = await req.json();
    const parsedInterestId = parseInt(interestId);
    const parsedHostessId = parseInt(hostessId);
    const existingLead = await prisma.lead.findFirst({ where: { 
        name: name,
        phoneNumber: phoneNumber,
        interestId: parsedInterestId,
        addedBy: parsedHostessId,
     } });
    if (existingLead) {
      return new Response(JSON.stringify({ error: true, message: 'Lead already exists.' }), {
      });
    }

    const existHostess = await prisma.hostess.update({
      where: {
        'id': parsedHostessId,
      },
      data: {
        totalCount: {
          increment: 1,
        },
      }
    });

    function generateNumericUUID(phoneNumber: string, hostessId: number, interestId: number): string {
        const raw = `${phoneNumber}${hostessId}${interestId}`;
        let hash = 0;

        for (let i = 0; i < raw.length; i++) {
            hash = (hash * 31 + raw.charCodeAt(i)) % 10000000000;
        }

        return hash.toString().padStart(10, '0'); 
    }

    const registerId = generateNumericUUID(phoneNumber, parsedHostessId, parsedInterestId);

    // Create new lead
    const lead = await prisma.lead.create({
      data: {
        name: name,
        phoneNumber: phoneNumber,
        interestId: parsedInterestId,
        addedBy: parsedHostessId,
        additionalInfo: additionalInfo,
        registerId: registerId,
        stageId: 0,
      },
    });
    
    const interest = await prisma.interest.findUnique({
      where: {
        id: parsedInterestId,
      },
    });

    const interestName = interest?.name;

    const passLead = {
      id: lead.id,
      name: lead.name,
      interest: {
        name: interestName,
      },
      phoneNumber: lead.phoneNumber,
      registerId: lead.registerId,
      status: lead.status,
      createdAt: lead.createdAt,
    };

    return new Response(JSON.stringify({ error: false,  message: 'Add Lead Successful!', lead: passLead  }), {
      status: 201,
    });
  } catch (err) {
    console.log(err);
    return new Response(JSON.stringify({ error: true, message: 'Failed to add lead. Please try again.' }));
  }
}
