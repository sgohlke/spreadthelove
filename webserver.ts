import { serve } from './deps.ts';

const port = 3018;

const clients: Array<{
   id: number;
   controller: ReadableStreamDefaultController;
}> = [];


function removeClient(clientId: number) {
   const indexToRemove = clients.findIndex( element => element.id === clientId )
      if (indexToRemove && indexToRemove >= 0) {
         clients.splice(indexToRemove, 1)
      }
}

function sendEventsToAll(newMessage: string): void {
   for (const client of clients) {
      try {
         client.controller.enqueue(
            new TextEncoder().encode(`data: ${newMessage}\r\n\r\n`),
         );
      } catch (error) {
         console.log('An error ocurred when sending an event.', error);
      }
   }
}

function handleRequest(request: Request): Response {
   const responseHeaders = new Headers();
   const origin = request.headers.get('origin');
   if (origin) {
      responseHeaders.set('Access-Control-Allow-Origin', origin);
   }

   let clientId: number
   const { pathname } = new URL(request.url);

   if (request.method === 'OPTIONS') {
      return new Response(undefined, { headers: responseHeaders });
   } else if (pathname.includes('/spreadlove')) {
      sendEventsToAll('Someone shared some ❤️');
      responseHeaders.set('content-type', 'application/json; charset=UTF-8');
      return new Response(JSON.stringify({ message: 'You spread some ❤️' }), {
         headers: responseHeaders,
      });
   } else if (pathname.includes('/getlove')) {
      const body = new ReadableStream({
         start(controller: ReadableStreamDefaultController): void {
            const newClientId = Date.now();
            const newClient = {
               id: newClientId,
               controller,
            };
            clients.push(newClient);
            clientId = newClientId
         },
         cancel(): void {
            removeClient(clientId)
         },
      });

      responseHeaders.set('content-type', 'text/event-stream');
      return new Response(body, {
         headers: responseHeaders,
         status: 200,
      });
   }

   responseHeaders.set('content-type', 'text/html; charset=UTF-8');
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
         headers: responseHeaders,
      },
   );
}

serve(handleRequest, { port: port });
