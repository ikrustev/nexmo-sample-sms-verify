# Nexmo Verify and Voice Proxy Sample

#### Overview

  

#### Install dependencies
```
npm install
```

#### Prepare config file
Copy provided template and fill in:
```
cp env-template .env
```

#### Webhook setup.

Start ngrok:
```
ngrok http 3000 
```

Use provided js to query ngrok public url and setup the nexmo app webhooks
```
node set-app-webhook.js
```

#### Start

```
node index.js
```

#### Try

Register number, initiate verification process

```
curl -X POST http://localhost:3000/api/numbers -d'{"e164":<number digits>}'
```

Verify number with received verification code

```
curl -X POST http://localhost:3000/api/numbers/:number_digits/verify_check -d'{"code":""}'

```

Trigger next verify workflow step 

```
curl -X POST http://localhost:3000/api/numbers/:number_digits/verify_trigger_next_event

```

Delete number, canceling verification process if not completed 

```
curl -X GET  http://localhost:3000/api/numbers/:number_digits
```

Get number

```
curl -X GET  http://localhost:3000/api/numbers/:number_digits
```
