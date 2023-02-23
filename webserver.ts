import { serve } from './deps.ts';

const port = 3018;

const clients: Array<{
   id: number;
   controller: ReadableStreamDefaultController;
}> = [];

function sendEventsToAll(newMessage: string): void {
   for (const client of clients) {
      try {
         client.controller.enqueue(
            new TextEncoder().encode(`data: ${newMessage}\r\n\r\n`),
         );
      } catch (error) {
         console.log('An error ocurred when sending an event', error);
      }
   }
}

function handleRequest(request: Request): Response {
   const { pathname } = new URL(request.url);
   if (pathname.includes('/spreadlove')) {
      sendEventsToAll('Someone shared some ❤️');
      return new Response(JSON.stringify({ message: 'You spread some ❤️' }), {
         headers: { 'content-type': 'application/json; charset=UTF-8' },
      });
   } else if (pathname.includes('/getlove')) {
      const body = new ReadableStream({
         start(controller: ReadableStreamDefaultController): void {
            const clientId = Date.now();
            const newClient = {
               id: clientId,
               controller,
            };
            clients.push(newClient);
         },
         cancel(): void {
         },
      });

      return new Response(body, {
         headers: { 'content-type': 'text/event-stream' },
         status: 200,
      });
   }

   return new Response(
      `
    <html>
    <head>
    </head>
    <body>
    <script>
    function spreadlove() {
      fetch('spreadlove').then( response => {}).catch( error => {})
    }
    </script>
    <h1>Spread some love ❤️</h1>
    <input type='button' value='Spread some love!' onclick='spreadlove()'>
    <div id="hearts"></div>
    <script>
    const evtSource = new EventSource("getlove");
    var hearts = document.getElementById('hearts');
    evtSource.onmessage = (event) => {
      var item = document.createElement('span');
      item.innerHTML = event.data + '<br>';
      hearts.appendChild(item);
      window.scrollTo(0, document.body.scrollHeight);
    }
    </script>
    </body>
    </html>
    
    `,
      {
         headers: { 'content-type': 'text/html; charset=UTF-8' },
      },
   );
}

serve(handleRequest, { port: port });
