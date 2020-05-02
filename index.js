require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const Nexmo = require('nexmo');
const numbers = require('./numbers').create();
const rides = require('./rides').create();
const BRAND = process.env.BRAND;
const WORKFLOW_ID = process.env.WORKFLOW_ID || 6;

const nexmo = new Nexmo({
    apiKey: process.env.API_KEY,
    apiSecret: process.env.API_SECRET,
    applicationId: process.env.APPLICATION_ID,
    privateKey: process.env.PRIVATE_KEY
})

function getSender() {
    // implement pool of LVNs
    return process.env.SENDER_LVN;
}

const app = express();
app.use(bodyParser.json({ type: "application/json"}));
app.use(bodyParser.urlencoded({ extended: true }));

function sendSms(from, to, text, callback) {
    nexmo.message.sendSms(from, to, text, callback);
}

function handleIncomingSms(sms) {
    const from = sms.msisdn;
    if (!from) {
        console.warn("Missing from for message id", sms.messageId);
        return;
    }
    if (sms.type !== 'text' && sms.type !== 'unicode') {
        sendSms(sms.to, from, "Only text messages are supported!");
    }
    const ride = rides.getByNumber(from);
    if (!ride) {
        sendSms(sms.to, from, "Your ride has ended. Have a nice day!");
        return;
    }
    const to = rides.getParty(ride, from);
    if (!to) {
        sendSms(sms.to, from, "Something wrong happened. Please call support and report this id: " + ride.id);
        return;
    }
    sendSms(ride.proxy, to, sms.text);
}

app.post('/webhooks/messages/inbound', (req, res) => {
    console.log(req.body);
    handleIncomingSms(req.body);
    res.status(200).end();
});

app.post('/webhooks/messages/status', (req, res) => {
    console.log(req.body);
    res.status(200).end();
});

function respondOk(res, entity) {
    res.status(200).json({result: "ok", entity: entity}).end();
}

function respondError(res, status, entity) {
    res.status(status).json({result: "error", entity: entity}).end();
}

app.post('/api/numbers', (req, res) => {
    const e164 = req.body.e164;
    let number;
    try {
        number = numbers.create(e164);
    } catch (e) {
        respondError(res, 400, e);
        return;
    }
    // number.state = 'verified';
    // respondOk(res, number);
    // return;
    nexmo.verify.request({
        number: number.e164,
        brand: BRAND,
        workflow_id: WORKFLOW_ID
    }, (err, result) => {
        if (err) {
            console.log("Verify request error", err);
            numbers.remove(e164);
            respondError(res, 500, err);
        } else if (result.status !== "0") {
            console.log("Verify request error status", result);
            numbers.remove(e164);
            respondError(res, 400, result);
        } else {
            number.verifyRequestId = result.request_id;
            console.log("Verify request result", result);
            respondOk(res, number);
        }
    });
});

app.post('/api/numbers/:e164/verify_check', (req, res) => {
    const e164 = req.params.e164;
    const number = numbers.get(e164);
    const code = req.body.code;
    if (!number) {
        respondError(res, 404, "Unknown number");
        return;
    }
    if (number.state === "verified") {
        respondError(res, 412, "Number is already verified");
        return;
    }
    nexmo.verify.check({
        request_id: number.verifyRequestId,
        code: code
    }, (err, result) => {
        if (err) {
            console.error("Check error", err);
            respondError(res, 500, err);
        } else if (result.status !== "0") {
            console.log("Check error status", result);
            respondError(res, 400, result);
        } else {
            console.log("Check result", result);
            number.state = "verified";
            delete number["verifyRequestId"];
            respondOk(res, number);
        }
    });
});

app.post('/api/numbers/:e164/verify_trigger_next_event', (req, res) => {
    const e164 = req.params.e164;
    const number = numbers.get(e164);
    if (!number) {
        respondError(res, 404, "Unknown number");
        return;
    }
    if (number.state === "verified") {
        respondError(res, 412, "Verification is already completed");
        return;
    }
    nexmo.verify.control({
        request_id: number.verifyRequestId,
        cmd: "trigger_next_event"
    }, (err, result) => {
        if (err) {
            console.error("Trigger next event error", err);
            respondError(res, 500, err);
        } else if (result.status !== "0") {
            console.log("Trigger next event error status", result);
            respondError(res, 400, result);
        } else {
            console.log("Trigger next event result", result);
            respondOk(res, number);
        }
    });
});

app.get('/api/numbers/:e164', (req, res) => {
    const e164 = req.params.e164;
    const number = numbers.get(e164);
    if (!number) {
        respondError(res, 404, "Unknown number");
        return;
    }
    respondOk(res, number);
});

app.delete('/api/numbers/:e164', (req, res) => {
    const e164 = req.params.e164;
    const number = numbers.get(e164);
    if (!number) {
        respondError(res, 404, "Unknown number");
        return;
    }
    numbers.remove(number.e164);
    respondOk(res, number);
    if (number.state === "verified") {
        return;
    }
    // cancel pending verification
    nexmo.verify.control({
        request_id: number.verifyRequestId,
        cmd: "cancel"
    }, (err, result) => {
        if (err) {
            console.warn("Cancel error", err);
        } else if (result.status !== "0") {
            console.warn("Cancel error status", result);
        } else {
            console.log("Cancel result", result);
        }
    });
});

function getVerified(res, role, e164) {
    const number = numbers.get(e164);
    if (!number) {
        throw "Number not found: " + e164;
    }
    if (number.state !== 'verified') {
        throw "Number not verified: " + e164;
    }
    return number;
}

function sendLogCallback(err, result) {
    if (err) {
        console.error("Send failed: ", err);
    } else {
        console.log("Sent: ", result);
    }
}

app.post('/api/rides', (req, res) => {
    let passenger, driver;
    try {
        passenger = getVerified(res, "Passenger", req.body.passenger);
        driver = getVerified(res, "Passenger", req.body.passenger);
    } catch (e) {
        respondError(res, 400, e);
        return;
    }
    let ride;
    try {
        ride = rides.create(passenger.e164, driver.e164, getSender());
    } catch (e) {
        respondError(res, 400, e);
        return;
    }
    sendSms(ride.proxy, ride.passenger, "I'm on my way. It's pleasure for me to serve you today.", sendLogCallback);
    sendSms(ride.proxy, ride.driver, "You have been assigned ride id: " + ride.id, sendLogCallback);
    respondOk(res, ride);
});

app.delete('/api/rides/:id', (req, res) => {
    const id = req.params.id;
    const ride = rides.getById(id);
    if (!ride) {
        respondError(res, 404, "Unknown ride");
        return;
    }
    rides.remove(id);
    respondOk(res, ride);
});

app.get('/api/rides/:id', (req, res) => {
    const id = req.params.id;
    const ride = rides.getById(id);
    if (!ride) {
        respondError(res, 404, "Unknown ride");
        return;
    }
    respondOk(res, ride);
});

app.listen(3000)
console.log("Accepting API calls at http://localhost:3000/api")
