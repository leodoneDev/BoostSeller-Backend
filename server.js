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

  // const server = createServer((req, res) => {
  //   handle(req, res);
  // });

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

      // // find top rank performer
      // const assignedPerfomer = await prisma.performer.findFirst({
      //   orderBy: {
      //     score: 'desc',
      //     createdAt: 'asc',
      //   },
      //   where: {
      //     available: true,
      //   },
      // });

      // if(assignedPerfomer == null) {
      //   const lead = await prisma.lead.update({
      //     where: {
      //       id: data.id,
      //     },
      //     data: {
      //       status: "pendding",
      //     },
      //   });
      // }

      // const performerId = assignedPerfomer.userId.toString();

      // // socket that correspond to assigned performer
      // const performerSocket = clients.get(performerId);
      
      // const lead = await prisma.lead.update({
      //   where: {
      //     id: data.id,
      //   },
      //   data: {
      //     assignedTo: assignedPerfomer.id,
      //     status: "assigned",
      //     assignedAt: new Date(),
      //   },
      // });

      // console.log(performerId);

      // const notification = await prisma.notification.create({
      //   data: {
      //     receiveId: parseInt(performerId),
      //     title: 'New lead is assigned',
      //     message: 'A new lead - ' + data.name + ' has been assigned to you.',
      //     isRead: false,
      //   },
      // });

      // if (performerSocket) {
        
      //   performerSocket.emit('lead_notification', {
      //     lead: data,
      //     message: 'A new lead - ' + data.name + ' has been assigned to you.',
      //     notification: notification,
      //   });
        
      // } else {
        
      //   const user = await prisma.user.findUnique({
      //     where: {
      //       id: assignedPerfomer.userId,
      //     },

      //   });
      //   const title = '📢 New Lead Assigned';
      //   const message = 'A new lead - ' + data.name + ' has been assigned to you.';
      //   const deviceToken = user.fcmToken;
      //   console.log(deviceToken);
      //   sendPushNotification(deviceToken, title, message);
      // }

      triedPerformers.clear(); // clear for each new lead
      await assignLeadToPerformer(data.id);

    });


    const triedPerformers = new Set();

    async function assignLeadToPerformer(leadId, performerToSkip = null) {
      const lead = await prisma.lead.findUnique({ where: { id: leadId } });

      if (lead.status !== 'assigned' && lead.status !== 'pending' && lead.status !== 'pending') {
        console.log('Lead already processed:', lead.status);
        return;
      }

      const nextPerformer = await prisma.performer.findFirst({
        where: {
          available: true,
          id: {
            notIn: [...triedPerformers],
            ...(performerToSkip ? { not: performerToSkip } : {})
          }
        },
        orderBy: [
          { score: 'desc'},
          { createdAt: 'asc'},
        ],
      });

      if (!nextPerformer) {
        console.log('No more performers to assign');
        const penddingLead = await prisma.lead.update({
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

      const setting = await prisma.setting.findFirst();
      const assignPeriod = setting.assignPeriod ?? 300000;

      // Wait for 60s before checking if accepted
      setTimeout(async () => {
        const updatedLead = await prisma.lead.findUnique({ 
          where: { id: leadId },
          include: {
            interest: true,
          }, 
        });
        if (updatedLead.status === 'assigned' && updatedLead.assignedTo === nextPerformer.id) {
          const escalationNotification = await prisma.notification.create({
            data: {
              receiveId: nextPerformer.userId, // or appropriate performer userId
              title: 'Lead is escalated!',
              message: `You did not accept the lead in time. The lead - ${updatedLead.name} will be escalated.`,
              isRead: false,
            },
          });

          const denyPerformerSocket = clients.get(nextPerformer.userId.toString());
          if (denyPerformerSocket) {
            performerSocket.emit('lead_escalation', {
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
          await assignLeadToPerformer(leadId, nextPerformer.id);
        }
      }, 60000);
    }

    
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



