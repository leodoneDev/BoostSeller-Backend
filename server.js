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

      console.log(data);
      await assignLeadToPerformer(parseInt(data.id));

    });

    async function assignLeadToPerformer(leadId) {

      const lead = await prisma.lead.findUnique({ 
        where: { id: leadId },
        include: {
          interest: true,
        } 
      
      });
      const triedPerformerIds = lead.triedPerformerIds;
      const intersteId = lead.interest.id;
      const assignedGroup= await prisma.group.findUnique({
        where : {
          interestId: intersteId,
        }
      });
      const assignedGroupId = assignedGroup.id;
      const setting = await prisma.setting.findFirst();
      const assignPeriod = setting.assignPeriod;
      const performLimit = setting.performLimit;
      const performers = await prisma.performer.findMany({
        where: {
          available: true,
          id: {
            // notIn: Array.from(triedPerformerIds),
            notIn: triedPerformerIds ?? [],
          },
          groupIds : {
            has: assignedGroupId,
          },
          
        },
      });

      const filteredPerformers = performers.filter(p =>
        (p.acceptedCount - p.closedCount - p.completedCount) <= performLimit
      );

      const rankedPerformers = filteredPerformers
      .map(performer => {
        const acceptedCount = performer.acceptedCount;
        const completedCount = performer.completedCount;
        const assignedCount = performer.assignedCount;
        const avgResponseTime = performer.avgResponseTime;
        const conversion = acceptedCount === 0 
        ? 0
        : completedCount / acceptedCount;
        const responseSpeed = avgResponseTime === 0 
        ? 0
        : 1 - (avgResponseTime / assignPeriod);
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

      const assignedPerformer = rankedPerformers[0];
      console.log(assignedPerformer);
      if (!assignedPerformer) {
        console.log('No more performers to assign');
        const penddingLead = await prisma.lead.update({
          where: { id: leadId },
          data: { 
            status: 'pendding',
            triedPerformerIds: [],
           },
          include: {
            interest: true,
          },
        });
        const addedByHostess = await prisma.hostess.findUnique({
          where: {
            id: penddingLead.addedBy,
          },
        });
        
        const hostessSocket = clients.get(addedByHostess.userId.toString());
        const hostessNotification = await prisma.notification.create({
          data: {
            receiveId: addedByHostess.userId,
            title: 'New lead is pendding',
            message: `A new lead - ${penddingLead.name} is pendding.`,
            isRead: false,
          },
        });
        if (hostessSocket) {
        hostessSocket.emit('lead_pendding', {
          type: 'pendding',
          lead: penddingLead,
          message: `A new lead - ${penddingLead.name} is penddding.`,
          hostessNotification,
        });
      } else {
        const user = await prisma.user.findUnique({
          where: { id: addedByHostess.userId },
        });
        sendPushNotification(user.fcmToken, '📢 New Lead is pendding', `A new lead - ${penddingLead.name} is penddding.`);
      }

        return;
      }

      await prisma.lead.update({
        where: { id: leadId },
        data: {
          triedPerformerIds: {
            push: assignedPerformer.id,
          },
        },
      });

      const assignedPerformerUserId = assignedPerformer.userId.toString();
      const performerSocket = clients.get(assignedPerformerUserId);

      const assignedLead = await prisma.lead.update({
        where: { id: leadId },
        data: {
          assignedTo: assignedPerformer.id,
          status: 'assigned',
          assignedAt: new Date(),
        },
        include: {
          interest: true,
        },
      });

      await prisma.performer.update({
        where: {
          id: assignedPerformer.id,
        },
        data: {
          assignedCount: {
            increment: 1,
          },
        },
      });

      const notification = await prisma.notification.create({
        data: {
          receiveId: assignedPerformer.userId,
          title: 'New lead is assigned',
          message: `A new lead - ${assignedLead.name} has been assigned to you.`,
          isRead: false,
        },
      });

      if (performerSocket) {
        performerSocket.emit('lead_notification', {
          type: 'assigned',
          lead: assignedLead,
          message: `A new lead - ${assignedLead.name} has been assigned to you.`,
          notification,
        });
      } else {
        const user = await prisma.user.findUnique({
          where: { id: assignedPerformer.userId },
        });
        sendPushNotification(user.fcmToken, '📢 New Lead Assigned', `A new lead - ${assignedLead.name} has been assigned to you.`);
      }

      setTimeout(async () => {
        const updatedLead = await prisma.lead.findUnique({ 
          where: { id: leadId },
          include: {
            interest: true,
          }, 
        });
        if (updatedLead.status === 'assigned' &&  updatedLead.assignedTo === assignedPerformer.id ) {
          const escalationNotification = await prisma.notification.create({
            data: {
              receiveId: assignedPerformer.userId, 
              title: 'Lead is escalated!',
              message: `You did not accept the lead in time. The lead - ${updatedLead.name} will be escalated.`,
              isRead: false,
            },
          });
          

          const denyPerformerSocket = clients.get(assignedPerformer.userId.toString());
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
              where: { id: assignedPerformer.userId },
            });
            sendPushNotification(user.fcmToken, '📢 Lead is escalated!', `You did not accept the lead in time. The lead - ${updatedLead.name} will be escalated.`);
          }
          await assignLeadToPerformer(leadId);
        } 
      }, assignPeriod * 1000);
    }

  socket.on('lead_skip', async (data) => {
      
      const userId = parseInt(data.userId);
      const performerId = parseInt(data.performerId);
      const lead = await prisma.lead.findUnique({
        where: {
          registerId: data.leadId,
        },
        include: {
          interest: true,
        },
      });
      
      if (!lead || lead.status !== 'assigned') return;

      const leadId = lead.id;

      await prisma.performer.update({
        where: {
          id: performerId,
        },
        data: {
          skippedCount: {
            increment: 1,
          }
        }
      });
      const skipSocket = clients.get(userId.toString());
      const escalationNotification = await prisma.notification.create({
        data: {
          receiveId: userId, // or appropriate performer userId
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
      await assignLeadToPerformer(leadId);
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



