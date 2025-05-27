
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export async function POST(req: Request) {
  try {
    const { performerId } = await req.json();
    const parsedPerformerId = parseInt(performerId);
   
    const performer = await prisma.performer.findUnique({ where: { id: parsedPerformerId } });
    if (!performer) {
      return new Response(JSON.stringify({error: true, message: "User not found" }), {});
    }

    const conversion = performer.acceptedCount === 0
      ? 0
      : Math.floor((performer.completedCount / performer.acceptedCount) * 100);
    const responsiveness = Math.floor(performer.avgResponseTime);

    const effectiveness = performer.assignedCount === 0  
      ? 0 
      : Math.floor((performer.acceptedCount / performer.assignedCount) * 100);
    return new Response(JSON.stringify({
      error: false,
      performer,
      conversion: conversion,
      responsiveness: responsiveness,
      effectiveness: effectiveness,

    }), {
      status: 200,
    });
  } catch (error) {
    console.error("Fetch data error:", error);
    return new Response(JSON.stringify({error: true, message: "Failed to get data. Please try again." }), {});
  }
}
