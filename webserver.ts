import { returnDataResponse, startServer } from './deps.ts'

const port = 3018
let numberOfHearts = 0

const clients: Array<{
   id: number
   controller: ReadableStreamDefaultController
}> = []

const channel = new BroadcastChannel("love")
channel.onmessage = (event: MessageEvent) => {
   console.log('Got broadcast message', JSON.stringify(event))
   numberOfHearts++
   sendEventsToAll(`Someone shared some ❤️, we now have ${numberOfHearts} ❤️s`)
 };

function removeClient(clientId: number) {
   const indexToRemove = clients.findIndex((element) => element.id === clientId)
   if (indexToRemove && indexToRemove >= 0) {
      clients.splice(indexToRemove, 1)
   }
}

function sendEventsToAll(newMessage: string): void {
   for (const client of clients) {
      try {
         client.controller.enqueue(
            new TextEncoder().encode(`data: ${newMessage}\r\n\r\n`),
         )
      } catch (error) {
         console.log('An error ocurred when sending an event.', error)
      }
   }
}

function handleRequest(request: Request): Response {
   const responseHeaders = new Headers()
   const origin = request.headers.get('origin')
   if (origin) {
      responseHeaders.set('Access-Control-Allow-Origin', origin)
   }

   const { pathname } = new URL(request.url)

   if (request.method === 'OPTIONS') {
      return new Response(undefined, { headers: responseHeaders })
   } else if (pathname.includes('/spreadlove')) {
      numberOfHearts++
      const message = `Someone shared some ❤️, we now have ${numberOfHearts} ❤️s` 
      sendEventsToAll(message)
      channel.postMessage(message);
      responseHeaders.set('content-type', 'application/json; charset=UTF-8')
      return returnDataResponse(
         { message: 'You spread some ❤️' },
         responseHeaders,
      )
   } else if (pathname.includes('/getlove')) {
      let clientId: number
      const body = new ReadableStream({
         start(controller: ReadableStreamDefaultController): void {
            const newClientId = Date.now()
            const newClient = {
               id: newClientId,
               controller,
            }
            clients.push(newClient)
            clientId = newClientId
         },
         cancel(): void {
            removeClient(clientId)
         },
      })

      responseHeaders.set('content-type', 'text/event-stream')
      return new Response(body, {
         headers: responseHeaders,
         status: 200,
      })
   }

   responseHeaders.set('content-type', 'text/html; charset=UTF-8')
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
   )
}

startServer(handleRequest, { port: port })
