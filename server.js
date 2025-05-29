const { createServer } = require('http');
const next = require('next');
const socketIo = require('socket.io');
const path = require('path');
const fs = require('fs');
const url = require('url');
const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

const { sendPushNotification } = require('./firebase');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

app.prepare().then(() => {

const server = createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;

  // Serve files from /uploads
  if (pathname.startsWith('/uploads')) {
    const filePath = path.join(__dirname, pathname);
      
    fs.stat(filePath, (err, stat) => {
      if (err || !stat.isFile()) {
        res.statusCode = 404;
        res.end('Not found');
        return;
      }

      const readStream = fs.createReadStream(filePath);
      readStream.pipe(res);
    });
      return;
    }

    // Default next.js handler
    handle(req, res);
  });

  
  const io = socketIo(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    }
  });

  const clients = new Map(); // Map userId => socket
  
  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    socket.on('register', (userId) => {
      if (clients.has(userId)) {
        console.log(`User ${userId} was already connected. Replacing old socket.`);
      } else {
        clients.set(userId, socket);
        console.log(`Registered user ${userId} with socket ${socket.id}`);
      }
      
    });

    

    socket.on('lead_added', async (data) => {

      const triedPerformers = new Set();
      triedPerformers.clear(); // clear for each new lead
      await assignLeadToPerformer(data.id, null, triedPerformers);

    });

    async function assignLeadToPerformer(leadId, performerToSkip = null, triedPerformers = new Set()) {

      const lead = await prisma.lead.findUnique({ where: { id: leadId } });

      if (lead.status !== 'assigned' && lead.status !== 'pending') {
        console.log('Lead already processed:', lead.status);
        return;
      }

      const setting = await prisma.setting.findFirst();
      const assignPeriod = setting.assignPeriod * 1000;

      const performers = await prisma.performer.findMany({
        where: {
          available: true,
          id: {
            notIn: [...triedPerformers],
            ...(performerToSkip ? { not: performerToSkip } : {}),
          },
        },
      });

      const rankedPerformers = performers
      .map(performer => {
        const acceptedCount = performer.acceptedCount;
        const completedCount = performer.completedCount;
        const assignedCount = performer.assignedCount;
        const avgResponseTime = performer.avgResponseTime;
        const conversion = acceptedCount === 0 
        ? 0
        : completedCount / acceptedCount;
        const responseSpeed = 1 - (avgResponseTime / assignPeriod);
        const acceptanceRatio = assignedCount === 0 
        ? 0
        : acceptedCount / assignedCount;
        const score = (conversion * 0.6) + (responseSpeed * 0.2) + (acceptanceRatio * 0.2);
        return { ...performer, score };
      })
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return a.createdAt.getTime() - b.createdAt.getTime();
      });

      const nextPerformer = rankedPerformers[0];
      console.log(nextPerformer);
      if (!nextPerformer) {
        console.log('No more performers to assign');
        await prisma.lead.update({
          where: { id: leadId },
          data: { status: 'pendding' },
        });
        return;
      }

      triedPerformers.add(nextPerformer.id);

      const performerId = nextPerformer.userId.toString();
      const performerSocket = clients.get(performerId);

      await prisma.lead.update({
        where: { id: leadId },
        data: {
          assignedTo: nextPerformer.id,
          status: 'assigned',
          assignedAt: new Date(),
        },
      });

      await prisma.performer.update({
        where: {
          id: nextPerformer.id,
        },
        data: {
          assignedCount: {
            increment: 1,
          },
        },
      });

      const leadData = await prisma.lead.findUnique({ 
        where: { id: leadId },
        include: {
          interest: true,
        }, 
      
      });

      const notification = await prisma.notification.create({
        data: {
          receiveId: nextPerformer.userId,
          title: 'New lead is assigned',
          message: `A new lead - ${leadData.name} has been assigned to you.`,
          isRead: false,
        },
      });

      if (performerSocket) {
        performerSocket.emit('lead_notification', {
          type: 'assigned',
          lead: leadData,
          message: `A new lead - ${leadData.name} has been assigned to you.`,
          notification,
        });
      } else {
        const user = await prisma.user.findUnique({
          where: { id: nextPerformer.userId },
        });
        sendPushNotification(user.fcmToken, '📢 New Lead Assigned', `A new lead - ${leadData.name} has been assigned to you.`);
      }

      setTimeout(async () => {
        const updatedLead = await prisma.lead.findUnique({ 
          where: { id: leadId },
          include: {
            interest: true,
          }, 
        });
        if (updatedLead.status === 'assigned' &&  updatedLead.assignedTo === nextPerformer.id ) {
          const escalationNotification = await prisma.notification.create({
            data: {
              receiveId: nextPerformer.userId, 
              title: 'Lead is escalated!',
              message: `You did not accept the lead in time. The lead - ${updatedLead.name} will be escalated.`,
              isRead: false,
            },
          });
          

          const denyPerformerSocket = clients.get(nextPerformer.userId.toString());
          if (denyPerformerSocket) {
            denyPerformerSocket.emit('lead_escalation', {
              type: 'escalated',
              lead: updatedLead,
              message: `You did not accept the lead in time. The lead - ${updatedLead.name} will be escalated.`,
              escalationNotification,
            });
          }

          else {
            const user = await prisma.user.findUnique({
              where: { id: nextPerformer.userId },
            });
            sendPushNotification(user.fcmToken, '📢 Lead is escalated!', `You did not accept the lead in time. The lead - ${updatedLead.name} will be escalated.`);
          }
          await assignLeadToPerformer(leadId, nextPerformer.id, triedPerformers);
        } 
      }, assignPeriod);
    }

    socket.on('lead_skip', async (data) => {
      
      const lead = await prisma.lead.findUnique({
        where: {
          registerId: data.leadId,
          status: 'assigned',
        }
      });

      const leadId = lead.id;

      await prisma.performer.update({
        where: {
          id: parseInt(data.performerId),
        },
        data: {
          skippedCount: {
            increment: 1,
          }
        }
      });
      const skipSocket = clients.get(data.userId.toString());
      const escalationNotification = await prisma.notification.create({
        data: {
          receiveId: parseInt(data.userId), // or appropriate performer userId
          title: 'Lead is escalated!',
          message: `You skiped lead. The lead - ${lead.name} will be escalated.`,
          isRead: false,
        },
      });
      skipSocket.emit('lead_escalation', {
        type: 'escalated',
        lead: lead,
        message: `You did not accept the lead in time. The lead - ${lead.name} will be escalated.`,
        escalationNotification,
      });
      const triedPerformers = new Set();
      triedPerformers.add(parseInt(data.performerId));
       if (lead.assignedTo) triedPerformers.add(lead.assignedTo);
      await assignLeadToPerformer(leadId, parseInt(data.performerId), triedPerformers); // Skip current performer
    });

    socket.on('disconnect', () => {
      for (const [userId, s] of clients.entries()) {
        if (s.id === socket.id) clients.delete(userId);
      }
      console.log('Client disconnected:', socket.id);
    });
  });

  const PORT = process.env.PORT || 3000;

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`> Ready on http://0.0.0.0:${PORT}`);
  });
  
});



