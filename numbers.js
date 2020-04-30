function createInstance() {

    const store = {};

    function get(e164) {
        return store[e164];
    }

    function create(e164) {
        // TODO: verify format and normalize
        if (get(e164)) {
            throw "Number already registered";
        }
        const number = {
            kind: "number",
            e164: e164,
            state: "registered"
        };
        store[e164] = number;
        return number;
    }

    function remove(e164) {
        const number = store[e164];
        if (number) {
            return delete store[e164];
        }
        return number;
    }

    return {
        get: get,
        create: create,
        remove: remove
    };
}

exports.create = createInstance;
