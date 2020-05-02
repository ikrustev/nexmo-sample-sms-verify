# Nexmo Verify and Secure Messaging Sample

#### Overview

The sample provides API for managing verified numbers within the system

Upon registration a verification code is sent to the number using Nexmo Verify API. Another API consumes the verification
code and if correct flags the number as verified and available for use.

Deleting a number cancels pending verification request if any. API is provided to trigger next verify workflow step.

Once a number is verified it can be used with the rides API either as a passenger or driver (or both).
Creating a ride notifies the two parties about their ride and establishes a bridge between the two numbers, which allows
them to exchange messages. Deleting the ride removes this bridge.  

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

Start ngrok and setup returned URL as inbound and delivery report webhook, like this:
```
ngrok http 3000 
```

Use this templates for inbound messages and delivery reports respectively:

```
<root-url>/webhooks/messages/inbound
<root-url>/webhooks/messages/status
```

Example:
```
https://2998e03f.ngrok.io/webhooks/messages/inbound
https://2998e03f.ngrok.io/webhooks/messages/status
```

#### Start

```
node index.js
```

#### Try

Register number, initiate verification process

```
curl -v -X POST -H'Content-Type: application/json' localhost:3000/api/numbers -d'{"e164":"<number_digits>"}'

example:
curl -v -X POST -H'Content-Type: application/json' localhost:3000/api/numbers -d'{"e164":"11234567890"}'

```

Verify number with received verification code

```
curl -X POST -H 'Content-Type: application/json' http://localhost:3000/api/numbers/:number_digits/verify_check -d'{"code":"5795"}'

example:
curl -X POST -H 'Content-Type: application/json' http://localhost:3000/api/numbers/11234567890/verify_check -d'{"code":"5795"}'


```

Trigger next verify workflow step 

```
curl -X POST -H 'Content-Type: application/json' http://localhost:3000/api/numbers/:number_digits/verify_trigger_next_event

```

Delete number, canceling verification process if not completed 

```
curl -X GET  http://localhost:3000/api/numbers/:number_digits
```

Get number

```
curl -X GET  http://localhost:3000/api/numbers/:number_digits
```

Create a ride

Note:
For easier testing the sample allows using same number for both the passenger and the driver.

```
curl -X POST -H 'Content-Type: application/json' http://localhost:3000/api/rides -d'{"driver":"<driver number digits>", "passenger":"<passenger number digits>"}'

example:
curl -X POST -H 'Content-Type: application/json' http://localhost:3000/api/rides -d'{"driver":"11111111111", "passenger":"12222222222"}'

```

Delete a ride

```
curl -X DELETE http://localhost:3000/api/rides/:id
```

Get a ride

```
curl -X GET http://localhost:3000/api/rides/:id
```
