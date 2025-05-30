
import nodemailer from 'nodemailer';
import { PrismaClient } from '@prisma/client';
import type SMTPTransport from 'nodemailer/lib/smtp-transport';

const prisma = new PrismaClient();

export async function POST(req: Request) {
  const { address, otpType } = await req.json();
  if(otpType == 1) {
    try {
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expires = new Date(Date.now() + 5 * 60 * 1000);
        
        await prisma.otp.create({
            data: { email: address, code: otp, expiresAt: expires,},
          });

        const transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port: process.env.SMTP_PORT,
          secure: true, 
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
          },
        } as SMTPTransport.Options);

        const mailOptions = {
          from: process.env.SMTP_USER,
          to: address,
          subject: 'Your OTP Code',
          html: `<p>Your OTP code is <b>${otp}</b>. It will expire in 5 minutes.</p>`,
        };

        await transporter.sendMail(mailOptions);

        return new Response(JSON.stringify({error: false,  message: 'OTP sent successfully! Please check your email.' }), {
          status: 200,
        });
      } catch (error) {
        console.error('Error sending OTP:', error);
        return new Response(
          JSON.stringify({ error: true, message: 'Failed to send OTP. Please try again. Your email is not real.' }),
          {}
        );
      }
  } else {
    // send SMS
  }
  
}
