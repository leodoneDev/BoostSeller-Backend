
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'BoostSellerSecret';

export async function POST(req: Request) {
  try {
    const { email, password, fcmToken } = await req.json()

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return new Response(JSON.stringify({error: true, message: "User not found" }), {});
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return new Response(JSON.stringify({ error: true, message: "Password is Invalid. Please enter correct password." }), {});
    }

    await prisma.user.update(
      { 
        where: { email },
        data: {fcmToken}, 
    });

    let hostess  = {};
    let performer = {};

    if (user.role === 'hostess') {
      const existHostess = await prisma.hostess.findUnique({
        where: {
          userId: user.id,
        },
      });
      if (existHostess) {
        hostess = existHostess;
      }
    } else if (user.role === 'performer') {
      const existPerformer = await prisma.performer.findUnique({
        where: {
          userId: user.id,
        },
      });
      if (existPerformer) {
        performer = existPerformer;
      }
    }

    const token = jwt.sign(
      { id: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: '7d' } // Optional: adjust token lifespan
    );
    return new Response(JSON.stringify({
      error: false,
      message: "Logged in successfully!",
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone_number: user.phoneNumber,
        is_verified: user.isVerified,
        is_approved: user.isApproved,
        avatar_path: user.avatarPath,
        hostess: hostess,
        performer: performer,
      }
    }), {
      status: 200,
    });
  } catch (error) {
    console.error("Login error:", error);
    return new Response(JSON.stringify({error: true, message: "Failed to login. Please try again." }), {});
  }
}
