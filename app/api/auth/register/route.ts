// import { prisma } from '../../../lib/prisma';
import bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
export async function POST(req: Request) {
  try {
    const { name, email, phoneNumber, password, role } = await req.json();

    // Check for existing user
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return new Response(JSON.stringify({ error: true, message: 'User already exists.', exist: true, }), {
      });
    }
    
    else {
      // Hash the password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create new user
      const user = await prisma.user.create({
        data: {
          name,
          email,
          phoneNumber,
          password: hashedPassword,
          role: role,
          isVerified: true,
          isApproved: false,
        },
      });
      
      if (role === 'hostess') {
        const existingHostess = await prisma.hostess.findUnique({ where: { userId: user.id } });
          if (existingHostess) {
            return new Response(JSON.stringify({ error: true, message: 'User already exists.', exist: true,}), {
          });
        }
        const hostess =  await prisma.hostess.create({ 
          data: { 
            userId: user.id 
          } 
        });
      } else if (role === 'performer') {
        const existingPerformer = await prisma.performer.findUnique({ where: { userId: user.id } });
          if (existingPerformer) {
            return new Response(JSON.stringify({ error: true, message: 'User already exists.', exist: true,}), {
          });
        }
        const performer = await prisma.performer.create({ 
          data: { 
            userId: user.id,
            groupIds: [], 
          } 
        });
      }

      return new Response(JSON.stringify({ error: false,  message: 'Register Successful!', exist: false,}), {
        status: 201,
      });

    }
  } catch (err) {
    console.log(err);
    return new Response(JSON.stringify({ error: true, message: 'Failed to register. Please try again.', exist: false, }));
  }
}
